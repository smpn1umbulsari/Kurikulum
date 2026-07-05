import chokidar from 'chokidar';
import path from 'path';

export class FileWatcher {
  constructor(projectManager, eventBus) {
    this.projectManager = projectManager;
    this.eventBus = eventBus;
    this.watcher = null;
    this.isWatching = false;
  }

  start() {
    if (this.isWatching) return;

    const meta = this.projectManager.getProjectMeta();
    const watchPath = meta.workspacePath;
    const config = meta.config;
    
    // Parse ignored rules
    const ignoredPatterns = config.ignoredPaths || [];
    
    // Convert rules into regex or glob paths that chokidar can use
    const ignoredCheckers = ignoredPatterns.map(pattern => {
      // If it's a simple folder name, ignore any path containing it
      if (!pattern.includes('*') && !pattern.includes('/') && !pattern.includes('\\')) {
        return new RegExp(`[\\\\/]${pattern}[\\\\/]`);
      }
      // If it's a file glob like *.zip
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(2);
        return new RegExp(`\\.${ext}$`);
      }
      return pattern;
    });

    // Add .aether/locks folder to ignore to prevent feedback loops on lock changes
    ignoredCheckers.push(new RegExp(`\\.aether[\\\\/]locks`));
    // Ignore config.json updates to avoid infinite loops if config updates trigger re-watch
    ignoredCheckers.push(new RegExp(`\\.aether[\\\\/]config\\.json`));

    this.watcher = chokidar.watch(watchPath, {
      ignored: (filePath) => {
        // Check if file matches any ignored checker
        return ignoredCheckers.some(checker => {
          if (checker instanceof RegExp) {
            return checker.test(filePath);
          }
          return filePath.includes(checker);
        });
      },
      persistent: true,
      ignoreInitial: true, // Do not trigger events for existing files on startup
      depth: 99
    });

    this.watcher
      .on('add', (filePath) => {
        const relPath = path.relative(watchPath, filePath).replace(/\\/g, '/');
        this.eventBus.publish('file:created', { path: relPath, fullPath: filePath });
      })
      .on('change', (filePath) => {
        const relPath = path.relative(watchPath, filePath).replace(/\\/g, '/');
        this.eventBus.publish('file:changed', { path: relPath, fullPath: filePath });
      })
      .on('unlink', (filePath) => {
        const relPath = path.relative(watchPath, filePath).replace(/\\/g, '/');
        this.eventBus.publish('file:deleted', { path: relPath, fullPath: filePath });
      });

    this.isWatching = true;
  }

  async stop() {
    if (!this.isWatching) return;
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
  }
}
