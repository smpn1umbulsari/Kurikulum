import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase/migrations');
const outputFile = path.resolve('supabase/install_all.sql');

function getSqlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isDirectory() && file.endsWith('.sql')) {
      results.push({ name: file, path: filePath });
    }
  });
  return results;
}

async function run() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Migrations directory does not exist: ${migrationsDir}`);
    process.exit(1);
  }

  const files = getSqlFiles(migrationsDir);

  // Sort by filename prefix number to ensure correct execution order
  files.sort((a, b) => {
    const numA = parseInt(a.name.split('_')[0], 10);
    const numB = parseInt(b.name.split('_')[0], 10);
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  // Collect all object names for cleanup header
  const allTables = new Set();
  const allFunctions = new Set();
  const allViews = new Set();

  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');
    let match;
    const tableRx = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi;
    while ((match = tableRx.exec(content)) !== null) allTables.add(match[1].replace(/^public\./, ''));
    const funcRx = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_.]+)/gi;
    while ((match = funcRx.exec(content)) !== null) allFunctions.add(match[1]);
    const viewRx = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi;
    while ((match = viewRx.exec(content)) !== null) allViews.add(match[1]);
  }

  const lines = [];
  lines.push('-- SIKAD v4.0 Full Database Installation Script');
  lines.push('-- Generated automatically from migrations');
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('-- =============================================');
  lines.push('-- CLEANUP: Drop all existing objects if any');
  lines.push('-- (Safe for fresh install & re-install)');
  lines.push('-- =============================================');
  lines.push('');
  
  // Drop views first
  for (const v of allViews) lines.push(`DROP VIEW IF EXISTS ${v} CASCADE;`);
  lines.push('');
  
  // Drop functions
  for (const f of allFunctions) lines.push(`DROP FUNCTION IF EXISTS ${f} CASCADE;`);
  lines.push('');
  
  // Drop tables (CASCADE handles FK chains)
  for (const t of allTables) lines.push(`DROP TABLE IF EXISTS ${t} CASCADE;`);
  lines.push('');

  // Now append all migration files
  for (const file of files) {
    lines.push('');
    lines.push('-- =============================================');
    lines.push(`-- File: ${file.name}`);
    lines.push('-- =============================================');
    lines.push('');
    const sqlContent = fs.readFileSync(file.path, 'utf8');
    lines.push(sqlContent);
  }

  fs.writeFileSync(outputFile, lines.join('\n'));
  console.log(`Successfully combined ${files.length} SQL files into: ${outputFile}`);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
