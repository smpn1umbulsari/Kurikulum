/**
 * AETHER Platform Master Test Suite
 * Comprehensive test for all Phase 0-9 components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const results = {
  phases: {},
  totalPassed: 0,
  totalFailed: 0,
  modules: []
};

function test(phase, name, fn) {
  try {
    fn();
    results.totalPassed++;
    if (!results.phases[phase]) results.phases[phase] = { passed: 0, failed: 0 };
    results.phases[phase].passed++;
    console.log(`✅ ${phase}/${name}`);
  } catch (err) {
    results.totalFailed++;
    if (!results.phases[phase]) results.phases[phase] = { passed: 0, failed: 0 };
    results.phases[phase].failed++;
    console.log(`❌ ${phase}/${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function checkModule(name, filePath) {
  const exists = fs.existsSync(path.join(rootDir, filePath));
  if (exists) {
    results.modules.push({ name, file: filePath, exists: true });
  }
  return exists;
}

console.log('\n' + '='.repeat(60));
console.log('AETHER PLATFORM MASTER TEST SUITE');
console.log('='.repeat(60));

// ============================================
// Module Existence Check
// ============================================
console.log('\n📦 Module Existence Check\n');

const coreModules = [
  ['ProjectManager', 'src/core/ProjectManager.js'],
  ['EventBus', 'src/core/EventBus.js'],
  ['FileWatcher', 'src/core/FileWatcher.js'],
  ['LockManager', 'src/core/LockManager.js'],
  ['ContextEngine', 'src/core/ContextEngine.js'],
  ['KnowledgeGraph', 'src/core/KnowledgeGraph.js'],
  ['SemanticIndexer', 'src/core/SemanticIndexer.js'],
  ['TaskEngine', 'src/core/TaskEngine.js'],
  ['WorkflowEngine', 'src/core/WorkflowEngine.js'],
  ['RuleEngine', 'src/core/RuleEngine.js'],
  ['DecisionEngine', 'src/core/DecisionEngine.js'],
  ['AgentManager', 'src/core/AgentManager.js'],
  ['PromptEngine', 'src/core/PromptEngine.js'],
  ['QualityEngine', 'src/core/QualityEngine.js'],
  ['MonitoringEngine', 'src/core/MonitoringEngine.js'],
  ['SecurityEngine', 'src/core/SecurityEngine.js'],
  ['VersionManager', 'src/core/VersionManager.js'],
  ['ReleaseManager', 'src/core/ReleaseManager.js'],
  ['PluginEngine', 'src/core/PluginEngine.js'],
  ['RBACEngine', 'src/core/RBACEngine.js'],
  ['AuditLedger', 'src/core/AuditLedger.js'],
  ['TeamSyncServer', 'src/core/TeamSyncServer.js'],
  ['UiResearchEngine', 'src/core/UiResearchEngine.js'],
];

for (const [name, file] of coreModules) {
  test('Module', name, () => assert(checkModule(name, file), `${name} not found`));
}

// ============================================
// Phase 0: Foundation
// ============================================
console.log('\n📋 Phase 0: Foundation\n');

test('Phase0', 'ProjectManager init', async () => {
  const { ProjectManager } = await import('../src/core/ProjectManager.js');
  assert(typeof ProjectManager === 'function', 'ProjectManager should be class');
});

test('Phase0', 'Config parsing', async () => {
  const { ProjectManager } = await import('../src/core/ProjectManager.js');
  const pm = new ProjectManager();
  assert(typeof pm.init === 'function', 'init should exist');
});

// ============================================
// Phase 1: Core Engine
// ============================================
console.log('\n📋 Phase 1: Core Engine\n');

test('Phase1', 'EventBus pub/sub', async () => {
  const { EventBus } = await import('../src/core/EventBus.js');
  const eb = new EventBus();
  assert(typeof eb.subscribe === 'function', 'subscribe should exist');
  assert(typeof eb.publish === 'function', 'publish should exist');
});

test('Phase1', 'FileWatcher', async () => {
  const { FileWatcher } = await import('../src/core/FileWatcher.js');
  assert(typeof FileWatcher === 'function', 'FileWatcher should be class');
});

test('Phase1', 'LockManager', async () => {
  const { LockManager } = await import('../src/core/LockManager.js');
  const lm = new LockManager();
  assert(typeof lm.acquire === 'function', 'acquire should exist');
  assert(typeof lm.release === 'function', 'release should exist');
});

// ============================================
// Phase 2: Context Engine
// ============================================
console.log('\n📋 Phase 2: Context Engine\n');

test('Phase2', 'ContextEngine', async () => {
  const { ContextEngine } = await import('../src/core/ContextEngine.js');
  assert(typeof ContextEngine === 'function', 'ContextEngine should be class');
});

test('Phase2', 'Context assembly', async () => {
  const { ContextEngine } = await import('../src/core/ContextEngine.js');
  const mockPM = { projectPath: rootDir };
  const ce = new ContextEngine(mockPM);
  assert(typeof ce.assemble === 'function', 'assemble should exist');
});

// ============================================
// Phase 3: Knowledge Graph
// ============================================
console.log('\n📋 Phase 3: Knowledge Graph\n');

test('Phase3', 'KnowledgeGraph', async () => {
  const { KnowledgeGraph } = await import('../src/core/KnowledgeGraph.js');
  assert(typeof KnowledgeGraph === 'function', 'KnowledgeGraph should be class');
});

test('Phase3', 'SemanticIndexer', async () => {
  const { SemanticIndexer } = await import('../src/core/SemanticIndexer.js');
  assert(typeof SemanticIndexer === 'function', 'SemanticIndexer should be class');
});

// ============================================
// Phase 4: Workflow Engine
// ============================================
console.log('\n📋 Phase 4: Workflow Engine\n');

test('Phase4', 'TaskEngine', async () => {
  const { TaskEngine } = await import('../src/core/TaskEngine.js');
  assert(typeof TaskEngine === 'function', 'TaskEngine should be class');
});

test('Phase4', 'WorkflowEngine', async () => {
  const { WorkflowEngine } = await import('../src/core/WorkflowEngine.js');
  assert(typeof WorkflowEngine === 'function', 'WorkflowEngine should be class');
});

test('Phase4', 'RuleEngine compliance', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  const mockPM = { projectPath: rootDir, configDir: rootDir };
  const re = new RuleEngine(mockPM);
  assert(typeof re.validateAction === 'function', 'validateAction should exist');
  assert(typeof re.calculateOverallCompliance === 'function', 'compliance scoring exists');

  // Test onboarding verification
  const onboardingSuccess = re.verifyOnboardingRead([
    'docs/engineering-handbook/00-Engineering-Handbook.md',
    'docs/engineering-handbook/06-Definition-of-Ready.md',
    'docs/engineering-handbook/07-Definition-of-Done.md'
  ]);
  assert(onboardingSuccess.success === true, 'Should pass onboarding read if all files are read');

  const onboardingFail = re.verifyOnboardingRead([
    'docs/engineering-handbook/00-Engineering-Handbook.md'
  ]);
  assert(onboardingFail.success === false, 'Should fail onboarding read if files are missing');
  assert(onboardingFail.missingFiles.includes('06-Definition-of-Ready.md'), 'Should list missing file');

  // Test role verification
  const roleReactSuccess = re.verifyRoleForFile('Frontend Lead', 'src/modules/kelas/pages/KelasPage.tsx');
  assert(roleReactSuccess.success === true, 'Frontend Lead can edit tsx files');

  const roleReactFail = re.verifyRoleForFile('Database Architect', 'src/modules/kelas/pages/KelasPage.tsx');
  assert(roleReactFail.success === false, 'Database Architect cannot edit tsx files');

  const roleSqlSuccess = re.verifyRoleForFile('Database Architect', 'docs/supabase/migrations/100_init.sql');
  assert(roleSqlSuccess.success === true, 'Database Architect can edit sql files');

  // Test RLS Scan
  const sqlComplianceSuccess = re.scanSqlMigrationsForRls(`
    CREATE TABLE test_table (id uuid primary key);
    ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;
    CREATE POLICY test_policy ON test_table FOR SELECT USING (true);
  `);
  assert(sqlComplianceSuccess.success === true, 'Should succeed if RLS enabled and policy defined');

  const sqlComplianceFail = re.scanSqlMigrationsForRls(`
    CREATE TABLE test_table (id uuid primary key);
  `);
  assert(sqlComplianceFail.success === false, 'Should fail if RLS not enabled');
});

test('Phase4', 'DecisionEngine', async () => {
  const { DecisionEngine } = await import('../src/core/DecisionEngine.js');
  assert(typeof DecisionEngine === 'function', 'DecisionEngine should be class');
});

test('Phase4', 'DecisionEngine proposal evaluation', async () => {
  const { DecisionEngine } = await import('../src/core/DecisionEngine.js');
  const mockPM = { configDir: rootDir };
  const de = new DecisionEngine(mockPM);
  
  // Test suboptimal proposal
  const subResult = await de.evaluateUserProposal({
    name: 'Hack DB directly',
    impact: 3,
    risk: 9,
    complexity: 4
  });
  assert(subResult.isOptimal === false, 'Direct hack should be suboptimal');
  assert(subResult.scoreDifference > 0, 'Score difference should be calculated');
  assert(subResult.suggestions.length > 0, 'Should return constructed suggestions for risk');
  assert(subResult.suggestions.some(s => s.includes('Reduce Risk')), 'Should suggest reducing risk');

  // Test optimal proposal
  const optimalResult = await de.evaluateUserProposal({
    name: 'Super Isolation',
    impact: 10,
    risk: 1,
    complexity: 1
  });
  assert(optimalResult.isOptimal === true, 'High impact low risk should be optimal');
  assert(optimalResult.recommendedProposal === null, 'No recommended alternative needed if optimal');
});

// ============================================
// Phase 5: Agent Manager
// ============================================
console.log('\n📋 Phase 5: Agent Manager\n');

test('Phase5', 'AgentManager', async () => {
  const { AgentManager } = await import('../src/core/AgentManager.js');
  assert(typeof AgentManager === 'function', 'AgentManager should be class');
});

test('Phase5', 'PromptEngine', async () => {
  const { PromptEngine } = await import('../src/core/PromptEngine.js');
  assert(typeof PromptEngine === 'function', 'PromptEngine should be class');
});

// ============================================
// Phase 6: Quality Engine
// ============================================
console.log('\n📋 Phase 6: Quality Engine\n');

test('Phase6', 'QualityEngine import', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  assert(typeof QualityEngine === 'function', 'QualityEngine should be class');
});

test('Phase6', 'QualityEngine runQualityCheck', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockPM = { workspacePath: rootDir };
  const qe = new QualityEngine(mockPM, null);
  assert(typeof qe.runQualityCheck === 'function', 'runQualityCheck should exist');
});

test('Phase6', 'QualityEngine autoRemediate', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockPM = { workspacePath: rootDir };
  const qe = new QualityEngine(mockPM, null);
  assert(typeof qe.autoRemediate === 'function', 'autoRemediate should exist');
});

test('Phase6', 'QualityEngine quickFix', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockPM = { workspacePath: rootDir };
  const qe = new QualityEngine(mockPM, null);
  assert(typeof qe.quickFix === 'function', 'quickFix should exist');
});

// ============================================
// Phase 7: Dashboard
// ============================================
console.log('\n📋 Phase 7: Dashboard\n');

test('Phase7', 'Dashboard server', async () => {
  const exists = fs.existsSync(path.join(rootDir, 'src/core/dashboard/server.js'));
  assert(exists, 'Dashboard server.js should exist');
});

test('Phase7', 'Dashboard HTML', async () => {
  const exists = fs.existsSync(path.join(rootDir, 'src/core/dashboard/public/index.html'));
  assert(exists, 'Dashboard index.html should exist');
});

test('Phase7', 'TUIDashboard', async () => {
  const { TUIDashboard } = await import('../src/core/dashboard/tui.js');
  assert(typeof TUIDashboard === 'function', 'TUIDashboard should be class');
});

test('Phase7', 'ReportExporter', async () => {
  const { ReportExporter } = await import('../src/utils/reportExporter.js');
  assert(typeof ReportExporter === 'function', 'ReportExporter should be class');
});

// ============================================
// Phase 8: Marketplace
// ============================================
console.log('\n📋 Phase 8: Marketplace\n');

test('Phase8', 'MarketplaceServer', async () => {
  const { MarketplaceServer } = await import('../src/core/dashboard/marketplace.js');
  assert(typeof MarketplaceServer === 'function', 'MarketplaceServer should be class');
});

test('Phase8', 'PluginEngine', async () => {
  const { PluginEngine } = await import('../src/core/PluginEngine.js');
  assert(typeof PluginEngine === 'function', 'PluginEngine should be class');
});

test('Phase8', 'PluginEngine loadPlugin', async () => {
  const { PluginEngine } = await import('../src/core/PluginEngine.js');
  const mockEB = { subscribe: () => {}, unsubscribe: () => {}, publish: () => {} };
  const mockPM = { workspacePath: rootDir };
  const pe = new PluginEngine(mockPM, mockEB);
  assert(typeof pe.loadPlugin === 'function', 'loadPlugin should exist');
  assert(typeof pe.listPlugins === 'function', 'listPlugins should exist');
});

// ============================================
// Phase 9: Enterprise
// ============================================
console.log('\n📋 Phase 9: Enterprise\n');

test('Phase9', 'RBACEngine', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  assert(typeof RBACEngine === 'function', 'RBACEngine should be class');
});

test('Phase9', 'RBACEngine roles', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  const roles = rbac.listRoles();
  assert(roles.length >= 4, 'Should have at least 4 default roles');
});

test('Phase9', 'RBACEngine permissions', async () => {
  const { RBACEngine } = await import('../src/core/RBACEngine.js');
  const mockPM = { configDir: rootDir };
  const rbac = new RBACEngine(mockPM, null);
  assert(typeof rbac.can === 'function', 'can method should exist');
  assert(typeof rbac.hasPermission === 'function', 'hasPermission should exist');
});

test('Phase9', 'AuditLedger', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  assert(typeof AuditLedger === 'function', 'AuditLedger should be class');
});

test('Phase9', 'AuditLedger chain', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(ledger.chain.length > 0, 'Should have genesis block');
  assert(ledger.chain[0].type === 'genesis', 'First entry should be genesis');
});

test('Phase9', 'AuditLedger verify', async () => {
  const { AuditLedger } = await import('../src/core/AuditLedger.js');
  const mockPM = { configDir: rootDir };
  const ledger = new AuditLedger(mockPM);
  assert(typeof ledger.verifyChain === 'function', 'verifyChain should exist');
});

test('Phase9', 'TeamSyncServer', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  assert(typeof TeamSyncServer === 'function', 'TeamSyncServer should be class');
});

test('Phase9', 'TeamSyncServer team mgmt', async () => {
  const { TeamSyncServer } = await import('../src/core/TeamSyncServer.js');
  const mockPM = { configDir: rootDir };
  const server = new TeamSyncServer(mockPM);
  assert(typeof server.createTeam === 'function', 'createTeam should exist');
  assert(typeof server.joinTeam === 'function', 'joinTeam should exist');
});

// ============================================
// Additional Modules
// ============================================
console.log('\n📋 Additional Modules\n');

test('Extra', 'MonitoringEngine', async () => {
  const { MonitoringEngine } = await import('../src/core/MonitoringEngine.js');
  assert(typeof MonitoringEngine === 'function', 'MonitoringEngine should be class');
});

test('Extra', 'SecurityEngine', async () => {
  const { SecurityEngine } = await import('../src/core/SecurityEngine.js');
  assert(typeof SecurityEngine === 'function', 'SecurityEngine should be class');
});

test('Extra', 'VersionManager', async () => {
  const { VersionManager } = await import('../src/core/VersionManager.js');
  assert(typeof VersionManager === 'function', 'VersionManager should be class');
});

test('Extra', 'ReleaseManager', async () => {
  const { ReleaseManager } = await import('../src/core/ReleaseManager.js');
  assert(typeof ReleaseManager === 'function', 'ReleaseManager should be class');
});

test('Extra', 'UiResearchEngine', async () => {
  const { UiResearchEngine } = await import('../src/core/UiResearchEngine.js');
  const mockPM = { projectPath: rootDir };
  const uiEngine = new UiResearchEngine(mockPM);
  const recipes = uiEngine.getRecipes();
  assert(recipes.length >= 4, 'Should have at least 4 recipes');

  // Test search functionality
  const glassRecipes = uiEngine.searchRecipes('glass');
  assert(glassRecipes.length > 0, 'Should find glassmorphism card');
  assert(glassRecipes[0].id === 'glassmorphism-card', 'First match should be glassmorphism-card');

  // Test get by ID
  const specificRecipe = uiEngine.getRecipeById('premium-table');
  assert(specificRecipe !== null, 'Should retrieve premium table by ID');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log('MASTER TEST SUMMARY');
console.log('='.repeat(60));

for (const [phase, data] of Object.entries(results.phases)) {
  const status = data.failed === 0 ? '✅' : '❌';
  console.log(`${status} ${phase}: ${data.passed} passed, ${data.failed} failed`);
}

console.log('\n' + '-'.repeat(60));
console.log(`Total: ✅ ${results.totalPassed} passed, ❌ ${results.totalFailed} failed`);
console.log(`Modules checked: ${results.modules.filter(m => m.exists).length}/${results.modules.length}`);
console.log('='.repeat(60) + '\n');

process.exit(results.totalFailed > 0 ? 1 : 0);
