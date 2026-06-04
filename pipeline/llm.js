const Groq = require('groq-sdk');
require('dotenv').config();

let _client = null;
function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}
const MODEL = () => process.env.MODEL || 'llama-3.1-8b-instant';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callLLM(systemPrompt, userMessage, options = {}) {
  const client = getClient();
  const { temperature = 0.1, maxTokens = 2048 } = options;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL(),
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });
      return response.choices[0].message.content;
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429');
      if (is429 && attempt < 5) {
        // Extract wait time from error message if available
        const waitMatch = err.message?.match(/try again in (\d+(\.\d+)?)s/i);
        const waitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500 : attempt * 8000;
        console.log(`Rate limited. Waiting ${(waitMs/1000).toFixed(1)}s before retry ${attempt}/5...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

function extractJSON(raw) {
  if (!raw) throw new Error('LLM returned empty response');

  try { return JSON.parse(raw); } catch (_) {}

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (_) {}
  }

  const startObj = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  const start = startObj === -1 ? startArr : startArr === -1 ? startObj : Math.min(startObj, startArr);

  if (start !== -1) {
    const opening = raw[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === opening) depth++;
      if (raw[i] === closing) depth--;
      if (depth === 0) {
        try { return JSON.parse(raw.slice(start, i + 1)); } catch (_) {}
        break;
      }
    }
  }

  throw new Error(`Failed to extract JSON from LLM response: ${raw.slice(0, 200)}`);
}

module.exports = { callLLM, extractJSON };
