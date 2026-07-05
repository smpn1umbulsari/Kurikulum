import { exec, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * VersionManager
 * 
 * Manages local Git version control integration, auto-commits changes,
 * creates branches, checks out revisions, and auto-generates descriptive messages.
 */
export class VersionManager {
  constructor(projectManager) {
    this.projectManager = projectManager;
  }

  /**
   * Check if workspace is a Git repository; initialize it if it isn't.
   * @returns {Promise<boolean>} True if initialized or already a repo.
   */
  async checkGitRepo() {
    const gitDir = path.join(this.projectManager.workspacePath, '.git');
    
    // Check if .git folder exists first (synchronous check)
    if (!fs.existsSync(gitDir)) {
      console.log('[VersionManager] Workspace is not a git repository. Initializing...');
      try {
        execSync('git init', { cwd: this.projectManager.workspacePath, stdio: 'pipe' });
        // Wait for filesystem to sync on Windows
        await new Promise(r => setTimeout(r, 200));
        return true;
      } catch (initErr) {
        throw new Error(`Failed to initialize git repository: ${initErr.message}`);
      }
    }
    return true;
  }

  /**
   * Stage all changes and commit them
   * @param {string} message 
   * @returns {Promise<string>} Commit hash
   */
  async createGitCommit(message = '') {
    await this.checkGitRepo();

    // 1. Stage all files
    await this._runGitCommand('git add .');

    // 2. Check if there are any staged changes to commit
    const isClean = await this.isClean();
    if (isClean) {
      throw new Error('No changes to commit. Repository is clean.');
    }

    // 3. Generate message if empty
    let commitMessage = message;
    if (!commitMessage) {
      commitMessage = await this.generateCommitMessage();
    }

    // 4. Commit changes
    // Escape double quotes in message for shell safety
    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    await this._runGitCommand(`git commit -m "${escapedMessage}"`);

    // 5. Get commit hash
    const hash = await this._runGitCommand('git rev-parse HEAD');
    return hash.trim();
  }

  /**
   * Create a new branch and checkout to it
   * @param {string} branchName 
   */
  async createBranch(branchName) {
    await this.checkGitRepo();
    await this._runGitCommand(`git checkout -b ${branchName}`);
  }

  /**
   * Checkout a specific revision (hash, branch, or tag)
   * @param {string} revision 
   */
  async checkoutRevision(revision) {
    await this.checkGitRepo();
    await this._runGitCommand(`git checkout ${revision}`);
  }

  /**
   * Check if there are uncommitted changes
   * @returns {Promise<boolean>} True if clean
   */
  async isClean() {
    await this.checkGitRepo();
    // Run diff-index to see if there are any staged changes
    return new Promise((resolve) => {
      exec('git diff-index --quiet HEAD --', { cwd: this.projectManager.workspacePath }, (error) => {
        // If git diff-index returns exit code 1, it means changes exist
        resolve(!error);
      });
    });
  }

  /**
   * Inspect current repository state and build a descriptive commit message
   * @returns {Promise<string>} Auto-generated commit message
   */
  async generateCommitMessage() {
    await this.checkGitRepo();
    
    // Check both staged and unstaged/untracked changes
    const statusOutput = await this._runGitCommand('git status --porcelain');
    const lines = statusOutput.split('\n').filter(Boolean);

    if (lines.length === 0) {
      return 'work: regular workspace update';
    }

    const modified = [];
    const added = [];
    const deleted = [];
    const untracked = [];

    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3).trim();

      // Stage status is first char, work tree status is second char
      const isModified = status.includes('M');
      const isAdded = status.includes('A') || status.trim() === 'A';
      const isDeleted = status.includes('D');
      const isUntracked = status === '??';

      if (isModified) modified.push(filePath);
      else if (isAdded) added.push(filePath);
      else if (isDeleted) deleted.push(filePath);
      else if (isUntracked) untracked.push(filePath);
    }

    const messageLines = ['work: auto-commit workspace changes', ''];

    if (added.length > 0) {
      messageLines.push('Added files:');
      added.forEach(file => messageLines.push(`  - ${file}`));
    }
    if (modified.length > 0) {
      if (added.length > 0) messageLines.push('');
      messageLines.push('Modified files:');
      modified.forEach(file => messageLines.push(`  - ${file}`));
    }
    if (deleted.length > 0) {
      if (added.length > 0 || modified.length > 0) messageLines.push('');
      messageLines.push('Deleted files:');
      deleted.forEach(file => messageLines.push(`  - ${file}`));
    }
    if (untracked.length > 0) {
      if (added.length > 0 || modified.length > 0 || deleted.length > 0) messageLines.push('');
      messageLines.push('Untracked files:');
      untracked.forEach(file => messageLines.push(`  - ${file}`));
    }

    return messageLines.join('\n');
  }

  _runGitCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.projectManager.workspacePath }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Git command failed: ${command}\nError: ${error.message}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}
