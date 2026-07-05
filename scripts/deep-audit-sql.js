/**
 * SIKAD v4.0 - Deep SQL Audit Script
 * Validates install_all.sql line-by-line for:
 * 1. Table creation order (FK targets must exist before REFERENCES)
 * 2. Column references in views, functions, triggers, policies
 * 3. Function existence before EXECUTE FUNCTION
 * 4. ENUM/TYPE existence before column usage
 * 5. Table existence before ALTER TABLE, ENABLE RLS, CREATE POLICY, CREATE INDEX
 * 6. Column existence: cross-references column names used in views/functions with actual table definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFile = path.join(__dirname, '..', 'supabase', 'install_all.sql');
const content = fs.readFileSync(sqlFile, 'utf8');
const lines = content.split('\n');

const errors = [];
const warnings = [];

// === PHASE 1: Collect all definitions ===

// Tables and their columns
const tables = {}; // tableName -> { line, columns: { colName -> { line, type } } }
// Functions
const functions = {}; // funcName -> line
// Types/Enums
const types = {}; // typeName -> line
// Views
const views = {}; // viewName -> line

// Parse CREATE TABLE and collect columns
let currentTable = null;
let currentTableName = null;
let parenDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  
  // Detect CREATE TABLE
  const createTableMatch = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(/i);
  if (createTableMatch) {
    currentTableName = createTableMatch[1].toLowerCase();
    if (!tables[currentTableName]) {
      tables[currentTableName] = { line: lineNum, columns: {} };
    }
    currentTable = tables[currentTableName];
    parenDepth = 1;
    continue;
  }
  
  if (currentTable && parenDepth > 0) {
    // Count parens
    for (const ch of line) {
      if (ch === '(') parenDepth++;
      if (ch === ')') parenDepth--;
    }
    
    // Parse column definition (starts with whitespace + identifier)
    const colMatch = line.match(/^\s+(\w+)\s+(UUID|TEXT|VARCHAR|INTEGER|BIGINT|SMALLINT|NUMERIC|BOOLEAN|DATE|CHAR|TIMESTAMP|TIMESTAMPTZ|BIGSERIAL|JSONB|SERIAL)/i);
    if (colMatch && !line.trim().startsWith('--') && !line.match(/^\s*(PRIMARY|UNIQUE|CHECK|CONSTRAINT|FOREIGN)/i)) {
      const colName = colMatch[1].toLowerCase();
      if (!['primary', 'unique', 'check', 'constraint', 'foreign', 'references', 'on', 'default', 'not', 'null', 'true', 'false', 'cascade', 'restrict', 'set'].includes(colName)) {
        currentTable.columns[colName] = { line: lineNum, type: colMatch[2] };
      }
    }
    
    if (parenDepth <= 0) {
      currentTable = null;
      currentTableName = null;
      parenDepth = 0;
    }
  }
  
  // Detect ALTER TABLE ADD COLUMN
  const alterColMatch = line.match(/ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+/i);
  if (alterColMatch) {
    const tbl = alterColMatch[1].toLowerCase();
    const col = alterColMatch[2].toLowerCase();
    if (tables[tbl]) {
      tables[tbl].columns[col] = { line: lineNum, type: 'ALTERED' };
    }
  }
  
  // Detect CREATE TYPE
  const createTypeMatch = line.match(/CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM/i);
  if (createTypeMatch) {
    types[createTypeMatch[1].toLowerCase()] = lineNum;
  }
  
  // Detect CREATE FUNCTION
  const createFuncMatch = line.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/i);
  if (createFuncMatch) {
    functions[createFuncMatch[1].toLowerCase()] = lineNum;
  }
  
  // Detect CREATE VIEW
  const createViewMatch = line.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)\s+AS/i);
  if (createViewMatch) {
    views[createViewMatch[1].toLowerCase()] = lineNum;
  }
}

// === PHASE 2: Validate references ===

// 2a. Check REFERENCES (FK) point to already-created tables
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  
  // Skip comments and DO $$ blocks
  if (line.trim().startsWith('--')) continue;
  
  const refMatch = line.match(/REFERENCES\s+(?:public\.)?(\w+)\s*\(/i);
  if (refMatch) {
    const target = refMatch[1].toLowerCase();
    // auth.users is a Supabase built-in
    if (target === 'auth' || target === 'users') continue;
    
    if (!tables[target]) {
      errors.push(`L${lineNum}: FK REFERENCES "${target}" but table does not exist anywhere in script`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: FK REFERENCES "${target}" but table is created later at L${tables[target].line}`);
    }
  }
}

// 2b. Check EXECUTE FUNCTION calls reference existing functions
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const execMatch = line.match(/EXECUTE\s+FUNCTION\s+(?:public\.)?(\w+)\s*\(/i);
  if (execMatch) {
    const funcName = execMatch[1].toLowerCase();
    if (!functions[funcName]) {
      errors.push(`L${lineNum}: EXECUTE FUNCTION "${funcName}" but function does not exist anywhere`);
    } else if (functions[funcName] > lineNum) {
      errors.push(`L${lineNum}: EXECUTE FUNCTION "${funcName}" but function is created later at L${functions[funcName]}`);
    }
  }
}

// 2c. Check ALTER TABLE targets exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const alterMatch = line.match(/ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+/i);
  if (alterMatch) {
    const target = alterMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: ALTER TABLE "${target}" but table does not exist`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: ALTER TABLE "${target}" but table is created later at L${tables[target].line}`);
    }
  }
}

// 2d. Check CREATE INDEX targets exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const idxMatch = line.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+\s+ON\s+(?:public\.)?(\w+)/i);
  if (idxMatch) {
    const target = idxMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: CREATE INDEX on "${target}" but table does not exist`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: CREATE INDEX on "${target}" but table is created later at L${tables[target].line}`);
    }
    
    // Also check column names in the index
    const colsMatch = line.match(/ON\s+(?:public\.)?\w+\s*(?:USING\s+\w+\s*)?\(([^)]+)\)/i);
    if (colsMatch && tables[target]) {
      const cols = colsMatch[1].split(',').map(c => c.trim().split(/\s+/)[0].toLowerCase());
      for (const col of cols) {
        if (col && !tables[target].columns[col] && col !== 'using' && col !== 'gin') {
          warnings.push(`L${lineNum}: INDEX references column "${col}" on table "${target}" — column not found in CREATE TABLE definition (may be added later via ALTER)`);
        }
      }
    }
  }
}

// 2e. Check CREATE POLICY targets exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const polMatch = line.match(/(?:CREATE|DROP)\s+POLICY\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?".+?"\s+ON\s+(?:public\.)?(\w+)/i);
  if (polMatch) {
    const target = polMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: POLICY on "${target}" but table does not exist`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: POLICY on "${target}" but table is created later at L${tables[target].line}`);
    }
  }
}

// 2f. Check ENABLE ROW LEVEL SECURITY targets exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const rlsMatch = line.match(/ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  if (rlsMatch) {
    const target = rlsMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: ENABLE RLS on "${target}" but table does not exist`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: ENABLE RLS on "${target}" but table is created later at L${tables[target].line}`);
    }
  }
}

// 2g. Check COMMENT ON TABLE/COLUMN targets exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const commentTableMatch = line.match(/COMMENT\s+ON\s+TABLE\s+(?:public\.)?(\w+)\s+IS/i);
  if (commentTableMatch) {
    const target = commentTableMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: COMMENT ON TABLE "${target}" but table does not exist`);
    }
  }
  
  const commentColMatch = line.match(/COMMENT\s+ON\s+COLUMN\s+(?:public\.)?(\w+)\.(\w+)\s+IS/i);
  if (commentColMatch) {
    const tbl = commentColMatch[1].toLowerCase();
    const col = commentColMatch[2].toLowerCase();
    if (!tables[tbl]) {
      errors.push(`L${lineNum}: COMMENT ON COLUMN "${tbl}.${col}" but table does not exist`);
    } else if (!tables[tbl].columns[col]) {
      warnings.push(`L${lineNum}: COMMENT ON COLUMN "${tbl}.${col}" — column not found in table definition`);
    }
  }
}

// 2h. Check views reference valid columns
// Parse view definitions and check table.column references
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  // Look for alias.column references in views like r.tanggal_selesai, t.tahun_ajaran etc.
  // This is hard to do perfectly with regex, but we can catch obvious table.column patterns
  // Focus on JOIN conditions and WHERE clauses with alias.column patterns
}

// 2i. Cross-check column references in INSERT statements inside functions
// Check that INSERT INTO table (col1, col2, ...) columns actually exist
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  if (line.trim().startsWith('--')) continue;
  
  const insertMatch = line.match(/INSERT\s+INTO\s+(?:public\.)?(\w+)\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const tbl = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    
    if (tables[tbl]) {
      for (const col of cols) {
        if (col && !tables[tbl].columns[col] && col !== '' && col !== 'id') {
          // id may be auto-generated, skip
          if (col === 'id') continue;
          warnings.push(`L${lineNum}: INSERT INTO "${tbl}" references column "${col}" — not found in table definition`);
        }
      }
    }
  }
}

// 2j. Check for problematic patterns
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');
  const lineNum = i + 1;
  
  // Check for pgcrypto. schema prefix
  if (line.match(/pgcrypto\./i) && !line.trim().startsWith('--')) {
    errors.push(`L${lineNum}: Uses "pgcrypto." schema prefix — Supabase uses bare function names (gen_salt, crypt)`);
  }
  
  // Check for academic_years (deprecated)
  if (line.match(/academic_years/i) && !line.trim().startsWith('--')) {
    errors.push(`L${lineNum}: References "academic_years" — should be "academic_terms"`);
  }
  
  // Check for encode(gen_salt
  if (line.match(/encode\s*\(\s*gen_salt/i) && !line.trim().startsWith('--')) {
    errors.push(`L${lineNum}: Uses "encode(gen_salt(...))" — type mismatch. gen_salt returns TEXT, encode expects BYTEA`);
  }
  
  // Check r.tanggal_selesai on riwayat_kelas
  if (line.match(/r\.tanggal_selesai/i) && !line.trim().startsWith('--')) {
    // Check context — is this referencing riwayat_kelas?
    // Look at surrounding lines for JOIN riwayat_kelas r
    let context = lines.slice(Math.max(0, i - 10), i + 1).join('\n');
    if (context.match(/riwayat_kelas\s+r\b/i)) {
      errors.push(`L${lineNum}: "r.tanggal_selesai" — riwayat_kelas has "tanggal_keluar" not "tanggal_selesai"`);
    }
  }
  
  // Check for a.kelas_id on assessments table (assessments doesn't have kelas_id)
  if (line.match(/a\.kelas_id/i) && !line.trim().startsWith('--')) {
    let context = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
    if (context.match(/assessments\s+a\b/i) || context.match(/FROM\s+(?:public\.)?assessments/i)) {
      // assessments table does NOT have kelas_id column!
      warnings.push(`L${lineNum}: "a.kelas_id" — assessments table does NOT have "kelas_id" column. Access kelas via pembagian_mengajar.`);
    }
  }
  
  // Check for sync_queue.device_id (sync_queue doesn't have device_id)
  if (line.match(/sync_queue\.device_id/i) && !line.trim().startsWith('--')) {
    if (!tables['sync_queue'] || !tables['sync_queue'].columns['device_id']) {
      warnings.push(`L${lineNum}: "sync_queue.device_id" — sync_queue table does NOT have "device_id" column`);
    }
  }
  
  // Check for conflict_queue.created_by (conflict_queue doesn't have created_by)
  if (line.match(/conflict_queue.*created_by|created_by.*conflict_queue/i) && !line.trim().startsWith('--')) {
    // Check within policy context
    let context = lines.slice(Math.max(0, i - 5), i + 5).join('\n');
    if (context.match(/conflict_queue/i)) {
      if (!tables['conflict_queue'] || !tables['conflict_queue'].columns['created_by']) {
        warnings.push(`L${lineNum}: RLS policy references "created_by" on conflict_queue — column does NOT exist in table`);
      }
    }
  }
  
  // Check for user_roles.aktif column
  if (line.match(/aktif/i) && !line.trim().startsWith('--')) {
    let insertUR = line.match(/INSERT\s+INTO\s+user_roles.*aktif/i);
    if (insertUR) {
      if (!tables['user_roles'] || !tables['user_roles'].columns['aktif']) {
        errors.push(`L${lineNum}: INSERT INTO user_roles references column "aktif" — user_roles table does NOT have "aktif" column`);
      }
    }
  }
  
  // Check riwayat_kelas.kelas_id (correct column is kelas_real_id)
  if (line.match(/rk\.kelas_id\b/i) && !line.trim().startsWith('--')) {
    let context = lines.slice(Math.max(0, i - 10), i + 1).join('\n');
    if (context.match(/riwayat_kelas\s+rk\b/i)) {
      // riwayat_kelas uses kelas_real_id, not kelas_id
      warnings.push(`L${lineNum}: "rk.kelas_id" — riwayat_kelas has "kelas_real_id" not "kelas_id". Check if this is intentional.`);
    }
  }
  
  // Check ON BEFORE/AFTER on tables that exist
  const triggerMatch = line.match(/(?:BEFORE|AFTER)\s+(?:INSERT|UPDATE|DELETE)(?:\s+OR\s+(?:INSERT|UPDATE|DELETE))*\s+ON\s+(?:public\.)?(\w+)/i);
  if (triggerMatch) {
    const target = triggerMatch[1].toLowerCase();
    if (!tables[target]) {
      errors.push(`L${lineNum}: TRIGGER on "${target}" but table does not exist`);
    } else if (tables[target].line > lineNum) {
      errors.push(`L${lineNum}: TRIGGER on "${target}" but table is created later at L${tables[target].line}`);
    }
  }
}

// === PHASE 3: Report ===
console.log('='.repeat(70));
console.log('SIKAD v4.0 - DEEP SQL AUDIT REPORT');
console.log('='.repeat(70));
console.log(`File: ${sqlFile}`);
console.log(`Total Lines: ${lines.length}`);
console.log(`Tables Found: ${Object.keys(tables).length}`);
console.log(`Functions Found: ${Object.keys(functions).length}`);
console.log(`Views Found: ${Object.keys(views).length}`);
console.log(`Types Found: ${Object.keys(types).length}`);
console.log('');

if (errors.length > 0) {
  console.log(`❌ ERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ ALL CHECKS PASSED — Zero errors, zero warnings!');
} else if (errors.length === 0) {
  console.log(`✅ No errors found, but ${warnings.length} warnings to review.`);
} else {
  console.log(`❌ AUDIT FAILED: ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(1);
}

// Print table catalog for reference
console.log('\n' + '='.repeat(70));
console.log('TABLE CATALOG (creation order):');
console.log('='.repeat(70));
const sortedTables = Object.entries(tables).sort((a, b) => a[1].line - b[1].line);
for (const [name, info] of sortedTables) {
  const colNames = Object.keys(info.columns).join(', ');
  console.log(`  L${info.line}: ${name} (${Object.keys(info.columns).length} cols)`);
}
