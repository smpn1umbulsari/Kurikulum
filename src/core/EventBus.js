/**
 * AETHER Platform - Enhanced EventBus
 * Version: 1.1.0
 * Now with TypeScript support, wildcard subscriptions, and async handling
 */

export class EventBus {
  constructor(options = {}) {
    this.subscribers = {};
    this.eventHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.enableLogging = options.enableLogging ?? true;
    this.logLevel = options.logLevel || 'info';
    this.errorHandlers = [];
    this.onceSubscribers = {}; // For one-time subscriptions
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - The event type to subscribe to
   * @param {Function} callback - The callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.subscribers[eventType]) {
      this.subscribers[eventType] = new Set();
    }
    this.subscribers[eventType].add(callback);

    this._log('debug', `Subscribed to event: ${eventType}`);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, callback);
  }

  /**
   * Subscribe to an event only once
   * @param {string} eventType - The event type
   * @param {Function} callback - The callback function
   * @returns {Function} Cancel function (before event fires)
   */
  subscribeOnce(eventType, callback) {
    if (!this.onceSubscribers[eventType]) {
      this.onceSubscribers[eventType] = new Set();
    }

    const wrappedCallback = (payload, event) => {
      this.onceSubscribers[eventType].delete(wrappedCallback);
      callback(payload, event);
    };

    this.onceSubscribers[eventType].add(wrappedCallback);

    // Also subscribe normally so it works
    return this.subscribe(eventType, wrappedCallback);
  }

  /**
   * Subscribe with wildcard pattern
   * Supports patterns like 'workflow:*' or 'file:*'
   * @param {string} pattern - Event pattern (e.g., 'workflow:*')
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeWildcard(pattern, callback) {
    const wildcardId = `_wildcard_${pattern}_${Date.now()}`;

    if (!this.subscribers['*']) {
      this.subscribers['*'] = new Set();
    }

    const wrappedCallback = (payload, event) => {
      const eventType = event?.type || payload?.type;
      if (this._matchPattern(eventType, pattern)) {
        callback(payload, event, { pattern, matched: eventType });
      }
    };

    this.subscribers['*'].add(wrappedCallback);
    wrappedCallback._wildcardId = wildcardId;
    wrappedCallback._pattern = pattern;

    this._log('debug', `Subscribed to wildcard pattern: ${pattern}`);

    return () => {
      if (this.subscribers['*']) {
        this.subscribers['*'].delete(wrappedCallback);
      }
    };
  }

  /**
   * Match event type against wildcard pattern
   * @param {string} eventType - Event type to match
   * @param {string} pattern - Pattern to match against (e.g., 'workflow:*')
   * @returns {boolean} True if matches
   */
  _matchPattern(eventType, pattern) {
    if (!eventType) return false;

    const patternParts = pattern.split('*');
    if (patternParts.length === 1) {
      return eventType === pattern;
    }

    // Handle wildcard patterns like 'workflow:*' or '*:completed'
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(eventType);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(eventType, callback) {
    if (this.subscribers[eventType]) {
      this.subscribers[eventType].delete(callback);
      if (this.subscribers[eventType].size === 0) {
        delete this.subscribers[eventType];
      }
      this._log('debug', `Unsubscribed from event: ${eventType}`);
    }
  }

  /**
   * Publish an event
   * @param {string} eventType - Event type
   * @param {*} payload - Event payload
   */
  publish(eventType, payload = {}) {
    const timestamp = new Date().toISOString();
    const event = {
      type: eventType,
      payload,
      timestamp
    };

    // Keep history bounded
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this._log('debug', `Publishing event: ${eventType}`, payload);

    // Execute regular subscribers
    if (this.subscribers[eventType]) {
      for (const callback of this.subscribers[eventType]) {
        this._safeExecute(callback, eventType, payload, event);
      }
    }

    // Execute wildcard subscribers
    if (this.subscribers['*']) {
      for (const callback of this.subscribers['*']) {
        if (callback._wildcardId) {
          this._safeExecute(callback, eventType, payload, event);
        }
      }
    }

    // Execute once subscribers and clean up
    if (this.onceSubscribers[eventType]) {
      for (const callback of this.onceSubscribers[eventType]) {
        this._safeExecute(callback, eventType, payload, event);
      }
      delete this.onceSubscribers[eventType];
    }

    return event;
  }

  /**
   * Safely execute a callback with error handling
   * @private
   */
  _safeExecute(callback, eventType, payload, event) {
    try {
      const result = callback(payload, event);

      // Handle async callbacks
      if (result && typeof result.then === 'function') {
        result.catch(error => {
          this._log('error', `Async error in event subscriber for ${eventType}:`, error);
          this._notifyErrorHandlers(eventType, error);
        });
      }
    } catch (error) {
      this._log('error', `Error in event subscriber for ${eventType}:`, error);
      this._notifyErrorHandlers(eventType, error);
    }
  }

  /**
   * Publish an event asynchronously (non-blocking)
   * @param {string} eventType - Event type
   * @param {*} payload - Event payload
   */
  publishAsync(eventType, payload = {}) {
    setImmediate(() => {
      this.publish(eventType, payload);
    });
  }

  /**
   * Publish multiple events in sequence
   * @param {Array} events - Array of {type, payload} objects
   */
  publishBatch(events) {
    const results = [];
    for (const event of events) {
      results.push(this.publish(event.type, event.payload));
    }
    return results;
  }

  /**
   * Get event history
   * @param {string|null} filterType - Optional event type filter
   * @returns {Array} Event history
   */
  getHistory(filterType = null) {
    if (filterType) {
      return this.eventHistory.filter(e => e.type === filterType);
    }
    return [...this.eventHistory];
  }

  /**
   * Get events within a time range
   * @param {Date|string} startTime - Start time
   * @param {Date|string} endTime - End time
   * @returns {Array} Filtered events
   */
  getHistoryInRange(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return this.eventHistory.filter(e => {
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime >= start && eventTime <= end;
    });
  }

  /**
   * Get event statistics
   * @returns {Object} Statistics about events
   */
  getStatistics() {
    const stats = {
      total: this.eventHistory.length,
      byType: {},
      byHour: {},
      recentEvents: this.eventHistory.slice(-10).map(e => ({
        type: e.type,
        timestamp: e.timestamp
      }))
    };

    for (const event of this.eventHistory) {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // Count by hour
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    this._log('info', 'Event history cleared');
  }

  /**
   * Add an error handler for event subscriber errors
   * @param {Function} handler - Error handler function
   * @returns {Function} Remove handler function
   */
  onError(handler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Notify all error handlers
   * @private
   */
  _notifyErrorHandlers(eventType, error) {
    for (const handler of this.errorHandlers) {
      try {
        handler(eventType, error);
      } catch (e) {
        this._log('error', 'Error in error handler:', e);
      }
    }
  }

  /**
   * Wait for an event to occur
   * @param {string} eventType - Event type to wait for
   * @param {number} timeout - Timeout in ms (default: 30000)
   * @returns {Promise} Resolves with event payload
   */
  waitFor(eventType, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.unsubscribe(eventType, callback);
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);

      const callback = (payload) => {
        clearTimeout(timer);
        this.unsubscribe(eventType, callback);
        resolve(payload);
      };

      this.subscribe(eventType, callback);
    });
  }

  /**
   * Wait for multiple events
   * @param {string[]} eventTypes - Event types to wait for
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Object>} Resolves with object of event payloads keyed by type
   */
  waitForAll(eventTypes, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const results = {};
      let pending = eventTypes.length;
      const timers = [];

      const cleanup = () => {
        timers.forEach(t => clearTimeout(t));
        eventTypes.forEach(type => this.unsubscribe(type, handlers[type]));
      };

      const handlers = {};

      for (const type of eventTypes) {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for events: ${eventTypes.join(', ')}`));
        }, timeout);
        timers.push(timer);

        handlers[type] = (payload) => {
          results[type] = payload;
          pending--;
          if (pending === 0) {
            cleanup();
            resolve(results);
          }
        };

        this.subscribe(type, handlers[type]);
      }
    });
  }

  /**
   * Get list of subscribed event types
   * @returns {string[]} List of event types
   */
  getSubscribedEvents() {
    return Object.keys(this.subscribers).filter(k => k !== '*');
  }

  /**
   * Check if there are subscribers for an event type
   * @param {string} eventType - Event type to check
   * @returns {boolean} True if there are subscribers
   */
  hasSubscribers(eventType) {
    return (this.subscribers[eventType]?.size || 0) > 0;
  }

  /**
   * Get subscriber count for an event type
   * @param {string} eventType - Event type
   * @returns {number} Number of subscribers
   */
  getSubscriberCount(eventType) {
    return this.subscribers[eventType]?.size || 0;
  }

  /**
   * Internal logging
   * @private
   */
  _log(level, ...args) {
    if (!this.enableLogging) return;

    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= currentLevel) {
      const prefix = `[EventBus:${level.toUpperCase()}]`;
      if (level === 'error') {
        console.error(prefix, ...args);
      } else if (level === 'warn') {
        console.warn(prefix, ...args);
      } else {
        console.log(prefix, ...args);
      }
    }
  }
}

export default EventBus;
