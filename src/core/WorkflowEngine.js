/**
 * AETHER Platform - Enhanced Workflow Engine
 * Version: 1.1.0
 * Features: Parallel execution, timeout handling, priority, agent affinity
 */

import fs from 'fs';
import path from 'path';

export class WorkflowEngine {
  constructor(eventBus, taskEngine, agentManager, config = {}) {
    this.eventBus = eventBus;
    this.taskEngine = taskEngine;
    this.agentManager = agentManager;
    this.activeWorkflows = new Map(); // workflowId -> workflowState
    this.config = {
      maxParallelTasks: config.maxParallelTasks || 4,
      taskTimeoutMs: config.taskTimeoutMs || 600000,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 5000,
      autoTransition: config.autoTransition ?? true,
      failFast: config.failFast ?? false,
    };
    this.taskMonitors = new Map(); // workflowId -> intervalId
    this.runningTasks = new Map(); // taskKey -> { workflowId, task, agentId, startTime }
  }

  /**
   * Start a new workflow
   * @param {string} workflowId - Unique workflow ID
   * @param {string} taskFilePath - Path to task file
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Workflow state
   */
  async startWorkflow(workflowId, taskFilePath, options = {}) {
    if (!fs.existsSync(taskFilePath)) {
      throw new Error(`Workflow cannot start: Task file not found at ${taskFilePath}`);
    }

    const tasks = this.taskEngine.parseTaskFile(taskFilePath);
    if (tasks.length === 0) {
      throw new Error(`Workflow cannot start: No checklist tasks found in ${taskFilePath}`);
    }

    // Parse priority from task text if specified (e.g., "[CRITICAL] Fix bug")
    const enrichedTasks = tasks.map(task => ({
      ...task,
      priority: this._parsePriority(task.text),
      type: this._parseTaskType(task.text),
      startedAt: undefined,
      completedAt: undefined,
      timeoutMs: options.taskTimeoutMs || this.config.taskTimeoutMs,
      retries: 0,
    }));

    const state = {
      workflowId,
      taskFilePath,
      status: 'initialized',
      currentTaskIndex: 0,
      tasks: enrichedTasks,
      history: [],
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      metadata: options.metadata || {},
      parallelTasks: [], // Currently running parallel tasks
      failedTasks: [],   // Failed task indices
    };

    this.activeWorkflows.set(workflowId, state);

    this._logHistory(state, 'initialize', `Workflow '${workflowId}' initialized with ${tasks.length} tasks.`);

    // Subscribe to agent completion events
    this.eventBus.subscribe('agent:completed', (payload) => this._handleAgentCompleted(payload));

    // If autoTransition enabled, start first task
    if (this.config.autoTransition) {
      await this.transitionToNextStep(workflowId);
    }

    // Start monitoring for timeouts
    this._startTaskMonitor(workflowId);

    this.eventBus.publish('workflow:started', {
      workflowId,
      taskFilePath,
      taskCount: tasks.length,
      metadata: options.metadata
    });

    return state;
  }

  /**
   * Start multiple tasks in parallel
   * @param {string} workflowId - Workflow ID
   * @param {number[]} taskIndices - Array of task indices to run in parallel
   * @returns {Promise<Object>} Updated workflow state
   */
  async startParallelTasks(workflowId, taskIndices) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    if (state.status !== 'running') {
      state.status = 'running';
    }

    // Check parallel task limit
    const currentlyRunning = state.parallelTasks.length;
    const maxAllowed = this.config.maxParallelTasks - currentlyRunning;

    if (taskIndices.length > maxAllowed) {
      console.warn(`Can only run ${maxAllowed} more parallel tasks. Requested: ${taskIndices.length}`);
      taskIndices = taskIndices.slice(0, maxAllowed);
    }

    // Validate all tasks can run (dependencies met)
    for (const idx of taskIndices) {
      const task = state.tasks[idx];
      if (!task) {
        throw new Error(`Task index ${idx} not found`);
      }
      if (task.status !== 'pending') {
        throw new Error(`Task at index ${idx} is not pending (status: ${task.status})`);
      }
      if (!this._areDependenciesMet(state, idx)) {
        throw new Error(`Dependencies not met for task at index ${idx}`);
      }
    }

    // Start each task
    const startPromises = taskIndices.map(async (idx) => {
      const task = state.tasks[idx];
      const assignedAgent = await this._findBestAgent(task);

      if (!assignedAgent) {
        throw new Error(`No available agent found for task: ${task.text}`);
      }

      // Mark task as in progress
      task.status = 'in_progress';
      task.assignedAgent = assignedAgent.id;
      task.startedAt = Date.now();

      // Track running task
      const taskKey = `${workflowId}:${idx}`;
      this.runningTasks.set(taskKey, {
        workflowId,
        task,
        agentId: assignedAgent.id,
        startTime: task.startedAt,
      });

      state.parallelTasks.push(idx);

      this._logHistory(state, 'parallel_start', `Started parallel task: "${task.text}" assigned to ${assignedAgent.role}`);
      this.eventBus.publish('workflow:task_assigned', {
        workflowId,
        taskIndex: idx,
        taskText: task.text,
        agentId: assignedAgent.id,
        agentRole: assignedAgent.role
      });

      // Execute the task (non-blocking)
      this._executeTask(workflowId, idx, assignedAgent);
    });

    await Promise.allSettled(startPromises);

    return state;
  }

  /**
   * Execute a task with the assigned agent
   * @private
   */
  async _executeTask(workflowId, taskIndex, agent) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) return;

    const task = state.tasks[taskIndex];
    const taskKey = `${workflowId}:${taskIndex}`;

    this.eventBus.publish('agent:executing', {
      agentId: agent.id,
      role: agent.role,
      taskIndex,
      taskText: task.text
    });

    try {
      const result = await this.agentManager.executeAgentTask(
        agent.id,
        task.text,
        this._buildContext(state, task)
      );

      // Task completed successfully
      task.status = 'completed';
      task.completedAt = Date.now();
      task.output = result;

      this._removeFromRunning(taskKey);
      state.parallelTasks = state.parallelTasks.filter(i => i !== taskIndex);

      this._logHistory(state, 'task_completed', `Task completed: "${task.text}" by ${agent.role}`);
      this.eventBus.publish('workflow:task_completed', {
        workflowId,
        taskIndex,
        taskText: task.text,
        agentId: agent.id,
        output: result
      });

      // Check if all tasks are done
      this._checkWorkflowCompletion(workflowId);

    } catch (error) {
      // Task failed
      task.retries = (task.retries || 0) + 1;

      if (task.retries < this.config.retryAttempts) {
        // Retry the task
        console.warn(`Task failed, retrying (${task.retries}/${this.config.retryAttempts}): ${task.text}`);
        setTimeout(() => {
          this._executeTask(workflowId, taskIndex, agent);
        }, this.config.retryDelayMs);
      } else {
        // Max retries reached
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = Date.now();

        this._removeFromRunning(taskKey);
        state.parallelTasks = state.parallelTasks.filter(i => i !== taskIndex);
        state.failedTasks.push(taskIndex);

        this._logHistory(state, 'task_failed', `Task failed after ${task.retries} retries: "${task.text}" - ${error.message}`);
        this.eventBus.publish('workflow:error', {
          workflowId,
          taskIndex,
          taskText: task.text,
          error: error.message
        });

        if (this.config.failFast) {
          await this.abortWorkflow(workflowId, `Fail-fast: Task "${task.text}" failed`);
        }

        this._checkWorkflowCompletion(workflowId);
      }
    }
  }

  /**
   * Handle agent completed event
   * @private
   */
  _handleAgentCompleted(payload) {
    // Update agent status in running tasks
    const taskKey = `${payload.workflowId || 'unknown'}:${payload.taskIndex || 'unknown'}`;
    const runningTask = this.runningTasks.get(taskKey);
    if (runningTask) {
      runningTask.agentStatus = 'completed';
    }
  }

  /**
   * Remove task from running tasks map
   * @private
   */
  _removeFromRunning(taskKey) {
    this.runningTasks.delete(taskKey);
  }

  /**
   * Check if all tasks are complete
   * @private
   */
  _checkWorkflowCompletion(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) return;

    // Still have running tasks
    if (state.parallelTasks.length > 0) return;

    // Check if all tasks are done
    const allDone = state.tasks.every(t =>
      t.status === 'completed' || t.status === 'skipped' || t.status === 'failed'
    );

    if (allDone) {
      const hasFailed = state.tasks.some(t => t.status === 'failed');
      state.status = hasFailed ? 'completed_with_errors' : 'completed';
      state.completedAt = new Date().toISOString();

      this._stopTaskMonitor(workflowId);
      this._logHistory(state, 'completed', hasFailed ? 'Workflow completed with errors' : 'All tasks completed successfully');

      this.eventBus.publish('workflow:completed', {
        workflowId,
        totalTasks: state.tasks.length,
        completedTasks: state.tasks.filter(t => t.status === 'completed').length,
        failedTasks: state.tasks.filter(t => t.status === 'failed').length,
        duration: state.completedAt ? new Date(state.completedAt) - new Date(state.startedAt) : 0
      });
    }
  }

  /**
   * Start monitoring tasks for timeouts
   * @private
   */
  _startTaskMonitor(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) return;

    // Clear any existing monitor
    this._stopTaskMonitor(workflowId);

    const intervalId = setInterval(() => {
      this._checkTimeouts(workflowId);
    }, 10000); // Check every 10 seconds

    this.taskMonitors.set(workflowId, intervalId);
  }

  /**
   * Stop task monitoring
   * @private
   */
  _stopTaskMonitor(workflowId) {
    const intervalId = this.taskMonitors.get(workflowId);
    if (intervalId) {
      clearInterval(intervalId);
      this.taskMonitors.delete(workflowId);
    }
  }

  /**
   * Check for task timeouts
   * @private
   */
  _checkTimeouts(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      this._stopTaskMonitor(workflowId);
      return;
    }

    const now = Date.now();

    for (const [taskKey, runningInfo] of this.runningTasks) {
      if (runningInfo.workflowId !== workflowId) continue;

      const elapsed = now - runningInfo.startTime;
      const taskTimeout = runningInfo.task.timeoutMs || this.config.taskTimeoutMs;

      if (elapsed > taskTimeout) {
        const task = runningInfo.task;
        const workflowId = runningInfo.workflowId;

        // Mark as timeout
        task.status = 'timeout';
        task.completedAt = now;
        task.error = `Task timed out after ${taskTimeout}ms`;

        this._removeFromRunning(taskKey);
        state.parallelTasks = state.parallelTasks.filter(i => i !== task.index);
        state.failedTasks.push(task.index);

        this._logHistory(state, 'task_timeout', `Task timed out: "${task.text}" after ${taskTimeout}ms`);
        this.eventBus.publish('workflow:task_timeout', {
          workflowId,
          taskIndex: task.index,
          taskText: task.text,
          timeoutMs: taskTimeout,
          elapsedMs: elapsed
        });

        this._checkWorkflowCompletion(workflowId);
      }
    }
  }

  /**
   * Find the best available agent for a task
   * @private
   */
  async _findBestAgent(task) {
    const availableAgents = this.agentManager.getAvailableAgents()
      .filter(agent => agent.status === 'standby' || agent.status === 'idle')
      .filter(agent => (agent.currentTasks || 0) < (agent.maxConcurrentTasks || 1));

    if (availableAgents.length === 0) {
      return null;
    }

    // Score agents based on capabilities matching task type
    const scoredAgents = availableAgents.map(agent => {
      let score = 0;

      // Priority bonus (lower number = higher priority)
      score += (10 - (agent.priority || 5)) * 10;

      // Capability match
      const taskType = task.type || 'implementation';
      const capabilityMap = {
        'implementation': ['backend', 'frontend', 'api'],
        'testing': ['qa'],
        'documentation': ['architect', 'backend', 'frontend'],
        'review': ['architect', 'qa', 'security'],
        'deployment': ['devops'],
      };

      const relevantCapabilities = capabilityMap[taskType] || [];
      for (const cap of relevantCapabilities) {
        if (agent.capabilities?.includes(cap)) {
          score += 20;
        }
      }

      // Current load (prefer less busy agents)
      score -= (agent.currentTasks || 0) * 5;

      return { agent, score };
    });

    // Sort by score and return best
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0]?.agent || null;
  }

  /**
   * Build context for agent execution
   * @private
   */
  _buildContext(state, task) {
    return {
      workflowId: state.workflowId,
      taskIndex: task.index,
      taskText: task.text,
      priority: task.priority,
      type: task.type,
      totalTasks: state.tasks.length,
      completedTasks: state.tasks.filter(t => t.status === 'completed').length,
    };
  }

  /**
   * Check if task dependencies are met
   * @private
   */
  _areDependenciesMet(state, taskIndex) {
    // For now, just check that all previous tasks are completed
    // In a more advanced version, we could parse explicit dependencies
    for (let i = 0; i < taskIndex; i++) {
      const prevTask = state.tasks[i];
      if (prevTask.status !== 'completed' && prevTask.status !== 'skipped') {
        return false;
      }
    }
    return true;
  }

  /**
   * Parse priority from task text
   * @private
   */
  _parsePriority(text) {
    const upperText = text.toUpperCase();
    if (upperText.includes('[CRITICAL]') || upperText.startsWith('!!!')) return 'critical';
    if (upperText.includes('[HIGH]') || upperText.startsWith('!!')) return 'high';
    if (upperText.includes('[LOW]') || upperText.startsWith('!')) return 'low';
    return 'medium';
  }

  /**
   * Parse task type from task text
   * @private
   */
  _parseTaskType(text) {
    const upperText = text.toUpperCase();
    if (upperText.includes('TEST') || upperText.includes('QA')) return 'testing';
    if (upperText.includes('DOC') || upperText.includes('DOCS') || upperText.includes('README')) return 'documentation';
    if (upperText.includes('REVIEW') || upperText.includes('AUDIT')) return 'review';
    if (upperText.includes('DEPLOY') || upperText.includes('RELEASE')) return 'deployment';
    return 'implementation';
  }

  /**
   * Transition to next step (sequential workflow)
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Updated workflow state
   */
  async transitionToNextStep(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    if (state.status !== 'initialized' && state.status !== 'running') {
      throw new Error(`Cannot transition workflow '${workflowId}': Status is '${state.status}'`);
    }

    state.status = 'running';

    // Refresh tasks from file to get latest state
    const currentTasks = this.taskEngine.parseTaskFile(state.taskFilePath);
    state.tasks = currentTasks.map((task, i) => ({
      ...task,
      priority: this._parsePriority(task.text),
      type: this._parseTaskType(task.text),
    }));

    const currentTask = currentTasks.find(t => t.status === 'in_progress');

    if (!currentTask) {
      // If none is in_progress, find the first pending task
      const firstPending = currentTasks.find(t => t.status === 'pending');
      if (!firstPending) {
        state.status = 'completed';
        state.completedAt = new Date().toISOString();
        this._stopTaskMonitor(workflowId);
        this._logHistory(state, 'completed', 'All tasks completed. Workflow finished.');
        this.eventBus.publish('workflow:completed', { workflowId });
        return state;
      }

      // Set first pending to in_progress
      this.taskEngine.updateTaskStatus(state.taskFilePath, firstPending.index, 'in_progress');
      firstPending.status = 'in_progress';
      this.eventBus.publish('workflow:task_updated', {
        workflowId,
        taskIndex: firstPending.index,
        status: 'in_progress'
      });
      return state;
    }

    // A task is in progress. Check prerequisites
    const currentTaskIdx = currentTasks.indexOf(currentTask);
    for (let i = 0; i < currentTaskIdx; i++) {
      if (currentTasks[i].status !== 'completed') {
        throw new Error(`Prerequisite verification failed: Task "${currentTasks[i].text}" before current task is not completed.`);
      }
    }

    // Mark current task as completed
    this.taskEngine.updateTaskStatus(state.taskFilePath, currentTask.index, 'completed');
    currentTask.status = 'completed';
    this._logHistory(state, 'task_completed', `Task completed: "${currentTask.text}"`);
    this.eventBus.publish('workflow:task_updated', {
      workflowId,
      taskIndex: currentTask.index,
      status: 'completed',
      text: currentTask.text
    });

    // Transition to next task
    const nextTask = currentTasks.find((t, idx) => idx > currentTaskIdx && t.status === 'pending');

    if (nextTask) {
      this.taskEngine.updateTaskStatus(state.taskFilePath, nextTask.index, 'in_progress');
      nextTask.status = 'in_progress';
      this._logHistory(state, 'transition', `Transitioned to next task: "${nextTask.text}"`);
      this.eventBus.publish('workflow:task_updated', {
        workflowId,
        taskIndex: nextTask.index,
        status: 'in_progress',
        text: nextTask.text
      });
    } else {
      // Check if there are any remaining pending tasks
      const anyPending = currentTasks.some(t => t.status === 'pending');
      if (!anyPending) {
        state.status = 'completed';
        state.completedAt = new Date().toISOString();
        this._stopTaskMonitor(workflowId);
        this._logHistory(state, 'completed', 'All tasks successfully completed. Workflow finished.');
        this.eventBus.publish('workflow:completed', { workflowId });
      }
    }

    return state;
  }

  /**
   * Skip a task (mark as skipped)
   * @param {string} workflowId - Workflow ID
   * @param {number} taskIndex - Task index to skip
   * @param {string} reason - Reason for skipping
   */
  async skipTask(workflowId, taskIndex, reason) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    const task = state.tasks[taskIndex];
    if (!task) {
      throw new Error(`Task at index ${taskIndex} not found`);
    }

    task.status = 'skipped';
    task.skipReason = reason;
    task.completedAt = Date.now();

    this.taskEngine.updateTaskStatus(state.taskFilePath, taskIndex, 'completed');

    this._logHistory(state, 'task_skipped', `Task skipped: "${task.text}" - Reason: ${reason}`);
    this.eventBus.publish('workflow:task_updated', {
      workflowId,
      taskIndex,
      status: 'skipped',
      text: task.text,
      reason
    });

    this._checkWorkflowCompletion(workflowId);

    return state;
  }

  /**
   * Assign a task to a specific agent
   * @param {string} workflowId - Workflow ID
   * @param {number} taskIndex - Task index
   * @param {string} agentId - Agent ID to assign to
   */
  async assignTaskToAgent(workflowId, taskIndex, agentId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    const task = state.tasks[taskIndex];
    if (!task) {
      throw new Error(`Task at index ${taskIndex} not found`);
    }

    const agent = this.agentManager.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }

    task.assignedAgent = agentId;
    task.status = 'in_progress';
    task.startedAt = Date.now();

    const taskKey = `${workflowId}:${taskIndex}`;
    this.runningTasks.set(taskKey, {
      workflowId,
      task,
      agentId,
      startTime: task.startedAt,
    });

    state.parallelTasks.push(taskIndex);

    this._logHistory(state, 'task_assigned', `Task "${task.text}" assigned to ${agent.role}`);
    this.eventBus.publish('workflow:task_assigned', {
      workflowId,
      taskIndex,
      taskText: task.text,
      agentId,
      agentRole: agent.role
    });

    // Execute the task
    this._executeTask(workflowId, taskIndex, agent);

    return state;
  }

  /**
   * Abort workflow
   * @param {string} workflowId - Workflow ID
   * @param {string} reason - Abort reason
   */
  async abortWorkflow(workflowId, reason) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    // Stop monitoring
    this._stopTaskMonitor(workflowId);

    // Mark all in-progress tasks as failed
    for (const task of state.tasks) {
      if (task.status === 'in_progress') {
        task.status = 'failed';
        task.error = 'Workflow aborted';
        task.completedAt = Date.now();
      }
    }

    state.status = 'aborted';
    state.completedAt = new Date().toISOString();
    state.abortReason = reason;

    this._logHistory(state, 'abort', `Workflow aborted. Reason: ${reason}`);
    this.eventBus.publish('workflow:aborted', { workflowId, reason });

    return state;
  }

  /**
   * Pause workflow
   * @param {string} workflowId - Workflow ID
   */
  async pauseWorkflow(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    state.status = 'paused';
    this._logHistory(state, 'pause', 'Workflow paused');

    return state;
  }

  /**
   * Resume paused workflow
   * @param {string} workflowId - Workflow ID
   */
  async resumeWorkflow(workflowId) {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) {
      throw new Error(`Active workflow not found: ${workflowId}`);
    }

    if (state.status !== 'paused') {
      throw new Error(`Cannot resume workflow '${workflowId}': Status is '${state.status}'`);
    }

    state.status = 'running';
    this._startTaskMonitor(workflowId);
    this._logHistory(state, 'resume', 'Workflow resumed');

    return state;
  }

  /**
   * Get workflow state
   * @param {string} workflowId - Workflow ID
   */
  getWorkflowState(workflowId) {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Get all running tasks across all workflows
   */
  getRunningTasks() {
    return Array.from(this.runningTasks.values()).map(info => ({
      workflowId: info.workflowId,
      taskIndex: info.task,
      taskText: info.task.text,
      agentId: info.agentId,
      startTime: new Date(info.startTime).toISOString(),
      elapsedMs: Date.now() - info.startTime,
    }));
  }

  /**
   * Log history entry
   * @private
   */
  _logHistory(state, action, message, agentId = null, taskIndex = null) {
    const logEntry = {
      action,
      message,
      timestamp: new Date().toISOString(),
      agentId,
      taskIndex
    };
    state.history.push(logEntry);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    for (const workflowId of this.taskMonitors.keys()) {
      this._stopTaskMonitor(workflowId);
    }
    this.activeWorkflows.clear();
    this.runningTasks.clear();
  }
}

export default WorkflowEngine;