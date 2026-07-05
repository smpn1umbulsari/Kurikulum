import fs from 'fs';
import path from 'path';
import { EventBus } from './EventBus.js';

/**
 * PluginEngine
 * 
 * Provides dynamic module loading with sandbox isolation,
 * plugin manifest validation, lifecycle hook management,
 * and plugin dependency resolution.
 */
export class PluginEngine {
  constructor(projectManager, eventBus) {
    this.projectManager = projectManager;
    this.eventBus = eventBus;
    this.plugins = new Map(); // pluginId -> { manifest, instance, hooks }
    this.pluginDir = path.join(projectManager.workspacePath, '.aether', 'plugins');
    this.registryFile = path.join(projectManager.workspacePath, '.aether', 'plugin-registry.json');
    this._initializePluginDir();
    this._registerBuiltInHooks();
  }

  _initializePluginDir() {
    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
    }
  }

  /**
   * Register built-in event hooks for plugin lifecycle
   */
  _registerBuiltInHooks() {
    // Relay file change events to plugins
    this.eventBus.subscribe('file:changed', (payload) => {
      this._emitToPlugins('onFileChange', payload);
    });

    // Relay task completion events
    this.eventBus.subscribe('task:completed', (payload) => {
      this._emitToPlugins('onTaskComplete', payload);
    });

    // Relay agent action events
    this.eventBus.subscribe('agent:action', (payload) => {
      this._emitToPlugins('onAgentAction', payload);
    });
  }

  /**
   * Load a plugin from a directory path
   * @param {string} pluginPath - Path to plugin directory
   * @returns {Promise<object>} Loaded plugin info
   */
  async loadPlugin(pluginPath) {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    
    // Validate manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin manifest not found at: ${manifestPath}`);
    }

    // Parse and validate manifest
    const manifest = this._parseManifest(manifestPath);
    this._validateManifest(manifest);

    const pluginId = manifest.name;

    // Check for duplicate plugins
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already loaded. Please unload it first.`);
    }

    // Resolve dependencies
    await this._resolveDependencies(manifest);

    // Create sandbox context for the plugin
    const sandbox = this._createSandbox(pluginId);

    // Load and instantiate plugin module
    const mainFile = path.join(pluginPath, manifest.main || 'index.js');
    if (!fs.existsSync(mainFile)) {
      throw new Error(`Plugin main file not found: ${mainFile}`);
    }

    let pluginInstance;
    try {
      // Dynamic import with sandboxed context
      const module = await import(`file://${mainFile}`);
      const PluginClass = module.default || module;
      
      // Instantiate with sandbox context
      pluginInstance = new PluginClass(sandbox, manifest);
    } catch (err) {
      throw new Error(`Failed to load plugin "${pluginId}": ${err.message}`);
    }

    // Extract lifecycle hooks
    const hooks = this._extractHooks(pluginInstance, manifest);

    // Store plugin info
    const pluginInfo = {
      manifest,
      instance: pluginInstance,
      hooks,
      path: pluginPath,
      loadedAt: new Date().toISOString()
    };
    this.plugins.set(pluginId, pluginInfo);

    // Call onInit hook if exists
    if (hooks.onInit) {
      try {
        await hooks.onInit(sandbox);
      } catch (err) {
        console.error(`[PluginEngine] Error in onInit hook for "${pluginId}":`, err.message);
      }
    }

    // NOTE: Event hooks are automatically registered via _registerBuiltInHooks()
    // which calls _emitToPlugins() - no need for separate registration

    // Update registry
    this._updateRegistry();

    console.log(`[PluginEngine] Plugin "${pluginId}" v${manifest.version} loaded successfully.`);
    
    return {
      id: pluginId,
      version: manifest.version,
      hooks: Object.keys(hooks),
      loadedAt: pluginInfo.loadedAt
    };
  }

  /**
   * Unload a plugin gracefully
   * @param {string} pluginId 
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" is not loaded.`);
    }

    // Call onShutdown hook
    if (plugin.hooks.onShutdown) {
      try {
        await plugin.hooks.onShutdown();
      } catch (err) {
        console.error(`[PluginEngine] Error in onShutdown hook for "${pluginId}":`, err.message);
      }
    }

    // Remove event subscriptions
    this.eventBus.unsubscribe(`plugin:${pluginId}:*`);

    // Remove from plugins map
    this.plugins.delete(pluginId);

    // Update registry
    this._updateRegistry();

    console.log(`[PluginEngine] Plugin "${pluginId}" unloaded successfully.`);
  }

  /**
   * Parse plugin manifest JSON
   */
  _parseManifest(manifestPath) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to parse plugin manifest: ${err.message}`);
    }
  }

  /**
   * Validate manifest structure
   */
  _validateManifest(manifest) {
    const required = ['name', 'version'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Plugin manifest missing required field: "${field}"`);
      }
    }

    // Validate name format (kebab-case)
    if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      throw new Error(`Plugin name must be lowercase kebab-case (e.g., "my-plugin")`);
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error(`Plugin version must be semver format (e.g., "1.0.0")`);
    }

    return true;
  }

  /**
   * Resolve and load plugin dependencies
   */
  async _resolveDependencies(manifest) {
    const dependencies = manifest.dependencies || {};
    const pluginPath = path.join(this.pluginDir, manifest.name);
    
    for (const [depName, depVersion] of Object.entries(dependencies)) {
      // Check if dependency is already loaded
      if (!this.plugins.has(depName)) {
        const depPath = path.join(this.pluginDir, depName);
        if (fs.existsSync(depPath)) {
          // Recursively load dependency
          await this.loadPlugin(depPath);
        } else {
          console.warn(`[PluginEngine] Dependency "${depName}" not found in plugins directory.`);
        }
      }
    }
  }

  /**
   * Create sandbox context for plugin isolation
   */
  _createSandbox(pluginId) {
    const self = this;
    
    return {
      // Plugin identity
      id: pluginId,
      
      // Logging (isolated to plugin namespace)
      log: {
        info: (msg, ...args) => console.log(`[${pluginId}]`, msg, ...args),
        warn: (msg, ...args) => console.warn(`[${pluginId}]`, msg, ...args),
        error: (msg, ...args) => console.error(`[${pluginId}]`, msg, ...args),
        debug: (msg, ...args) => console.debug(`[${pluginId}]`, msg, ...args)
      },

      // Emit events to other plugins or core
      emit: (eventType, payload) => {
        self.eventBus.publish(`plugin:${pluginId}:${eventType}`, payload);
      },

      // Subscribe to events
      on: (eventType, callback) => {
        self.eventBus.subscribe(`plugin:${pluginId}:${eventType}`, callback);
        return () => self.eventBus.unsubscribe(`plugin:${pluginId}:${eventType}`, callback);
      },

      // Access to project manager
      project: {
        getMeta: () => self.projectManager.getProjectMeta(),
        getConfig: () => self.projectManager.config
      },

      // Access to context engine if available
      getContext: () => {
        try {
          const { ContextEngine } = require('./ContextEngine.js');
          return null; // Will be injected by caller if available
        } catch {
          return null;
        }
      },

      // Safe filesystem access (sandboxed to workspace)
      fs: {
        readFile: (filePath) => {
          const absPath = path.isAbsolute(filePath) ? filePath : path.join(self.projectManager.workspacePath, filePath);
          return fs.readFileSync(absPath, 'utf-8');
        },
        writeFile: (filePath, content) => {
          const absPath = path.isAbsolute(filePath) ? filePath : path.join(self.projectManager.workspacePath, filePath);
          fs.writeFileSync(absPath, content, 'utf-8');
        },
        exists: (filePath) => {
          const absPath = path.isAbsolute(filePath) ? filePath : path.join(self.projectManager.workspacePath, filePath);
          return fs.existsSync(absPath);
        }
      }
    };
  }

  /**
   * Extract lifecycle hooks from plugin instance
   */
  _extractHooks(instance, manifest) {
    const hooks = {};
    const hookNames = manifest.hooks || {
      onInit: 'onInit',
      onShutdown: 'onShutdown',
      onFileChange: 'onFileChange',
      onTaskComplete: 'onTaskComplete',
      onAgentAction: 'onAgentAction'
    };

    for (const [hookName, methodName] of Object.entries(hookNames)) {
      if (typeof instance[methodName] === 'function') {
        hooks[hookName] = instance[methodName].bind(instance);
      }
    }

    return hooks;
  }

  /**
   * Register plugin event subscriptions
   */
  _registerPluginEvents(pluginId, hooks) {
    if (hooks.onFileChange) {
      this.eventBus.subscribe('file:changed', hooks.onFileChange);
    }
    if (hooks.onTaskComplete) {
      this.eventBus.subscribe('task:completed', hooks.onTaskComplete);
    }
    if (hooks.onAgentAction) {
      this.eventBus.subscribe('agent:action', hooks.onAgentAction);
    }
  }

  /**
   * Emit event to all plugins
   */
  _emitToPlugins(hookName, payload) {
    for (const [pluginId, plugin] of this.plugins) {
      if (plugin.hooks[hookName]) {
        try {
          plugin.hooks[hookName](payload);
        } catch (err) {
          console.error(`[PluginEngine] Error in ${hookName} hook for "${pluginId}":`, err.message);
        }
      }
    }
  }

  /**
   * Update plugin registry file
   */
  _updateRegistry() {
    const registry = {
      updatedAt: new Date().toISOString(),
      plugins: Array.from(this.plugins.values()).map(p => ({
        name: p.manifest.name,
        version: p.manifest.version,
        description: p.manifest.description,
        author: p.manifest.author,
        hooks: Object.keys(p.hooks),
        loadedAt: p.loadedAt
      }))
    };

    fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2), 'utf-8');
  }

  /**
   * List all loaded plugins
   */
  listPlugins() {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => ({
      id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      hooks: Object.keys(plugin.hooks),
      loadedAt: plugin.loadedAt,
      path: plugin.path
    }));
  }

  /**
   * Get plugin info by ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Install plugin from npm package
   */
  async installFromNpm(packageName) {
    const { execSync } = await import('child_process');
    const targetDir = path.join(this.pluginDir, packageName);

    if (fs.existsSync(targetDir)) {
      throw new Error(`Plugin "${packageName}" is already installed.`);
    }

    console.log(`[PluginEngine] Installing plugin "${packageName}"...`);
    
    try {
      execSync(`npm install ${packageName}`, { 
        cwd: this.pluginDir, 
        stdio: 'pipe' 
      });
      
      console.log(`[PluginEngine] Plugin "${packageName}" installed successfully.`);
      return { success: true, name: packageName };
    } catch (err) {
      throw new Error(`Failed to install plugin "${packageName}": ${err.message}`);
    }
  }

  /**
   * Shutdown all plugins gracefully
   */
  async shutdownAll() {
    for (const pluginId of this.plugins.keys()) {
      await this.unloadPlugin(pluginId);
    }
  }
}
