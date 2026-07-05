import fs from 'fs';
import path from 'path';

export class KnowledgeGraph {
  constructor(contextEngine) {
    this.contextEngine = contextEngine;
    this.adjacencyList = {};
    this.nodeTypes = {}; // map node -> type ('file' | 'table')
    this.tableToFiles = {}; // map table -> file path where it's defined
  }

  async buildGraph() {
    this.adjacencyList = {};
    this.nodeTypes = {};
    this.tableToFiles = {};

    // 1. Fetch file nodes and dependencies from context database
    const fileDependencies = this.contextEngine.getDependencies();
    
    // Add file nodes and dependencies
    for (const dep of fileDependencies) {
      this._addNode(dep.source_file, 'file');
      this._addNode(dep.target_file, 'file');
      
      // Directed edge: source_file depends on target_file
      // For impact analysis: if target_file changes, source_file is impacted.
      // So we add directed edge from target_file -> source_file.
      this._addEdge(dep.target_file, dep.source_file, 'depends_on_file');
    }

    // 2. Fetch tables and relational dependencies
    this.contextEngine.start();
    let tables = [];
    try {
      tables = this.contextEngine.db.prepare("SELECT name FROM db_tables").all();
    } catch (e) {}

    // Track which SQL files define which tables
    const files = [];
    try {
      const rows = this.contextEngine.db.prepare("SELECT path FROM files").all();
      files.push(...rows.map(r => r.path));
    } catch (e) {}

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const fullPath = path.join(this.contextEngine.workspacePath, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          // Match table creations in this file
          const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_.]+)/gi;
          let match;
          while ((match = tableRegex.exec(content)) !== null) {
            const table = match[1].replace(/"/g, '');
            this.tableToFiles[table] = file;
            
            this._addNode(table, 'table');
            this._addNode(file, 'file');
            
            // Edge: If the SQL file defining the table changes, the table schema is impacted
            this._addEdge(file, table, 'defines_table');
          }
        }
      }
    }

    // Add table-to-table dependencies (relations)
    const relations = this.contextEngine.getDbRelations();
    for (const rel of relations) {
      this._addNode(rel.from_table, 'table');
      this._addNode(rel.to_table, 'table');
      
      // Directed edge: if to_table (referenced table) changes, from_table is impacted.
      this._addEdge(rel.to_table, rel.from_table, 'referenced_by_table');

      // Transitively: if the file defining to_table changes, the file defining from_table is impacted.
      const fromFile = this.tableToFiles[rel.from_table];
      const toFile = this.tableToFiles[rel.to_table];
      if (fromFile && toFile && fromFile !== toFile) {
        this._addEdge(toFile, fromFile, 'depends_on_table_definition');
      }
    }
  }

  _addNode(node, type) {
    if (!this.adjacencyList[node]) {
      this.adjacencyList[node] = new Set();
      this.nodeTypes[node] = type;
    }
  }

  _addEdge(fromNode, toNode, relationType) {
    this._addNode(fromNode);
    this._addNode(toNode);
    this.adjacencyList[fromNode].add({ node: toNode, relation: relationType });
  }

  findImpactedNodes(targetNode) {
    // Perform BFS traversal to find all nodes impacted by changes to targetNode
    if (!this.adjacencyList[targetNode]) {
      return [];
    }

    const visited = new Set();
    const queue = [targetNode];
    const impacted = [];

    visited.add(targetNode);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current !== targetNode) {
        impacted.push({
          node: current,
          type: this.nodeTypes[current] || 'unknown'
        });
      }

      const neighbors = this.adjacencyList[current];
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.node)) {
            visited.add(neighbor.node);
            queue.push(neighbor.node);
          }
        }
      }
    }

    return impacted;
  }
}
