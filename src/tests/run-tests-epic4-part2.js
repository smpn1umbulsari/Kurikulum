import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { MonitoringEngine } from '../core/MonitoringEngine.js';
import { startDashboardServer } from '../core/dashboard/server.js';

const tempDir = path.resolve('./temp_epic4_part2_test');

// Helper to clean up temp directory
function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 4 FEATURE 4.2 (MONITORING ENGINE) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1. Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // 2. Initialize MonitoringEngine
  console.log('\n[Test 1] Initializing MonitoringEngine and logging data...');
  const me = new MonitoringEngine(pm);

  // Log some mock actions
  me.logAgentAction('developer', 'Backend Lead', 'modify_file', 'success', 'Successfully modified user_auth.js');
  me.logAgentAction('qa', 'QA Architect', 'run_tests', 'failed', 'Lint issues in test runner');
  me.logAgentAction('architect', 'Software Architect', 'design_schema', 'pending', 'Drafting relational entities');

  // Track token usages for different models
  const cost1 = me.trackTokenUsage('developer', 'gemini-1.5-pro', 1000, 2000); // 1000 input, 2000 output
  // gemini-1.5-pro: input $3.5/M, output $10.5/M
  // 1000 * 0.0000035 = 0.0035
  // 2000 * 0.0000105 = 0.0210
  // Total expected cost1 = 0.0245
  assert.strictEqual(parseFloat(cost1.toFixed(6)), 0.0245);

  const cost2 = me.trackTokenUsage('qa', 'gemini-1.5-flash', 10000, 5000);
  // gemini-1.5-flash: input $0.075/M, output $0.30/M
  // 10000 * 0.000000075 = 0.00075
  // 5000 * 0.0000003 = 0.0015
  // Total expected cost2 = 0.00225
  assert.strictEqual(parseFloat(cost2.toFixed(6)), 0.00225);

  console.log('✔ Test 1 Passed.');

  // 3. Verify Report Compiles Correctly
  console.log('\n[Test 2] Verifying compiled analytics report...');
  const report = me.generateAnalyticsReport();

  assert.strictEqual(report.summary.totalActions, 3, 'Total actions should be 3.');
  assert.strictEqual(report.summary.successfulActions, 1, 'Successful actions should be 1.');
  assert.strictEqual(report.summary.failedActions, 1, 'Failed actions should be 1.');
  assert.strictEqual(report.summary.successRate, 33.33, 'Success rate should be 33.33%.');
  
  const expectedTotalCost = 0.0245 + 0.00225; // 0.02675
  assert.strictEqual(report.summary.totalCost, expectedTotalCost);
  assert.strictEqual(report.summary.totalTokens, 18000, 'Total tokens should be 18000.');
  assert.strictEqual(report.summary.totalPromptTokens, 11000, 'Total prompt tokens should be 11000.');
  assert.strictEqual(report.summary.totalCompletionTokens, 7000, 'Total completion tokens should be 7000.');
  
  // Verify token usage grouped by model exists
  assert.ok(report.tokenUsageByModel['gemini-1.5-pro'], 'Should group gemini-1.5-pro.');
  assert.ok(report.tokenUsageByModel['gemini-1.5-flash'], 'Should group gemini-1.5-flash.');
  assert.strictEqual(report.tokenUsageByModel['gemini-1.5-pro'].total, 3000);
  assert.strictEqual(report.tokenUsageByModel['gemini-1.5-flash'].total, 15000);

  console.log('✔ Test 2 Passed.');

  // 4. Verify Local Dashboard REST API
  console.log('\n[Test 3] Verifying dashboard HTTP server endpoints...');
  const port = 4001;
  const server = startDashboardServer(pm, port);

  try {
    // Test GET /api/stats
    const statsRes = await fetch(`http://localhost:${port}/api/stats`);
    assert.strictEqual(statsRes.status, 200, 'Stats endpoint should respond with 200.');
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.summary.totalActions, 3);
    assert.strictEqual(statsData.summary.totalTokens, 18000);

    // Test GET /api/logs
    const logsRes = await fetch(`http://localhost:${port}/api/logs`);
    assert.strictEqual(logsRes.status, 200, 'Logs endpoint should respond with 200.');
    const logsData = await logsRes.json();
    assert.strictEqual(logsData.length, 3, 'Should return exactly 3 action logs.');
    assert.strictEqual(logsData[0].agentId, 'architect', 'Newest log should be first.');

    // Test GET static HTML
    const htmlRes = await fetch(`http://localhost:${port}/`);
    assert.strictEqual(htmlRes.status, 200, 'Root endpoint should serve index.html.');
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('AETHER Monitoring Dashboard'), 'Should contain title.');

    console.log('✔ Test 3 Passed.');
  } finally {
    // Ensure server shuts down in all cases
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n=== ALL EPIC 4 FEATURE 4.2 TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .then(() => {
    setTimeout(() => {
      cleanup();
      process.exit(0);
    }, 200);
  })
  .catch(err => {
    console.error('❌ TEST FAILURE:', err);
    setTimeout(() => {
      cleanup();
      process.exit(1);
    }, 200);
  });
