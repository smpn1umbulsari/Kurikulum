/**
 * AETHER Platform - Agent Communication Protocol
 * Version: 1.1.0
 * Handles agent-to-agent communication, negotiation, and context sharing
 */

export class AgentProtocol {
  constructor(eventBus, agentManager) {
    this.eventBus = eventBus;
    this.agentManager = agentManager;
    this.contextCache = new Map(); // Shared context between agents
    this.pendingNegotiations = new Map(); // taskId -> negotiation state
    this.messageQueue = new Map(); // agentId -> pending messages
  }

  /**
   * Share context between agents
   * @param {string} sourceAgentId - Source agent ID
   * @param {string[]} targetAgentIds - Target agent IDs
   * @param {Object} context - Context to share
   */
  async shareContext(sourceAgentId, targetAgentIds, context) {
    const contextId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store context
    this.contextCache.set(contextId, {
      id: contextId,
      sourceAgentId,
      targetAgentIds,
      context,
      createdAt: new Date().toISOString(),
      ttl: 3600000, // 1 hour TTL
    });

    // Publish context shared event
    this.eventBus.publish('agent:context_shared', {
      contextId,
      sourceAgentId,
      targetAgentIds,
      contextKeys: Object.keys(context),
    });

    // Notify target agents
    for (const targetAgentId of targetAgentIds) {
      await this.sendMessage(targetAgentId, {
        type: 'context_share',
        contextId,
        sourceAgentId,
        context,
        priority: 'high',
      });
    }

    return { contextId, sharedWith: targetAgentIds };
  }

  /**
   * Negotiate task assignment between agents
   * @param {Object} taskRequirements - Task requirements
   * @param {string[]} preferredAgents - Preferred agent IDs
   */
  async negotiateTaskAssignment(taskRequirements, preferredAgents = []) {
    const negotiationId = `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const negotiation = {
      id: negotiationId,
      taskRequirements,
      preferredAgents,
      candidates: [],
      status: 'negotiating',
      startedAt: new Date().toISOString(),
      concludedAt: null,
    };

    this.pendingNegotiations.set(negotiationId, negotiation);

    // Get all available agents
    const availableAgents = this.agentManager.getAvailableAgents()
      .filter(a => a.status === 'standby' || a.status === 'idle');

    // Score agents
    for (const agent of availableAgents) {
      const score = this._scoreAgentForTask(agent, taskRequirements);

      if (preferredAgents.includes(agent.id)) {
        negotiation.candidates.push({ agent, score: score + 20 }); // Boost for preference
      } else {
        negotiation.candidates.push({ agent, score });
      }
    }

    // Sort by score
    negotiation.candidates.sort((a, b) => b.score - a.score);

    // Select winner
    if (negotiation.candidates.length > 0) {
      const winner = negotiation.candidates[0];
      negotiation.status = 'concluded';
      negotiation.winner = {
        agentId: winner.agent.id,
        role: winner.agent.role,
        score: winner.score,
      };
      negotiation.concludedAt = new Date().toISOString();
    } else {
      negotiation.status = 'no_candidates';
      negotiation.concludedAt = new Date().toISOString();
    }

    this.eventBus.publish('agent:negotiation_completed', {
      negotiationId,
      status: negotiation.status,
      winner: negotiation.winner,
      candidates: negotiation.candidates.length,
    });

    return negotiation;
  }

  /**
   * Score an agent for a specific task
   * @private
   */
  _scoreAgentForTask(agent, taskRequirements) {
    let score = 50; // Base score

    // Capability match
    if (taskRequirements.requiredCapabilities) {
      const matches = taskRequirements.requiredCapabilities.filter(
        cap => agent.capabilities?.includes(cap)
      ).length;
      score += matches * 15;
    }

    // Task type match
    if (taskRequirements.taskType) {
      const typeMap = {
        'implementation': ['backend', 'frontend', 'api'],
        'testing': ['qa', 'testing'],
        'review': ['architect', 'qa', 'security'],
        'deployment': ['devops'],
      };

      const relevant = typeMap[taskRequirements.taskType] || [];
      for (const cap of relevant) {
        if (agent.capabilities?.includes(cap)) {
          score += 20;
        }
      }
    }

    // Availability
    const availableSlots = (agent.maxConcurrentTasks || 1) - (agent.currentTasks || 0);
    score += availableSlots * 10;

    // Priority match
    if (taskRequirements.priority === 'critical' && agent.priority <= 2) {
      score += 15;
    }

    return score;
  }

  /**
   * Send message to an agent
   * @param {string} targetAgentId - Target agent ID
   * @param {Object} message - Message payload
   */
  async sendMessage(targetAgentId, message) {
    const envelope = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: 'protocol',
      to: targetAgentId,
      message,
      sentAt: new Date().toISOString(),
      status: 'queued',
    };

    // Queue message
    if (!this.messageQueue.has(targetAgentId)) {
      this.messageQueue.set(targetAgentId, []);
    }
    this.messageQueue.get(targetAgentId).push(envelope);

    // Publish event
    this.eventBus.publish('agent:message_sent', {
      envelopeId: envelope.id,
      to: targetAgentId,
      type: message.type,
    });

    // Simulate delivery (in real implementation, this would be async)
    setTimeout(() => {
      envelope.status = 'delivered';
      envelope.deliveredAt = new Date().toISOString();
      this.eventBus.publish('agent:message_delivered', {
        envelopeId: envelope.id,
        to: targetAgentId,
      });
    }, 100);

    return envelope;
  }

  /**
   * Get pending messages for an agent
   * @param {string} agentId - Agent ID
   */
  getPendingMessages(agentId) {
    const messages = this.messageQueue.get(agentId) || [];
    return messages.filter(m => m.status === 'queued' || m.status === 'delivered');
  }

  /**
   * Mark message as read
   * @param {string} agentId - Agent ID
   * @param {string} messageId - Message ID
   */
  markMessageRead(agentId, messageId) {
    const messages = this.messageQueue.get(agentId) || [];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      message.status = 'read';
      message.readAt = new Date().toISOString();
    }
  }

  /**
   * Aggregate results from multiple agents
   * @param {Object[]} results - Array of results from different agents
   * @param {string} strategy - Aggregation strategy: 'consensus', 'majority', 'best', 'all'
   */
  aggregateResults(results, strategy = 'best') {
    switch (strategy) {
      case 'consensus':
        return this._aggregateConsensus(results);
      case 'majority':
        return this._aggregateMajority(results);
      case 'best':
        return this._aggregateBest(results);
      case 'all':
        return { aggregated: true, results, count: results.length };
      default:
        return results[0] || null;
    }
  }

  /**
   * Aggregate using consensus strategy
   * @private
   */
  _aggregateConsensus(results) {
    // Find items that appear in all results
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];

    const allKeys = new Set();
    results.forEach(r => {
      if (typeof r === 'object') {
        Object.keys(r).forEach(k => allKeys.add(k));
      }
    });

    const consensus = {};
    for (const key of allKeys) {
      const values = results.map(r => r[key]).filter(v => v !== undefined);
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];

      if (uniqueValues.length === 1) {
        consensus[key] = values[0];
      } else if (uniqueValues.length <= results.length / 2) {
        // Some agreement
        consensus[key] = values[0];
        consensus[key + '_conflict'] = true;
      }
    }

    return {
      aggregated: true,
      strategy: 'consensus',
      consensus,
      conflicts: Object.keys(consensus).filter(k => k.endsWith('_conflict')).length,
    };
  }

  /**
   * Aggregate using majority strategy
   * @private
   */
  _aggregateMajority(results) {
    if (results.length === 0) return null;

    // For simple values, find the most common
    const valueCounts = new Map();
    for (const result of results) {
      const str = JSON.stringify(result);
      valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
    }

    let maxCount = 0;
    let majority = results[0];
    for (const [str, count] of valueCounts) {
      if (count > maxCount) {
        maxCount = count;
        majority = JSON.parse(str);
      }
    }

    return {
      aggregated: true,
      strategy: 'majority',
      result: majority,
      agreementPercent: (maxCount / results.length) * 100,
      count: results.length,
    };
  }

  /**
   * Aggregate using best strategy (highest scored result)
   * @private
   */
  _aggregateBest(results) {
    if (results.length === 0) return null;

    // Sort by score if available, otherwise return first
    const scored = results.map((r, i) => ({
      result: r,
      score: r.score || r._score || 0,
      index: i,
    }));

    scored.sort((a, b) => b.score - a.score);

    return {
      aggregated: true,
      strategy: 'best',
      result: scored[0].result,
      score: scored[0].score,
      alternatives: scored.slice(1).map(s => s.result),
    };
  }

  /**
   * Resolve conflicts between agent results
   * @param {Object[]} conflicts - Array of conflicting results
   * @param {string} strategy - Resolution strategy
   */
  resolveConflicts(conflicts, strategy = 'priority') {
    const resolutions = [];

    for (const conflict of conflicts) {
      const resolution = {
        conflictId: conflict.id,
        options: conflict.options,
        resolution: null,
        reason: null,
      };

      switch (strategy) {
        case 'priority':
          // Use highest priority agent's result
          const prioritized = [...conflict.options].sort((a, b) =>
            (a.agentPriority || 5) - (b.agentPriority || 5)
          );
          resolution.resolution = prioritized[0].value;
          resolution.reason = `Selected by priority (agent: ${prioritized[0].agentId})`;
          break;

        case 'latest':
          // Use most recent result
          const sorted = [...conflict.options].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          resolution.resolution = sorted[0].value;
          resolution.reason = `Selected by timestamp (${sorted[0].timestamp})`;
          break;

        case 'most_common':
          // Use most common value
          const counts = new Map();
          for (const opt of conflict.options) {
            const key = JSON.stringify(opt.value);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
          let maxCount = 0;
          let mostCommon = conflict.options[0].value;
          for (const [key, count] of counts) {
            if (count > maxCount) {
              maxCount = count;
              mostCommon = JSON.parse(key);
            }
          }
          resolution.resolution = mostCommon;
          resolution.reason = `Selected by majority (${maxCount}/${conflict.options.length})`;
          break;

        default:
          resolution.resolution = conflict.options[0].value;
          resolution.reason = 'Default: first option';
      }

      resolutions.push(resolution);
    }

    return {
      resolved: true,
      strategy,
      resolutions,
      totalConflicts: conflicts.length,
    };
  }

  /**
   * Broadcast message to all agents
   * @param {Object} message - Message to broadcast
   */
  async broadcast(message) {
    const agents = this.agentManager.getAvailableAgents();
    const results = [];

    for (const agent of agents) {
      results.push({
        agentId: agent.id,
        ...(await this.sendMessage(agent.id, message)),
      });
    }

    this.eventBus.publish('agent:broadcast', {
      messageType: message.type,
      recipientCount: results.length,
    });

    return results;
  }

  /**
   * Request feedback from multiple agents
   * @param {string} subject - Subject to get feedback on
   * @param {string[]} agentIds - Agents to request feedback from
   */
  async requestFeedback(subject, agentIds) {
    const requests = [];

    for (const agentId of agentIds) {
      const request = await this.sendMessage(agentId, {
        type: 'feedback_request',
        subject,
        requestId: `fb_${Date.now()}`,
        priority: 'normal',
      });
      requests.push(request);
    }

    return {
      requestId: `feedback_request_${Date.now()}`,
      subject,
      requestedAgents: agentIds.length,
      requests,
    };
  }

  /**
   * Sync context across all agents
   * @param {Object} sharedContext - Context to share
   */
  async syncContext(sharedContext) {
    const allAgentIds = this.agentManager.getAvailableAgents().map(a => a.id);
    return this.shareContext('system', allAgentIds, sharedContext);
  }

  /**
   * Get protocol statistics
   */
  getStatistics() {
    return {
      activeContexts: this.contextCache.size,
      pendingNegotiations: this.pendingNegotiations.size,
      totalMessagesQueued: Array.from(this.messageQueue.values()).reduce((sum, q) => sum + q.length, 0),
      messageQueueBreakdown: Object.fromEntries(
        Array.from(this.messageQueue.entries()).map(([id, q]) => [id, q.length])
      ),
    };
  }

  /**
   * Cleanup expired context
   */
  cleanup() {
    const now = Date.now();
    for (const [id, context] of this.contextCache) {
      if (now > new Date(context.createdAt).getTime() + context.ttl) {
        this.contextCache.delete(id);
      }
    }
  }
}

export default AgentProtocol;
