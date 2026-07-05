import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { ProjectManager } from '../core/ProjectManager.js';
import { ContextEngine } from '../core/ContextEngine.js';
import { KnowledgeGraph } from '../core/KnowledgeGraph.js';

const TEST_DIR = path.join(process.cwd(), 'src', 'tests', 'test_workspace_epic2');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING AETHER EPIC 2 (CONTEXT & GRAPH) TEST SUITE");
  console.log("=========================================");

  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const pm = new ProjectManager(TEST_DIR);
  await pm.initializeProject();

  // Create temporary folders in test workspace
  const migrationsDir = path.join(TEST_DIR, 'docs', 'supabase', 'migrations');
  fs.mkdirSync(migrationsDir, { recursive: true });

  // 1. Create a mock SQL file with a target table
  console.log("Test 1: Writing mock SQL migrations...");
  const sqlFile1 = path.join(migrationsDir, '100_gurus.sql');
  const ddl1 = `
    CREATE TABLE gurus (
      id UUID PRIMARY KEY,
      nip VARCHAR(30) UNIQUE,
      nama VARCHAR(150) NOT NULL
    );
  `;
  fs.writeFileSync(sqlFile1, ddl1, 'utf-8');

  // 2. Create another mock SQL file referencing the first table
  const sqlFile2 = path.join(migrationsDir, '200_assessments.sql');
  const ddl2 = `
    CREATE TABLE assessments (
      id UUID PRIMARY KEY,
      judul VARCHAR(200) NOT NULL,
      created_by UUID REFERENCES gurus(id) ON DELETE RESTRICT
    );
  `;
  fs.writeFileSync(sqlFile2, ddl2, 'utf-8');

  // 3. Create a markdown file linking to sql file 2
  const mdFile = path.join(TEST_DIR, 'docs', 'spec.md');
  const mdContent = `
    # Assessment Spec
    Read more in [assessments schema](supabase/migrations/200_assessments.sql)
  `;
  fs.writeFileSync(mdFile, mdContent, 'utf-8');

  // Run ContextEngine Sync
  console.log("Test 2: ContextEngine sync...");
  const ce = new ContextEngine(pm);
  await ce.syncWorkspace();

  // Verify files registered
  ce.start();
  const fileRows = ce.db.prepare("SELECT path FROM files").all().map(r => r.path);
  console.log("File rows in database:", fileRows);
  assert.ok(fileRows.includes('docs/supabase/migrations/100_gurus.sql'));
  assert.ok(fileRows.includes('docs/supabase/migrations/200_assessments.sql'));
  assert.ok(fileRows.includes('docs/spec.md'));
  console.log("✔ Files synced in local cache.");

  // Verify tables extracted
  const tableRows = ce.db.prepare("SELECT name FROM db_tables").all().map(r => r.name);
  assert.ok(tableRows.includes('gurus'));
  assert.ok(tableRows.includes('assessments'));
  console.log("✔ SQL tables extracted successfully.");

  // Verify columns extracted
  const columns = ce.db.prepare("SELECT name, type, is_pk FROM db_columns WHERE table_name = 'gurus'").all();
  const idCol = columns.find(c => c.name === 'id');
  assert.ok(idCol);
  assert.strictEqual(idCol.is_pk, 1);
  console.log("✔ Table columns & keys verified.");

  // Verify foreign key relations
  const relations = ce.getDbRelations();
  const rel = relations.find(r => r.from_table === 'assessments' && r.to_table === 'gurus');
  assert.ok(rel);
  assert.strictEqual(rel.from_column, 'created_by');
  assert.strictEqual(rel.to_column, 'id');
  console.log("✔ SQL schema foreign key relations verified.");

  // Verify markdown dependencies
  const dependencies = ce.getDependencies();
  console.log("Dependencies in database:", dependencies);
  const dep = dependencies.find(d => d.source_file === 'docs/spec.md' && d.target_file === 'docs/supabase/migrations/200_assessments.sql');
  assert.ok(dep);
  assert.strictEqual(dep.type, 'markdown');
  console.log("✔ Markdown link dependencies verified.");

  // Test 3: KnowledgeGraph Impact Analysis
  console.log("Test 3: KnowledgeGraph construction and Impact Analysis...");
  const kg = new KnowledgeGraph(ce);
  await kg.buildGraph();

  // If table 'gurus' is updated, table 'assessments' is impacted
  const gurusImpacts = kg.findImpactedNodes('gurus');
  const assessmentsTableImpact = gurusImpacts.find(i => i.node === 'assessments' && i.type === 'table');
  assert.ok(assessmentsTableImpact);

  // If 'docs/supabase/migrations/100_gurus.sql' is modified, table 'gurus' and transitively the assessments SQL file is impacted
  const file1Impacts = kg.findImpactedNodes('docs/supabase/migrations/100_gurus.sql');
  const tableImpact = file1Impacts.find(i => i.node === 'gurus' && i.type === 'table');
  assert.ok(tableImpact);
  
  // Transitively, docs/supabase/migrations/200_assessments.sql is impacted because it depends on gurus table definition
  const file2Impact = file1Impacts.find(i => i.node === 'docs/supabase/migrations/200_assessments.sql' && i.type === 'file');
  assert.ok(file2Impact);

  // If 'docs/supabase/migrations/200_assessments.sql' is modified, 'docs/spec.md' is impacted via markdown dependency mapping
  const file2Impacts = kg.findImpactedNodes('docs/supabase/migrations/200_assessments.sql');
  const specMdImpact = file2Impacts.find(i => i.node === 'docs/spec.md' && i.type === 'file');
  assert.ok(specMdImpact);

  console.log("✔ Impact Analysis graph traversal verified.");

  ce.close();
  cleanup();
  console.log("=========================================");
  console.log("ALL EPIC 2 TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
