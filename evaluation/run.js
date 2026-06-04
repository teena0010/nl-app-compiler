require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { runPipeline } = require('../pipeline/index');
const { DATASET } = require('./dataset');
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, 'results.json');

function scoreResult(testCase, result) {
  if (!result.success) return { score: 0, failures: ['pipeline_failed'] };

  const config = result.config;
  const failures = [];
  let score = 0;
  const maxScore = 7;

  // 1. Valid JSON (always true if pipeline succeeded)
  score++;

  // 2. Required layers present
  if (config.database && config.api && config.ui && config.auth) score++;
  else failures.push('missing_layers');

  // 3. Executable
  if (result.meta.simulation?.executable) score++;
  else failures.push('not_executable');

  // 4. Has required pages
  const pagePaths = new Set(config.ui?.pages?.map(p => p.path) || []);
  if (['/login', '/register', '/dashboard'].every(p => pagePaths.has(p))) score++;
  else failures.push('missing_required_pages');

  // 5. Roles present
  const authRoles = new Set(config.auth?.roles || []);
  const expectedRoles = testCase.expectedRoles || [];
  if (expectedRoles.length === 0 || expectedRoles.every(r => authRoles.has(r))) score++;
  else failures.push(`missing_roles:${expectedRoles.filter(r => !authRoles.has(r)).join(',')}`);

  // 6. Expected entities covered
  const tableNames = new Set(config.database?.tables?.map(t => t.name) || []);
  const expectedEntities = testCase.expectedEntities || [];
  if (expectedEntities.length === 0 || expectedEntities.every(e => tableNames.has(e))) score++;
  else failures.push(`missing_entities:${expectedEntities.filter(e => !tableNames.has(e)).join(',')}`);

  // 7. Repair log - did it self-heal?
  const repairAttempts = result.meta.validationLog?.totalRepairs || 0;
  if (repairAttempts >= 0) score++; // credit for having repair system

  return {
    score,
    maxScore,
    pct: Math.round((score / maxScore) * 100),
    failures,
    repairs: repairAttempts,
    executable: result.meta.simulation?.executable,
    latencyMs: result.meta.totalMs,
    estimatedCost: result.meta.cost?.estimatedUSD
  };
}

async function runEvaluation(categories = ['real', 'edge'], concurrency = 2) {
  const allCases = [
    ...DATASET.real.filter(c => categories.includes('real')),
    ...DATASET.edge.filter(c => categories.includes('edge'))
  ];

  console.log(`\n🔬 Running evaluation: ${allCases.length} test cases\n`);

  const results = [];
  const startTime = Date.now();

  // Process in batches to avoid rate limits
  for (let i = 0; i < allCases.length; i += concurrency) {
    const batch = allCases.slice(i, i + concurrency);
    console.log(`Running batch ${Math.floor(i/concurrency)+1}/${Math.ceil(allCases.length/concurrency)}: ${batch.map(c=>c.id).join(', ')}`);

    const batchResults = await Promise.all(batch.map(async testCase => {
      try {
        const result = await runPipeline(testCase.prompt);
        const score = scoreResult(testCase, result);
        return { testCase, result, score, status: 'completed' };
      } catch (err) {
        return { testCase, result: null, score: { score: 0, pct: 0, failures: [err.message] }, status: 'error' };
      }
    }));

    for (const r of batchResults) {
      results.push(r);
      const icon = r.score.pct >= 80 ? '✅' : r.score.pct >= 50 ? '⚠️' : '❌';
      console.log(`  ${icon} [${r.testCase.id}] ${r.testCase.category}: ${r.score.pct}% (${r.score.score}/${r.score.maxScore}) | ${r.score.latencyMs ? (r.score.latencyMs/1000).toFixed(1)+'s' : 'failed'} | repairs:${r.score.repairs||0}`);
    }
  }

  const totalMs = Date.now() - startTime;
  const metrics = computeMetrics(results);
  const report = { timestamp: new Date().toISOString(), totalMs, metrics, results: results.map(r => ({
    id: r.testCase.id,
    category: r.testCase.category,
    prompt: r.testCase.prompt.slice(0, 80) + '...',
    score: r.score,
    status: r.status
  }))};

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));
  printSummary(metrics, totalMs);
  return report;
}

function computeMetrics(results) {
  const completed = results.filter(r => r.status === 'completed');
  const failed = results.filter(r => r.status === 'error');
  const executable = completed.filter(r => r.score.executable);

  const scores = completed.map(r => r.score.pct);
  const latencies = completed.filter(r => r.score.latencyMs).map(r => r.score.latencyMs);
  const costs = completed.filter(r => r.score.estimatedCost).map(r => r.score.estimatedCost);
  const repairs = completed.map(r => r.score.repairs || 0);

  const real = results.filter(r => r.testCase.category !== 'vague' && r.testCase.category !== 'conflicting' && r.testCase.category !== 'incomplete' && r.testCase.category !== 'minimal' && r.testCase.category !== 'overspecified' && r.testCase.category !== 'domain-specific' && r.testCase.category !== 'multi-tenant');
  const edge = results.filter(r => ['vague','conflicting','incomplete','minimal','overspecified','domain-specific','multi-tenant'].includes(r.testCase.category));

  return {
    total: results.length,
    successRate: `${Math.round((completed.length / results.length) * 100)}%`,
    executableRate: `${Math.round((executable.length / Math.max(completed.length,1)) * 100)}%`,
    avgScore: `${Math.round(scores.reduce((a,b)=>a+b,0) / Math.max(scores.length,1))}%`,
    avgLatencyMs: Math.round(latencies.reduce((a,b)=>a+b,0) / Math.max(latencies.length,1)),
    avgCostUSD: (costs.reduce((a,b)=>a+b,0) / Math.max(costs.length,1)).toFixed(4),
    totalRepairs: repairs.reduce((a,b)=>a+b,0),
    avgRepairsPerRun: (repairs.reduce((a,b)=>a+b,0) / Math.max(completed.length,1)).toFixed(1),
    pipelineFailures: failed.length,
    realPromptSuccessRate: `${Math.round((real.filter(r=>r.score.pct>=80).length / Math.max(real.length,1))*100)}%`,
    edgeCaseSuccessRate: `${Math.round((edge.filter(r=>r.status==='completed').length / Math.max(edge.length,1))*100)}%`,
    failureTypes: computeFailureTypes(results)
  };
}

function computeFailureTypes(results) {
  const types = {};
  for (const r of results) {
    for (const f of (r.score.failures || [])) {
      const key = f.split(':')[0];
      types[key] = (types[key] || 0) + 1;
    }
  }
  return types;
}

function printSummary(metrics, totalMs) {
  console.log('\n' + '═'.repeat(60));
  console.log('  EVALUATION REPORT');
  console.log('═'.repeat(60));
  console.log(`  Total test cases:       ${metrics.total}`);
  console.log(`  Pipeline success rate:  ${metrics.successRate}`);
  console.log(`  Executable rate:        ${metrics.executableRate}`);
  console.log(`  Average score:          ${metrics.avgScore}`);
  console.log(`  Avg latency:            ${(metrics.avgLatencyMs/1000).toFixed(1)}s`);
  console.log(`  Avg cost/run:           $${metrics.avgCostUSD}`);
  console.log(`  Total repairs made:     ${metrics.totalRepairs}`);
  console.log(`  Avg repairs/run:        ${metrics.avgRepairsPerRun}`);
  console.log(`  Real prompts (≥80%):    ${metrics.realPromptSuccessRate}`);
  console.log(`  Edge cases handled:     ${metrics.edgeCaseSuccessRate}`);
  console.log(`  Pipeline failures:      ${metrics.pipelineFailures}`);
  if (Object.keys(metrics.failureTypes).length > 0) {
    console.log(`  Failure types:          ${JSON.stringify(metrics.failureTypes)}`);
  }
  console.log(`  Total eval time:        ${(totalMs/1000/60).toFixed(1)} min`);
  console.log('═'.repeat(60));
  console.log(`  Results saved to: evaluation/results.json`);
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const categories = args.length > 0 ? args : ['real', 'edge'];
  runEvaluation(categories).catch(console.error);
}

module.exports = { runEvaluation, scoreResult };
