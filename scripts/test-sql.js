import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/install_all.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

let errors = 0;

// Remove comments and DO $$ blocks to avoid false positives inside them (they are procedural)
let noCommentsSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
noCommentsSql = noCommentsSql.replace(/DO\s+\$\$[\s\S]*?END\s*\$\$\s*;/gi, '');

const createdTables = new Set(['users', 'auth.users', 'auth', 'public.users']);
const createdTypes = new Set();
const createdFunctions = new Set(['now', 'gen_random_uuid', 'auth.uid', 'timezone', 'gen_salt', 'crypt', 'encode', 'coalesce', 'current_setting', 'update_timestamp']);
const createdViews = new Set();

// Regular expressions to find definitions and usages with their indices
const regexes = {
  table: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi,
  view: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi,
  type: /CREATE\s+TYPE\s+([a-zA-Z0-9_.]+)/gi,
  func: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+([a-zA-Z0-9_.]+)/gi,
  ref: /REFERENCES\s+([a-zA-Z0-9_.]+)/gi,
  alter: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi,
  trigger: /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+[a-zA-Z0-9_.]+\s+(?:BEFORE|AFTER|INSTEAD OF).+?ON\s+([a-zA-Z0-9_.]+)/gi,
  execFunc: /EXECUTE\s+(?:PROCEDURE|FUNCTION)\s+([a-zA-Z0-9_.]+)/gi,
  policy: /CREATE\s+POLICY\s+(?:".+?"|'.+?'|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)/gi,
  index: /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[a-zA-Z0-9_.]+\s+ON\s+([a-zA-Z0-9_.]+)/gi
};

const events = [];

for (const [type, regex] of Object.entries(regexes)) {
  let match;
  while ((match = regex.exec(noCommentsSql)) !== null) {
    events.push({
      type,
      name: match[1].toLowerCase(),
      index: match.index,
      context: noCommentsSql.substring(Math.max(0, match.index - 30), match.index + 50).trim()
    });
  }
}

// Sort events by index to process them sequentially
events.sort((a, b) => a.index - b.index);

for (const ev of events) {
  // Strip schema prefix for easier checking, except auth.users
  const cleanName = ev.name.includes('.') && !ev.name.startsWith('auth.') ? ev.name.split('.')[1] : ev.name;

  if (ev.type === 'table') createdTables.add(cleanName);
  if (ev.type === 'view') createdViews.add(cleanName);
  if (ev.type === 'type') createdTypes.add(cleanName);
  if (ev.type === 'func') createdFunctions.add(cleanName);

  if (ev.type === 'ref') {
    if (!createdTables.has(cleanName) && !createdTables.has(ev.name)) {
      console.error(`ERROR: Foreign key references unknown or not-yet-created table: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }

  if (ev.type === 'alter') {
    if (!createdTables.has(cleanName) && !createdViews.has(cleanName) && !createdTables.has(ev.name)) {
      console.error(`ERROR: ALTER TABLE on unknown table: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }

  if (ev.type === 'trigger') {
    if (!createdTables.has(cleanName) && !createdViews.has(cleanName) && !createdTables.has(ev.name)) {
      console.error(`ERROR: CREATE TRIGGER on unknown table: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }

  if (ev.type === 'execFunc') {
    // Strip parentheses if any were caught
    const rawFuncName = cleanName.replace(/\(\)/g, '');
    if (!createdFunctions.has(rawFuncName) && !createdFunctions.has(ev.name)) {
      console.error(`ERROR: Trigger executes unknown function: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }

  if (ev.type === 'policy') {
    if (!createdTables.has(cleanName) && !createdViews.has(cleanName) && !createdTables.has(ev.name)) {
      console.error(`ERROR: CREATE POLICY on unknown table: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }

  if (ev.type === 'index') {
    if (!createdTables.has(cleanName) && !createdViews.has(cleanName) && !createdTables.has(ev.name)) {
      console.error(`ERROR: CREATE INDEX on unknown table: '${ev.name}'`);
      console.error(`Context: ...${ev.context}...`);
      errors++;
    }
  }
}

if (errors === 0) {
  console.log('✅ Comprehensive Audit Passed: 0 schema/relation errors found.');
} else {
  console.log(`❌ Audit Failed with ${errors} error(s).`);
  process.exit(1);
}
