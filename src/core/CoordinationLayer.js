/**
 * AETHER Platform - Coordination Layer
 * Version: 1.1.0
 *
 * Fungsi: Mengkoordinasikan semua komponen AETHER
 * - Integrasi AgentExecutor, TaskQueue, ResultAggregator, ContextManager
 * - Orchestration layer untuk multi-agent workflows
 * - Event-driven coordination
 * - PRD-aware execution pipeline
 */

import { EventEmitter } from 'events';
import { AgentExecutor } from './AgentExecutor.js';
import { TaskQueue } from './TaskQueue.js';
import { ResultAggregator } from './ResultAggregator.js';

export class CoordinationLayer extends EventEmitter {
  constructor(projectManager, options = {}) {
    super();

    this.projectManager = projectManager;
    this.config = {
      enableAutoRetry: options.enableAutoRetry ?? true,
      enablePrdChecks: options.enablePrdChecks ?? true,
      maxParallelAgents: options.maxParallelAgents ?? 3,
      taskTimeout: options.taskTimeout ?? 300000, // 5 minutes
      customGateway: options.customGateway || {
        claudeUrl: process.env.CLAUDE_BASE_URL,
        geminiUrl: process.env.GEMINI_BASE_URL,
        openaiUrl: process.env.OPENAI_BASE_URL,
        apiKey: process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
      },
      ...options
    };

    // Initialize components with custom gateway
    this.agentExecutor = new AgentExecutor({
      maxRetries: 3,
      timeout: this.config.taskTimeout,
      customGateway: this.config.customGateway
    });

    this.taskQueue = new TaskQueue({
      maxRetries: 3,
      rateLimit: this.config.maxParallelAgents
    });

    this.resultAggregator = new ResultAggregator({
      consensusThreshold: 0.6
    });

    // State management
    this.workflows = new Map(); // workflowId -> workflow state
    this.activeSessions = new Map(); // sessionId -> session state
    this.contextCache = new Map(); // sessionId -> context

    // Bind event handlers
    this._bindEventHandlers();
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  _bindEventHandlers() {
    // Forward executor events
    this.agentExecutor.on('execution:started', (data) => {
      this.emit('execution:started', data);
    });

    this.agentExecutor.on('execution:completed', (data) => {
      this.emit('execution:completed', data);
      this._handleTaskCompletion(data);
    });

    this.agentExecutor.on('execution:failed', (data) => {
      this.emit('execution:failed', data);
      this._handleTaskFailure(data);
    });

    this.agentExecutor.on('execution:stream', (data) => {
      this.emit('execution:stream', data);
    });

    // Forward queue events
    this.taskQueue.on('task:enqueued', (data) => {
      this.emit('task:enqueued', data);
    });

    this.taskQueue.on('task:dead_letter', (data) => {
      this.emit('task:dead_letter', data);
    });

    // Aggregator events
    this.resultAggregator.on('aggregation:completed', (data) => {
      this.emit('aggregation:completed', data);
    });
  }

  // ============================================================
  // WORKFLOW MANAGEMENT
  // ============================================================

  /**
   * Create a new workflow
   * @param {string} workflowId - Unique workflow identifier
   * @param {Object} options - Workflow options
   */
  createWorkflow(workflowId, options = {}) {
    const workflow = {
      id: workflowId,
      createdAt: new Date().toISOString(),
      status: 'created',
      agents: options.agents || [],
      tasks: [],
      completedTasks: 0,
      failedTasks: 0,
      currentTask: null,
      context: {},
      metadata: options.metadata || {}
    };

    this.workflows.set(workflowId, workflow);
    this.emit('workflow:created', workflow);

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  // ============================================================
  // TASK EXECUTION
  // ============================================================

  /**
   * Execute a single task with automatic agent selection
   * @param {Object} task - Task definition
   * @param {Object} options - Execution options
   */
  async executeTask(task, options = {}) {
    const {
      agentId,
      agentProfile,
      priority = 'medium',
      timeout = this.config.taskTimeout,
      context = {}
    } = options;

    // Create execution context
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare agent
    const agent = agentProfile || this._createAdHocAgent(agentId, options);

    // Add to queue
    const taskId = this.taskQueue.enqueue({
      id: executionId,
      priority,
      payload: { task, options },
      metadata: {
        workflowId: options.workflowId,
        context
      }
    });

    // Execute immediately (non-queued)
    return this._executeTaskDirectly(executionId, task, agent, context);
  }

  /**
   * Execute task directly (bypasses queue for immediate execution)
   * @private
   */
  async _executeTaskDirectly(executionId, task, agent, context) {
    try {
      // PRD compliance check
      if (this.config.enablePrdChecks) {
        const prdCheck = await this._checkPrdCompliance(task, context);
        if (!prdCheck.passed) {
          this.emit('prd:warning', prdCheck);
        }
      }

      // Execute
      const result = await this.agentExecutor.execute(agent, task, context);

      return result;

    } catch (error) {
      this.emit('execution:error', {
        executionId,
        error: error.message,
        agentId: agent.id
      });
      throw error;
    }
  }

  /**
   * Execute multiple tasks in parallel with result aggregation
   * @param {Array} tasks - Array of task definitions
   * @param {Object} options - Execution options
   */
  async executeParallel(tasks, options = {}) {
    const {
      agents = [],
      strategy = 'consensus',
      priority = 'medium'
    } = options;

    const executionId = `parallel_${Date.now()}`;

    this.emit('execution:parallel:started', {
      executionId,
      taskCount: tasks.length,
      agentCount: agents.length
    });

    // Execute all tasks in parallel
    const results = await Promise.allSettled(
      tasks.map(async (task, index) => {
        const agent = agents[index % agents.length] || this._createAdHocAgent(`agent_${index}`, options);
        return this._executeTaskDirectly(`${executionId}_${index}`, task, agent, options.context || {});
      })
    );

    // Format results
    const formattedResults = results.map((result, index) => ({
      taskIndex: index,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }));

    // Aggregate results
    const successfulResults = formattedResults
      .filter(r => r.success)
      .map(r => r.result);

    const aggregation = this.resultAggregator.aggregate(successfulResults, {
      strategy,
      priorities: this._buildPriorityMap(agents)
    });

    this.emit('execution:parallel:completed', {
      executionId,
      taskCount: tasks.length,
      successCount: successfulResults.length,
      aggregation
    });

    return {
      executionId,
      results: formattedResults,
      aggregation,
      summary: {
        total: tasks.length,
        successful: successfulResults.length,
        failed: tasks.length - successfulResults.length,
        confidence: aggregation.confidence
      }
    };
  }

  /**
   * Execute sequential workflow
   * @param {Array} tasks - Array of tasks to execute sequentially
   * @param {Object} options - Execution options
   */
  async executeSequential(tasks, options = {}) {
    const {
      workflowId = `workflow_${Date.now()}`,
      agents = [],
      stopOnError = true,
      context = {}
    } = options;

    // Create workflow
    const workflow = this.createWorkflow(workflowId, {
      agents,
      metadata: options.metadata
    });
    workflow.status = 'running';

    const results = [];
    let accumulatedContext = { ...context };

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const agent = agents[i % agents.length] || this._createAdHocAgent(`agent_${i}`, options);

      workflow.currentTask = i;
      workflow.tasks.push({
        index: i,
        task,
        agentId: agent.id,
        status: 'running'
      });

      try {
        const result = await this._executeTaskDirectly(
          `${workflowId}_task_${i}`,
          task,
          agent,
          accumulatedContext
        );

        results.push({
          index: i,
          success: true,
          result
        });

        workflow.tasks[i].status = 'completed';
        workflow.tasks[i].result = result;
        workflow.completedTasks++;

        // Update context with result
        accumulatedContext = {
          ...accumulatedContext,
          lastResult: result.output,
          completedTasks: workflow.completedTasks
        };

        this.emit('workflow:task:completed', {
          workflowId,
          taskIndex: i,
          totalTasks: tasks.length
        });

      } catch (error) {
        workflow.tasks[i].status = 'failed';
        workflow.tasks[i].error = error.message;
        workflow.failedTasks++;

        results.push({
          index: i,
          success: false,
          error: error.message
        });

        this.emit('workflow:task:failed', {
          workflowId,
          taskIndex: i,
          error: error.message
        });

        if (stopOnError) {
          workflow.status = 'failed';
          break;
        }
      }
    }

    // Finalize workflow
    if (workflow.status === 'running') {
      workflow.status = workflow.failedTasks > 0 ? 'completed_with_errors' : 'completed';
    }
    workflow.completedAt = new Date().toISOString();

    this.emit('workflow:completed', workflow);

    return {
      workflowId,
      workflow,
      results,
      summary: {
        total: tasks.length,
        completed: workflow.completedTasks,
        failed: workflow.failedTasks,
        status: workflow.status
      }
    };
  }

  /**
   * Execute multi-agent collaboration
   * @param {Object} task - Task requiring multiple agents
   * @param {Array} agents - Agents to involve
   * @param {Object} options - Execution options
   */
  async executeCollaboration(task, agents, options = {}) {
    const {
      strategy = 'hierarchical',
      rounds = 1,
      context = {}
    } = options;

    const executionId = `collab_${Date.now()}`;

    this.emit('execution:collaboration:started', {
      executionId,
      agentCount: agents.length,
      rounds
    });

    let accumulatedResults = [];
    let currentContext = { ...context };

    // Multi-round collaboration
    for (let round = 0; round < rounds; round++) {
      this.emit('execution:collaboration:round', {
        executionId,
        round: round + 1,
        totalRounds: rounds
      });

      // Each agent contributes
      const roundResults = await Promise.allSettled(
        agents.map(async (agent, index) => {
          // Build context with previous contributions
          const agentContext = {
            ...currentContext,
            round,
            totalRounds: rounds,
            previousContributions: accumulatedResults.filter(r => r.agentId !== agent.id)
          };

          return this._executeTaskDirectly(
            `${executionId}_round_${round}_agent_${index}`,
            task,
            agent,
            agentContext
          );
        })
      );

      // Format round results
      const formattedRoundResults = roundResults.map((result, index) => ({
        agentId: agents[index].id,
        agentRole: agents[index].role,
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null
      }));

      accumulatedResults.push(...formattedRoundResults);

      // Update context
      currentContext = {
        ...currentContext,
        roundResults: formattedRoundResults
      };
    }

    // Final aggregation
    const successfulResults = accumulatedResults.filter(r => r.success);
    const aggregation = this.resultAggregator.aggregate(
      successfulResults.map(r => r.result),
      { strategy, hierarchy: agents.map(a => a.role) }
    );

    this.emit('execution:collaboration:completed', {
      executionId,
      totalContributions: accumulatedResults.length,
      aggregation
    });

    return {
      executionId,
      contributions: accumulatedResults,
      aggregation,
      finalOutput: aggregation.result?.output
    };
  }

  // ============================================================
  // TASK MANAGEMENT
  // ============================================================

  /**
   * Enqueue a task for later processing
   */
  enqueueTask(task, options = {}) {
    const taskId = this.taskQueue.enqueue({
      priority: options.priority || 'medium',
      payload: task,
      dependencies: options.dependencies || [],
      metadata: options.metadata || {}
    });

    this.emit('task:enqueued', { taskId, task, options });
    return taskId;
  }

  /**
   * Start processing the task queue
   */
  startQueue(processor) {
    this.taskQueue.start(async (queuedTask) => {
      const { task, options } = queuedTask.payload;
      const agent = options.agentProfile || this._createAdHocAgent(options.agentId, options);

      return this._executeTaskDirectly(queuedTask.id, task, agent, options.context || {});
    });

    this.emit('queue:started');
  }

  /**
   * Stop the task queue
   */
  stopQueue() {
    this.taskQueue.stop();
    this.emit('queue:stopped');
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.taskQueue.getStats();
  }

  // ============================================================
  // PRAGMA / PRD COMPLIANCE
  // ============================================================

  /**
   * Check PRD compliance for a task
   * @private
   */
  async _checkPrdCompliance(task, context) {
    // Simple heuristic-based compliance check
    const checks = {
      hasPRD: true,
      hasAcceptanceCriteria: false,
      hasSecurityConsideration: false,
      hasTestPlan: false
    };

    const taskLower = task.toLowerCase();

    // Check for acceptance criteria indicators
    if (taskLower.includes('acceptance') ||
        taskLower.includes('criteria') ||
        taskLower.includes('given') ||
        taskLower.includes('when') ||
        taskLower.includes('then')) {
      checks.hasAcceptanceCriteria = true;
    }

    // Check for security indicators
    if (taskLower.includes('security') ||
        taskLower.includes('auth') ||
        taskLower.includes('validate') ||
        taskLower.includes('sanitize')) {
      checks.hasSecurityConsideration = true;
    }

    // Check for test indicators
    if (taskLower.includes('test') ||
        taskLower.includes('verify') ||
        taskLower.includes('qa')) {
      checks.hasTestPlan = true;
    }

    const passed = checks.hasPRD;
    const warnings = [];

    if (!checks.hasAcceptanceCriteria) {
      warnings.push('Task lacks explicit acceptance criteria');
    }
    if (!checks.hasSecurityConsideration && taskLower.includes('api')) {
      warnings.push('API task should consider security implications');
    }
    if (!checks.hasTestPlan) {
      warnings.push('Task should have associated test plan');
    }

    return { passed, checks, warnings };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Create ad-hoc agent profile
   * @private
   */
  _createAdHocAgent(agentId, options) {
    return {
      id: agentId || `adhoc_${Date.now()}`,
      role: options.role || 'AI Agent',
      model: options.model || 'gemini-1.5-pro',
      capabilities: options.capabilities || [],
      priority: options.priority || 3,
      maxConcurrentTasks: options.maxConcurrentTasks || 1
    };
  }

  /**
   * Build priority map from agents
   * @private
   */
  _buildPriorityMap(agents) {
    const map = {};
    agents.forEach((agent, index) => {
      map[agent.id] = index; // Earlier agents have higher priority
    });
    return map;
  }

  /**
   * Handle task completion
   * @private
   */
  _handleTaskCompletion(data) {
    this.emit('task:completed', data);
  }

  /**
   * Handle task failure
   * @private
   */
  _handleTaskFailure(data) {
    this.emit('task:failed', data);

    // Auto-retry logic
    if (this.config.enableAutoRetry && data.retries < 3) {
      this.emit('task:retrying', data);
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      executor: this.agentExecutor.getStatistics(),
      queue: this.taskQueue.getStats(),
      aggregator: this.resultAggregator.getStatistics(),
      workflows: {
        total: this.workflows.size,
        running: Array.from(this.workflows.values()).filter(w => w.status === 'running').length,
        completed: Array.from(this.workflows.size).filter(w => w.status === 'completed').length
      }
    };
  }

  /**
   * Get executor instance for direct access
   */
  getExecutor() {
    return this.agentExecutor;
  }

  /**
   * Get queue instance for direct access
   */
  getQueue() {
    return this.taskQueue;
  }

  /**
   * Get aggregator instance for direct access
   */
  getAggregator() {
    return this.resultAggregator;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopQueue();
    this.workflows.clear();
    this.activeSessions.clear();
    this.contextCache.clear();
    this.emit('cleanup:completed');
  }
}

export default CoordinationLayer;