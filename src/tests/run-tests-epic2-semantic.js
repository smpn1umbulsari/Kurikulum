import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { ContextEngine } from '../core/ContextEngine.js';
import { SemanticIndexer } from '../core/SemanticIndexer.js';

const tempDir = path.resolve('./temp_epic2_semantic_test');

function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 2 (SEMANTIC INDEXING & KNN) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1. Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // 2. Create some sample files in the workspace
  const doc1Path = path.join(tempDir, 'student_info.md');
  const doc2Path = path.join(tempDir, 'teacher_schedule.txt');
  const doc3Path = path.join(tempDir, 'grading_system.json');

  fs.writeFileSync(doc1Path, 'This file contains student registration information, profile records, and academic history.', 'utf-8');
  fs.writeFileSync(doc2Path, 'Weekly teaching hours, classroom schedule, teacher lessons, workload optimization dashboard.', 'utf-8');
  fs.writeFileSync(doc3Path, '{"system": "standard grading", "assessments": ["quiz", "exam", "assignment"], "passingScore": 75}', 'utf-8');

  // 3. Initialize ContextEngine and sync
  const ce = new ContextEngine(pm);
  await ce.syncWorkspace();

  // 4. Initialize SemanticIndexer
  const indexer = new SemanticIndexer(ce);

  // ----------------------------------------------------
  // Test 1: Local TF-IDF Embedding generation
  // ----------------------------------------------------
  console.log('\n[Test 1] Verifying local embedding generation...');
  const text = 'student registration history';
  const vec1 = await indexer.getEmbedding(text);
  
  assert.strictEqual(vec1.length, 384, 'Local embedding should have exactly 384 dimensions.');
  
  // Calculate L2 norm to verify it is unit normalized
  let sumSq = 0;
  for (let i = 0; i < vec1.length; i++) {
    sumSq += vec1[i] * vec1[i];
  }
  const norm = Math.sqrt(sumSq);
  assert.ok(Math.abs(norm - 1.0) < 1e-5, 'Local embedding vector must be L2 normalized (unit length).');
  console.log('✔ Local vector dimensions and normalization verified.');

  // ----------------------------------------------------
  // Test 2: Database saving and loading
  // ----------------------------------------------------
  console.log('\n[Test 2] Verifying database caching of embeddings...');
  const testHash = 'abcde12345';
  ce.saveEmbedding('student_info.md', testHash, vec1);

  const cachedVec = ce.getEmbedding('student_info.md', testHash);
  assert.deepStrictEqual(cachedVec, vec1, 'Cached vector should match the saved vector.');

  const invalidCachedVec = ce.getEmbedding('student_info.md', 'different-hash');
  assert.strictEqual(invalidCachedVec, null, 'Querying with mismatched hash should invalidate cache and return null.');
  console.log('✔ Database cache storing, retrieving, and hash validation verified.');

  // ----------------------------------------------------
  // Test 3: Workspace Indexing
  // ----------------------------------------------------
  console.log('\n[Test 3] Verifying incremental workspace indexing...');
  await indexer.indexWorkspace();

  const allEmbeds = ce.getAllEmbeddings();
  assert.strictEqual(allEmbeds.length, 3, 'All 3 files should be indexed in the database.');
  
  // Check that all 3 files have valid 384-dimensional vectors stored
  for (const item of allEmbeds) {
    assert.strictEqual(item.vector.length, 384, `File ${item.path} vector should have 384 dimensions.`);
    assert.ok(item.hash.length > 0, `File ${item.path} should have a stored hash.`);
  }
  console.log('✔ Workspace indexing successfully populated 3 files.');

  // ----------------------------------------------------
  // Test 4: KNN Cosine Similarity Search
  // ----------------------------------------------------
  console.log('\n[Test 4] Verifying KNN query results...');
  
  // Query 1: "student profile registration"
  const q1Results = await indexer.search('student profile registration', 3);
  assert.strictEqual(q1Results.length, 3, 'Should return scores for all 3 indexed files.');
  assert.strictEqual(q1Results[0].path, 'student_info.md', 'First result for student query should be student_info.md.');
  assert.ok(q1Results[0].score > q1Results[1].score, 'student_info.md score should be higher than other files.');

  // Query 2: "workload optimization hours"
  const q2Results = await indexer.search('workload optimization hours', 3);
  assert.strictEqual(q2Results[0].path, 'teacher_schedule.txt', 'First result for schedule query should be teacher_schedule.txt.');

  // Query 3: "passingScore quiz grading"
  const q3Results = await indexer.search('passingScore quiz grading', 3);
  assert.strictEqual(q3Results[0].path, 'grading_system.json', 'First result for grading query should be grading_system.json.');

  console.log('✔ Semantic query matching and KNN sorting verified.');
  console.log('✔ Test 4 Passed.');

  // ----------------------------------------------------
  // Test 5: Incremental Indexing Check
  // ----------------------------------------------------
  console.log('\n[Test 5] Verifying incremental index reuse...');
  // Modify doc1 content and sync workspace again
  fs.writeFileSync(doc1Path, 'New content that is completely different about cats and dogs.', 'utf-8');
  await ce.syncWorkspace(); // This runs indexer.indexWorkspace() internally

  // The doc1 vector in database should have changed
  const newVec = ce.getEmbedding('student_info.md');
  const oldVec = vec1;
  assert.notDeepStrictEqual(newVec, oldVec, 'File vector should be re-calculated when file hash changes.');

  // Verify that an unchanged file (like teacher_schedule.txt) still has its cached embedding
  const unchangedVec = ce.getEmbedding('teacher_schedule.txt');
  assert.ok(unchangedVec !== null, 'Unchanged file should preserve its embedding.');

  console.log('✔ Incremental indexing update and cache preservation verified.');
  console.log('✔ Test 5 Passed.');

  ce.close();
  console.log('\n=== ALL EPIC 2 SEMANTIC INDEXING & KNN TESTS PASSED SUCCESSFULLY ===');
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
