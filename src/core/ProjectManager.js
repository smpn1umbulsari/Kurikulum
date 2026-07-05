import fs from 'fs';
import path from 'path';

export class ProjectManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath || process.cwd();
    this.configDir = path.join(this.workspacePath, '.aether');
    this.configFilePath = path.join(this.configDir, 'config.json');
    this.status = 'bootstrap'; // bootstrap -> active -> suspend -> destroy
  }

  async initializeProject() {
    this.status = 'bootstrap';
    
    // Create .aether directory
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Default configuration
    const defaultConfig = {
      name: "SIKAD v4.0 & AETHER Workspace",
      version: "1.0.0",
      ignoredPaths: [
        "node_modules",
        ".git",
        "*.zip",
        "final boss.md"
      ],
      agentProfiles: [
        { id: "architect", role: "Software Architect", model: "gemini-1.5-pro" },
        { id: "developer", role: "Backend Lead", model: "gemini-1.5-pro" },
        { id: "qa", role: "QA Architect", model: "gemini-1.5-flash" }
      ],
      lockTimeoutMs: 300000 // 5 minutes
    };

    // Write default config if it doesn't exist
    if (!fs.existsSync(this.configFilePath)) {
      fs.writeFileSync(this.configFilePath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    }

    // Create default directories required by AETHER
    const requiredDirs = [
      path.join(this.workspacePath, '00-Platform'),
      path.join(this.workspacePath, '.agents'),
      path.join(this.workspacePath, 'docs')
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.status = 'active';
    return this.getProjectMeta();
  }

  getProjectMeta() {
    if (!fs.existsSync(this.configFilePath)) {
      throw new Error("Project not initialized. Please run 'aether init' first.");
    }
    const rawData = fs.readFileSync(this.configFilePath, 'utf-8');
    const config = JSON.parse(rawData);
    return {
      workspacePath: this.workspacePath,
      status: this.status,
      config
    };
  }

  async updateProjectConfig(newConfig) {
    const meta = this.getProjectMeta();
    const updatedConfig = { ...meta.config, ...newConfig };
    fs.writeFileSync(this.configFilePath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
  }

  destroy() {
    this.status = 'destroy';
  }
}
