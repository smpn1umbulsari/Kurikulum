/**
 * AETHER Platform QA Test Suite - Phase 9
 * Tests for Enterprise features (RBAC, Audit, TeamSync)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed++;
    results.errors.push({ name, error: err.message });
    console.log(`❌ ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('\n📋 PHASE 9: Enterprise Features Tests\n');

// ============================================
// RBAC Engine Tests
// ============================================
console.log('🔐 RBAC Engine Tests\n');

test('RBACEngine can be imported', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  assert(typeof RBACEngine === 'function', 'RBACEngine should be a class');
});

test('RBACEngine has createRole method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.createRole === 'function', 'createRole should exist');
});

test('RBACEngine has hasPermission method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.hasPermission === 'function', 'hasPermission should exist');
});

test('RBACEngine has can method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.can === 'function', 'can should exist');
});

test('RBACEngine has validateAction method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.validateAction === 'function', 'validateAction should exist');
});

test('RBACEngine has setUser method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.setUser === 'function', 'setUser should exist');
});

test('RBACEngine has listRoles method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  const roles = rbac.listRoles();
  assert(Array.isArray(roles), 'listRoles should return array');
  assert(roles.length >= 4, 'Should have default roles (admin, developer, reviewer, viewer)');
});

test('RBACEngine has default roles configured', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  const roles = rbac.listRoles();
  const roleIds = roles.map(r => r.id);
  assert(roleIds.includes('admin'), 'Should have admin role');
  assert(roleIds.includes('developer'), 'Should have developer role');
  assert(roleIds.includes('viewer'), 'Should have viewer role');
});

test('RBACEngine has getStats method', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  const stats = rbac.getStats();
  assert(typeof stats === 'object', 'getStats should return object');
  assert('totalRoles' in stats, 'Stats should have totalRoles');
  assert('totalUsers' in stats, 'Stats should have totalUsers');
});

// ============================================
// Audit Ledger Tests
// ============================================
console.log('\n📒 Audit Ledger Tests\n');

test('AuditLedger can be imported', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  assert(typeof AuditLedger === 'function', 'AuditLedger should be a class');
});

test('AuditLedger has log method', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(typeof ledger.log === 'function', 'log should exist');
});

test('AuditLedger has verifyChain method', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(typeof ledger.verifyChain === 'function', 'verifyChain should exist');
});

test('AuditLedger has query method', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(typeof ledger.query === 'function', 'query should exist');
});

test('AuditLedger has getStats method', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  const stats = ledger.getStats();
  assert(typeof stats === 'object', 'getStats should return object');
  assert('totalEntries' in stats, 'Stats should have totalEntries');
  assert('hashAlgorithm' in stats, 'Stats should have hashAlgorithm');
});

test('AuditLedger has export method', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(typeof ledger.export === 'function', 'export should exist');
});

test('AuditLedger has genesis block', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(ledger.chain.length > 0, 'Chain should have genesis block');
  assert(ledger.chain[0].type === 'genesis', 'First entry should be genesis');
});

test('AuditLedger can log events', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  const entry = ledger.log({
    type: 'test:event',
    data: { message: 'Test' }
  });
  assert(entry && typeof entry === 'object', 'log should return entry');
  assert(entry.hash, 'Entry should have hash');
  assert(entry.index > 0, 'Entry index should be > 0');
});

test('AuditLedger chain integrity check', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  const result = ledger.verifyChain();
  assert(result.valid === true, 'Chain should be valid');
  assert(result.failed.length === 0, 'Should have no failures');
});

// ============================================
// Team Sync Server Tests
// ============================================
console.log('\n👥 Team Sync Server Tests\n');

test('TeamSyncServer can be imported', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  assert(typeof TeamSyncServer === 'function', 'TeamSyncServer should be a class');
});

test('TeamSyncServer has start method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.start === 'function', 'start should exist');
});

test('TeamSyncServer has stop method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.stop === 'function', 'stop should exist');
});

test('TeamSyncServer has createTeam method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.createTeam === 'function', 'createTeam should exist');
});

test('TeamSyncServer has joinTeam method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.joinTeam === 'function', 'joinTeam should exist');
});

test('TeamSyncServer has leaveTeam method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.leaveTeam === 'function', 'leaveTeam should exist');
});

test('TeamSyncServer has updateContext method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.updateContext === 'function', 'updateContext should exist');
});

test('TeamSyncServer has getStats method', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  const stats = server.getStats();
  assert(typeof stats === 'object', 'getStats should return object');
  assert('teams' in stats, 'Stats should have teams');
  assert('totalMembers' in stats, 'Stats should have totalMembers');
});

test('TeamSyncServer can create team programmatically', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  const team = server.createTeam({
    name: 'Test Team',
    userId: 'test-user'
  });
  assert(team && typeof team === 'object', 'createTeam should return team');
  assert(team.name === 'Test Team', 'Team should have correct name');
  assert(team.members.includes('test-user'), 'Creator should be in members');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log('PHASE 9 QA TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);

if (results.errors.length > 0) {
  console.log('\nFailed Tests:');
  results.errors.forEach(e => {
    console.log(`  - ${e.name}: ${e.error}`);
  });
}

console.log('\n' + '='.repeat(50));
if (results.failed === 0) {
  console.log('🎉 ALL PHASE 9 TESTS PASSED!');
} else {
  console.log(`⚠️  ${results.failed} test(s) failed`);
}
console.log('='.repeat(50) + '\n');

process.exit(results.failed > 0 ? 1 : 0);
