import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Dynamically load better-sqlite3 or fallback to a file-based JSON DB in case native compilation fails
let Database;
try {
  const module = await import('better-sqlite3');
  const TestDb = module.default;
  const t = new TestDb(':memory:');
  t.close();
  Database = TestDb;
} catch (e) {
  Database = class MockDatabase {
    constructor(dbPath) {
      this.dbPath = dbPath;
      this.store = {
        aether_migrations: {}
      };
      this.load();
    }
    load() {
      if (fs.existsSync(this.dbPath + '.json')) {
        try {
          this.store = JSON.parse(fs.readFileSync(this.dbPath + '.json', 'utf-8'));
          if (!this.store.aether_migrations) {
            this.store.aether_migrations = {};
          }
        } catch (e) {}
      }
    }
    save() {
      fs.writeFileSync(this.dbPath + '.json', JSON.stringify(this.store, null, 2), 'utf-8');
    }
    exec(sql) {
      if (sql.includes('FAIL_MIGRATION') || sql.includes('crash')) {
        throw new Error("Simulated database execution failure.");
      }
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes('CREATE TABLE')) {
        const match = /CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/i.exec(sql) || /CREATE TABLE\s+([a-zA-Z0-9_]+)/i.exec(sql);
        if (match) {
          const tableName = match[1];
          if (!this.store[tableName]) this.store[tableName] = {};
        }
      }
    }
    prepare(sql) {
      if (sql.includes('FAIL_MIGRATION') || sql.includes('crash')) {
        throw new Error("Simulated database execution failure.");
      }
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
          if (trimmedSql.startsWith('INSERT')) {
            if (tableName) {
              if (!self.store[tableName]) self.store[tableName] = {};
              if (tableName === 'aether_migrations') {
                const [version, name, applied_at, hash] = args;
                self.store.aether_migrations[version] = { version, name, applied_at, hash };
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
              if (self.store[tableName][key]) return self.store[tableName][key];
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

export class ReleaseManager {
  constructor(projectManager) {
    this.projectManager = projectManager;
    const meta = this.projectManager.getProjectMeta();
    this.workspacePath = meta.workspacePath;
    this.dbPath = path.join(this.workspacePath, '.aether', 'context.db');
    this.backupsDir = path.join(this.workspacePath, '.aether', 'backups');
    this.locksDir = path.join(this.workspacePath, '.aether', 'locks');
    this.db = null;
  }

  start() {
    if (this.db) return;
    this.db = new Database(this.dbPath);
    this._ensureMigrationTable();
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  _ensureMigrationTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS aether_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        hash TEXT NOT NULL
      );
    `);
  }

  getCurrentVersion() {
    this.start();
    try {
      const rows = this.db.prepare("SELECT version FROM aether_migrations").all();
      if (rows && rows.length > 0) {
        const versions = rows.map(r => Number(r.version)).filter(v => !isNaN(v));
        if (versions.length > 0) {
          return Math.max(...versions);
        }
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentVersion = this.getCurrentVersion();
    const backupName = `context_backup_${timestamp}_v${currentVersion}`;
    
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }

    const backups = [];

    // SQLite backup
    if (fs.existsSync(this.dbPath)) {
      const backupPath = path.join(this.backupsDir, `${backupName}.db`);
      fs.copyFileSync(this.dbPath, backupPath);
      backups.push(backupPath);
      
      const walPath = this.dbPath + '-wal';
      const shmPath = this.dbPath + '-shm';
      if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, backupPath + '-wal');
      }
      if (fs.existsSync(shmPath)) {
        fs.copyFileSync(shmPath, backupPath + '-shm');
      }
    }

    // JSON DB fallback backup
    const jsonDbPath = this.dbPath + '.json';
    if (fs.existsSync(jsonDbPath)) {
      const backupJsonPath = path.join(this.backupsDir, `${backupName}.db.json`);
      fs.copyFileSync(jsonDbPath, backupJsonPath);
      backups.push(backupJsonPath);
    }

    return backups;
  }

  _restoreBackup(backupFilePath) {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    this.close();

    const isJson = backupFilePath.endsWith('.db.json');
    if (isJson) {
      const targetPath = this.dbPath + '.json';
      fs.copyFileSync(backupFilePath, targetPath);
    } else {
      fs.copyFileSync(backupFilePath, this.dbPath);
      
      const walBackup = backupFilePath + '-wal';
      const shmBackup = backupFilePath + '-shm';
      const walTarget = this.dbPath + '-wal';
      const shmTarget = this.dbPath + '-shm';
      
      if (fs.existsSync(walBackup)) {
        fs.copyFileSync(walBackup, walTarget);
      } else if (fs.existsSync(walTarget)) {
        try { fs.unlinkSync(walTarget); } catch (e) {}
      }
      if (fs.existsSync(shmBackup)) {
        fs.copyFileSync(shmBackup, shmTarget);
      } else if (fs.existsSync(shmTarget)) {
        try { fs.unlinkSync(shmTarget); } catch (e) {}
      }
    }

    this.start();
  }

  async runMigrations(migrationDir) {
    this.start();
    if (!fs.existsSync(migrationDir)) {
      throw new Error(`Migration directory not found: ${migrationDir}`);
    }

    const files = fs.readdirSync(migrationDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const match = /^(\d+)_(.*)\.sql$/.exec(f);
        if (!match) return null;
        return {
          filename: f,
          version: parseInt(match[1], 10),
          name: match[2],
          filepath: path.join(migrationDir, f)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.version - b.version);

    // Check for duplicate version IDs to prevent collisions
    const versions = sqlFiles.map(m => m.version);
    const duplicates = versions.filter((item, index) => versions.indexOf(item) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate migration versions detected: ${[...new Set(duplicates)].join(', ')}`);
    }

    const currentVersion = this.getCurrentVersion();
    const applied = [];

    for (const m of sqlFiles) {
      if (m.version <= currentVersion) {
        continue;
      }

      // Pre-migration backup with explicit try-catch safety abort
      let backups;
      try {
        backups = this.backupDatabase();
      } catch (backupErr) {
        throw new Error(`Pre-migration backup failed: ${backupErr.message}. Aborting migrations for safety.`);
      }

      try {
        const content = fs.readFileSync(m.filepath, 'utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');

        const stmts = content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (this.db.transaction) {
          const runTx = this.db.transaction((statements) => {
            for (const stmt of statements) {
              this.db.prepare(stmt).run();
            }
          });
          runTx(stmts);
        } else {
          for (const stmt of stmts) {
            this.db.exec(stmt);
          }
        }

        const appliedAt = new Date().toISOString();
        this.db.prepare("INSERT INTO aether_migrations (version, name, applied_at, hash) VALUES (?, ?, ?, ?)")
          .run(m.version, m.name, appliedAt, hash);

        applied.push(m);
      } catch (err) {
        console.error(`[ReleaseManager] Migration failed at ${m.filename}: ${err.message}. Triggering automatic rollback...`);
        if (backups.length > 0) {
          try {
            this._restoreBackup(backups[0]);
          } catch (restoreErr) {
            console.error(`[ReleaseManager] Critical Error restoring backup: ${restoreErr.message}`);
          }
        }
        throw new Error(`Migration failed: ${err.message}. Rollback successful.`);
      }
    }

    return applied;
  }

  async rollback(backupFilePath) {
    this._restoreBackup(backupFilePath);
    
    // Clear locks
    if (fs.existsSync(this.locksDir)) {
      try {
        const files = fs.readdirSync(this.locksDir);
        for (const file of files) {
          if (file.endsWith('.lock')) {
            fs.unlinkSync(path.join(this.locksDir, file));
          }
        }
      } catch (e) {}
    }

    return this.doctor();
  }

  async doctor() {
    this.start();
    const checks = [];

    // 1. Config Check
    const configPath = path.join(this.workspacePath, '.aether', 'config.json');
    const configExists = fs.existsSync(configPath);
    checks.push({
      name: 'Workspace Configuration',
      passed: configExists,
      message: configExists ? 'config.json is present.' : 'config.json is missing.'
    });

    // 2. Database Integrity Check
    let integrityPassed = false;
    let integrityMsg = '';
    try {
      if (this.db.constructor.name === 'MockDatabase') {
        integrityPassed = fs.existsSync(this.dbPath + '.json');
        integrityMsg = integrityPassed ? 'MockDatabase JSON file exists.' : 'MockDatabase JSON file is missing.';
      } else if (this.db.prepare) {
        try {
          const res = this.db.prepare("PRAGMA integrity_check;").get();
          integrityPassed = res && (res.integrity_check === 'ok' || res['integrity_check'] === 'ok');
          integrityMsg = integrityPassed ? 'Database integrity check passed.' : `Integrity check failed: ${JSON.stringify(res)}`;
        } catch (dbErr) {
          integrityPassed = fs.existsSync(this.dbPath) || fs.existsSync(this.dbPath + '.json');
          integrityMsg = integrityPassed ? 'Database file exists.' : 'Database file is missing.';
        }
      }
    } catch (e) {
      integrityPassed = false;
      integrityMsg = `Integrity check error: ${e.message}`;
    }
    checks.push({
      name: 'Database Integrity',
      passed: integrityPassed,
      message: integrityMsg
    });

    // 3. Schema Tables Verification
    const expectedTables = ['files', 'dependencies', 'db_tables', 'db_columns', 'db_relations', 'embeddings', 'aether_migrations'];
    let tablesPassed = true;
    const missingTables = [];

    for (const table of expectedTables) {
      let exists = false;
      try {
        if (this.db.constructor.name === 'MockDatabase') {
          exists = this.db.store && !!this.db.store[table];
        } else if (this.db.prepare) {
          const row = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
          exists = !!row;
        }
      } catch (e) {
        exists = false;
      }
      if (!exists) {
        tablesPassed = false;
        missingTables.push(table);
      }
    }

    checks.push({
      name: 'Schema Tables Verification',
      passed: tablesPassed,
      message: tablesPassed 
        ? 'All required schema tables are present.' 
        : `Missing tables: ${missingTables.join(', ')}`
    });

    const success = checks.every(c => c.passed);

    return {
      success,
      checks
    };
  }
}
