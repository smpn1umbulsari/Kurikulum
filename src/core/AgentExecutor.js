/**
 * AETHER Platform - Agent Executor
 * Version: 1.2.0
 *
 * Fungsi: Real AI Agent Execution Engine
 * - Execute tasks using real AI APIs (Claude, Gemini, OpenAI)
 * - Multi-endpoint support for various gateways
 * - Streaming support for real-time responses
 * - Token tracking and cost estimation
 * - Retry logic with exponential backoff
 */

import { EventEmitter } from 'events';

export class AgentExecutor extends EventEmitter {
  constructor(options = {}) {
    super();

    // Provider configurations
    this.providers = {
      claude: {
        baseUrl: process.env.CLAUDE_BASE_URL || 'https://gateway.olagon.site/anthropic',
        apiKey: process.env.CLAUDE_API_KEY,
        supportsStreaming: true
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY,
        supportsStreaming: false
      },
      openai: {
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
        supportsStreaming: true
      }
    };

    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 2000,
      timeout: options.timeout || 120000,
      maxTokens: options.maxTokens || 4096,
      ...options
    };

    this.executionHistory = [];
    this.activeExecutions = new Map();
    this.tokenCosts = {
      claude: { input: 0.000003, output: 0.000015 },
      gemini: { input: 0.000000125, output: 0.0000005 },
      openai: { input: 0.0000015, output: 0.000002 }
    };
  }

  /**
   * Detect AI provider from model name
   */
  detectProvider(modelName) {
    const lower = modelName.toLowerCase();
    if (lower.includes('claude') || lower.includes('anthropic')) return 'claude';
    if (lower.includes('gemini')) return 'gemini';
    if (lower.includes('gpt') || lower.includes('o1') || lower.includes('openai')) return 'openai';
    return 'unknown';
  }

  /**
   * Execute a task using the specified agent
   */
  async execute(agent, prompt, context = {}) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    const execution = {
      id: executionId,
      agentId: agent.id,
      agentRole: agent.role,
      model: agent.model,
      provider: this.detectProvider(agent.model),
      prompt,
      context,
      status: 'running',
      startTime,
      tokenUsage: { input: 0, output: 0 },
      retries: 0,
      error: null
    };

    this.activeExecutions.set(executionId, execution);
    this.emit('execution:started', execution);

    try {
      // Check API key availability
      const provider = execution.provider;
      let useMock = false;

      if (!this.providers[provider]?.apiKey) {
        console.warn(`[AgentExecutor] No API key for ${provider}, using mock execution`);
        useMock = true;
      }

      // Prepare system prompt
      const systemPrompt = this._buildSystemPrompt(agent, context);

      // Execute with retry logic
      let result;
      let attempt = 0;
      const maxRetries = this.config.maxRetries;

      while (attempt < maxRetries) {
        try {
          attempt++;

          if (useMock) {
            result = await this._executeMock(provider, agent, prompt);
          } else {
            result = await this._executeWithProvider(
              provider,
              agent.model,
              systemPrompt,
              prompt
            );
          }

          break;
        } catch (error) {
          execution.retries = attempt - 1;

          if (attempt >= maxRetries) {
            throw error;
          }

          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`[AgentExecutor] Retry ${attempt}/${maxRetries} after ${delay}ms: ${error.message}`);
          await this._sleep(delay);
        }
      }

      // Calculate metrics
      const duration = Date.now() - startTime;
      const cost = this._calculateCost(execution.provider, execution.tokenUsage);

      // Build result
      const finalResult = {
        executionId,
        success: true,
        agentId: agent.id,
        agentRole: agent.role,
        model: agent.model,
        output: result.text,
        tokenUsage: execution.tokenUsage,
        cost,
        duration,
        retries: execution.retries,
        timestamp: new Date().toISOString()
      };

      execution.status = 'completed';
      execution.result = finalResult;
      this.activeExecutions.set(executionId, execution);
      this.executionHistory.push(finalResult);

      this.emit('execution:completed', finalResult);

      return finalResult;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit('execution:error', {
        executionId,
        error: error.message,
        agentId: agent.id
      });

      return {
        executionId,
        success: false,
        agentId: agent.id,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute with specific provider
   */
  async _executeWithProvider(provider, model, systemPrompt, userPrompt) {
    switch (provider) {
      case 'claude':
        return this._executeClaude(model, systemPrompt, userPrompt);
      case 'gemini':
        return this._executeGemini(model, systemPrompt, userPrompt);
      case 'openai':
        return this._executeOpenAI(model, systemPrompt, userPrompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Execute using Claude API (via gateway - tries multiple endpoints)
   */
  async _executeClaude(model, systemPrompt, userPrompt) {
    const provider = this.providers.claude;

    // Try multiple endpoint patterns with different auth methods
    const endpointConfigs = [
      // Anthropic native format
      { url: `${provider.baseUrl}/v1/messages`, auth: 'x-api-key', format: 'anthropic' },
      // OpenAI compatible
      { url: `${provider.baseUrl}/v1/chat/completions`, auth: 'bearer', format: 'openai' },
      { url: `${provider.baseUrl}/chat/completions`, auth: 'bearer', format: 'openai' }
    ];

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    for (const config of endpointConfigs) {
      try {
        let body, headers;

        console.log(`[AgentExecutor] Trying endpoint: ${config.url} (${config.format})`);

        if (config.format === 'anthropic') {
          body = JSON.stringify({ model, messages, max_tokens: this.config.maxTokens });
          headers = {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          };
        } else {
          body = JSON.stringify({ model, messages });
          headers = {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          };
        }

        const response = await this._fetchWithTimeout(config.url, {
          method: 'POST',
          headers,
          body
        });

        const statusText = await response.text();
        console.log(`[AgentExecutor] Response status: ${response.status}`);

        if (response.status === 405) {
          console.log(`[AgentExecutor] Method Not Allowed for ${config.url}`);
          throw new Error('Method Not Allowed');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${statusText}`);
        }

        const data = JSON.parse(statusText);
        return this._parseResponse(data, config.format);

      } catch (error) {
        console.warn(`[AgentExecutor] Endpoint ${config.url} failed: ${error.message}`);
        if (config === endpointConfigs[endpointConfigs.length - 1]) {
          throw error;
        }
      }
    }
  }

  /**
   * Execute using Gemini API
   */
  async _executeGemini(model, systemPrompt, userPrompt) {
    const provider = this.providers.gemini;
    const url = `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`;

    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    }
    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await this._fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { text, usage: { input: 0, output: 0 } };
  }

  /**
   * Execute using OpenAI API
   */
  async _executeOpenAI(model, systemPrompt, userPrompt) {
    const provider = this.providers.openai;
    const url = `${provider.baseUrl}/chat/completions`;

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await this._fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return this._parseResponse(data, 'openai');
  }

  /**
   * Parse response from different providers
   */
  _parseResponse(data, provider) {
    let text = '';
    let usage = { input: 0, output: 0 };

    // OpenAI format
    if (data.choices && data.choices[0]?.message?.content) {
      text = data.choices[0].message.content;
      if (data.usage) {
        usage = {
          input: data.usage.prompt_tokens || 0,
          output: data.usage.completion_tokens || 0
        };
      }
    }
    // Anthropic format (has content array with blocks)
    else if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        // Skip thinking blocks
        if (block.type === 'thinking') continue;
        // Get text blocks only
        if (block.type === 'text') {
          text += block.text;
        }
      }
      if (data.usage) {
        usage = {
          input: data.usage.input_tokens || 0,
          output: data.usage.output_tokens || 0
        };
      }
    }
    // Direct text
    else if (typeof data.text === 'string') {
      text = data.text;
    }
    // Fallback
    else {
      text = JSON.stringify(data).substring(0, 500);
    }

    return { text, usage };
  }

  /**
   * Execute mock task
   */
  async _executeMock(provider, agent, prompt) {
    await this._sleep(100);

    const role = agent.role?.toLowerCase() || '';

    if (role.includes('architect')) {
      return {
        text: `[MOCK] Architecture design for: ${prompt.substring(0, 50)}...`,
        usage: { input: 50, output: 100 }
      };
    }

    return {
      text: `[MOCK] Response from ${agent.role} for: ${prompt.substring(0, 50)}...`,
      usage: { input: 50, output: 50 }
    };
  }

  /**
   * Build system prompt from agent
   */
  _buildSystemPrompt(agent, context) {
    const rules = context.rules || '';
    const tasks = context.tasks || '';

    return `${rules}\n\nActive Tasks:\n${tasks}`.trim();
  }

  /**
   * Calculate cost
   */
  _calculateCost(provider, usage) {
    const costs = this.tokenCosts[provider] || { input: 0, output: 0 };
    return (usage.input * costs.input) + (usage.output * costs.output);
  }

  /**
   * Fetch with timeout
   */
  async _fetchWithTimeout(url, options, timeout = this.config.timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution history
   */
  getHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(e => e.success);
    const totalCost = this.executionHistory.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalTokens = this.executionHistory.reduce((sum, e) => sum + (e.tokenUsage?.input || 0) + (e.tokenUsage?.output || 0), 0);
    const durations = this.executionHistory.map(e => e.duration);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successful.length / total * 100).toFixed(1) + '%' : '0%',
      totalCost: '$' + totalCost.toFixed(6),
      tokensUsed: totalTokens,
      avgDuration: avgDuration.toFixed(0) + 'ms'
    };
  }
}

export default AgentExecutor;
