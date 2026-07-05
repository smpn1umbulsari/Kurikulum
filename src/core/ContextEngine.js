import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SemanticIndexer } from './SemanticIndexer.js';

// Dynamically load better-sqlite3 or fallback to a file-based JSON DB in case native compilation fails
let Database;
try {
  const module = await import('better-sqlite3');
  const TestDb = module.default;
  const t = new TestDb(':memory:');
  t.close();
  Database = TestDb;
} catch (e) {
  console.warn("Warning: better-sqlite3 failed to load. Falling back to MockDatabase.");
  Database = class MockDatabase {
    constructor(dbPath) {
      this.dbPath = dbPath;
      this.store = {
        files: {},
        dependencies: {},
        db_tables: {},
        db_columns: {},
        db_relations: {},
        embeddings: {}
      };
      this.load();
    }
    load() {
      if (fs.existsSync(this.dbPath + '.json')) {
        try {
          this.store = JSON.parse(fs.readFileSync(this.dbPath + '.json', 'utf-8'));
        } catch (e) {}
      }
    }
    save() {
      fs.writeFileSync(this.dbPath + '.json', JSON.stringify(this.store, null, 2), 'utf-8');
    }
    exec(sql) {
      // Stub execution
    }
    prepare(sql) {
      const self = this;
      let tableName = "";
      const deleteMatch = /DELETE\s+FROM\s+([a-zA-Z0-9_]+)/i.exec(sql);
      const selectMatch = /SELECT\s+.*?\s+FROM\s+([a-zA-Z0-9_]+)/i.exec(sql);
      const insertMatch = /INSERT\s+(?:OR\s+[A-Z]+\s+)?INTO\s+([a-zA-Z0-9_]+)/i.exec(sql);
      
      if (deleteMatch) tableName = deleteMatch[1];
      else if (selectMatch) tableName = selectMatch[1];
      else if (insertMatch) tableName = insertMatch[1];

      return {
        run: (...args) => {
          const trimmedSql = sql.trim().toUpperCase();
          if (trimmedSql.startsWith('DELETE')) {
            if (tableName && self.store[tableName]) {
              self.store[tableName] = {};
            }
          } else if (trimmedSql.startsWith('INSERT')) {
            if (tableName) {
              if (!self.store[tableName]) self.store[tableName] = {};
              if (tableName === 'files') {
                const [path, hash, size, last_modified] = args;
                self.store.files[path] = { path, hash, size, last_modified };
              } else if (tableName === 'dependencies') {
                const [source_file, target_file, type = 'markdown'] = args;
                const key = `${source_file}::${target_file}::${type}`;
                self.store.dependencies[key] = { source_file, target_file, type };
              } else if (tableName === 'db_tables') {
                const [name, ddl] = args;
                self.store.db_tables[name] = { name, ddl };
              } else if (tableName === 'db_columns') {
                const [table_name, name, type, is_pk] = args;
                const key = `${table_name}::${name}`;
                self.store.db_columns[key] = { table_name, name, type, is_pk };
              } else if (tableName === 'db_relations') {
                const [from_table, to_table, from_column, to_column] = args;
                const key = `${from_table}::${to_table}::${from_column}::${to_column}`;
                self.store.db_relations[key] = { from_table, to_table, from_column, to_column };
              } else if (tableName === 'embeddings') {
                const [path, hash, vector] = args;
                self.store.embeddings[path] = { path, hash, vector };
              }
            }
          }
          self.save();
          return { changes: 1 };
        },
        all: (...args) => {
          if (tableName && self.store[tableName]) {
            return Object.values(self.store[tableName]);
          }
          return [];
        },
        get: (...args) => {
          if (tableName && self.store[tableName]) {
            if (args.length > 0 && typeof args[0] === 'string') {
              const key = args[0];
              if (self.store[tableName][key]) {
                return self.store[tableName][key];
              }
              const found = Object.values(self.store[tableName]).find(item => item.path === key || item.name === key || item.table_name === key);
              if (found) return found;
            }
            const vals = Object.values(self.store[tableName]);
            return vals[0] || null;
          }
          return null;
        }
      };
    }
    close() {
      this.save();
    }
  };
}

export class ContextEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    const meta = this.projectManager.getProjectMeta();
    this.workspacePath = meta.workspacePath;
    this.dbPath = path.join(this.workspacePath, '.aether', 'context.db');
    this.db = null;
  }

  start() {
    if (this.db) return;
    this.db = new Database(this.dbPath);
    this._initializeSchema();
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  _initializeSchema() {
    // Enable WAL mode for better concurrency if using SQLite
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
    } catch (e) {}

    // Files metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        size INTEGER NOT NULL,
        last_modified TEXT NOT NULL
      );
    `);

    // Dependencies mapping table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependencies (
        source_file TEXT NOT NULL,
        target_file TEXT NOT NULL,
        type TEXT NOT NULL,
        PRIMARY KEY (source_file, target_file, type)
      );
    `);

    // Database tables schema extraction cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_tables (
        name TEXT PRIMARY KEY,
        ddl TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_columns (
        table_name TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_pk INTEGER DEFAULT 0,
        PRIMARY KEY (table_name, name)
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS db_relations (
        from_table TEXT NOT NULL,
        to_table TEXT NOT NULL,
        from_column TEXT NOT NULL,
        to_column TEXT NOT NULL,
        PRIMARY KEY (from_table, to_table, from_column, to_column)
      );
    `);

    // Local file vector embeddings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        path TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        vector TEXT NOT NULL
      );
    `);
  }

  _calculateFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async syncWorkspace() {
    this.start();
    const meta = this.projectManager.getProjectMeta();
    const ignoredPatterns = meta.config.ignoredPaths || [];
    
    const ignoredCheckers = ignoredPatterns.map(pattern => {
      if (!pattern.includes('*') && !pattern.includes('/') && !pattern.includes('\\')) {
        return new RegExp(`[\\\\/]${pattern}[\\\\/]`);
      }
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(2);
        return new RegExp(`\\.${ext}$`);
      }
      return pattern;
    });
    ignoredCheckers.push(new RegExp(`\\.aether`));

    const filesToSync = [];
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.workspacePath, fullPath).replace(/\\/g, '/');
        
        // Skip ignored paths
        const isIgnored = ignoredCheckers.some(checker => {
          if (checker instanceof RegExp) {
            return checker.test(fullPath) || checker.test(relPath);
          }
          return relPath.includes(checker) || fullPath.includes(checker);
        });

        if (isIgnored) continue;

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.md', '.sql', '.txt', '.js', '.json'].includes(ext)) {
            filesToSync.push({ relPath, fullPath, ext });
          }
        }
      }
    };

    scanDir(this.workspacePath);

    // Clear old parsed DB structures and dependencies before rebuild
    try {
      this.db.prepare("DELETE FROM db_tables").run();
      this.db.prepare("DELETE FROM db_columns").run();
      this.db.prepare("DELETE FROM db_relations").run();
      this.db.prepare("DELETE FROM dependencies").run();
    } catch (e) {}

    for (const file of filesToSync) {
      const stats = fs.statSync(file.fullPath);
      const hash = this._calculateFileHash(file.fullPath);
      const mtime = stats.mtime.toISOString();
      const size = stats.size;

      // Update files table
      try {
        this.db.prepare(`
          INSERT INTO files (path, hash, size, last_modified)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(path) DO UPDATE SET
            hash = EXCLUDED.hash,
            size = EXCLUDED.size,
            last_modified = EXCLUDED.last_modified
        `).run(file.relPath, hash, size, mtime);
      } catch (e) {}

      // File-specific dependency parsing
      if (file.ext === '.md') {
        this._parseMarkdownDependencies(file.relPath, file.fullPath);
      } else if (file.ext === '.sql') {
        this._parseSQLSchemaAndDependencies(file.relPath, file.fullPath);
      }
    }

    // Run semantic indexer on all synced files
    try {
      const indexer = new SemanticIndexer(this);
      await indexer.indexWorkspace();
    } catch (err) {
      console.warn("[ContextEngine] Semantic indexing failed during sync:", err.message);
    }
  }

  _parseMarkdownDependencies(relPath, fullPath) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Regex to capture markdown relative links: [label](relative/path/to/file.md)
    const linkRegex = /\[[^\]]+\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const targetLink = match[1].split('#')[0]; // Strip anchors
      // If it's a relative path and doesn't start with http/https
      if (!targetLink.startsWith('http') && !targetLink.startsWith('mailto:')) {
        const fileDir = path.dirname(relPath);
        const resolvedRelPath = path.normalize(path.join(fileDir, targetLink)).replace(/\\/g, '/');
        
        // Only register if target file exists
        if (fs.existsSync(path.join(this.workspacePath, resolvedRelPath))) {
          try {
            this.db.prepare(`
              INSERT OR IGNORE INTO dependencies (source_file, target_file, type)
              VALUES (?, ?, 'markdown')
            `).run(relPath, resolvedRelPath);
          } catch (e) {}
        }
      }
    }
  }

  _parseSQLSchemaAndDependencies(relPath, fullPath) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // 1. Parse tables: CREATE TABLE [IF NOT EXISTS] table_name ( columns... )
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)\s*\(([\s\S]*?)\)(?:\s*;|\s+WITH\s*\(|;)/gi;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(content)) !== null) {
      const tableName = tableMatch[1].replace(/"/g, '');
      const ddl = tableMatch[0];
      const columnsBlock = tableMatch[2];

      try {
        this.db.prepare(`
          INSERT INTO db_tables (name, ddl)
          VALUES (?, ?)
          ON CONFLICT(name) DO UPDATE SET ddl = EXCLUDED.ddl
        `).run(tableName, ddl);
      } catch (e) {}

      // 2. Parse inline Primary Keys & Columns
      // Simple regex split by commas while trying to avoid commas inside parentheses like NUMERIC(5,2)
      const columnDefs = [];
      let depth = 0;
      let currentField = "";
      for (let i = 0; i < columnsBlock.length; i++) {
        const char = columnsBlock[i];
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (char === ',' && depth === 0) {
          columnDefs.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      if (currentField.trim()) {
        columnDefs.push(currentField.trim());
      }

      for (const def of columnDefs) {
        // Skip table level constraints like UNIQUE, PRIMARY KEY (col1, col2), etc.
        const upperDef = def.toUpperCase();
        if (upperDef.startsWith('CONSTRAINT') || upperDef.startsWith('UNIQUE') || upperDef.startsWith('PRIMARY KEY') || upperDef.startsWith('FOREIGN KEY')) {
          // Parse table-level references
          const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*([a-zA-Z0-9_.]+)\s*\(([^)]+)\)/i.exec(def);
          if (fkMatch) {
            const fromCols = fkMatch[1].replace(/"/g, '').trim();
            const toTable = fkMatch[2].replace(/"/g, '').trim();
            const toCols = fkMatch[3].replace(/"/g, '').trim();
            try {
              this.db.prepare(`
                INSERT OR IGNORE INTO db_relations (from_table, to_table, from_column, to_column)
                VALUES (?, ?, ?, ?)
              `).run(tableName, toTable, fromCols, toCols);
            } catch (e) {}
          }
          continue;
        }

        // Standard column definition: col_name type [constraints]
        const parts = def.split(/\s+/);
        if (parts.length < 2) continue;

        const colName = parts[0].replace(/"/g, '');
        const colType = parts[1];
        const isPk = upperDef.includes('PRIMARY KEY') ? 1 : 0;

        try {
          this.db.prepare(`
            INSERT INTO db_columns (table_name, name, type, is_pk)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(table_name, name) DO UPDATE SET
              type = EXCLUDED.type,
              is_pk = EXCLUDED.is_pk
          `).run(tableName, colName, colType, isPk);
        } catch (e) {}

        // Parse inline references: col_name type REFERENCES target_table(target_col)
        const inlineRefMatch = /REFERENCES\s+([a-zA-Z0-9_.]+)\s*\(([^)]+)\)/i.exec(def);
        if (inlineRefMatch) {
          const toTable = inlineRefMatch[1].replace(/"/g, '').trim();
          const toCol = inlineRefMatch[2].replace(/"/g, '').trim();
          try {
            this.db.prepare(`
              INSERT OR IGNORE INTO db_relations (from_table, to_table, from_column, to_column)
              VALUES (?, ?, ?, ?)
            `).run(tableName, toTable, colName, toCol);
          } catch (e) {}
        }
      }
    }
  }

  getDependencies() {
    this.start();
    try {
      return this.db.prepare("SELECT * FROM dependencies").all();
    } catch (e) {
      return [];
    }
  }

  getDbRelations() {
    this.start();
    try {
      return this.db.prepare("SELECT * FROM db_relations").all();
    } catch (e) {
      return [];
    }
  }

  saveEmbedding(filePath, hash, vectorArray) {
    this.start();
    try {
      const vectorJson = JSON.stringify(vectorArray);
      this.db.prepare(`
        INSERT INTO embeddings (path, hash, vector)
        VALUES (?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          hash = EXCLUDED.hash,
          vector = EXCLUDED.vector
      `).run(filePath, hash, vectorJson);
    } catch (e) {
      console.error("[ContextEngine] Error saving embedding:", e.message);
    }
  }

  getEmbedding(filePath, currentHash = null) {
    this.start();
    try {
      const row = this.db.prepare("SELECT hash, vector FROM embeddings WHERE path = ?").get(filePath);
      if (row) {
        if (currentHash !== null && row.hash !== currentHash) {
          return null;
        }
        return JSON.parse(row.vector);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  getAllEmbeddings() {
    this.start();
    try {
      const rows = this.db.prepare("SELECT path, hash, vector FROM embeddings").all();
      return rows
        .filter(r => fs.existsSync(path.join(this.workspacePath, r.path)))
        .map(r => ({
          path: r.path,
          hash: r.hash,
          vector: JSON.parse(r.vector)
        }));
    } catch (e) {
      return [];
    }
  }
}
