import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { QualityEngine } from '../core/QualityEngine.js';

const tempDir = path.resolve('./temp_epic4_test');

// Helper to clean up temp directory
function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 4 (QUALITY ENGINE) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // -------------------------------------------------------------
  // Test Case 1: Success Scenario (Both Lint & Test Pass)
  // -------------------------------------------------------------
  console.log('\n[Test 1] Verifying quality check success scenario...');
  
  await pm.updateProjectConfig({
    testCommand: 'node -e "console.log(\'Tests passed successfully.\'); process.exit(0)"',
    lintCommand: 'node -e "console.log(\'Lint clean.\'); process.exit(0)"'
  });

  const qe = new QualityEngine(pm);
  const report1 = await qe.runQualityCheck('task-1');

  assert.strictEqual(report1.success, true, 'Report overall success should be true.');
  assert.strictEqual(report1.lintPassed, true, 'LintPassed should be true.');
  assert.strictEqual(report1.testsPassed, true, 'TestsPassed should be true.');
  assert.strictEqual(report1.errors.length, 0, 'No errors should be recorded.');
  console.log('✔ Test 1 Passed.');

  // -------------------------------------------------------------
  // Test Case 2: Lint Failure Scenario
  // -------------------------------------------------------------
  console.log('\n[Test 2] Verifying lint failure scenario...');
  
  await pm.updateProjectConfig({
    testCommand: 'node -e "console.log(\'Tests passed successfully.\'); process.exit(0)"',
    lintCommand: 'node -e "console.error(\'error: expected semicolon on line 42\'); process.exit(1)"'
  });

  const report2 = await qe.runQualityCheck('task-2');

  assert.strictEqual(report2.success, false, 'Report overall success should be false.');
  assert.strictEqual(report2.lintPassed, false, 'LintPassed should be false.');
  assert.strictEqual(report2.testsPassed, true, 'TestsPassed should be true.');
  assert.strictEqual(report2.errors.length, 1, 'Exactly one error should be recorded.');
  assert.strictEqual(report2.errors[0].type, 'lint', 'Error type should be lint.');
  assert.ok(report2.errors[0].message.includes('error: expected semicolon'), 'Error message should capture stdout/stderr.');
  console.log('✔ Test 2 Passed.');

  // -------------------------------------------------------------
  // Test Case 3: Test Failure Scenario
  // -------------------------------------------------------------
  console.log('\n[Test 3] Verifying test failure scenario...');
  
  await pm.updateProjectConfig({
    testCommand: 'node -e "console.error(\'FAIL: AssertionError: Expected 1 to be 2\'); process.exit(1)"',
    lintCommand: 'node -e "console.log(\'Lint clean.\'); process.exit(0)"'
  });

  const report3 = await qe.runQualityCheck('task-3');

  assert.strictEqual(report3.success, false, 'Report overall success should be false.');
  assert.strictEqual(report3.lintPassed, true, 'LintPassed should be true.');
  assert.strictEqual(report3.testsPassed, false, 'TestsPassed should be false.');
  assert.strictEqual(report3.errors.length, 1, 'Exactly one error should be recorded.');
  assert.strictEqual(report3.errors[0].type, 'test', 'Error type should be test.');
  assert.ok(report3.errors[0].message.includes('AssertionError: Expected 1 to be 2'), 'Error message should capture stdout/stderr.');
  console.log('✔ Test 3 Passed.');

  // -------------------------------------------------------------
  // Test Case 4: Auto-Remediation Loop
  // -------------------------------------------------------------
  console.log('\n[Test 4] Verifying auto-remediation loop...');
  
  // Set initial failing config
  await pm.updateProjectConfig({
    testCommand: 'node -e "console.error(\'FAIL: failing unit test\'); process.exit(1)"',
    lintCommand: 'node -e "console.log(\'Lint clean.\'); process.exit(0)"'
  });

  // Construct a MockAgentManager to change config to success upon invocation
  const mockAgentManager = {
    statusMap: new Map(),
    setAgentStatus(agentId, status) {
      this.statusMap.set(agentId, status);
    },
    executeAgentTask: async (agentId, prompt, context) => {
      console.log(`    [Mock Agent] fixing: "${prompt.substring(0, 40)}..."`);
      
      // Update config so subsequent run succeeds
      await pm.updateProjectConfig({
        testCommand: 'node -e "console.log(\'Tests passed successfully.\'); process.exit(0)"',
        lintCommand: 'node -e "console.log(\'Lint clean.\'); process.exit(0)"'
      });
      return "Fixed!";
    }
  };

  const qeRemediation = new QualityEngine(pm, mockAgentManager);
  
  // Run initial check (fails)
  const initialReport = await qeRemediation.runQualityCheck('task-remediate');
  assert.strictEqual(initialReport.success, false, 'Initial run should fail.');

  // Run autoRemediate
  const remediationResult = await qeRemediation.autoRemediate(
    'developer',
    'Write sum function',
    'context data',
    initialReport,
    3
  );

  assert.strictEqual(remediationResult.success, true, 'Remediation should ultimately succeed.');
  assert.strictEqual(remediationResult.attempts, 1, 'Remediation should take 1 attempt.');
  assert.strictEqual(remediationResult.finalReport.success, true, 'Final report status should be success.');
  console.log('✔ Test 4 Passed.');

  console.log('\n=== ALL EPIC 4 TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ TEST FAILURE:', err);
    cleanup();
    process.exit(1);
  });
