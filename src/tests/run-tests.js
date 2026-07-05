import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { ProjectManager } from '../core/ProjectManager.js';
import { EventBus } from '../core/EventBus.js';
import { LockManager } from '../core/LockManager.js';
import { FileWatcher } from '../core/FileWatcher.js';

const TEST_DIR = path.join(process.cwd(), 'src', 'tests', 'test_workspace');

// Setup cleanup
function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING AETHER CORE SUITE");
  console.log("=========================================");

  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const pm = new ProjectManager(TEST_DIR);

  // Test 1: ProjectManager Initialize
  console.log("Test 1: ProjectManager Initialization...");
  const meta = await pm.initializeProject();
  assert.strictEqual(pm.status, 'active');
  assert.ok(fs.existsSync(path.join(TEST_DIR, '.aether', 'config.json')));
  assert.ok(fs.existsSync(path.join(TEST_DIR, '00-Platform')));
  assert.ok(fs.existsSync(path.join(TEST_DIR, '.agents')));
  assert.ok(fs.existsSync(path.join(TEST_DIR, 'docs')));
  console.log("✔ ProjectManager Initialized Successfully.");

  // Test 2: ProjectManager Config Update
  console.log("Test 2: ProjectManager Update Config...");
  await pm.updateProjectConfig({ newProperty: "AetherPower" });
  const updatedMeta = pm.getProjectMeta();
  assert.strictEqual(updatedMeta.config.newProperty, "AetherPower");
  console.log("✔ ProjectManager Config Updated Successfully.");

  // Test 3: EventBus Pub/Sub
  console.log("Test 3: EventBus Publish/Subscribe...");
  const eb = new EventBus();
  let receivedPayload = null;
  const unsubscribe = eb.subscribe('test:event', (payload) => {
    receivedPayload = payload;
  });

  eb.publish('test:event', { message: "Hello Aether!" });
  assert.deepStrictEqual(receivedPayload, { message: "Hello Aether!" });
  
  // Test Unsubscribe
  receivedPayload = null;
  unsubscribe();
  eb.publish('test:event', { message: "Silent Aether!" });
  assert.strictEqual(receivedPayload, null);
  console.log("✔ EventBus Pub/Sub Verified.");

  // Test 4: LockManager Concurrency Control
  console.log("Test 4: LockManager Concurrency & Expire...");
  // Temporarily adjust lockTimeoutMs to 50ms for testing expire
  await pm.updateProjectConfig({ lockTimeoutMs: 50 });
  const lm = new LockManager(pm);
  
  const testFile = 'docs/test-file.md';

  // Acquire Lock agent A
  const acquiredA = lm.acquireLock('agent-A', testFile);
  assert.strictEqual(acquiredA, true);
  assert.strictEqual(lm.acquireLock('agent-B', testFile), false); // agent B should be blocked

  // Let lock expire (wait 100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Now agent B should be able to acquire lock
  assert.strictEqual(lm.acquireLock('agent-B', testFile), true);
  assert.strictEqual(lm.isLocked(testFile).agentId, 'agent-B');

  // Release Lock agent B
  const released = lm.releaseLock('agent-B', testFile);
  assert.strictEqual(released, true);
  assert.strictEqual(lm.isLocked(testFile), null);
  console.log("✔ LockManager Concurrency & Expiration Verified.");

  // Test 5: Integration Watcher and EventBus
  console.log("Test 5: FileWatcher Integration...");
  const integrationEB = new EventBus();
  const watcher = new FileWatcher(pm, integrationEB);

  let watcherEvent = null;
  integrationEB.subscribe('file:created', (data) => {
    watcherEvent = data;
  });

  watcher.start();
  // Wait a bit for watcher to initialize
  await new Promise(resolve => setTimeout(resolve, 300));

  // Write file to trigger event
  const dummyFile = path.join(TEST_DIR, 'docs', 'dummy.md');
  fs.writeFileSync(dummyFile, 'Hello Dummy', 'utf-8');

  // Wait for file watcher to catch and publish event
  await new Promise(resolve => setTimeout(resolve, 500));

  assert.ok(watcherEvent);
  assert.strictEqual(watcherEvent.path, path.join('docs', 'dummy.md').replace(/\\/g, '/'));
  
  await watcher.stop();
  console.log("✔ FileWatcher Integration Verified.");

  cleanup();
  console.log("=========================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
