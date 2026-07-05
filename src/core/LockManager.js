import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class LockManager {
  constructor(projectManager) {
    this.projectManager = projectManager;
    const meta = this.projectManager.getProjectMeta();
    this.workspacePath = meta.workspacePath;
    this.locksDir = path.join(this.workspacePath, '.aether', 'locks');
    this.defaultTimeout = meta.config.lockTimeoutMs || 300000; // 5 minutes

    // Create locks directory if not exists
    if (!fs.existsSync(this.locksDir)) {
      fs.mkdirSync(this.locksDir, { recursive: true });
    }
  }

  _getLockFilePath(targetFilePath) {
    // Normalize path to make it platform-independent
    const normalized = path.normalize(targetFilePath).replace(/\\/g, '/');
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    return path.join(this.locksDir, `${hash}.lock`);
  }

  isLocked(targetFilePath) {
    const lockFile = this._getLockFilePath(targetFilePath);
    if (!fs.existsSync(lockFile)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
      const timestamp = new Date(data.timestamp).getTime();
      const elapsed = Date.now() - timestamp;

      if (elapsed > this.defaultTimeout) {
        // Lock expired, clean it up
        fs.unlinkSync(lockFile);
        return null;
      }

      return data;
    } catch (error) {
      // Corrupted file, assume unlocked
      return null;
    }
  }

  acquireLock(agentId, targetFilePath) {
    const lockFile = this._getLockFilePath(targetFilePath);
    const currentLock = this.isLocked(targetFilePath);

    if (currentLock) {
      if (currentLock.agentId === agentId) {
        // Already locked by this agent, update timestamp
        currentLock.timestamp = new Date().toISOString();
        fs.writeFileSync(lockFile, JSON.stringify(currentLock, null, 2), 'utf-8');
        return true;
      }
      // Locked by another agent
      return false;
    }

    // Acquire new lock
    const lockData = {
      agentId,
      filePath: targetFilePath,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2), 'utf-8');
    return true;
  }

  releaseLock(agentId, targetFilePath) {
    const lockFile = this._getLockFilePath(targetFilePath);
    const currentLock = this.isLocked(targetFilePath);

    if (!currentLock) {
      return true; // Already released/unlocked
    }

    if (currentLock.agentId === agentId) {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
      return true;
    }

    // Locked by another agent, cannot release
    return false;
  }

  clearAllLocks() {
    if (fs.existsSync(this.locksDir)) {
      const files = fs.readdirSync(this.locksDir);
      for (const file of files) {
        if (file.endsWith('.lock')) {
          fs.unlinkSync(path.join(this.locksDir, file));
        }
      }
    }
  }
}
