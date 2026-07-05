/**
 * AETHER Platform - Enhanced Agent Manager
 * Version: 1.1.0
 * Features: Task assignment, real execution, capability matching, load balancing
 */

import fs from 'fs';
import path from 'path';

export class AgentManager {
  constructor(projectManager, eventBus = null) {
    this.projectManager = projectManager;
    this.eventBus = eventBus;
    this.agents = new Map();
    this.statusMap = new Map(); // agentId -> status
    this.taskAssignments = new Map(); // agentId -> assigned tasks
    this.executionHistory = []; // Recent execution history
    this.maxHistorySize = 100;
    this._loadConfiguredAgents();
  }

  _loadConfiguredAgents() {
    try {
      const meta = this.projectManager.getProjectMeta();
      const profiles = meta.config.agentProfiles || [];
      for (const profile of profiles) {
        this.registerAgent(profile);
      }
    } catch (e) {
      // Configuration might not be initialized yet
      console.warn('AgentManager: Could not load configured agents:', e.message);
    }
  }

  /**
   * Register a new agent
   * @param {Object} agentProfile - Agent profile configuration
   */
  registerAgent(agentProfile) {
    if (!agentProfile.id) {
      throw new Error("Agent profile must have an 'id'.");
    }

    const agent = {
      ...agentProfile,
      capabilities: agentProfile.capabilities || [],
      priority: agentProfile.priority || 5,
      maxConcurrentTasks: agentProfile.maxConcurrentTasks || 1,
      currentTasks: 0,
      registeredAt: new Date().toISOString(),
      lastActive: null,
    };

    this.agents.set(agentProfile.id, agent);
    this.statusMap.set(agentProfile.id, 'standby');
    this.taskAssignments.set(agentProfile.id, []);

    // Publish registration event
    if (this.eventBus) {
      this.eventBus.publish('agent:registered', {
        agentId: agent.id,
        role: agent.role,
        model: agent.model,
        capabilities: agent.capabilities,
      });
    }

    return agent;
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent ID
   */
  unregisterAgent(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID '${agentId}' not found.`);
    }

    const agent = this.agents.get(agentId);
    this.agents.delete(agentId);
    this.statusMap.delete(agentId);
    this.taskAssignments.delete(agentId);

    return agent;
  }

  /**
   * Get all available agents
   */
  getAvailableAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      ...agent,
      status: this.statusMap.get(agent.id) || 'standby',
      currentTasks: agent.currentTasks || 0,
      maxConcurrentTasks: agent.maxConcurrentTasks || 1,
    }));
  }

  /**
   * Get agents filtered by capability
   * @param {string} capability - Required capability
   */
  getAgentsByCapability(capability) {
    return this.getAvailableAgents().filter(agent =>
      agent.capabilities?.includes(capability)
    );
  }

  /**
   * Get the best available agent for a task
   * @param {Object} taskRequirements - Task requirements (type, priority, etc.)
   */
  findBestAgent(taskRequirements) {
    const available = this.getAvailableAgents()
      .filter(agent => agent.status === 'standby' || agent.status === 'idle')
      .filter(agent => (agent.currentTasks || 0) < (agent.maxConcurrentTasks || 1));

    if (available.length === 0) {
      return null;
    }

    const scoredAgents = available.map(agent => {
      let score = 0;

      // Priority score (higher priority role = higher score)
      score += (10 - (agent.priority || 5)) * 10;

      // Capability match
      if (taskRequirements.requiredCapabilities) {
        const matches = taskRequirements.requiredCapabilities.filter(
          cap => agent.capabilities?.includes(cap)
        ).length;
        score += matches * 25;
      }

      // Specific capability match
      if (taskRequirements.capability && agent.capabilities?.includes(taskRequirements.capability)) {
        score += 30;
      }

      // Task type match
      if (taskRequirements.taskType) {
        const typeCapabilityMap = {
          'implementation': ['backend', 'frontend', 'api', 'react', 'ui'],
          'testing': ['qa', 'testing', 'verification'],
          'documentation': ['architect', 'backend', 'frontend'],
          'review': ['architect', 'qa', 'security', 'review'],
          'deployment': ['devops', 'deployment', 'ci-cd'],
          'security': ['security', 'rls', 'encryption'],
          'database': ['schema', 'migration', 'optimization', 'db_architect'],
        };

        const relevantCaps = typeCapabilityMap[taskRequirements.taskType] || [];
        for (const cap of relevantCaps) {
          if (agent.capabilities?.includes(cap)) {
            score += 20;
          }
        }
      }

      // Current load (prefer less busy)
      score -= (agent.currentTasks || 0) * 15;

      // Model preference (prefer larger models for complex tasks)
      if (taskRequirements.complexity === 'high') {
        if (agent.model.includes('opus') || agent.model.includes('1.5-pro')) {
          score += 10;
        }
      }

      return { agent, score };
    });

    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agent || null;
  }

  /**
   * Negotiate task assignment
   * @param {Object} taskRequirements - Task requirements
   */
  negotiateTask(taskRequirements) {
    const bestAgent = this.findBestAgent(taskRequirements);

    if (!bestAgent) {
      return {
        success: false,
        reason: 'No available agents found',
        estimatedWait: this._estimateWaitTime(),
      };
    }

    return {
      success: true,
      agentId: bestAgent.id,
      agentRole: bestAgent.role,
      model: bestAgent.model,
      capabilities: bestAgent.capabilities,
      estimatedDuration: this._estimateTaskDuration(taskRequirements),
    };
  }

  /**
   * Estimate wait time until an agent is available
   * @private
   */
  _estimateWaitTime() {
    const busyAgents = this.getAvailableAgents()
      .filter(a => a.status === 'executing');

    if (busyAgents.length === 0) {
      return 0;
    }

    // Average of 5 minutes per task
    return busyAgents.reduce((sum, a) => sum + 300, 0) / busyAgents.length;
  }

  /**
   * Estimate task duration based on requirements
   * @private
   */
  _estimateTaskDuration(taskRequirements) {
    const baseDuration = 300000; // 5 minutes base
    const complexityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      critical: 3,
    };

    const multiplier = complexityMultiplier[taskRequirements.complexity || 'medium'] || 1;
    return baseDuration * multiplier;
  }

  /**
   * Set agent status
   * @param {string} agentId - Agent ID
   * @param {string} status - New status
   */
  setAgentStatus(agentId, status) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID '${agentId}' is not registered.`);
    }

    const validStatuses = ['standby', 'executing', 'idle', 'error', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status '${status}'. Must be one of ${validStatuses.join(', ')}`);
    }

    this.statusMap.set(agentId, status);

    const agent = this.agents.get(agentId);
    agent.lastActive = new Date().toISOString();

    if (this.eventBus) {
      this.eventBus.publish(`agent:${status}`, {
        agentId,
        role: agent.role,
        model: agent.model,
      });
    }

    return agent;
  }

  /**
   * Execute a task with the specified agent
   * @param {string} agentId - Agent ID
   * @param {string} prompt - Task prompt
   * @param {string} context - Additional context
   */
  async executeAgentTask(agentId, prompt, context = '') {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found.`);
    }

    // Track task assignment
    this.taskAssignments.get(agentId).push({
      prompt,
      startTime: Date.now(),
      status: 'in_progress',
    });

    this.setAgentStatus(agentId, 'executing');
    agent.currentTasks = (agent.currentTasks || 0) + 1;

    if (this.eventBus) {
      this.eventBus.publish('agent:executing', {
        agentId,
        role: agent.role,
        model: agent.model,
        prompt: prompt.substring(0, 100) + '...',
      });
    }

    const startTime = Date.now();
    let responseText;
    let error = null;

    try {
      const provider = this._detectProvider(agent.model);
      const apiKey = this._getApiKeyForProvider(provider);

      if (!apiKey) {
        // Fallback to Mock Response
        responseText = await this._executeMockTask(agent, prompt, context);
      } else {
        responseText = await this._executeRealTask(provider, apiKey, agent, prompt, context);
      }
    } catch (err) {
      error = err;
      responseText = null;
    }

    const duration = Date.now() - startTime;

    // Update agent status
    agent.currentTasks = Math.max(0, (agent.currentTasks || 0) - 1);
    this.setAgentStatus(agentId, 'standby');

    // Record execution
    const executionRecord = {
      agentId,
      role: agent.role,
      model: agent.model,
      prompt: prompt.substring(0, 200),
      success: !error,
      duration,
      timestamp: new Date().toISOString(),
      error: error?.message,
    };

    this.executionHistory.unshift(executionRecord);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.pop();
    }

    // Update task assignment
    const assignments = this.taskAssignments.get(agentId);
    if (assignments.length > 0) {
      const lastAssignment = assignments[assignments.length - 1];
      lastAssignment.endTime = Date.now();
      lastAssignment.duration = Date.now() - lastAssignment.startTime;
      lastAssignment.status = error ? 'failed' : 'completed';
      lastAssignment.result = responseText;
    }

    if (this.eventBus) {
      this.eventBus.publish('agent:completed', {
        agentId,
        role: agent.role,
        success: !error,
        duration,
        error: error?.message,
      });
    }

    if (error) {
      throw error;
    }

    return responseText;
  }

  /**
   * Execute task with multiple agents and aggregate results
   * @param {string[]} agentIds - Array of agent IDs
   * @param {string} prompt - Task prompt
   * @param {string} context - Additional context
   */
  async executeMultiAgentTask(agentIds, prompt, context = '') {
    const results = await Promise.allSettled(
      agentIds.map(agentId => this.executeAgentTask(agentId, prompt, context))
    );

    return results.map((result, index) => ({
      agentId: agentIds[index],
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null,
    }));
  }

  /**
   * Detect AI provider from model name
   * @private
   */
  _detectProvider(modelName) {
    const name = modelName.toLowerCase();
    if (name.includes('gemini')) return 'gemini';
    if (name.includes('claude')) return 'claude';
    if (name.includes('gpt') || name.includes('o1') || name.includes('openai')) return 'openai';
    return 'mock';
  }

  /**
   * Get API key for provider
   * @private
   */
  _getApiKeyForProvider(provider) {
    if (provider === 'gemini') return process.env.GEMINI_API_KEY;
    if (provider === 'claude') return process.env.CLAUDE_API_KEY;
    if (provider === 'openai') return process.env.OPENAI_API_KEY;
    return null;
  }

  /**
   * Execute real API call
   * @private
   */
  async _executeRealTask(provider, apiKey, agent, prompt, context) {
    const systemPrompt = this._buildSystemPrompt(agent, context);

    const fullPrompt = `${systemPrompt}\n\nTask:\n${prompt}`;

    const maxRetries = 3;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      attempt++;
      try {
        if (provider === 'gemini') {
          return await this._callGeminiAPI(apiKey, agent.model, fullPrompt);
        } else if (provider === 'claude') {
          return await this._callClaudeAPI(apiKey, agent.model, fullPrompt);
        } else if (provider === 'openai') {
          return await this._callOpenAIAPI(apiKey, agent.model, fullPrompt);
        }
      } catch (err) {
        const isRateLimit = err.status === 429 || err.message.includes('429') || err.message.includes('rate limit');
        if (isRateLimit && attempt < maxRetries) {
          console.warn(`Rate limit hit (429). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Failed to execute task after ${maxRetries} attempts due to API issues.`);
  }

  /**
   * Build system prompt for agent
   * @private
   */
  _buildSystemPrompt(agent, context) {
    return `You are an AI Agent acting as a ${agent.role}.

Your capabilities include:
${agent.capabilities?.map(cap => `- ${cap}`).join('\n') || '- General purpose'}

Role Priority: ${agent.priority} (1 = highest, 5 = lowest)

Active Context:
${context}

Guidelines:
- Always output clean, well-structured results matching task requirements
- Follow best practices for your role as ${agent.role}
- When uncertain, provide a thoughtful analysis with alternatives
- Prioritize quality and security in all outputs`;
  }

  /**
   * Call Gemini API
   * @private
   */
  async _callGeminiAPI(apiKey, model, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Call Claude API
   * @private
   */
  async _callClaudeAPI(apiKey, model, prompt) {
    const baseUrl = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1';
    const url = `${baseUrl}/messages`;
    const payload = {
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  /**
   * Call OpenAI API
   * @private
   */
  async _callOpenAIAPI(apiKey, model, prompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model,
      messages: [{ role: 'user', content: prompt }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Execute mock task (fallback when no API key)
   * @private
   */
  async _executeMockTask(agent, prompt, context) {
    const role = agent.role.toLowerCase();

    await new Promise(resolve => setTimeout(resolve, 100));

    if (role.includes('architect')) {
      return `### MOCK ARCHITECTURE DESIGN
Role: ${agent.role}
Model: ${agent.model} (MOCK)

Proposed Schema Additions:
\`\`\`sql
CREATE TABLE IF NOT EXISTS mock_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
\`\`\`
This matches the requirements described in: ${prompt}`;
    }

    if (role.includes('developer') || role.includes('backend') || role.includes('frontend')) {
      return `// MOCK IMPLEMENTATION CODE
// Role: ${agent.role}
// Task: ${prompt.split('\n')[0]}

export function executeFeature() {
  console.log("Mock implementation executed successfully.");
  return { success: true, timestamp: Date.now() };
}`;
    }

    if (role.includes('qa') || role.includes('quality') || role.includes('testing')) {
      return `✔ MOCK QA SUITE RESULT
Role: ${agent.role}
All integration tests passed.
Coverage: 87.5%
No security vulnerabilities detected.
Verification for: "${prompt.split('\n')[0]}" is successful.`;
    }

    if (role.includes('security')) {
      return `🔒 MOCK SECURITY AUDIT
Role: ${agent.role}
Security scan completed.
- Input validation: PASSED
- SQL injection: NOT VULNERABLE
- XSS: NOT VULNERABLE
- CSRF: PROTECTED
- Rate limiting: ENABLED
`;
    }

    if (role.includes('devops') || role.includes('deployment')) {
      return `🚀 MOCK DEPLOYMENT RESULT
Role: ${agent.role}
Build: SUCCESS
Test: PASSED
Deploy: READY
Environment: ${process.env.NODE_ENV || 'development'}
`;
    }

    return `Mock execution output for ${agent.role} (${agent.id}) using ${agent.model}.
Prompt length: ${prompt.length} chars.
Capabilities: ${agent.capabilities?.join(', ') || 'General'}`;
  }

  /**
   * Get agent execution history
   * @param {number} limit - Number of recent executions to return
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Get agent statistics
   */
  getStatistics() {
    const agents = this.getAvailableAgents();
    const stats = {
      totalAgents: agents.length,
      byStatus: {},
      byRole: {},
      totalExecutions: this.executionHistory.length,
      successRate: 0,
      averageDuration: 0,
    };

    for (const agent of agents) {
      stats.byStatus[agent.status] = (stats.byStatus[agent.status] || 0) + 1;
      stats.byRole[agent.role] = (stats.byRole[agent.role] || 0) + 1;
    }

    const successfulExecutions = this.executionHistory.filter(e => e.success);
    if (this.executionHistory.length > 0) {
      stats.successRate = (successfulExecutions.length / this.executionHistory.length) * 100;
    }

    if (successfulExecutions.length > 0) {
      stats.averageDuration = successfulExecutions.reduce((sum, e) => sum + e.duration, 0) / successfulExecutions.length;
    }

    return stats;
  }

  /**
   * Get load distribution across agents
   */
  getLoadDistribution() {
    return this.getAvailableAgents().map(agent => ({
      agentId: agent.id,
      role: agent.role,
      currentTasks: agent.currentTasks || 0,
      maxConcurrentTasks: agent.maxConcurrentTasks || 1,
      utilizationPercent: ((agent.currentTasks || 0) / (agent.maxConcurrentTasks || 1)) * 100,
      status: agent.status,
    }));
  }
}

export default AgentManager;
