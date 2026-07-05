/**
 * AETHER Platform - Task Queue
 * Version: 1.1.0
 *
 * Fungsi: Priority-based task queue dengan retry logic
 * - Priority levels (P0-P4)
 * - Retry dengan exponential backoff
 * - Dead-letter queue untuk failed tasks
 * - Rate limiting
 * - Task dependencies
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class TaskQueue extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      maxBackoff: options.maxBackoff || 60000,
      rateLimit: options.rateLimit || 10, // tasks per window
      rateWindow: options.rateWindow || 60000, // ms
      ...options
    };

    this.tasks = new Map(); // taskId -> task
    this.priorityQueue = []; // sorted by priority
    this.deadLetterQueue = []; // failed tasks
    this.processing = new Set(); // currently processing task IDs
    this.running = false;
    this.processor = null; // async function to process tasks

    // Rate limiting
    this.rateLimitCount = 0;
    this.rateLimitReset = Date.now() + this.config.rateWindow;

    // Metrics
    this.metrics = {
      enqueued: 0,
      processed: 0,
      failed: 0,
      retried: 0,
      dequeued: 0
    };
  }

  // ============================================================
  // PRIORITY LEVELS
  // ============================================================

  static PRIORITY = {
    CRITICAL: 0,  // P0 - Must do immediately
    HIGH: 1,       // P1 - Do soon
    MEDIUM: 2,     // P2 - Normal priority
    LOW: 3,        // P3 - Do when possible
    BACKGROUND: 4  // P4 - Background tasks
  };

  static PRIORITY_NAMES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BACKGROUND'];

  /**
   * Get priority name from value
   */
  static getPriorityName(priority) {
    return TaskQueue.PRIORITY_NAMES[priority] || 'UNKNOWN';
  }

  /**
   * Parse priority from string or number
   */
  static parsePriority(input) {
    if (typeof input === 'number') {
      if (input >= 0 && input <= 4) return input;
      return TaskQueue.PRIORITY.MEDIUM;
    }

    const upper = String(input).toUpperCase();
    const map = {
      'CRITICAL': 0,
      'P0': 0,
      'HIGH': 1,
      'P1': 1,
      'MEDIUM': 2,
      'P2': 2,
      'NORMAL': 2,
      'LOW': 3,
      'P3': 3,
      'BACKGROUND': 4,
      'P4': 4
    };

    return map[upper] ?? TaskQueue.PRIORITY.MEDIUM;
  }

  // ============================================================
  // TASK ENQUEUE
  // ============================================================

  /**
   * Add a task to the queue
   * @param {Object} task - Task definition
   * @returns {string} Task ID
   */
  enqueue(task) {
    const taskId = task.id || this._generateTaskId();

    const taskData = {
      id: taskId,
      priority: TaskQueue.parsePriority(task.priority),
      payload: task.payload,
      metadata: task.metadata || {},
      retries: 0,
      maxRetries: task.maxRetries ?? this.config.maxRetries,
      status: 'pending',
      createdAt: new Date().toISOString(),
      scheduledAt: task.scheduledAt || new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      error: null,
      dependencies: task.dependencies || [],
      tags: task.tags || [],
      assignedAgent: task.assignedAgent || null
    };

    this.tasks.set(taskId, taskData);
    this._insertIntoPriorityQueue(taskData);
    this.metrics.enqueued++;

    this.emit('task:enqueued', taskData);

    return taskId;
  }

  /**
   * Add multiple tasks to the queue
   * @param {Array} tasks
   * @returns {Array<string>} Task IDs
   */
  enqueueBatch(tasks) {
    return tasks.map(task => this.enqueue(task));
  }

  /**
   * Schedule a task for future execution
   * @param {Object} task
   * @param {Date|string} scheduledTime
   */
  schedule(task, scheduledTime) {
    task.scheduledAt = scheduledTime instanceof Date
      ? scheduledTime.toISOString()
      : scheduledTime;
    return this.enqueue(task);
  }

  /**
   * Insert task into priority queue (sorted by priority, then by creation time)
   */
  _insertIntoPriorityQueue(task) {
    // Binary search for insertion point
    let left = 0;
    let right = this.priorityQueue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midTask = this.priorityQueue[mid];

      // Compare by priority first, then by createdAt
      if (task.priority < midTask.priority) {
        right = mid;
      } else if (task.priority > midTask.priority) {
        left = mid + 1;
      } else {
        // Same priority, sort by createdAt (older first)
        if (task.createdAt < midTask.createdAt) {
          right = mid;
        } else {
          left = mid + 1;
        }
      }
    }

    this.priorityQueue.splice(left, 0, task.id);
  }

  /**
   * Generate unique task ID
   */
  _generateTaskId() {
    return `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // ============================================================
  // TASK DEQUEUE
  // ============================================================

  /**
   * Get next available task (respects dependencies)
   */
  dequeue() {
    // Check rate limiting
    if (!this._checkRateLimit()) {
      return null;
    }

    // Find first task whose dependencies are satisfied
    for (let i = 0; i < this.priorityQueue.length; i++) {
      const taskId = this.priorityQueue[i];
      const task = this.tasks.get(taskId);

      if (!task) {
        // Task was removed, skip
        continue;
      }

      // Skip if not yet scheduled
      if (new Date(task.scheduledAt) > new Date()) {
        continue;
      }

      // Skip if already processing
      if (this.processing.has(taskId)) {
        continue;
      }

      // Check dependencies
      if (!this._areDependenciesMet(task)) {
        continue;
      }

      // Mark as processing
      this.processing.add(taskId);
      task.status = 'processing';
      task.startedAt = new Date().toISOString();
      this.metrics.dequeued++;

      // Remove from queue
      this.priorityQueue.splice(i, 1);

      this.emit('task:dequeued', task);
      return task;
    }

    return null;
  }

  /**
   * Check if all dependencies are satisfied
   */
  _areDependenciesMet(task) {
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask) continue; // Dependency task not found, assume ok

      // Check if dependency is completed
      if (depTask.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Check rate limiting
   */
  _checkRateLimit() {
    const now = Date.now();

    // Reset counter if window expired
    if (now >= this.rateLimitReset) {
      this.rateLimitCount = 0;
      this.rateLimitReset = now + this.config.rateWindow;
    }

    return this.rateLimitCount < this.config.rateLimit;
  }

  // ============================================================
  // TASK COMPLETION
  // ============================================================

  /**
   * Mark task as completed
   * @param {string} taskId
   * @param {*} result
   */
  complete(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.emit('error', { message: `Task not found: ${taskId}` });
      return false;
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    this.processing.delete(taskId);
    this.metrics.processed++;

    this.emit('task:completed', task);

    // Check if this unblocks dependent tasks
    this._checkDependentTasks(taskId);

    return true;
  }

  /**
   * Mark task as failed
   * @param {string} taskId
   * @param {Error} error
   */
  fail(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.emit('error', { message: `Task not found: ${taskId}` });
      return false;
    }

    task.retries++;
    task.error = error instanceof Error ? error.message : String(error);

    if (task.retries < task.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.min(
        this.config.retryDelay * Math.pow(2, task.retries - 1),
        this.config.maxBackoff
      );

      task.status = 'pending';
      task.scheduledAt = new Date(Date.now() + delay).toISOString();
      this.processing.delete(taskId);
      this.metrics.retried++;

      // Re-add to priority queue
      this._insertIntoPriorityQueue(task);

      this.emit('task:retry', {
        task,
        retryNumber: task.retries,
        delay,
        maxRetries: task.maxRetries
      });
    } else {
      // Move to dead letter queue
      task.status = 'dead_letter';
      this.processing.delete(taskId);
      this.metrics.failed++;
      this.deadLetterQueue.push(task);

      this.emit('task:dead_letter', task);
    }

    return true;
  }

  /**
   * Check and unblock tasks that depend on completed task
   */
  _checkDependentTasks(completedTaskId) {
    for (const [taskId, task] of this.tasks) {
      if (task.dependencies.includes(completedTaskId)) {
        if (this._areDependenciesMet(task)) {
          this.emit('task:unblocked', task);
        }
      }
    }
  }

  // ============================================================
  // QUEUE PROCESSING
  // ============================================================

  /**
   * Start processing the queue
   * @param {Function} processor - Async function to process each task
   */
  start(processor) {
    if (this.running) {
      this.emit('warning', { message: 'Queue is already running' });
      return;
    }

    this.processor = processor;
    this.running = true;

    this.emit('queue:started');

    this._processLoop();
  }

  /**
   * Stop processing the queue
   */
  stop() {
    this.running = false;
    this.emit('queue:stopped');
  }

  /**
   * Main processing loop
   */
  async _processLoop() {
    while (this.running) {
      try {
        const task = this.dequeue();

        if (!task) {
          // No task available, wait before retrying
          await this._sleep(100);
          continue;
        }

        // Process the task
        if (this.processor) {
          try {
            const result = await this.processor(task);
            this.complete(task.id, result);
          } catch (error) {
            this.fail(task.id, error);
          }
        } else {
          // No processor defined, auto-complete
          this.complete(task.id, { processed: true });
        }
      } catch (error) {
        this.emit('error', { message: 'Processing error', error });
        await this._sleep(1000);
      }
    }
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // TASK MANAGEMENT
  // ============================================================

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status) {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  /**
   * Get pending tasks
   */
  getPendingTasks() {
    return this.getTasksByStatus('pending');
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry a dead letter task
   */
  retryDeadLetter(taskId) {
    const index = this.deadLetterQueue.findIndex(t => t.id === taskId);
    if (index === -1) {
      return false;
    }

    const task = this.deadLetterQueue.splice(index, 1)[0];

    // Reset task state
    task.status = 'pending';
    task.retries = 0;
    task.error = null;
    task.scheduledAt = new Date().toISOString();

    this.tasks.set(taskId, task);
    this._insertIntoPriorityQueue(task);

    this.emit('task:retry_scheduled', task);
    return true;
  }

  /**
   * Remove a task
   */
  remove(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Remove from queue if present
    const queueIndex = this.priorityQueue.indexOf(taskId);
    if (queueIndex !== -1) {
      this.priorityQueue.splice(queueIndex, 1);
    }

    // Remove from processing if present
    this.processing.delete(taskId);

    // Remove from dead letter if present
    const dlIndex = this.deadLetterQueue.findIndex(t => t.id === taskId);
    if (dlIndex !== -1) {
      this.deadLetterQueue.splice(dlIndex, 1);
    }

    this.tasks.delete(taskId);
    this.emit('task:removed', task);

    return true;
  }

  /**
   * Clear all tasks
   */
  clear() {
    this.stop();
    this.tasks.clear();
    this.priorityQueue = [];
    this.deadLetterQueue = [];
    this.processing.clear();
    this.emit('queue:cleared');
  }

  // ============================================================
  // METRICS & STATUS
  // ============================================================

  /**
   * Get queue statistics
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: this.processing.size,
      completed: tasks.filter(t => t.status === 'completed').length,
      deadLetter: this.deadLetterQueue.length,
      queueDepth: this.priorityQueue.length,
      running: this.running,
      rateLimit: {
        remaining: this.config.rateLimit - this.rateLimitCount,
        resetIn: Math.max(0, this.rateLimitReset - Date.now())
      },
      metrics: { ...this.metrics }
    };
  }

  /**
   * Get queue size by priority
   */
  getQueueDepthByPriority() {
    const depths = {};
    for (const name of TaskQueue.PRIORITY_NAMES) {
      depths[name] = 0;
    }

    for (const taskId of this.priorityQueue) {
      const task = this.tasks.get(taskId);
      if (task) {
        const name = TaskQueue.getPriorityName(task.priority);
        depths[name]++;
      }
    }

    return depths;
  }

  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this.priorityQueue.length === 0 && this.processing.size === 0;
  }

  /**
   * Wait for queue to be empty
   */
  async waitForEmpty(timeout = 60000) {
    const start = Date.now();

    while (!this.isEmpty()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for queue to be empty');
      }
      await this._sleep(100);
    }
  }
}

export default TaskQueue;