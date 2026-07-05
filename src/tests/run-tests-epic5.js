import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ProjectManager } from '../core/ProjectManager.js';
import { VersionManager } from '../core/VersionManager.js';

const tempDir = path.resolve('./temp_epic5_test');

// Helper to clean up temp directory
function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 5 (VERSION MANAGER) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1. Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // 2. Initialize VersionManager and Git Repo
  console.log('\n[Test 1] Initializing Git repository...');
  const vm = new VersionManager(pm);
  await vm.checkGitRepo();
  assert.ok(fs.existsSync(path.join(tempDir, '.git')), 'Git repository folder .git should exist.');

  // Set local Git config so commits do not fail on machines with no global user configured
  execSync('git config --local user.name "Aether Test"', { cwd: tempDir });
  execSync('git config --local user.email "test@aether.local"', { cwd: tempDir });
  // Disable GPG signing for test repository to prevent prompts/failures
  execSync('git config --local commit.gpgsign false', { cwd: tempDir });

  console.log('✔ Test 1 Passed.');

  // 3. Verify Auto Commit Message on fresh file
  console.log('\n[Test 2] Verifying commit message generation for untracked files...');
  fs.writeFileSync(path.join(tempDir, 'test.txt'), 'Hello Aether', 'utf-8');
  
  const msg1 = await vm.generateCommitMessage();
  assert.ok(msg1.includes('Untracked files:'), 'Message should notice untracked files.');
  assert.ok(msg1.includes('test.txt'), 'Message should reference test.txt.');
  console.log('✔ Test 2 Passed.');

  // 4. Create first commit
  console.log('\n[Test 3] Creating first commit...');
  const hash1 = await vm.createGitCommit('first commit');
  assert.strictEqual(hash1.length, 40, 'Should return a valid 40-character SHA1 commit hash.');

  const isCleanAfterCommit = await vm.isClean();
  assert.strictEqual(isCleanAfterCommit, true, 'Repository should be clean after committing all changes.');
  console.log('✔ Test 3 Passed.');

  // 5. Verify Branch Creation
  console.log('\n[Test 4] Verifying branch creation...');
  await vm.createBranch('test-feature-branch');
  
  // Verify active branch is test-feature-branch
  const activeBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: tempDir }).toString().trim();
  assert.strictEqual(activeBranch, 'test-feature-branch', 'Active branch should be test-feature-branch.');
  console.log('✔ Test 4 Passed.');

  // 6. Verify Modification Diff & Auto Message
  console.log('\n[Test 5] Verifying modification detection & commit...');
  fs.writeFileSync(path.join(tempDir, 'test.txt'), 'Hello Aether Version 2', 'utf-8');
  
  const isCleanAfterMod = await vm.isClean();
  assert.strictEqual(isCleanAfterMod, false, 'Repository should not be clean after file modification.');

  const msg2 = await vm.generateCommitMessage();
  assert.ok(msg2.includes('Modified files:'), 'Message should notice modified files.');
  assert.ok(msg2.includes('test.txt'), 'Message should reference test.txt.');

  const hash2 = await vm.createGitCommit(); // Test auto-message generation on commit
  assert.strictEqual(hash2.length, 40, 'Should commit modifications successfully.');
  console.log('✔ Test 5 Passed.');

  // 7. Verify Checkout Revision
  console.log('\n[Test 6] Verifying revision checkout...');
  await vm.checkoutRevision(hash1);
  
  const textAtHash1 = fs.readFileSync(path.join(tempDir, 'test.txt'), 'utf-8');
  assert.strictEqual(textAtHash1, 'Hello Aether', 'File content should rollback to hash1 state.');
  console.log('✔ Test 6 Passed.');

  console.log('\n=== ALL EPIC 5 VERSION MANAGER TESTS PASSED SUCCESSFULLY ===');
}

// Wrap with a delay before cleanup to handle Windows file locks cleanly
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
