/**
 * AETHER Platform - Code Analysis Engine
 * Version: 1.1.0
 *
 * Fungsi: Deep code analysis untuk menutupi kelemahan AETHER
 * - Trace data flow antara Dexie ↔ Supabase
 * - Analyze database relationships
 * - Map module dependencies
 * - Understand code structure deeply
 */

import fs from 'fs';
import path from 'path';

export class CodeAnalysisEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.workspacePath = projectManager.workspacePath;
    this.analysisCache = new Map();
  }

  // ============================================================
  // DATA FLOW ANALYSIS
  // ============================================================

  /**
   * Analyze data flow between frontend and backend
   * @param {string} featureName - Feature to analyze
   * @returns {Object} Data flow analysis
   */
  async analyzeDataFlow(featureName) {
    const analysis = {
      id: `flow_${Date.now()}`,
      timestamp: new Date().toISOString(),
      feature: featureName,
      localStorage: null,
      apiCalls: [],
      databaseTables: [],
      syncFlow: null,
      dataMappings: [],
      gaps: []
    };

    // 1. Analyze local storage (Dexie/IndexedDB)
    analysis.localStorage = await this._analyzeLocalStorage(featureName);

    // 2. Analyze API calls
    analysis.apiCalls = await this._analyzeAPICalls(featureName);

    // 3. Analyze database tables
    analysis.databaseTables = await this._analyzeDatabaseTables(featureName);

    // 4. Map sync flow
    analysis.syncFlow = this._mapSyncFlow(analysis);

    // 5. Identify gaps
    analysis.gaps = this._identifyFlowGaps(analysis);

    return analysis;
  }

  /**
   * Analyze local storage (Dexie schema)
   * @private
   */
  async _analyzeLocalStorage(featureName) {
    const schemaPath = path.join(this.workspacePath, 'src', 'database', 'schema.ts');
    const syncDir = path.join(this.workspacePath, 'src', 'database', 'sync');

    const result = {
      tables: [],
      indexes: [],
      syncLogic: []
    };

    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Extract table definitions
      const tableMatches = content.matchAll(/(\w+):\s*'(\w+)'/g);
      for (const match of tableMatches) {
        result.tables.push({
          name: match[1],
          type: match[2],
          definedIn: 'schema.ts'
        });
      }

      // Extract index definitions
      const indexMatches = content.matchAll(/indexes:\s*\{([^}]+)\}/g);
      for (const match of indexMatches) {
        const indexes = match[1].match(/\w+/g) || [];
        result.indexes.push(...indexes);
      }
    }

    // Analyze sync logic
    if (fs.existsSync(syncDir)) {
      const syncFiles = fs.readdirSync(syncDir);
      for (const file of syncFiles) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(syncDir, file), 'utf-8');
          result.syncLogic.push({
            file,
            hasOfflineQueue: content.includes('syncQueue') || content.includes('offline'),
            hasConflictResolution: content.includes('conflict') || content.includes('merge'),
            hasRetryLogic: content.includes('retry') || content.includes('backoff'),
            hasEncryption: content.includes('encrypt') || content.includes('AES'),
            tablesSynced: this._extractTableNames(content)
          });
        }
      }
    }

    return result;
  }

  /**
   * Analyze API calls from frontend
   * @private
   */
  async _analyzeAPICalls(featureName) {
    const result = [];
    const modulesDir = path.join(this.workspacePath, 'src', 'modules');

    if (!fs.existsSync(modulesDir)) return result;

    // Find all service files
    const serviceFiles = this._findFiles(modulesDir, /service\.ts$/);

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Extract Supabase calls
      const supabaseCalls = content.matchAll(/supabase\.from\(['"]([^'"]+)['"]\)/g);
      for (const call of supabaseCalls) {
        result.push({
          table: call[1],
          operations: this._extractOperations(content, call[1]),
          file: path.relative(this.workspacePath, file),
          hasRLS: content.includes('Row Level Security') || content.includes('RLS'),
          hasValidation: content.includes('z.') || content.includes('validate'),
          hasOfflineFallback: content.includes('offline') || content.includes('cache'),
          authRequired: content.includes('auth.') || content.includes('user')
        });
      }

      // Extract API function calls
      const apiCalls = content.matchAll(/(?:fetch|axios)\(['"]([^'"]+)['"]/g);
      for (const call of apiCalls) {
        result.push({
          endpoint: call[1],
          type: 'HTTP',
          file: path.relative(this.workspacePath, file)
        });
      }
    }

    return result;
  }

  /**
   * Analyze database tables
   * @private
   */
  async _analyzeDatabaseTables(featureName) {
    const result = [];
    const migrationsDir = path.join(this.workspacePath, 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) return result;

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Extract CREATE TABLE statements
      const tableMatches = content.matchAll(/CREATE TABLE.*?(\w+).*?\(([\s\S]*?)\);?/gi);
      for (const match of tableMatches) {
        const tableName = match[1];
        const tableBody = match[2];

        // Only include if matches feature name
        if (featureName && !tableName.toLowerCase().includes(featureName.toLowerCase())) {
          continue;
        }

        result.push({
          name: tableName,
          columns: this._extractColumns(tableBody),
          foreignKeys: this._extractForeignKeys(tableBody),
          indexes: this._extractIndexes(tableBody),
          constraints: this._extractConstraints(tableBody),
          rlsPolicies: this._extractRLSPolicies(content, tableName),
          triggers: this._extractTriggers(content, tableName),
          migrationFile: file
        });
      }
    }

    return result;
  }

  /**
   * Map sync flow between local and remote
   * @private
   */
  _mapSyncFlow(analysis) {
    const flow = {
      steps: [],
      dataMappings: [],
      potentialConflicts: []
    };

    // Step 1: Local write
    flow.steps.push({
      step: 1,
      action: 'WRITE_LOCAL',
      description: 'Data written to local storage (Dexie/IndexedDB)',
      technology: 'Dexie.js',
      tables: analysis.localStorage?.tables || []
    });

    // Step 2: Queue for sync
    if (analysis.localStorage?.syncLogic?.some(s => s.hasOfflineQueue)) {
      flow.steps.push({
        step: 2,
        action: 'QUEUE_SYNC',
        description: 'Change queued for synchronization',
        technology: 'SyncQueue (IndexedDB)',
        tables: ['sync_queue']
      });
    }

    // Step 3: API call
    if (analysis.apiCalls.length > 0) {
      flow.steps.push({
        step: 3,
        action: 'API_CALL',
        description: 'HTTP request to Supabase Edge Function',
        technology: 'Supabase Client',
        endpoints: analysis.apiCalls.map(a => a.endpoint || a.table)
      });
    }

    // Step 4: Backend validation
    flow.steps.push({
      step: 4,
      action: 'BACKEND_VALIDATION',
      description: 'Input validation, RLS check, business logic',
      technology: 'Supabase Edge Functions',
      validations: ['JWT Auth', 'Zod Schema', 'RLS Policy']
    });

    // Step 5: Database write
    if (analysis.databaseTables.length > 0) {
      flow.steps.push({
        step: 5,
        action: 'WRITE_REMOTE',
        description: 'Data written to PostgreSQL',
        technology: 'Supabase',
        tables: analysis.databaseTables.map(t => t.name)
      });
    }

    // Step 6: Sync back
    if (analysis.localStorage?.syncLogic?.some(s => s.hasConflictResolution)) {
      flow.steps.push({
        step: 6,
        action: 'SYNC_BACK',
        description: 'Updated data synced back to local storage',
        technology: 'Realtime subscriptions / Polling',
        tables: analysis.databaseTables.map(t => t.name)
      });
    }

    // Map data between local and remote
    for (const localTable of analysis.localStorage?.tables || []) {
      const remoteMatch = analysis.apiCalls.find(a => a.table === localTable.name);
      if (remoteMatch) {
        flow.dataMappings.push({
          local: localTable.name,
          remote: remoteMatch.table,
          direction: 'bidirectional',
          conflicts: remoteMatch.hasOfflineFallback ? 'possible' : 'none'
        });
      }
    }

    return flow;
  }

  /**
   * Identify gaps in data flow
   * @private
   */
  _identifyFlowGaps(analysis) {
    const gaps = [];

    // Check for missing local tables
    if (analysis.apiCalls.length > 0 && analysis.localStorage.tables.length === 0) {
      gaps.push({
        type: 'MISSING_LOCAL',
        severity: 'high',
        message: 'API calls exist but no local storage defined for offline support',
        recommendation: 'Add Dexie schema for offline-first capability'
      });
    }

    // Check for missing sync logic
    if (analysis.apiCalls.length > 0 && !analysis.localStorage.syncLogic.some(s => s.hasOfflineQueue)) {
      gaps.push({
        type: 'MISSING_SYNC_QUEUE',
        severity: 'medium',
        message: 'API calls exist but no offline queue mechanism found',
        recommendation: 'Implement sync queue with exponential backoff retry'
      });
    }

    // Check for missing RLS
    for (const api of analysis.apiCalls) {
      if (api.authRequired && !api.hasRLS) {
        gaps.push({
          type: 'MISSING_RLS',
          severity: 'high',
          message: `Table '${api.table}' requires auth but has no RLS policy`,
          recommendation: 'Add Row Level Security policies'
        });
      }
    }

    // Check for missing validation
    for (const api of analysis.apiCalls) {
      if (!api.hasValidation) {
        gaps.push({
          type: 'MISSING_VALIDATION',
          severity: 'medium',
          message: `API service '${api.file}' has no input validation`,
          recommendation: 'Add Zod schema validation'
        });
      }
    }

    return gaps;
  }

  // ============================================================
  // DATABASE RELATIONSHIP ANALYSIS
  // ============================================================

  /**
   * Analyze database relationships comprehensively
   * @param {string} tableName - Starting table
   * @returns {Object} Relationship analysis
   */
  async analyzeRelationships(tableName) {
    const analysis = {
      id: `rel_${Date.now()}`,
      timestamp: new Date().toISOString(),
      startingTable: tableName,
      directRelations: [],
      indirectRelations: [],
      dependencyTree: null,
      affectedBy: [],
      affects: []
    };

    // Get all tables
    const tables = await this._getAllTables();

    // Find direct relations (foreign keys)
    for (const table of tables) {
      if (table.name === tableName) {
        analysis.directRelations = table.foreignKeys.map(fk => ({
          targetTable: fk.referenceTable,
          column: fk.column,
          referenceColumn: fk.referenceColumn,
          type: 'has_many'
        }));
      }

      // Find tables that reference this table
      for (const fk of table.foreignKeys) {
        if (fk.referenceTable === tableName) {
          analysis.affectedBy.push({
            sourceTable: table.name,
            column: fk.column,
            referenceColumn: fk.referenceColumn,
            type: 'referenced_by'
          });
        }
      }
    }

    // Build dependency tree
    analysis.dependencyTree = this._buildDependencyTree(tableName, tables);

    return analysis;
  }

  /**
   * Get all tables from migrations
   * @private
   */
  async _getAllTables() {
    const tables = [];
    const migrationsDir = path.join(this.workspacePath, 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) return tables;

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      const tableMatches = content.matchAll(/CREATE TABLE.*?(\w+).*?\(([\s\S]*?)\);?/gi);
      for (const match of tableMatches) {
        const tableName = match[1];
        const tableBody = match[2];

        tables.push({
          name: tableName,
          columns: this._extractColumns(tableBody),
          foreignKeys: this._extractForeignKeys(tableBody),
          indexes: this._extractIndexes(tableBody),
          migrationFile: file
        });
      }
    }

    return tables;
  }

  /**
   * Build dependency tree
   * @private
   */
  _buildDependencyTree(tableName, tables) {
    const tree = {
      name: tableName,
      children: []
    };

    const visited = new Set();

    const buildChildren = (currentTable, parent) => {
      if (visited.has(currentTable.name)) return;
      visited.add(currentTable.name);

      for (const fk of currentTable.foreignKeys) {
        const childTable = tables.find(t => t.name === fk.referenceTable);
        if (childTable && !visited.has(childTable.name)) {
          const childNode = {
            name: childTable.name,
            relation: fk.column,
            children: []
          };
          parent.children.push(childNode);
          buildChildren(childTable, childNode);
        }
      }
    };

    const startTable = tables.find(t => t.name === tableName);
    if (startTable) {
      buildChildren(startTable, tree);
    }

    return tree;
  }

  // ============================================================
  // MODULE DEPENDENCY ANALYSIS
  // ============================================================

  /**
   * Analyze module dependencies
   * @param {string} modulePath - Path to module
   * @returns {Object} Dependency analysis
   */
  async analyzeModuleDependencies(modulePath) {
    const result = {
      id: `dep_${Date.now()}`,
      timestamp: new Date().toISOString(),
      module: modulePath,
      internalDependencies: [],
      externalDependencies: [],
      entryPoints: [],
      exports: [],
      circularDependencies: []
    };

    // Handle both relative and absolute paths
    const fullPath = path.isAbsolute(modulePath) ? modulePath : path.join(this.workspacePath, modulePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Module path not found: ${fullPath}`);
    }

    // Analyze TypeScript/JS files
    const files = this._findFiles(fullPath, /\.(ts|tsx|js|jsx)$/);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.workspacePath, file);

      // Extract imports
      const imports = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || [];

      for (const imp of imports) {
        const match = imp.match(/import\s+.*?from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];

          if (importPath.startsWith('.')) {
            // Internal dependency
            result.internalDependencies.push({
              from: relativePath,
              to: path.resolve(path.dirname(file), importPath)
            });
          } else if (!importPath.startsWith('@')) {
            // External dependency
            result.externalDependencies.push({
              from: relativePath,
              package: importPath
            });
          }
        }
      }
    }

    // Detect circular dependencies
    result.circularDependencies = this._detectCircularDeps(result.internalDependencies);

    return result;
  }

  /**
   * Detect circular dependencies
   * @private
   */
  _detectCircularDeps(dependencies) {
    const graph = new Map();
    const circular = [];

    // Build graph
    for (const dep of dependencies) {
      if (!graph.has(dep.from)) graph.set(dep.from, []);
      graph.get(dep.from).push(dep.to);
    }

    // DFS to find cycles
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node, path) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path])) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          circular.push({
            cycle: path.slice(path.indexOf(neighbor)),
            from: node,
            to: neighbor
          });
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return circular;
  }

  // ============================================================
  // COMPREHENSIVE FEATURE ANALYSIS
  // ============================================================

  /**
   * Analyze a feature comprehensively (combines all analysis)
   * @param {string} featureName - Feature to analyze
   * @returns {Object} Comprehensive analysis
   */
  async analyzeFeatureComprehensively(featureName) {
    const analysis = {
      id: `feat_${Date.now()}`,
      timestamp: new Date().toISOString(),
      feature: featureName,
      dataFlow: null,
      databaseSchema: null,
      relationships: null,
      moduleDependencies: null,
      codeQuality: null,
      recommendations: []
    };

    // 1. Data Flow Analysis
    analysis.dataFlow = await this.analyzeDataFlow(featureName);

    // 2. Database Schema Analysis
    const tables = await this._getAllTables();
    const featureTables = tables.filter(t =>
      t.name.toLowerCase().includes(featureName.toLowerCase())
    );

    if (featureTables.length > 0) {
      analysis.databaseSchema = featureTables;
      analysis.relationships = await this.analyzeRelationships(featureTables[0].name);
    }

    // 3. Module Dependency Analysis
    const modulePath = this._findFeatureModule(featureName);
    if (modulePath) {
      analysis.moduleDependencies = await this.analyzeModuleDependencies(modulePath);
    }

    // 4. Code Quality Analysis
    analysis.codeQuality = await this._analyzeCodeQuality(featureName);

    // 5. Generate Recommendations
    analysis.recommendations = this._generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Find feature module path
   * @private
   */
  _findFeatureModule(featureName) {
    const modulesDir = path.join(this.workspacePath, 'src', 'modules');

    if (!fs.existsSync(modulesDir)) return null;

    const normalized = featureName.toLowerCase().replace(/\s+/g, '-');
    const camelCase = this._toCamelCase(featureName);
    const pascalCase = this._toPascalCase(featureName);

    // Try different naming patterns
    const patterns = [
      path.join(modulesDir, normalized),
      path.join(modulesDir, featureName.toLowerCase()),
      path.join(modulesDir, featureName),
      path.join(modulesDir, camelCase),
      path.join(modulesDir, pascalCase),
      // Search recursively for folder matching the name
    ];

    for (const pattern of patterns) {
      if (fs.existsSync(pattern)) {
        return pattern;
      }
    }

    // Try recursive search
    const found = this._findModuleDir(modulesDir, normalized);
    if (found) return found;

    return null;
  }

  /**
   * Find module directory recursively
   * @private
   */
  _findModuleDir(dir, name) {
    if (!fs.existsSync(dir)) return null;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        if (entry.name.toLowerCase().includes(name) || name.includes(entry.name.toLowerCase())) {
          return path.join(dir, entry.name);
        }
        // Recurse
        const found = this._findModuleDir(path.join(dir, entry.name), name);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Convert to camelCase
   * @private
   */
  _toCamelCase(str) {
    return str
      .replace(/\s(.)/g, (match, p1) => p1.toUpperCase())
      .replace(/\s/g, '');
  }

  /**
   * Convert to PascalCase
   * @private
   */
  _toPascalCase(str) {
    return str
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Analyze code quality
   * @private
   */
  async _analyzeCodeQuality(featureName) {
    const quality = {
      typescript: null,
      testing: null,
      errorHandling: null,
      validation: null,
      documentation: null
    };

    const modulePath = this._findFeatureModule(featureName);
    if (!modulePath) return quality;

    const files = this._findFiles(modulePath, /\.(ts|tsx)$/);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = path.relative(this.workspacePath, file);

      // TypeScript usage
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        quality.typescript = {
          hasInterfaces: content.includes('interface ') || content.includes('type '),
          hasTypeAnnotations: /:\s*(string|number|boolean|any)/.test(content),
          score: content.includes('interface ') ? 'good' : 'needs_improvement'
        };
      }

      // Error handling
      quality.errorHandling = {
        hasTryCatch: content.includes('try {') || content.includes('try{'),
        hasErrorBoundaries: content.includes('ErrorBoundary') || content.includes('error boundary'),
        score: content.includes('try {') ? 'good' : 'needs_improvement'
      };

      // Validation
      quality.validation = {
        hasZod: content.includes('z.object') || content.includes('z.string'),
        hasReactHookForm: content.includes('useForm'),
        score: content.includes('z.') ? 'good' : 'needs_improvement'
      };
    }

    return quality;
  }

  /**
   * Generate recommendations based on analysis
   * @private
   */
  _generateRecommendations(analysis) {
    const recommendations = [];

    // Data flow recommendations
    if (analysis.dataFlow?.gaps) {
      for (const gap of analysis.dataFlow.gaps) {
        recommendations.push({
          category: 'DATA_FLOW',
          priority: gap.severity,
          finding: gap.message,
          recommendation: gap.recommendation
        });
      }
    }

    // Code quality recommendations
    if (analysis.codeQuality) {
      if (!analysis.codeQuality.typescript?.hasInterfaces) {
        recommendations.push({
          category: 'CODE_QUALITY',
          priority: 'medium',
          finding: 'Module lacks TypeScript interfaces',
          recommendation: 'Define interfaces for all data structures'
        });
      }

      if (!analysis.codeQuality.errorHandling?.hasTryCatch) {
        recommendations.push({
          category: 'CODE_QUALITY',
          priority: 'high',
          finding: 'Missing error handling (try-catch)',
          recommendation: 'Wrap async operations with proper error handling'
        });
      }
    }

    // Sync recommendations
    if (analysis.dataFlow?.localStorage && analysis.dataFlow.localStorage.syncLogic.length === 0) {
      recommendations.push({
        category: 'OFFLINE_SUPPORT',
        priority: 'high',
        finding: 'No offline sync logic implemented',
        recommendation: 'Implement Dexie sync queue with retry logic'
      });
    }

    return recommendations;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Find files matching pattern
   * @private
   */
  _findFiles(dir, pattern) {
    const results = [];

    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...this._findFiles(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Extract column definitions
   * @private
   */
  _extractColumns(tableBody) {
    const columns = [];
    const lines = tableBody.split('\n');

    for (const line of lines) {
      const match = line.match(/(\w+)\s+(\w+(?:\(\d+\))?(?:\s+\w+)*)/);
      if (match && !['PRIMARY', 'FOREIGN', 'CONSTRAINT', 'INDEX', 'UNIQUE'].includes(match[1].toUpperCase())) {
        columns.push({
          name: match[1],
          type: match[2],
          nullable: line.includes('NULL'),
          primaryKey: line.includes('PRIMARY KEY')
        });
      }
    }

    return columns;
  }

  /**
   * Extract foreign key definitions
   * @private
   */
  _extractForeignKeys(tableBody) {
    const fks = [];
    const fkMatches = tableBody.matchAll(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi);

    for (const match of fkMatches) {
      fks.push({
        column: match[1].trim(),
        referenceTable: match[2],
        referenceColumn: match[3].trim()
      });
    }

    return fks;
  }

  /**
   * Extract index definitions
   * @private
   */
  _extractIndexes(tableBody) {
    const indexes = [];
    const idxMatches = tableBody.matchAll(/INDEX\s+(\w+)\s*\(([^)]+)\)/gi);

    for (const match of idxMatches) {
      indexes.push({
        name: match[1],
        columns: match[2].split(',').map(c => c.trim())
      });
    }

    return indexes;
  }

  /**
   * Extract constraints
   * @private
   */
  _extractConstraints(tableBody) {
    const constraints = [];
    const consMatches = tableBody.matchAll(/CONSTRAINT\s+(\w+)\s+(\w+)/gi);

    for (const match of consMatches) {
      constraints.push({
        name: match[1],
        type: match[2]
      });
    }

    return constraints;
  }

  /**
   * Extract RLS policies
   * @private
   */
  _extractRLSPolicies(content, tableName) {
    const policies = [];
    const polMatches = content.matchAll(
      new RegExp(`CREATE\\s+POLICY\\s+["']([^"']+)["']\\s+ON\\s+${tableName}`, 'gi')
    );

    for (const match of polMatches) {
      policies.push(match[1]);
    }

    return policies;
  }

  /**
   * Extract triggers
   * @private
   */
  _extractTriggers(content, tableName) {
    const triggers = [];
    const trigMatches = content.matchAll(
      new RegExp(`CREATE\\s+TRIGGER\\s+(\\w+).*?ON\\s+${tableName}`, 'gi')
    );

    for (const match of trigMatches) {
      triggers.push(match[1]);
    }

    return triggers;
  }

  /**
   * Extract table names from content
   * @private
   */
  _extractTableNames(content) {
    const tables = [];
    const matches = content.matchAll(/supabase\.from\(['"]([^'"]+)['"]\)/g);

    for (const match of matches) {
      tables.push(match[1]);
    }

    return [...new Set(tables)];
  }

  /**
   * Extract operations from content
   * @private
   */
  _extractOperations(content, tableName) {
    const operations = [];

    if (content.includes(`.from('${tableName}')`)) {
      if (content.includes('.select(')) operations.push('READ');
      if (content.includes('.insert(')) operations.push('CREATE');
      if (content.includes('.update(')) operations.push('UPDATE');
      if (content.includes('.delete(')) operations.push('DELETE');
    }

    return operations;
  }

  // ============================================================
  // EXPORT METHODS
  // ============================================================

  /**
   * Export analysis to markdown format
   * @param {Object} analysis - Analysis result
   * @returns {string} Markdown formatted output
   */
  exportToMarkdown(analysis) {
    let md = `# Feature Analysis: ${analysis.feature}\n\n`;
    md += `> Generated: ${analysis.timestamp}\n\n`;

    // Data Flow
    if (analysis.dataFlow) {
      md += '## Data Flow Analysis\n\n';
      md += '### Sync Flow\n\n';
      for (const step of analysis.dataFlow.syncFlow?.steps || []) {
        md += `${step.step}. **${step.action}**\n`;
        md += `   - ${step.description}\n`;
        md += `   - Technology: ${step.technology}\n\n`;
      }

      md += '### Gaps Identified\n\n';
      for (const gap of analysis.dataFlow.gaps || []) {
        md += `- [${gap.severity.toUpperCase()}] ${gap.message}\n`;
        md += `  → ${gap.recommendation}\n\n`;
      }
    }

    // Database Schema
    if (analysis.databaseSchema) {
      md += '## Database Schema\n\n';
      for (const table of analysis.databaseSchema) {
        md += `### ${table.name}\n\n`;
        md += '| Column | Type | Nullable | PK |\n';
        md += '|--------|------|----------|----|\n';
        for (const col of table.columns) {
          md += `| ${col.name} | ${col.type} | ${col.nullable ? 'Yes' : 'No'} | ${col.primaryKey ? 'Yes' : 'No'} |\n`;
        }
        md += '\n';
      }
    }

    // Recommendations
    if (analysis.recommendations?.length > 0) {
      md += '## Recommendations\n\n';
      for (const rec of analysis.recommendations) {
        md += `### [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.finding}\n`;
        md += `**Recommendation:** ${rec.recommendation}\n\n`;
      }
    }

    return md;
  }
}

export default CodeAnalysisEngine;
