import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { ContextEngine } from '../core/ContextEngine.js';
import { ReleaseManager } from '../core/ReleaseManager.js';

const tempDir = path.resolve('./temp_epic7_test');

function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 7 (RELEASE & MIGRATION) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1. Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // Start ContextEngine to initialize core tables
  const ce = new ContextEngine(pm);
  ce.start();
  ce.close();

  const rm = new ReleaseManager(pm);

  // ----------------------------------------------------
  // Test 1: Initialize Database & Check Initial Version
  // ----------------------------------------------------
  console.log('\n[Test 1] Verifying initial schema and version...');
  rm.start();
  const initialVersion = rm.getCurrentVersion();
  assert.strictEqual(initialVersion, 0, 'Initial version should be 0');

  // Verify migration table is created
  const doctorReport = await rm.doctor();
  assert.strictEqual(doctorReport.success, true, 'Integrity & schema checks should pass initially');
  
  const migrationTableCheck = doctorReport.checks.find(c => c.name === 'Schema Tables Verification');
  assert.ok(migrationTableCheck.passed, 'Migration table verification check should pass');
  console.log('✔ Initial version and doctor diagnostics verified.');

  // ----------------------------------------------------
  // Test 2: Database Backup Snapshot
  // ----------------------------------------------------
  console.log('\n[Test 2] Verifying database backup snapshot creation...');
  const backups = rm.backupDatabase();
  assert.ok(backups.length > 0, 'Backup file list should not be empty');
  backups.forEach(backupPath => {
    assert.ok(fs.existsSync(backupPath), `Backup file should exist: ${backupPath}`);
  });
  console.log('✔ Database backup snapshot generated successfully.');

  // ----------------------------------------------------
  // Test 3: SQL Migration Execution
  // ----------------------------------------------------
  console.log('\n[Test 3] Verifying SQL migrations runner...');
  
  // Set up mock migrations folder
  const migrationsDir = path.join(tempDir, 'migrations');
  fs.mkdirSync(migrationsDir, { recursive: true });

  const m1Content = `
    CREATE TABLE IF NOT EXISTS test_users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL
    );
    INSERT INTO test_users (id, username) VALUES (10, 'alice');
  `;
  const m2Content = `
    CREATE TABLE IF NOT EXISTS test_posts (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author_id INTEGER
    );
    INSERT INTO test_posts (id, title, author_id) VALUES (100, 'Hello World', 10);
  `;

  fs.writeFileSync(path.join(migrationsDir, '001_create_users.sql'), m1Content, 'utf-8');
  fs.writeFileSync(path.join(migrationsDir, '002_create_posts.sql'), m2Content, 'utf-8');

  const applied = await rm.runMigrations(migrationsDir);
  assert.strictEqual(applied.length, 2, 'Should apply exactly 2 migrations');
  assert.strictEqual(applied[0].version, 1, 'First migration should be version 1');
  assert.strictEqual(applied[1].version, 2, 'Second migration should be version 2');

  const newVersion = rm.getCurrentVersion();
  assert.strictEqual(newVersion, 2, 'Database schema version should now be 2');

  // Verify migration runs successfully on the database (check if tables exists/mock stores updated)
  if (rm.db.store) {
    assert.ok(rm.db.store.test_users, 'test_users table should be created in mock store');
    assert.ok(rm.db.store.test_posts, 'test_posts table should be created in mock store');
  } else {
    // SQLite test
    const userRow = rm.db.prepare("SELECT username FROM test_users WHERE id = 10").get();
    assert.strictEqual(userRow.username, 'alice', 'User alice should be inserted');
    const postRow = rm.db.prepare("SELECT title FROM test_posts WHERE id = 100").get();
    assert.strictEqual(postRow.title, 'Hello World', 'Post Hello World should be inserted');
  }
  console.log('✔ Successful SQL migrations executed and verified.');

  // ----------------------------------------------------
  // Test 4: Automatic Rollback on Failure
  // ----------------------------------------------------
  console.log('\n[Test 4] Verifying automatic rollback on migration failure...');
  
  // Create a bad migration script (syntax error or constraints error)
  const badMigrationContent = `
    INSERT INTO test_users (id, username) VALUES (10, 'alice'); -- FAIL_MIGRATION
  `;
  fs.writeFileSync(path.join(migrationsDir, '003_bad_migration.sql'), badMigrationContent, 'utf-8');

  let errorThrown = false;
  try {
    await rm.runMigrations(migrationsDir);
  } catch (err) {
    errorThrown = true;
    assert.ok(err.message.includes('Migration failed'), 'Error should report migration failure');
  }
  assert.ok(errorThrown, 'Should throw an error for failed migration');

  // Verify that the version did NOT change (remained 2)
  const versionAfterFail = rm.getCurrentVersion();
  assert.strictEqual(versionAfterFail, 2, 'Database version should remain 2 after failed migration');
  console.log('✔ Automatic rollback on failure verified.');

  // ----------------------------------------------------
  // Test 5: Manual Rollback
  // ----------------------------------------------------
  console.log('\n[Test 5] Verifying manual rollback restore...');
  
  // We want to roll back to the first backup (version 0 state)
  const firstBackup = backups[0]; // taken when version was 0
  const rollbackReport = await rm.rollback(firstBackup);

  assert.strictEqual(rollbackReport.success, true, 'Rollback diagnostics should pass');
  const rolledBackVersion = rm.getCurrentVersion();
  assert.strictEqual(rolledBackVersion, 0, 'Database version should roll back to 0');

  if (rm.db.store) {
    assert.strictEqual(rm.db.store.test_users, undefined, 'test_users table should not exist after rolling back to v0');
  } else {
    // SQLite check
    const tableCheck = rm.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_users'").get();
    assert.strictEqual(tableCheck, undefined, 'test_users table should be removed');
  }
  console.log('✔ Manual rollback and state restoration verified.');

  // ----------------------------------------------------
  // Test 6: Locks Clearing on Rollback
  // ----------------------------------------------------
  console.log('\n[Test 6] Verifying locks cleanup on rollback...');
  
  const locksDir = path.join(tempDir, '.aether', 'locks');
  if (!fs.existsSync(locksDir)) {
    fs.mkdirSync(locksDir, { recursive: true });
  }
  // Create mock lock files
  fs.writeFileSync(path.join(locksDir, 'dummy.lock'), '{}', 'utf-8');
  
  assert.ok(fs.existsSync(path.join(locksDir, 'dummy.lock')), 'Dummy lock should exist prior to rollback');

  // Trigger rollback to clean it
  await rm.rollback(firstBackup);
  assert.ok(!fs.existsSync(path.join(locksDir, 'dummy.lock')), 'Lock files should be cleared on rollback');
  console.log('✔ Lock files cleanup verified.');

  rm.close();
  console.log('\n=== ALL EPIC 7 RELEASE & MIGRATION TESTS PASSED SUCCESSFULLY ===');
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
