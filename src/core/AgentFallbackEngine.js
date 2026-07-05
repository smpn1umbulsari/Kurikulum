/**
 * AETHER Platform - Agent Fallback Engine
 * Version: 1.2.0
 *
 * Fungsi: Cascading fallback system untuk AI agents
 * - Jika Agent A gagal, coba Agent B
 * - Jika Agent B gagal, coba Agent C
 * - Maximum retry attempts per agent
 * - Fallback chains berdasarkan task type
 */

import { EventEmitter } from 'events';
import { AgentExecutor } from './AgentExecutor.js';

export class AgentFallbackEngine extends EventEmitter {
  constructor(agentManager, options = {}) {
    super();

    this.agentManager = agentManager;
    this.agentExecutor = new AgentExecutor({
      maxRetries: options.maxRetriesPerAgent || 2,
      retryDelay: options.retryDelayMs || 2000,
      timeout: options.fallbackTimeoutMs || 60000
    });

    this.config = {
      maxRetriesPerAgent: options.maxRetriesPerAgent || 3,
      retryDelayMs: options.retryDelayMs || 2000,
      fallbackTimeoutMs: options.fallbackTimeoutMs || 60000,
      enableCascade: options.enableCascade ?? true,
      ...options
    };

    // Default fallback chains by task type
    this.fallbackChains = {
      default: [
        'architect',
        'backend',
        'frontend'
      ],
      architecture: [
        'architect',
        'backend',
        'db_architect'
      ],
      database: [
        'db_architect',
        'backend',
        'architect'
      ],
      backend: [
        'backend',
        'architect',
        'qa'
      ],
      frontend: [
        'frontend',
        'backend',
        'architect'
      ],
      security: [
        'security',
        'architect',
        'backend'
      ],
      testing: [
        'qa',
        'backend',
        'architect'
      ],
      deployment: [
        'devops',
        'backend',
        'architect'
      ],
      documentation: [
        'architect',
        'backend',
        'frontend'
      ]
    };

    // Execution history for analytics
    this.executionHistory = [];
  }

  /**
   * Execute task dengan cascading fallback
   * @param {string} task - Task description
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeWithFallback(task, options = {}) {
    const {
      taskType = 'default',
      priority = 'medium',
      context = {},
      customChain = null,
      requireAll = false // Jika true, semua agent harus merespon
    } = options;

    const startTime = Date.now();
    const chain = customChain || this.fallbackChains[taskType] || this.fallbackChains.default;

    const executionLog = {
      task,
      taskType,
      chain,
      startTime: new Date().toISOString(),
      attempts: [],
      finalResult: null,
      success: false,
      fallbackCount: 0,
      errors: []
    };

    this.emit('fallback:started', { task, chain });

    let lastError = null;

    // Try each agent in chain
    for (let i = 0; i < chain.length; i++) {
      const agentId = chain[i];
      const isLastAgent = i === chain.length - 1;

      this.emit('fallback:attempt', {
        agentId,
        attemptNumber: i + 1,
        totalAttempts: chain.length
      });

      try {
        const result = await this._executeWithAgent(
          agentId,
          task,
          context,
          options
        );

        if (result.success) {
          executionLog.attempts.push({
            agentId,
            success: true,
            duration: result.duration,
            timestamp: new Date().toISOString()
          });

          executionLog.finalResult = result;
          executionLog.success = true;
          executionLog.fallbackCount = i; // 0 means first agent succeeded

          this.emit('fallback:success', {
            agentId,
            fallbackCount: i,
            duration: Date.now() - startTime
          });

          break;
        } else {
          executionLog.attempts.push({
            agentId,
            success: false,
            error: result.error,
            timestamp: new Date().toISOString()
          });
          executionLog.errors.push(result.error);
          lastError = result.error;
        }

      } catch (error) {
        executionLog.attempts.push({
          agentId,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        executionLog.errors.push(error.message);
        lastError = error;

        this.emit('fallback:error', {
          agentId,
          error: error.message,
          willRetry: !isLastAgent
        });
      }

      // If not last agent and failed, wait before next attempt
      if (!isLastAgent && lastError) {
        await this._delay(this.config.retryDelayMs);
      }
    }

    // If requireAll is true, aggregate results from all agents
    if (requireAll && executionLog.attempts.length > 0) {
      executionLog.finalResult = this._aggregateResults(executionLog.attempts);
      executionLog.success = executionLog.finalResult.aggregated !== null;
    }

    // If all failed
    if (!executionLog.success && lastError) {
      this.emit('fallback:failed', {
        chain,
        errors: executionLog.errors,
        totalAttempts: chain.length
      });
    }

    // Record history
    executionLog.endTime = new Date().toISOString();
    executionLog.duration = Date.now() - startTime;
    this.executionHistory.push(executionLog);

    return {
      success: executionLog.success,
      result: executionLog.finalResult,
      fallbackCount: executionLog.fallbackCount,
      chain: chain,
      attempts: executionLog.attempts,
      duration: executionLog.duration,
      errors: executionLog.errors,
      taskType,
      timestamp: executionLog.timestamp
    };
  }

  /**
   * Execute dengan specific agent
   * @private
   */
  async _executeWithAgent(agentId, task, context, options) {
    const agent = this.agentManager.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    const startTime = Date.now();

    try {
      // Use AgentExecutor directly for better API handling
      const result = await this.agentExecutor.execute(
        agent,
        task,
        context || {}
      );

      if (result.success) {
        return {
          success: true,
          result: result.output,
          agentId: agent.id,
          model: agent.model,
          duration: result.duration,
          attempt: 1
        };
      } else {
        throw new Error(result.error || 'Execution failed');
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Aggregate results from multiple agents
   * @private
   */
  _aggregateResults(attempts) {
    const successful = attempts.filter(a => a.success);

    if (successful.length === 0) {
      return { aggregated: null, count: 0, confidence: 0 };
    }

    // Simple aggregation: concatenate results
    const aggregated = successful.map(a => a.result).join('\n\n---\n\n');

    // Calculate confidence based on success rate
    const confidence = (successful.length / attempts.length) * 100;

    return {
      aggregated,
      count: successful.length,
      confidence,
      agents: successful.map(a => a.agentId)
    };
  }

  /**
   * Add or update fallback chain
   * @param {string} taskType - Task type
   * @param {string[]} chain - Array of agent IDs
   */
  setFallbackChain(taskType, chain) {
    if (!Array.isArray(chain) || chain.length === 0) {
      throw new Error('Fallback chain must be a non-empty array of agent IDs');
    }

    // Validate all agents exist
    for (const agentId of chain) {
      if (!this.agentManager.agents.has(agentId)) {
        throw new Error(`Agent '${agentId}' not found in registry`);
      }
    }

    this.fallbackChains[taskType] = chain;
    this.emit('chain:updated', { taskType, chain });
  }

  /**
   * Get fallback chain for task type
   * @param {string} taskType - Task type
   * @returns {string[]} Chain of agent IDs
   */
  getFallbackChain(taskType) {
    return this.fallbackChains[taskType] || this.fallbackChains.default;
  }

  /**
   * Get all defined chains
   * @returns {Object} All fallback chains
   */
  getAllChains() {
    return { ...this.fallbackChains };
  }

  /**
   * Get execution history
   * @param {number} limit - Max number of records
   * @returns {Array} Execution history
   */
  getHistory(limit = 100) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get analytics summary
   * @returns {Object} Analytics
   */
  getAnalytics() {
    const total = this.executionHistory.length;

    if (total === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgFallbackCount: 0,
        avgDuration: 0,
        agentReliability: {}
      };
    }

    const successful = this.executionHistory.filter(e => e.success);
    const fallbackCounts = this.executionHistory.map(e => e.fallbackCount);
    const durations = this.executionHistory.map(e => e.duration);

    // Calculate agent reliability
    const agentStats = {};
    for (const exec of this.executionHistory) {
      for (const attempt of exec.attempts) {
        if (!agentStats[attempt.agentId]) {
          agentStats[attempt.agentId] = { attempts: 0, successes: 0, failures: 0 };
        }
        agentStats[attempt.agentId].attempts++;
        if (attempt.success) {
          agentStats[attempt.agentId].successes++;
        } else {
          agentStats[attempt.agentId].failures++;
        }
      }
    }

    return {
      totalExecutions: total,
      successRate: ((successful.length / total) * 100).toFixed(1) + '%',
      avgFallbackCount: (fallbackCounts.reduce((a, b) => a + b, 0) / total).toFixed(2),
      avgDuration: (durations.reduce((a, b) => a + b, 0) / total).toFixed(0) + 'ms',
      totalFallbacks: fallbackCounts.reduce((a, b) => a + b, 0),
      agentReliability: Object.fromEntries(
        Object.entries(agentStats).map(([id, stats]) => [
          id,
          {
            successRate: ((stats.successes / stats.attempts) * 100).toFixed(1) + '%',
            attempts: stats.attempts,
            successfulAsPrimary: stats.successes
          }
        ])
      )
    };
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.executionHistory = [];
    this.emit('history:cleared');
  }
}

export default AgentFallbackEngine;
