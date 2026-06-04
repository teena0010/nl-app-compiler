require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { runPipeline } = require('./pipeline/index');
const { renderApp } = require('./runtime/renderer');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', model: process.env.MODEL || 'gpt-4o' }));

// Main generation endpoint
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
    return res.status(400).json({ error: 'prompt must be at least 10 characters' });
  }

  try {
    const result = await runPipeline(prompt.trim());
    // Save config to disk for runtime rendering
    if (result.success) {
      fs.writeFileSync(path.join(DATA_DIR, `${result.runId}.json`), JSON.stringify(result.config));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stream progress endpoint (SSE)
app.get('/api/generate/stream', (req, res) => {
  const { prompt } = req.query;
  if (!prompt) return res.status(400).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ stage: 'started', prompt });

  runPipeline(prompt.trim())
    .then(result => {
      send({ stage: 'completed', result });
      res.end();
    })
    .catch(err => {
      send({ stage: 'error', error: err.message });
      res.end();
    });
});

// Serve the generated runtime app
app.get('/app/:runId', (req, res) => {
  const filePath = path.join(DATA_DIR, `${req.params.runId}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).send('App not found. Generate it first.');
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.setHeader('Content-Type', 'text/html');
  res.send(renderApp(config, req.params.runId));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
