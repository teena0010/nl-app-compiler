const { extractIntent } = require('./1_intent');
const { designSystem } = require('./2_design');
const { generateSchemas } = require('./3_schema');
const { validateAndRepair } = require('./4_validate');
const { runSimulation } = require('./5_runtime');
const { v4: uuidv4 } = require('uuid');

const MAX_REPAIR_ATTEMPTS = parseInt(process.env.MAX_REPAIR_ATTEMPTS) || 3;

async function runPipeline(userPrompt, options = {}) {
  const startTime = Date.now();
  const runId = uuidv4();
  const stages = [];

  function stageWrap(name, fn) {
    return async (...args) => {
      const t = Date.now();
      try {
        const result = await fn(...args);
        stages.push({ stage: name, durationMs: Date.now() - t, status: 'ok' });
        return result;
      } catch (err) {
        stages.push({ stage: name, durationMs: Date.now() - t, status: 'error', error: err.message });
        throw err;
      }
    };
  }

  try {
    // Stage 1: Intent Extraction
    const intent = await stageWrap('1_intent_extraction', extractIntent)(userPrompt);

    // Stage 2: System Design
    const design = await stageWrap('2_system_design', designSystem)(intent);

    // Stage 3: Schema Generation (parallel)
    const { database, api, ui, auth } = await stageWrap('3_schema_generation', generateSchemas)(intent, design);

    // Assemble full config
    const config = {
      meta: {
        appName: design.appName || 'GeneratedApp',
        appType: design.appType || 'web',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        assumptions: intent.assumptions || []
      },
      intent,
      design: { modules: design.modules, dataFlow: design.dataFlow },
      database,
      api,
      ui,
      auth
    };

    // Normalize: ensure arrays are never missing
    for (const page of config.ui.pages || []) {
      if (!Array.isArray(page.components)) page.components = [];
      if (!Array.isArray(page.roles)) page.roles = ['user'];
    }
    for (const ep of config.api.endpoints || []) {
      if (!Array.isArray(ep.roles)) ep.roles = [];
    }

    // Stage 4: Validate + Repair
    const { config: repairedConfig, validationLog } = await stageWrap('4_validate_repair',
      (c) => validateAndRepair(c, MAX_REPAIR_ATTEMPTS)
    )(config);

    // Stage 5: Simulation
    const simulation = await stageWrap('5_runtime_simulation',
      (c) => Promise.resolve(runSimulation(c))
    )(repairedConfig);

    const totalMs = Date.now() - startTime;

    return {
      success: true,
      runId,
      prompt: userPrompt,
      config: repairedConfig,
      meta: {
        totalMs,
        stages,
        validationLog,
        simulation: {
          executable: simulation.executable,
          summary: simulation.summary,
          issues: simulation.issues
        },
        artifacts: simulation.artifacts,
        cost: estimateCost(stages)
      }
    };

  } catch (err) {
    return {
      success: false,
      runId,
      prompt: userPrompt,
      error: err.message,
      meta: { totalMs: Date.now() - startTime, stages }
    };
  }
}

function estimateCost(stages) {
  // Rough estimate: each LLM call ~1500 tokens in + ~2000 out
  // Stage 3 runs 4 parallel calls, others run 1 each
  const llmStages = { '1_intent_extraction': 1, '2_system_design': 1, '3_schema_generation': 4, '4_validate_repair': 2 };
  let totalCalls = 0;
  for (const stage of stages) {
    if (stage.status === 'ok' && llmStages[stage.stage]) totalCalls += llmStages[stage.stage];
  }
  // gpt-4o: $5/1M input, $15/1M output
  const inputTokens = totalCalls * 1500;
  const outputTokens = totalCalls * 2000;
  const cost = (inputTokens / 1e6) * 5 + (outputTokens / 1e6) * 15;
  return { estimatedUSD: parseFloat(cost.toFixed(4)), llmCalls: totalCalls };
}

module.exports = { runPipeline };
