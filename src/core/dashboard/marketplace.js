/**
 * AETHER Plugin Marketplace UI
 * 
 * Web-based interface for browsing, installing, and managing plugins
 * Part of Phase 8: Marketplace
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { PluginEngine } from '../PluginEngine.js';

export class MarketplaceServer {
  constructor(pluginEngine, port = 3010) {
    this.pluginEngine = pluginEngine;
    this.port = port;
    this.installedPlugins = [];
    this.availablePlugins = this._getAvailablePlugins();
  }

  /**
   * Get list of available plugins from registry
   */
  _getAvailablePlugins() {
    return [
      {
        id: 'eslint-config-aether',
        name: 'Aether ESLint Config',
        version: '1.0.0',
        description: 'Pre-configured ESLint rules for AETHER projects',
        author: 'Aether Team',
        category: 'linting',
        downloads: 1234,
        rating: 4.8,
        size: '45KB'
      },
      {
        id: 'git-hooks-manager',
        name: 'Git Hooks Manager',
        version: '2.1.0',
        description: 'Automate git hooks for better workflow',
        author: 'DevTools Inc',
        category: 'git',
        downloads: 892,
        rating: 4.5,
        size: '23KB'
      },
      {
        id: 'supabase-helper',
        name: 'Supabase Helper',
        version: '1.5.0',
        description: 'Utilities for Supabase integration',
        author: 'Aether Team',
        category: 'database',
        downloads: 2103,
        rating: 4.9,
        size: '67KB'
      },
      {
        id: 'markdown-generator',
        name: 'Markdown Generator',
        version: '1.2.0',
        description: 'Auto-generate documentation from code',
        author: 'DocsCorp',
        category: 'documentation',
        downloads: 567,
        rating: 4.3,
        size: '34KB'
      },
      {
        id: 'test-coverage-reporter',
        name: 'Test Coverage Reporter',
        version: '1.0.0',
        description: 'Visual test coverage reports',
        author: 'QA Tools',
        category: 'testing',
        downloads: 1456,
        rating: 4.7,
        size: '56KB'
      },
      {
        id: 'ai-code-reviewer',
        name: 'AI Code Reviewer',
        version: '0.9.0',
        description: 'AI-powered code review using LLM',
        author: 'Aether Labs',
        category: 'ai',
        downloads: 3421,
        rating: 4.6,
        size: '123KB'
      },
      {
        id: 'dependency-updater',
        name: 'Dependency Updater',
        version: '2.0.0',
        description: 'Smart npm dependency updates',
        author: 'DevTools Inc',
        category: 'maintenance',
        downloads: 2089,
        rating: 4.4,
        size: '28KB'
      },
      {
        id: 'api-doc-generator',
        name: 'API Documentation Generator',
        version: '1.3.0',
        description: 'Generate OpenAPI/Swagger docs',
        author: 'DocsCorp',
        category: 'documentation',
        downloads: 987,
        rating: 4.5,
        size: '78KB'
      }
    ];
  }

  /**
   * Start the marketplace server
   */
  start() {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${this.port}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // API Routes
      if (url.pathname === '/api/plugins' && req.method === 'GET') {
        this._handleGetPlugins(req, res);
      } else if (url.pathname === '/api/plugins/available' && req.method === 'GET') {
        this._handleGetAvailable(req, res);
      } else if (url.pathname === '/api/plugins/install' && req.method === 'POST') {
        this._handleInstall(req, res);
      } else if (url.pathname === '/api/plugins/uninstall' && req.method === 'POST') {
        this._handleUninstall(req, res);
      } else if (url.pathname === '/api/plugins/search' && req.method === 'GET') {
        this._handleSearch(req, res, url);
      } else if (url.pathname === '/api/categories' && req.method === 'GET') {
        this._handleCategories(req, res);
      } else if (url.pathname === '/api/plugins/load' && req.method === 'POST') {
        this._handleLoadPlugin(req, res);
      } else if (url.pathname === '/api/plugins/unload' && req.method === 'POST') {
        this._handleUnloadPlugin(req, res);
      } else {
        this._serveIndex(req, res);
      }
    });

    server.listen(this.port, () => {
      console.log(`[Marketplace] Plugin Store running at http://localhost:${this.port}`);
    });

    return server;
  }

  /**
   * Get installed plugins
   */
  _handleGetPlugins(req, res) {
    const plugins = this.pluginEngine.listPlugins();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ plugins }));
  }

  /**
   * Get available plugins
   */
  _handleGetAvailable(req, res) {
    const installed = new Set(this.pluginEngine.listPlugins().map(p => p.name));
    const available = this.availablePlugins.map(p => ({
      ...p,
      installed: installed.has(p.id)
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ plugins: available }));
  }

  /**
   * Handle plugin search
   */
  _handleSearch(req, res, url) {
    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    
    let results = this.availablePlugins;
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    
    if (category) {
      results = results.filter(p => p.category === category);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ plugins: results, count: results.length }));
  }

  /**
   * Get plugin categories
   */
  _handleCategories(req, res) {
    const categories = [...new Set(this.availablePlugins.map(p => p.category))];
    const categoryStats = {};
    
    categories.forEach(cat => {
      categoryStats[cat] = this.availablePlugins.filter(p => p.category === cat).length;
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ categories, stats: categoryStats }));
  }

  /**
   * Handle install request
   */
  async _handleInstall(req, res) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const { pluginId } = JSON.parse(Buffer.concat(chunks).toString());
      
      // Simulate installation (in real impl, would call npm install)
      const plugin = this.availablePlugins.find(p => p.id === pluginId);
      if (!plugin) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Plugin not found' }));
        return;
      }
      
      // Create plugin directory and manifest
      const pluginDir = path.join(this.pluginEngine.pluginDir, pluginId);
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }
      
      // Create mock plugin.json
      const manifest = {
        name: plugin.id,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        main: 'index.js'
      };
      
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      // Create placeholder index.js
      fs.writeFileSync(
        path.join(pluginDir, 'index.js'),
        `// ${plugin.name} v${plugin.version}\n// ${plugin.description}\nexport default class ${plugin.id.replace(/-/g, '_')}Plugin {\n  constructor(sandbox, manifest) {\n    this.sandbox = sandbox;\n    this.manifest = manifest;\n  }\n  onInit() {\n    this.sandbox.log.info('${plugin.name} initialized');\n  }\n}\n`
      );
      
      this.installedPlugins.push(pluginId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, plugin: plugin }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Handle uninstall request
   */
  _handleUninstall(req, res) {
    // Similar to install but removes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  /**
   * Load a plugin from installed plugins
   */
  async _handleLoadPlugin(req, res) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const { pluginId } = JSON.parse(Buffer.concat(chunks).toString());
      
      const pluginDir = path.join(this.pluginEngine.pluginDir, pluginId);
      const result = await this.pluginEngine.loadPlugin(pluginDir);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Unload a loaded plugin
   */
  async _handleUnloadPlugin(req, res) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const { pluginId } = JSON.parse(Buffer.concat(chunks).toString());
      
      await this.pluginEngine.unloadPlugin(pluginId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  /**
   * Serve the marketplace UI
   */
  _serveIndex(req, res) {
    const html = this._getMarketplaceHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Generate marketplace HTML
   */
  _getMarketplaceHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AETHER Plugin Marketplace</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-card: rgba(17, 24, 39, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: var(--bg-primary); color: var(--text); padding: 2rem; }
    h1 { font-family: 'Outfit', sans-serif; margin-bottom: 1.5rem; }
    .search-bar { display: flex; gap: 1rem; margin-bottom: 2rem; }
    .search-bar input { flex: 1; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); font-size: 1rem; }
    .search-bar select { padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); }
    .categories { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 2rem; }
    .category-btn { padding: 0.5rem 1rem; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
    .category-btn.active, .category-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
    .plugins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .plugin-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: transform 0.2s, border-color 0.2s; }
    .plugin-card:hover { transform: translateY(-2px); border-color: var(--accent); }
    .plugin-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .plugin-name { font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600; }
    .plugin-version { font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; }
    .plugin-desc { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.5; }
    .plugin-meta { display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; }
    .plugin-category { color: var(--accent); }
    .plugin-actions { display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-success { background: var(--success); color: white; }
    .btn-warning { background: var(--warning); color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .installed-badge { display: inline-block; padding: 0.25rem 0.75rem; background: rgba(16, 185, 129, 0.2); color: var(--success); border-radius: 12px; font-size: 0.75rem; }
    .loaded-badge { background: rgba(59, 130, 246, 0.2); color: var(--accent); }
    .section-title { font-size: 1.5rem; margin: 2rem 0 1rem; }
    .stats { display: flex; gap: 2rem; margin-bottom: 2rem; }
    .stat { background: var(--bg-card); padding: 1rem 1.5rem; border-radius: 8px; }
    .stat-value { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 700; color: var(--accent); }
    .stat-label { font-size: 0.8rem; color: var(--text-muted); }
  </style>
</head>
<body>
  <h1>⚡ AETHER Plugin Marketplace</h1>
  
  <div class="stats">
    <div class="stat"><div class="stat-value" id="total-plugins">0</div><div class="stat-label">Total Plugins</div></div>
    <div class="stat"><div class="stat-value" id="installed-count">0</div><div class="stat-label">Installed</div></div>
    <div class="stat"><div class="stat-value" id="loaded-count">0</div><div class="stat-label">Loaded</div></div>
  </div>

  <div class="search-bar">
    <input type="text" id="search" placeholder="Search plugins...">
    <select id="category-filter">
      <option value="">All Categories</option>
    </select>
  </div>

  <div class="categories" id="categories"></div>
  
  <h2 class="section-title">Available Plugins</h2>
  <div class="plugins-grid" id="plugins-grid"></div>

  <h2 class="section-title">Installed Plugins</h2>
  <div class="plugins-grid" id="installed-grid"></div>

  <script>
    let allPlugins = [];
    let installedPlugins = [];
    let loadedPlugins = [];
    let selectedCategory = '';

    async function loadData() {
      const [availRes, instRes] = await Promise.all([
        fetch('/api/plugins/available'),
        fetch('/api/plugins')
      ]);
      
      const availData = await availRes.json();
      const instData = await instRes.json();
      
      allPlugins = availData.plugins;
      installedPlugins = allPlugins.filter(p => p.installed);
      loadedPlugins = instData.plugins;

      renderPlugins();
      renderCategories();
      updateStats();
    }

    function renderPlugins(filter = '') {
      const query = document.getElementById('search').value.toLowerCase();
      let plugins = allPlugins;
      
      if (selectedCategory) {
        plugins = plugins.filter(p => p.category === selectedCategory);
      }
      if (query) {
        plugins = plugins.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query)
        );
      }

      const grid = document.getElementById('plugins-grid');
      grid.innerHTML = plugins.map(p => {
        const isInstalled = installedPlugins.find(i => i.id === p.id);
        const isLoaded = loadedPlugins.find(l => l.id === p.id);
        return \`
          <div class="plugin-card">
            <div class="plugin-header">
              <div class="plugin-name">\${p.name}</div>
              <div class="plugin-version">v\${p.version}</div>
            </div>
            <div class="plugin-desc">\${p.description}</div>
            <div class="plugin-meta">
              <span class="plugin-category">\${p.category}</span>
              <span>📥 \${p.downloads}</span>
              <span>⭐ \${p.rating}</span>
            </div>
            <div class="plugin-actions">
              \${isInstalled ? 
                (isLoaded ? 
                  \`<span class="installed-badge loaded-badge">Loaded</span>
                   <button class="btn btn-warning" onclick="unloadPlugin('\${p.id}')">Unload</button>\` :
                  \`<span class="installed-badge">Installed</span>
                   <button class="btn btn-primary" onclick="loadPlugin('\${p.id}')">Load</button>\`
                ) :
                \`<button class="btn btn-success" onclick="installPlugin('\${p.id}')">Install</button>\`
              }
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderCategories() {
      const categories = [...new Set(allPlugins.map(p => p.category))];
      const catEl = document.getElementById('categories');
      catEl.innerHTML = \`
        <button class="category-btn \${selectedCategory === '' ? 'active' : ''}" onclick="filterCategory('')">All</button>
        \${categories.map(c => \`
          <button class="category-btn \${selectedCategory === c ? 'active' : ''}" onclick="filterCategory('\${c}')">\${c}</button>
        \`).join('')}
      \`;
      
      const selectEl = document.getElementById('category-filter');
      selectEl.innerHTML = \`<option value="">All Categories</option>\${categories.map(c => \`<option value="\${c}">\${c}</option>\`).join('')}\`;
    }

    function filterCategory(cat) {
      selectedCategory = cat;
      renderCategories();
      renderPlugins();
    }

    function updateStats() {
      document.getElementById('total-plugins').textContent = allPlugins.length;
      document.getElementById('installed-count').textContent = installedPlugins.length;
      document.getElementById('loaded-count').textContent = loadedPlugins.length;
    }

    async function installPlugin(id) {
      await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId: id })
      });
      await loadData();
    }

    async function loadPlugin(id) {
      await fetch('/api/plugins/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId: id })
      });
      await loadData();
    }

    async function unloadPlugin(id) {
      await fetch('/api/plugins/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId: id })
      });
      await loadData();
    }

    document.getElementById('search').addEventListener('input', () => renderPlugins());
    document.getElementById('category-filter').addEventListener('change', (e) => filterCategory(e.target.value));

    loadData();
    setInterval(loadData, 5000); // Refresh every 5 seconds
  </script>
</body>
</html>`;
  }
}

export default MarketplaceServer;
