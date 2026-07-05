import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { ProjectManager } from '../core/ProjectManager.js';
import { EventBus } from '../core/EventBus.js';
import { PluginEngine } from '../core/PluginEngine.js';

const TEST_DIR = path.resolve('./temp_epic8_plugin_test');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 8 (PLUGIN ENGINE) INTEGRATION TESTS ===');

  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Initialize ProjectManager
  const pm = new ProjectManager(TEST_DIR);
  await pm.initializeProject();

  // Initialize EventBus
  const eventBus = new EventBus();

  // Initialize PluginEngine
  const pluginEngine = new PluginEngine(pm, eventBus);

  // Test 1: Plugin Directory Initialization
  console.log('\n[Test 1] Verifying plugin directory initialization...');
  const pluginDir = path.join(TEST_DIR, '.aether', 'plugins');
  assert.ok(fs.existsSync(pluginDir), 'Plugin directory should be created.');
  console.log('✔ Test 1 Passed.');

  // Test 2: Create a mock plugin with manifest
  console.log('\n[Test 2] Creating mock plugin with manifest...');
  const mockPluginPath = path.join(pluginDir, 'test-example-plugin');
  fs.mkdirSync(mockPluginPath, { recursive: true });

  // Create plugin.json manifest
  const manifest = {
    name: 'test-example-plugin',
    version: '1.0.0',
    description: 'A test plugin for Epic 8',
    author: 'Aether Test',
    main: 'index.js',
    hooks: {
      onInit: 'onInit',
      onShutdown: 'onShutdown',
      onFileChange: 'onFileChange',
      onTaskComplete: 'onTaskComplete'
    }
  };
  fs.writeFileSync(path.join(mockPluginPath, 'plugin.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  // Create plugin main file
  const pluginCode = `
export default class TestPlugin {
  constructor(sandbox, manifest) {
    this.sandbox = sandbox;
    this.manifest = manifest;
    this.initCalled = false;
    this.shutdownCalled = false;
    this.fileChangesReceived = 0;
  }

  onInit() {
    this.initCalled = true;
    this.sandbox.log.info('TestPlugin initialized');
    return Promise.resolve();
  }

  onShutdown() {
    this.shutdownCalled = true;
    this.sandbox.log.info('TestPlugin shutting down');
    return Promise.resolve();
  }

  onFileChange(payload) {
    this.fileChangesReceived++;
    this.sandbox.log.info('File changed:', payload);
    return Promise.resolve();
  }

  onTaskComplete(payload) {
    this.sandbox.log.info('Task completed:', payload);
    return Promise.resolve();
  }
}
`;
  fs.writeFileSync(path.join(mockPluginPath, 'index.js'), pluginCode, 'utf-8');
  console.log('✔ Test 2 Passed.');

  // Test 3: Load Plugin
  console.log('\n[Test 3] Loading plugin...');
  const loadedPlugin = await pluginEngine.loadPlugin(mockPluginPath);
  assert.strictEqual(loadedPlugin.id, 'test-example-plugin', 'Plugin ID should match.');
  assert.strictEqual(loadedPlugin.version, '1.0.0', 'Plugin version should match.');
  assert.ok(Array.isArray(loadedPlugin.hooks), 'Plugin hooks should be an array.');
  assert.ok(loadedPlugin.hooks.includes('onInit'), 'onInit hook should be present.');
  console.log('✔ Test 3 Passed.');

  // Test 4: List Plugins
  console.log('\n[Test 4] Verifying plugin listing...');
  const plugins = pluginEngine.listPlugins();
  assert.strictEqual(plugins.length, 1, 'Should have exactly one plugin loaded.');
  assert.strictEqual(plugins[0].name, 'test-example-plugin', 'Plugin name should match.');
  console.log('✔ Test 4 Passed.');

  // Test 5: Event Relay to Plugins
  console.log('\n[Test 5] Verifying event relay to plugins...');
  
  // Get the loaded plugin instance
  const pluginInfo = pluginEngine.getPlugin('test-example-plugin');
  assert.ok(pluginInfo, 'Plugin should be retrievable by ID.');
  assert.strictEqual(pluginInfo.instance.fileChangesReceived, 0, 'File changes should start at 0.');

  // Emit a file change event
  eventBus.publish('file:changed', { path: 'test.js', type: 'modified' });
  
  // Give time for event processing
  await new Promise(r => setTimeout(r, 50));
  
  assert.strictEqual(pluginInfo.instance.fileChangesReceived, 1, 'Plugin should have received one file change event.');
  console.log('✔ Test 5 Passed.');

  // Test 6: Emit from Plugin
  console.log('\n[Test 6] Verifying plugin can emit events...');
  let eventReceived = false;
  eventBus.subscribe('plugin:test-example-plugin:customEvent', () => {
    eventReceived = true;
  });
  
  pluginInfo.instance.sandbox.emit('customEvent', { data: 'test' });
  
  assert.ok(eventReceived, 'Plugin should be able to emit events.');
  console.log('✔ Test 6 Passed.');

  // Test 7: Sandbox Isolation - Safe Filesystem Access
  console.log('\n[Test 7] Verifying sandbox filesystem isolation...');
  
  // Write a test file in workspace
  const testFilePath = path.join(TEST_DIR, 'test-sandbox.txt');
  fs.writeFileSync(testFilePath, 'sandbox test content', 'utf-8');
  
  // Plugin should be able to read it
  const content = pluginInfo.instance.sandbox.fs.readFile('test-sandbox.txt');
  assert.strictEqual(content, 'sandbox test content', 'Plugin should read workspace files.');
  console.log('✔ Test 7 Passed.');

  // Test 8: Unload Plugin
  console.log('\n[Test 8] Verifying plugin unloading...');
  await pluginEngine.unloadPlugin('test-example-plugin');
  
  const pluginsAfterUnload = pluginEngine.listPlugins();
  assert.strictEqual(pluginsAfterUnload.length, 0, 'No plugins should be loaded after unload.');
  
  const unloadedPlugin = pluginEngine.getPlugin('test-example-plugin');
  assert.strictEqual(unloadedPlugin, null, 'Unloaded plugin should not be retrievable.');
  console.log('✔ Test 8 Passed.');

  // Test 9: Plugin Registry Persistence
  console.log('\n[Test 9] Verifying plugin registry file...');
  const registryPath = path.join(TEST_DIR, '.aether', 'plugin-registry.json');
  assert.ok(fs.existsSync(registryPath), 'Plugin registry should be created.');
  
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  assert.ok(registry.plugins, 'Registry should have plugins array.');
  console.log('✔ Test 9 Passed.');

  // Test 10: Manifest Validation Errors
  console.log('\n[Test 10] Verifying manifest validation...');
  const invalidPluginPath = path.join(pluginDir, 'invalid-plugin');
  fs.mkdirSync(invalidPluginPath, { recursive: true });
  fs.writeFileSync(path.join(invalidPluginPath, 'plugin.json'), JSON.stringify({ description: 'missing name and version' }), 'utf-8');

  try {
    await pluginEngine.loadPlugin(invalidPluginPath);
    assert.fail('Should have thrown error for invalid manifest.');
  } catch (err) {
    assert.ok(err.message.includes('missing required field'), 'Should report missing required fields.');
    console.log('✔ Test 10 Passed.');
  }

  // Test 11: Duplicate Plugin Prevention
  console.log('\n[Test 11] Verifying duplicate plugin prevention...');
  
  // Create a valid plugin
  const duplicateTestPath = path.join(pluginDir, 'duplicate-test-plugin');
  fs.mkdirSync(duplicateTestPath, { recursive: true });
  fs.writeFileSync(path.join(duplicateTestPath, 'plugin.json'), JSON.stringify({
    name: 'duplicate-test-plugin',
    version: '1.0.0',
    main: 'index.js'
  }), 'utf-8');
  fs.writeFileSync(path.join(duplicateTestPath, 'index.js'), 'export default class P { constructor() {} }', 'utf-8');

  // Load it first time
  await pluginEngine.loadPlugin(duplicateTestPath);
  
  // Try to load again
  try {
    await pluginEngine.loadPlugin(duplicateTestPath);
    assert.fail('Should have thrown error for duplicate plugin.');
  } catch (err) {
    assert.ok(err.message.includes('already loaded'), 'Should report plugin already loaded.');
    console.log('✔ Test 11 Passed.');
  }

  // Test 12: Shutdown All Plugins
  console.log('\n[Test 12] Verifying shutdown all plugins...');
  await pluginEngine.shutdownAll();
  const pluginsAfterShutdown = pluginEngine.listPlugins();
  assert.strictEqual(pluginsAfterShutdown.length, 0, 'All plugins should be unloaded after shutdown.');
  console.log('✔ Test 12 Passed.');

  // Cleanup
  cleanup();

  console.log('\n=== ALL EPIC 8 PLUGIN ENGINE TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('❌ TEST FAILURE:', err);
  cleanup();
  process.exit(1);
});
