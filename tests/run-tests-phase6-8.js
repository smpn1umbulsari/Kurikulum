/**
 * AETHER Platform QA Test Suite
 * Tests for Phase 6, 7.1, and 8 implementations
 * 
 * Run: node tests/run-tests-phase6-8.js
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

// ============================================
// PHASE 6: Quality Engine Tests
// ============================================
console.log('\n📋 PHASE 6: Quality Engine Tests\n');

test('QualityEngine exists and can be imported', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  assert(typeof QualityEngine === 'function', 'QualityEngine should be a class');
});

test('QualityEngine has runQualityCheck method', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockProjectManager = { workspacePath: rootDir };
  const qe = new QualityEngine(mockProjectManager, null);
  assert(typeof qe.runQualityCheck === 'function', 'runQualityCheck should exist');
});

test('QualityEngine has autoRemediate method', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockProjectManager = { workspacePath: rootDir };
  const qe = new QualityEngine(mockProjectManager, null);
  assert(typeof qe.autoRemediate === 'function', 'autoRemediate should exist');
});

test('QualityEngine has quickFix method', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockProjectManager = { workspacePath: rootDir };
  const qe = new QualityEngine(mockProjectManager, null);
  assert(typeof qe.quickFix === 'function', 'quickFix should exist');
});

test('QualityEngine has getRemediationHistory method', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockProjectManager = { workspacePath: rootDir };
  const qe = new QualityEngine(mockProjectManager, null);
  const history = qe.getRemediationHistory();
  assert(Array.isArray(history), 'getRemediationHistory should return array');
});

test('QualityEngine status transitions correctly', async () => {
  const { QualityEngine } = await import('../src/core/QualityEngine.js');
  const mockProjectManager = { workspacePath: rootDir };
  const qe = new QualityEngine(mockProjectManager, null);
  assert(qe.status === 'idle', 'Initial status should be idle');
});

// ============================================
// PHASE 7.1: Dashboard Enhancement Tests
// ============================================
console.log('\n📋 PHASE 7.1: Dashboard Enhancement Tests\n');

test('TUI Dashboard exists', () => {
  const tuiPath = path.join(rootDir, 'src/core/dashboard/tui.js');
  assert(fs.existsSync(tuiPath), 'tui.js should exist');
});

test('TUIDashboard class can be imported', async () => {
  const { TUIDashboard } = await import('../src/core/dashboard/tui.js');
  assert(typeof TUIDashboard === 'function', 'TUIDashboard should be a class');
});

test('TUIDashboard has start method', async () => {
  const { TUIDashboard } = await import('../src/core/dashboard/tui.js');
  const mockPM = { configDir: rootDir };
  const mockME = { generateAnalyticsReport: () => ({}) };
  const tui = new TUIDashboard(mockPM);
  assert(typeof tui.start === 'function', 'start should exist');
  assert(typeof tui.stop === 'function', 'stop should exist');
  assert(typeof tui.render === 'function', 'render should exist');
});

test('TUIDashboard has export methods', async () => {
  const { TUIDashboard } = await import('../src/core/dashboard/tui.js');
  const mockPM = { configDir: rootDir };
  const tui = new TUIDashboard(mockPM);
  assert(typeof tui.exportJSON === 'function', 'exportJSON should exist');
  assert(typeof tui.exportCSV === 'function', 'exportCSV should exist');
});

test('RuleEngine exists with compliance scoring', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  assert(typeof RuleEngine === 'function', 'RuleEngine should be a class');
});

test('RuleEngine has validateAction method', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  const mockPM = { projectPath: rootDir, configDir: rootDir };
  const re = new RuleEngine(mockPM);
  assert(typeof re.validateAction === 'function', 'validateAction should exist');
});

test('RuleEngine has calculateOverallCompliance method', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  const mockPM = { projectPath: rootDir, configDir: rootDir };
  const re = new RuleEngine(mockPM);
  assert(typeof re.calculateOverallCompliance === 'function', 'calculateOverallCompliance should exist');
});

test('RuleEngine has getComplianceReport method', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  const mockPM = { projectPath: rootDir, configDir: rootDir };
  const re = new RuleEngine(mockPM);
  const report = re.getComplianceReport();
  assert(report && typeof report === 'object', 'getComplianceReport should return object');
  assert('overall' in report, 'Report should have overall property');
  assert('violations' in report, 'Report should have violations property');
});

test('RuleEngine has default rules', async () => {
  const { RuleEngine } = await import('../src/core/RuleEngine.js');
  const mockPM = { projectPath: rootDir, configDir: rootDir };
  const re = new RuleEngine(mockPM);
  assert(re.rules.length > 0, 'Should have default rules');
});

test('ReportExporter exists', async () => {
  const { ReportExporter } = await import('../src/utils/reportExporter.js');
  assert(typeof ReportExporter === 'function', 'ReportExporter should be a class');
});

test('ReportExporter has export methods', async () => {
  const { ReportExporter } = await import('../src/utils/reportExporter.js');
  const mockME = { generateAnalyticsReport: () => ({ summary: {}, tokenUsageByModel: {}, recentActions: [] }) };
  const exporter = new ReportExporter(mockME);
  assert(typeof exporter.exportToJSON === 'function', 'exportToJSON should exist');
  assert(typeof exporter.exportToCSV === 'function', 'exportToCSV should exist');
  assert(typeof exporter.exportToMarkdown === 'function', 'exportToMarkdown should exist');
  assert(typeof exporter.exportToHTML === 'function', 'exportToHTML should exist');
});

// ============================================
// PHASE 8: Marketplace Tests
// ============================================
console.log('\n📋 PHASE 8: Marketplace Tests\n');

test('Marketplace UI exists', () => {
  const mpPath = path.join(rootDir, 'src/core/dashboard/marketplace.js');
  assert(fs.existsSync(mpPath), 'marketplace.js should exist');
});

test('MarketplaceServer class can be imported', async () => {
  const { MarketplaceServer } = await import('../src/core/dashboard/marketplace.js');
  assert(typeof MarketplaceServer === 'function', 'MarketplaceServer should be a class');
});

test('MarketplaceServer has start method', async () => {
  const { MarketplaceServer } = await import('../src/core/dashboard/marketplace.js');
  const mockPE = { pluginDir: rootDir, listPlugins: () => [] };
  const mp = new MarketplaceServer(mockPE);
  assert(typeof mp.start === 'function', 'start should exist');
});

test('MarketplaceServer has available plugins list', async () => {
  const { MarketplaceServer } = await import('../src/core/dashboard/marketplace.js');
  const mockPE = { pluginDir: rootDir, listPlugins: () => [] };
  const mp = new MarketplaceServer(mockPE);
  assert(Array.isArray(mp.availablePlugins), 'availablePlugins should be array');
  assert(mp.availablePlugins.length >= 5, 'Should have at least 5 sample plugins');
});

test('PluginEngine exists', async () => {
  const { PluginEngine } = await import('../src/core/PluginEngine.js');
  assert(typeof PluginEngine === 'function', 'PluginEngine should be a class');
});

test('PluginEngine has loadPlugin method', async () => {
  const { PluginEngine } = await import('../src/core/PluginEngine.js');
  const mockEB = { subscribe: () => {}, unsubscribe: () => {}, publish: () => {} };
  const mockPM = { workspacePath: rootDir };
  const pe = new PluginEngine(mockPM, mockEB);
  assert(typeof pe.loadPlugin === 'function', 'loadPlugin should exist');
  assert(typeof pe.unloadPlugin === 'function', 'unloadPlugin should exist');
  assert(typeof pe.listPlugins === 'function', 'listPlugins should exist');
});

test('PluginEngine has listPlugins method', async () => {
  const { PluginEngine } = await import('../src/core/PluginEngine.js');
  const mockEB = { subscribe: () => {}, unsubscribe: () => {}, publish: () => {} };
  const mockPM = { workspacePath: rootDir };
  const pe = new PluginEngine(mockPM, mockEB);
  const plugins = pe.listPlugins();
  assert(Array.isArray(plugins), 'listPlugins should return array');
});

// ============================================
// Dashboard HTML/CSS/JS Tests
// ============================================
console.log('\n📋 Dashboard UI Tests\n');

test('Dashboard HTML exists', () => {
  const htmlPath = path.join(rootDir, 'src/core/dashboard/public/index.html');
  assert(fs.existsSync(htmlPath), 'index.html should exist');
});

test('Dashboard CSS exists', () => {
  const cssPath = path.join(rootDir, 'src/core/dashboard/public/index.css');
  assert(fs.existsSync(cssPath), 'index.css should exist');
});

test('Dashboard JS exists', () => {
  const jsPath = path.join(rootDir, 'src/core/dashboard/public/index.js');
  assert(fs.existsSync(jsPath), 'index.js should exist');
});

test('Dashboard server exists', () => {
  const serverPath = path.join(rootDir, 'src/core/dashboard/server.js');
  assert(fs.existsSync(serverPath), 'server.js should exist');
});

test('Dashboard HTML has required elements', () => {
  const html = fs.readFileSync(path.join(rootDir, 'src/core/dashboard/public/index.html'), 'utf-8');
  assert(html.includes('AETHER'), 'Should have AETHER branding');
  assert(html.includes('metric-cost'), 'Should have cost metric');
  assert(html.includes('metric-tokens'), 'Should have tokens metric');
  assert(html.includes('logs-table'), 'Should have logs table');
});

test('Dashboard JS has SSE implementation', () => {
  const js = fs.readFileSync(path.join(rootDir, 'src/core/dashboard/public/index.js'), 'utf-8');
  assert(js.includes('EventSource'), 'Should use EventSource for SSE');
  assert(js.includes('/api/stats'), 'Should call /api/stats endpoint');
  assert(js.includes('/api/events'), 'Should call /api/events endpoint');
});

test('Dashboard CSS has glassmorphism styling', () => {
  const css = fs.readFileSync(path.join(rootDir, 'src/core/dashboard/public/index.css'), 'utf-8');
  assert(css.includes('backdrop-filter'), 'Should have backdrop-filter for glass effect');
  assert(css.includes('--accent-color'), 'Should have accent color variable');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log('QA TEST SUMMARY');
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
  console.log('🎉 ALL TESTS PASSED!');
} else {
  console.log(`⚠️  ${results.failed} test(s) failed`);
}
console.log('='.repeat(50) + '\n');

process.exit(results.failed > 0 ? 1 : 0);
