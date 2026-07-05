import fs from 'fs';
import path from 'path';

export class PromptEngine {
  constructor(projectManager, contextEngine, taskEngine) {
    this.projectManager = projectManager;
    this.contextEngine = contextEngine;
    this.taskEngine = taskEngine;
    this.templates = new Map();
    this._registerDefaultTemplates();
  }

  _registerDefaultTemplates() {
    this.registerPromptTemplate('default', 
      "You are an AI Agent acting as a {{role}}.\n\n" +
      "=== GOVERNANCE RULES (AGENTS.md) ===\n" +
      "{{rules}}\n\n" +
      "=== ACTIVE TASKS ===\n" +
      "{{tasks}}\n\n" +
      "=== WORKSPACE CONTEXT ===\n" +
      "{{context}}\n\n" +
      "Please execute the tasks adhering to the governance rules above."
    );
  }

  /**
   * Register a new prompt template
   * @param {string} name 
   * @param {string} templateString 
   */
  registerPromptTemplate(name, templateString) {
    this.templates.set(name, templateString);
  }

  /**
   * Approximate token count (1 word ≈ 1.3 tokens) and compress context if budget is exceeded
   * @param {string} rawContext 
   * @param {number} limitToken 
   * @returns {string} Compressed context
   */
  compressContext(rawContext, limitToken = 2000) {
    if (!rawContext) return '';
    if (limitToken <= 0) {
      return '[... CONTEXT TRUNCATED DUE TO ZERO OR NEGATIVE TOKEN BUDGET LIMIT ...]';
    }

    const wordCount = rawContext.split(/\s+/).length;
    const estimatedTokens = Math.ceil(wordCount * 1.3);

    if (estimatedTokens <= limitToken) {
      return rawContext;
    }

    // Token budget exceeded. Compress line-by-line.
    const lines = rawContext.split('\n');
    const acceptedLines = [];
    let currentTokens = 0;

    for (const line of lines) {
      // Approximate line tokens
      const lineWords = line.trim().split(/\s+/).filter(Boolean).length;
      const lineTokens = Math.ceil(lineWords * 1.3);

      if (currentTokens + lineTokens > limitToken - 10) { // leave safety margin for truncation message
        acceptedLines.push('[... CONTEXT TRUNCATED DUE TO TOKEN BUDGET LIMIT ...]');
        break;
      }

      acceptedLines.push(line);
      currentTokens += lineTokens;
    }

    return acceptedLines.join('\n');
  }

  /**
   * Scrub credentials and sensitive API keys from prompt text
   * @param {string} text 
   * @returns {string} Sanitized text
   */
  scrubCredentials(text) {
    if (!text) return '';

    let sanitized = text;

    // Pattern-based redaction
    const regexes = [
      /AIzaSy[a-zA-Z0-9_-]{30,45}/g,                 // Gemini API keys
      /sk-[a-zA-Z0-9_-]{32,}/g,                     // OpenAI API keys
      /sk-proj-[a-zA-Z0-9_-]{32,}/g,                 // OpenAI Proj keys
      /sk-ant-[a-zA-Z0-9_-]{40,}/g                   // Claude API keys
    ];

    for (const regex of regexes) {
      sanitized = sanitized.replace(regex, '[REDACTED_API_KEY]');
    }

    // Value-based redaction (from process.env)
    const envSecrets = [
      process.env.GEMINI_API_KEY,
      process.env.OPENAI_API_KEY,
      process.env.CLAUDE_API_KEY,
      process.env.AETHER_MASTER_PASSWORD
    ]
      .filter(s => s && typeof s === 'string' && s.length > 5);

    // Remove duplicates
    const uniqueSecrets = [...new Set(envSecrets)];

    for (const secret of uniqueSecrets) {
      // Escape special characters for RegExp
      const escaped = secret.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const secretRegex = new RegExp(escaped, 'g');
      sanitized = sanitized.replace(secretRegex, '[REDACTED_SECRET]');
    }

    return sanitized;
  }

  /**
   * Assemble a fully-scrubbed system prompt for an agent and task
   * @param {string} agentId 
   * @param {string} taskId 
   * @param {string} rawContext 
   * @param {string} templateName 
   * @returns {Promise<string>}
   */
  async assembleSystemPrompt(agentId, taskId, rawContext = '', templateName = 'default') {
    const template = this.templates.get(templateName) || this.templates.get('default');
    
    // 1. Fetch agent profile
    let role = 'AI Engineering Agent';
    try {
      const meta = this.projectManager.getProjectMeta();
      const profile = (meta.config.agentProfiles || []).find(a => a.id === agentId);
      if (profile) role = profile.role;
    } catch (e) {}

    // 2. Fetch workspace rules (AGENTS.md)
    let rules = 'Follow clean code engineering standards.';
    const agentsMdPath = path.join(this.projectManager.workspacePath, '.agents', 'AGENTS.md');
    if (fs.existsSync(agentsMdPath)) {
      try {
        rules = fs.readFileSync(agentsMdPath, 'utf-8').trim();
      } catch (e) {}
    }

    // Dynamic UI/UX guidelines injection for frontend tasks
    if (role === 'Frontend Lead') {
      try {
        const UiResearchModule = await import('./UiResearchEngine.js');
        const UiResearchEngine = UiResearchModule.UiResearchEngine || UiResearchModule.default;
        const uiEngine = new UiResearchEngine(this.projectManager);
        const recipes = uiEngine.getRecipes();
        rules += '\n\n=== SPENTURI PREMIUM UI/UX GUIDELINES ===\n';
        recipes.forEach(r => {
          rules += `\n* Recipe: ${r.name} (${r.category})\n  Description: ${r.description}\n  Code Snippet:\n\`\`\`css\n${r.code}\n\`\`\`\n`;
        });
      } catch (err) {
        console.warn('PromptEngine: Could not load UI/UX recipes for injection:', err.message);
      }
    }

    // 3. Fetch active tasks
    let tasks = 'No active tasks.';
    if (this.taskEngine) {
      const taskFilePath = path.join(this.projectManager.workspacePath, '.agents', 'task.md');
      if (fs.existsSync(taskFilePath)) {
        try {
          const parsedTasks = this.taskEngine.parseTaskFile(taskFilePath);
          tasks = parsedTasks
            .map(t => {
              const statusChar = t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '/' : ' ';
              return `- [${statusChar}] ${t.text}`;
            })
            .join('\n');
        } catch (e) {}
      }
    }

    // 4. Compress context
    const compressedContext = this.compressContext(rawContext);

    // 5. Build prompt
    let prompt = template
      .replace(/{{role}}/g, role)
      .replace(/{{rules}}/g, rules)
      .replace(/{{tasks}}/g, tasks)
      .replace(/{{context}}/g, compressedContext);

    // 6. Scrub credentials
    return this.scrubCredentials(prompt);
  }
}
