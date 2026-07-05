import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { ProjectManager } from '../core/ProjectManager.js';
import { RBACEngine } from '../core/RBACEngine.js';
import { AuditLedger } from '../core/AuditLedger.js';

const TEST_DIR = path.resolve('./temp_epic9_enterprise_test');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 9 (ENTERPRISE FEATURES) INTEGRATION TESTS ===');

  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Initialize ProjectManager
  const pm = new ProjectManager(TEST_DIR);
  await pm.initializeProject();

  // Initialize RBACEngine
  const rbac = new RBACEngine(pm);

  // Initialize AuditLedger
  const audit = new AuditLedger(pm);

  // =========================================
  // RBAC ENGINE TESTS
  // =========================================
  console.log('\n--- RBAC Engine Tests ---');

  // Test 1: Default roles created
  console.log('\n[Test 1] Verifying default roles creation...');
  const roles = rbac.listRoles();
  assert.ok(roles.length >= 5, 'Should have at least 5 default roles.');
  const roleNames = roles.map(r => r.name);
  assert.ok(roleNames.includes('architect'), 'Should have architect role.');
  assert.ok(roleNames.includes('developer'), 'Should have developer role.');
  assert.ok(roleNames.includes('database-admin'), 'Should have database-admin role.');
  console.log('✔ Test 1 Passed.');

  // Test 2: Assign role to agent
  console.log('\n[Test 2] Verifying role assignment...');
  const assignment = rbac.assignRole('test-agent-1', 'developer');
  assert.strictEqual(assignment.role, 'developer', 'Agent should be assigned developer role.');
  console.log('✔ Test 2 Passed.');

  // Test 3: Check permission - allowed
  console.log('\n[Test 3] Verifying permission check - allowed...');
  const allowed = rbac.checkPermission('test-agent-1', 'write', 'src/core/test.js');
  assert.ok(allowed.allowed, 'Developer should be allowed to write to src/');
  console.log('✔ Test 3 Passed.');

  // Test 4: Check permission - denied
  console.log('\n[Test 4] Verifying permission check - denied...');
  const denied = rbac.checkPermission('test-agent-1', 'write', 'supabase/migrations/001.sql');
  assert.ok(!denied.allowed, 'Developer should be denied write to supabase/migrations/');
  console.log('✔ Test 4 Passed.');

  // Test 5: Check permission - sensitive file
  console.log('\n[Test 5] Verifying permission check - sensitive file...');
  const deniedEnv = rbac.checkPermission('test-agent-1', 'read', '.env');
  assert.ok(!deniedEnv.allowed, 'Developer should be denied access to .env');
  console.log('✔ Test 5 Passed.');

  // Test 6: Check permission - no role assigned
  console.log('\n[Test 6] Verifying permission check - no role...');
  const noRole = rbac.checkPermission('unknown-agent', 'write', 'src/test.js');
  assert.ok(!noRole.allowed, 'Unknown agent should be denied.');
  console.log('✔ Test 6 Passed.');

  // Test 7: Role without deny list
  console.log('\n[Test 7] Verifying role without deny list...');
  rbac.assignRole('test-agent-2', 'database-admin');
  const dbAllowed = rbac.checkPermission('test-agent-2', 'write', 'supabase/migrations/001.sql');
  assert.ok(dbAllowed.allowed, 'Database admin should be allowed to write to supabase/');
  console.log('✔ Test 7 Passed.');

  // Test 8: Custom role creation
  console.log('\n[Test 8] Verifying custom role creation...');
  rbac.createRole({
    name: 'custom-tester',
    description: 'Custom tester role',
    permissions: {
      read: ['src/**', 'tests/**'],
      write: ['tests/**'],
      deny: []
    }
  });
  const customRoles = rbac.listRoles();
  const customRole = customRoles.find(r => r.name === 'custom-tester');
  assert.ok(customRole, 'Custom role should be created.');
  assert.strictEqual(customRole.permissions.write.length, 1, 'Custom role should have write permission.');
  console.log('✔ Test 8 Passed.');

  // Test 9: Pattern matching - glob
  console.log('\n[Test 9] Verifying glob pattern matching...');
  rbac.assignRole('test-agent-3', 'architect');
  const archAllowed = rbac.checkPermission('test-agent-3', 'write', 'docs/architecture/design.md');
  assert.ok(archAllowed.allowed, 'Architect should be allowed to write to docs/architecture/');
  console.log('✔ Test 9 Passed.');

  // =========================================
  // AUDIT LEDGER TESTS
  // =========================================
  console.log('\n--- Audit Ledger Tests ---');

  // Test 10: Ledger initialization
  console.log('\n[Test 10] Verifying audit ledger initialization...');
  const stats = audit.getStats();
  assert.strictEqual(stats.totalEntries, 1, 'Should have genesis entry.');
  assert.ok(stats.integrity.valid, 'Ledger integrity should be valid.');
  console.log('✔ Test 10 Passed.');

  // Test 11: Log agent action
  console.log('\n[Test 11] Verifying agent action logging...');
  const entry = audit.logAgentAction('test-agent', 'CODE_COMPLETE', { file: 'test.js' });
  assert.ok(entry.hash, 'Entry should have hash.');
  assert.ok(entry.signature, 'Entry should have signature.');
  assert.strictEqual(entry.type, 'AGENT_ACTION', 'Entry type should be AGENT_ACTION.');
  assert.strictEqual(entry.payload.agentId, 'test-agent', 'Entry should contain agentId.');
  console.log('✔ Test 11 Passed.');

  // Test 12: Log file modification
  console.log('\n[Test 12] Verifying file modification logging...');
  const fileEntry = audit.logFileModification('test-agent', 'src/test.js', 'create');
  assert.strictEqual(fileEntry.payload.operation, 'create', 'Entry should contain operation.');
  assert.strictEqual(fileEntry.payload.filePath, 'src/test.js', 'Entry should contain filePath.');
  console.log('✔ Test 12 Passed.');

  // Test 13: Log system event
  console.log('\n[Test 13] Verifying system event logging...');
  const sysEntry = audit.logSystemEvent('PLUGIN_LOADED', { plugin: 'test-plugin' });
  assert.strictEqual(sysEntry.type, 'SYSTEM_EVENT', 'Entry type should be SYSTEM_EVENT.');
  assert.strictEqual(sysEntry.payload.eventType, 'PLUGIN_LOADED', 'Entry should contain eventType.');
  console.log('✔ Test 13 Passed.');

  // Test 14: Verify ledger integrity
  console.log('\n[Test 14] Verifying ledger integrity...');
  const integrity = audit.verifyIntegrity();
  assert.ok(integrity.valid, 'Ledger should have valid integrity.');
  console.log('✔ Test 14 Passed.');

  // Test 15: Get entries by agent
  console.log('\n[Test 15] Verifying get entries by agent...');
  const agentEntries = audit.getEntriesByAgent('test-agent');
  assert.ok(agentEntries.length >= 2, 'Should have at least 2 entries for test-agent.');
  console.log('✔ Test 15 Passed.');

  // Test 16: Get entries by type
  console.log('\n[Test 16] Verifying get entries by type...');
  const actionEntries = audit.getEntriesByType('AGENT_ACTION');
  assert.ok(actionEntries.length >= 2, 'Should have at least 2 agent action entries.');
  console.log('✔ Test 16 Passed.');

  // Test 17: Export ledger
  console.log('\n[Test 17] Verifying ledger export...');
  const exported = audit.exportLedger();
  assert.ok(exported.publicKey, 'Exported data should include public key.');
  assert.ok(exported.ledger, 'Exported data should include ledger.');
  assert.ok(exported.exportedAt, 'Exported data should include timestamp.');
  console.log('✔ Test 17 Passed.');

  // Test 18: Get audit stats
  console.log('\n[Test 18] Verifying audit statistics...');
  const fullStats = audit.getStats();
  assert.ok(fullStats.totalEntries > 1, 'Should have more than genesis entry.');
  assert.ok(fullStats.uniqueAgents >= 1, 'Should track unique agents.');
  assert.strictEqual(fullStats.integrity.valid, true, 'Integrity should still be valid.');
  console.log('✔ Test 18 Passed.');

  // Test 19: Hash chain verification
  console.log('\n[Test 19] Verifying hash chain integrity...');
  const entries = audit.getAllEntries();
  for (let i = 1; i < entries.length; i++) {
    const current = entries[i];
    const previous = entries[i - 1];
    assert.strictEqual(current.previousHash, previous.hash, 
      `Entry ${i} should reference previous entry's hash.`);
  }
  console.log('✔ Test 19 Passed.');

  // Test 20: Signature verification
  console.log('\n[Test 20] Verifying cryptographic signatures...');
  const signatureIntegrity = audit.verifyIntegrity();
  assert.ok(signatureIntegrity.valid, 'All signatures should be valid.');
  console.log('✔ Test 20 Passed.');

  // Cleanup
  cleanup();

  console.log('\n=== ALL EPIC 9 ENTERPRISE FEATURES TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('❌ TEST FAILURE:', err);
  cleanup();
  process.exit(1);
});
