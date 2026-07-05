import fs from 'fs';
import path from 'path';

/**
 * MonitoringEngine
 * 
 * Tracks agent runtime activities, measures LLM token consumption,
 * calculates execution costs, and compiles analytics reports.
 */
export class MonitoringEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.logFilePath = path.join(this.projectManager.configDir, 'monitoring_logs.json');
    this._initializeLogFile();
  }

  /**
   * Log an action performed by an agent
   */
  logAgentAction(agentId, role, action, status, details = '') {
    const entry = {
      type: 'action',
      agentId,
      role,
      action,
      status, // success, failed, pending
      details,
      timestamp: new Date().toISOString()
    };

    this._writeLogEntry(entry);
  }

  /**
   * Track token usage and compute cost
   */
  trackTokenUsage(agentId, model, promptTokens, completionTokens) {
    const cost = this._calculateCost(model, promptTokens, completionTokens);
    
    const entry = {
      type: 'tokens',
      agentId,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      timestamp: new Date().toISOString()
    };

    this._writeLogEntry(entry);
    return cost;
  }

  /**
   * Aggregate all logged events to generate a detailed report
   */
  generateAnalyticsReport() {
    const data = this._readLogFile();
    const logs = data.logs || [];

    let totalCost = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    
    const tokenUsageByModel = {};
    const tokenUsageByAgent = {};
    const actionsByAgent = {};
    
    let totalActions = 0;
    let successfulActions = 0;
    let failedActions = 0;

    const actionHistory = [];

    for (const log of logs) {
      if (log.type === 'tokens') {
        totalCost += log.cost || 0;
        totalPromptTokens += log.promptTokens || 0;
        totalCompletionTokens += log.completionTokens || 0;

        // Group by model
        if (!tokenUsageByModel[log.model]) {
          tokenUsageByModel[log.model] = { prompt: 0, completion: 0, total: 0, cost: 0 };
        }
        tokenUsageByModel[log.model].prompt += log.promptTokens;
        tokenUsageByModel[log.model].completion += log.completionTokens;
        tokenUsageByModel[log.model].total += log.totalTokens;
        tokenUsageByModel[log.model].cost += log.cost;

        // Group by agent
        if (!tokenUsageByAgent[log.agentId]) {
          tokenUsageByAgent[log.agentId] = { prompt: 0, completion: 0, total: 0, cost: 0 };
        }
        tokenUsageByAgent[log.agentId].prompt += log.promptTokens;
        tokenUsageByAgent[log.agentId].completion += log.completionTokens;
        tokenUsageByAgent[log.agentId].total += log.totalTokens;
        tokenUsageByAgent[log.agentId].cost += log.cost;

      } else if (log.type === 'action') {
        totalActions++;
        if (log.status === 'success') successfulActions++;
        else if (log.status === 'failed') failedActions++;

        // Group by agent
        if (!actionsByAgent[log.agentId]) {
          actionsByAgent[log.agentId] = { total: 0, success: 0, failed: 0, pending: 0 };
        }
        actionsByAgent[log.agentId].total++;
        if (log.status === 'success') actionsByAgent[log.agentId].success++;
        else if (log.status === 'failed') actionsByAgent[log.agentId].failed++;
        else actionsByAgent[log.agentId].pending++;

        actionHistory.push(log);
      }
    }

    return {
      summary: {
        totalCost: parseFloat(totalCost.toFixed(6)),
        totalTokens: totalPromptTokens + totalCompletionTokens,
        totalPromptTokens,
        totalCompletionTokens,
        totalActions,
        successfulActions,
        failedActions,
        successRate: totalActions > 0 ? parseFloat(((successfulActions / totalActions) * 100).toFixed(2)) : 100
      },
      tokenUsageByModel,
      tokenUsageByAgent,
      actionsByAgent,
      recentActions: actionHistory.slice(-50).reverse() // Last 50 actions, newest first
    };
  }

  _calculateCost(model, promptTokens, completionTokens) {
    const modelLower = model.toLowerCase();
    let promptRate = 0.000001; // Default $1.00/M
    let completionRate = 0.000003; // Default $3.00/M

    if (modelLower.includes('gemini-1.5-pro')) {
      promptRate = 0.0000035;
      completionRate = 0.0000105;
    } else if (modelLower.includes('gemini-1.5-flash')) {
      promptRate = 0.000000075;
      completionRate = 0.0000003;
    } else if (modelLower.includes('claude-3-5-sonnet') || modelLower.includes('claude-3.5-sonnet')) {
      promptRate = 0.000003;
      completionRate = 0.000015;
    } else if (modelLower.includes('claude-3-opus')) {
      promptRate = 0.000015;
      completionRate = 0.000075;
    } else if (modelLower.includes('gpt-4o')) {
      promptRate = 0.000005;
      completionRate = 0.000015;
    }

    const promptCost = promptTokens * promptRate;
    const completionCost = completionTokens * completionRate;
    return promptCost + completionCost;
  }

  _initializeLogFile() {
    if (!fs.existsSync(this.projectManager.configDir)) {
      fs.mkdirSync(this.projectManager.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, JSON.stringify({ logs: [] }, null, 2), 'utf-8');
    }
  }

  _readLogFile() {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const raw = fs.readFileSync(this.logFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[MonitoringEngine] Error reading log file:', e.message);
    }
    return { logs: [] };
  }

  _writeLogEntry(entry) {
    try {
      const data = this._readLogFile();
      data.logs.push(entry);
      fs.writeFileSync(this.logFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[MonitoringEngine] Error writing log entry:', e.message);
    }
  }
}
