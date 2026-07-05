/**
 * AETHER Platform - Result Aggregator
 * Version: 1.1.0
 *
 * Fungsi: Menggabungkan hasil dari multiple agents
 * - Consensus-based aggregation
 * - Priority voting
 * - Conflict detection & resolution
 * - Confidence scoring
 */

import { EventEmitter } from 'events';

export class ResultAggregator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      consensusThreshold: options.consensusThreshold || 0.6, // 60% agreement needed
      maxResults: options.maxResults || 10,
      conflictResolutionStrategy: options.conflictResolutionStrategy || 'priority', // priority, majority, latest
      ...options
    };

    this.aggregations = new Map(); // aggregationId -> aggregation data
    this.history = [];
  }

  // ============================================================
  // AGGREGATION METHODS
  // ============================================================

  /**
   * Aggregate results from multiple agents
   * @param {Array} results - Array of agent execution results
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregated result
   */
  aggregate(results, options = {}) {
    const aggregationId = `agg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const aggregation = {
      id: aggregationId,
      timestamp: new Date().toISOString(),
      inputCount: results.length,
      results: results.filter(r => r.success),
      failedCount: results.filter(r => !r.success).length,
      strategy: options.strategy || 'consensus',
      ...options
    };

    // Process based on strategy
    switch (aggregation.strategy) {
      case 'consensus':
        aggregation.result = this._buildConsensus(aggregation.results);
        break;
      case 'priority':
        aggregation.result = this._buildPriorityBased(aggregation.results, options.priorities);
        break;
      case 'majority':
        aggregation.result = this._buildMajority(aggregation.results);
        break;
      case 'latest':
        aggregation.result = this._buildLatest(aggregation.results);
        break;
      case 'hierarchical':
        aggregation.result = this._buildHierarchical(aggregation.results, options.hierarchy);
        break;
      default:
        aggregation.result = this._buildSimpleMerge(aggregation.results);
    }

    // Calculate confidence
    aggregation.confidence = this._calculateConfidence(aggregation);

    // Detect conflicts
    aggregation.conflicts = this._detectConflicts(aggregation.results);

    // Generate summary
    aggregation.summary = this._generateSummary(aggregation);

    // Store aggregation
    this.aggregations.set(aggregationId, aggregation);
    this.history.push(aggregation);

    this.emit('aggregation:completed', aggregation);

    return aggregation;
  }

  /**
   * Build consensus result
   * Finds common patterns/answers across results
   */
  _buildConsensus(results) {
    if (results.length === 0) {
      return { output: '', type: 'empty' };
    }

    if (results.length === 1) {
      return {
        output: results[0].output,
        type: 'single',
        source: results[0].agentId
      };
    }

    // For text results, find longest common substring or merge
    const outputs = results.map(r => r.output || '').filter(Boolean);

    if (outputs.length === 0) {
      return { output: '', type: 'empty' };
    }

    // Simple approach: Use the longest/cmost detailed result
    // In a real implementation, you might use more sophisticated techniques
    const sorted = outputs.sort((a, b) => b.length - a.length);
    const primary = sorted[0];

    // Check similarity to others
    const similarities = outputs.map(o => this._calculateSimilarity(primary, o));
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

    return {
      output: primary,
      type: 'consensus',
      confidence: avgSimilarity,
      agreeingResults: Math.round(avgSimilarity * outputs.length),
      totalResults: outputs.length
    };
  }

  /**
   * Build priority-based result
   * Uses agent priorities to select best result
   */
  _buildPriorityBased(results, priorities = {}) {
    if (results.length === 0) {
      return { output: '', type: 'empty' };
    }

    // Score each result
    const scored = results.map(r => {
      const priority = priorities[r.agentId] || 5; // Default priority 5
      const length = (r.output || '').length;
      const completeness = this._assessCompleteness(r.output);

      return {
        ...r,
        score: priority * 10 + completeness * 5 + Math.log(length + 1),
        priority,
        completeness
      };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    return {
      output: best.output,
      type: 'priority',
      source: best.agentId,
      agentRole: best.agentRole,
      score: best.score,
      allResults: scored.map(s => ({
        agentId: s.agentId,
        role: s.agentRole,
        score: s.score
      }))
    };
  }

  /**
   * Build majority result
   * Uses voting to select most common answer
   */
  _buildMajority(results) {
    if (results.length === 0) {
      return { output: '', type: 'empty' };
    }

    // Group by similar outputs
    const groups = new Map();

    for (const result of results) {
      const output = result.output || '';
      const key = this._normalizeForComparison(output);

      if (!groups.has(key)) {
        groups.set(key, { output, count: 0, results: [] });
      }

      groups.get(key).count++;
      groups.get(key).results.push(result);
    }

    // Find majority group
    let majority = null;
    let maxCount = 0;

    for (const [_, group] of groups) {
      if (group.count > maxCount) {
        maxCount = group.count;
        majority = group;
      }
    }

    const threshold = Math.ceil(results.length * this.config.consensusThreshold);

    if (maxCount >= threshold && results.length > 1) {
      return {
        output: majority.output,
        type: 'majority',
        voteCount: maxCount,
        totalVotes: results.length,
        percentage: (maxCount / results.length * 100).toFixed(1) + '%'
      };
    }

    // No clear majority, use priority
    return this._buildPriorityBased(majority?.results || results);
  }

  /**
   * Build latest result
   */
  _buildLatest(results) {
    if (results.length === 0) {
      return { output: '', type: 'empty' };
    }

    // Sort by timestamp
    const sorted = [...results].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return {
      output: sorted[0].output,
      type: 'latest',
      source: sorted[0].agentId,
      timestamp: sorted[0].timestamp
    };
  }

  /**
   * Build hierarchical result
   * Uses a hierarchy of agents (e.g., architect > developer > qa)
   */
  _buildHierarchical(results, hierarchy = []) {
    if (results.length === 0) {
      return { output: '', type: 'empty' };
    }

    // Create hierarchy map
    const hierarchyMap = new Map();
    hierarchy.forEach((role, index) => {
      hierarchyMap.set(role, index);
    });

    // Sort results by hierarchy position
    const sorted = results.sort((a, b) => {
      const aPos = hierarchyMap.get(a.agentRole) ?? 999;
      const bPos = hierarchyMap.get(b.agentRole) ?? 999;
      return aPos - bPos;
    });

    // Use first successful result from highest priority role
    for (const result of sorted) {
      if (result.success && result.output) {
        return {
          output: result.output,
          type: 'hierarchical',
          source: result.agentId,
          agentRole: result.agentRole,
          hierarchyLevel: hierarchy.indexOf(result.agentRole)
        };
      }
    }

    return { output: '', type: 'empty' };
  }

  /**
   * Simple merge of all results
   */
  _buildSimpleMerge(results) {
    return {
      output: results.map(r => r.output).filter(Boolean).join('\n\n---\n\n'),
      type: 'merged',
      count: results.length
    };
  }

  // ============================================================
  // ANALYSIS METHODS
  // ============================================================

  /**
   * Calculate confidence score
   */
  _calculateConfidence(aggregation) {
    if (aggregation.failedCount === aggregation.inputCount) {
      return 0;
    }

    const successRate = (aggregation.inputCount - aggregation.failedCount) / aggregation.inputCount;

    // Factor in consensus level if applicable
    if (aggregation.result?.confidence !== undefined) {
      return (successRate * 0.6 + aggregation.result.confidence * 0.4);
    }

    return successRate;
  }

  /**
   * Detect conflicts between results
   */
  _detectConflicts(results) {
    const conflicts = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const similarity = this._calculateSimilarity(
          results[i].output || '',
          results[j].output || ''
        );

        if (similarity < 0.3) {
          conflicts.push({
            resultA: results[i].agentId,
            resultB: results[j].agentId,
            similarity,
            severity: similarity < 0.1 ? 'high' : 'medium'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Generate summary of aggregation
   */
  _generateSummary(aggregation) {
    return {
      totalInputs: aggregation.inputCount,
      successfulInputs: aggregation.inputCount - aggregation.failedCount,
      failedInputs: aggregation.failedCount,
      strategy: aggregation.strategy,
      confidence: (aggregation.confidence * 100).toFixed(1) + '%',
      conflictsDetected: aggregation.conflicts?.length || 0,
      hasConflicts: (aggregation.conflicts?.length || 0) > 0
    };
  }

  /**
   * Calculate similarity between two texts
   */
  _calculateSimilarity(textA, textB) {
    if (!textA || !textB) return 0;

    // Normalize
    const normA = this._normalizeForComparison(textA);
    const normB = this._normalizeForComparison(textB);

    if (normA === normB) return 1;
    if (normA.length === 0 || normB.length === 0) return 0;

    // Simple Jaccard similarity on words
    const wordsA = new Set(normA.split(/\s+/));
    const wordsB = new Set(normB.split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  /**
   * Normalize text for comparison
   */
  _normalizeForComparison(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Assess completeness of output
   */
  _assessCompleteness(output) {
    if (!output) return 0;

    // Check for indicators of complete response
    const indicators = [
      /```[\s\S]*?```/, // Code blocks
      /\n\d+\./, // Numbered lists
      /[-*]\s/m, // Bullet lists
      /##\s/, // Headers
      /```sql|```javascript|```typescript|```json/, // Technical code
    ];

    let score = 0;
    for (const pattern of indicators) {
      if (pattern.test(output)) {
        score += 0.1;
      }
    }

    // Length factor (normalized)
    score += Math.min(output.length / 5000, 0.5);

    return Math.min(score, 1);
  }

  // ============================================================
  // PUBLIC METHODS
  // ============================================================

  /**
   * Get aggregation by ID
   */
  getAggregation(aggregationId) {
    return this.aggregations.get(aggregationId) || null;
  }

  /**
   * Get all aggregations
   */
  getAllAggregations() {
    return Array.from(this.aggregations.values());
  }

  /**
   * Get aggregation history
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }

  /**
   * Compare two aggregations
   */
  compare(aggregationIdA, aggregationIdB) {
    const aggA = this.aggregations.get(aggregationIdA);
    const aggB = this.aggregations.get(aggregationIdB);

    if (!aggA || !aggB) {
      return null;
    }

    return {
      idA: aggregationIdA,
      idB: aggregationIdB,
      confidenceDiff: aggA.confidence - aggB.confidence,
      outputSimilarity: this._calculateSimilarity(aggA.result?.output || '', aggB.result?.output || ''),
      comparisonTimestamp: new Date().toISOString()
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const total = this.history.length;

    if (total === 0) {
      return {
        totalAggregations: 0,
        averageConfidence: 0,
        totalConflicts: 0,
        byStrategy: {}
      };
    }

    const totalConfidence = this.history.reduce((sum, a) => sum + a.confidence, 0);
    const totalConflicts = this.history.reduce((sum, a) => sum + (a.conflicts?.length || 0), 0);

    const byStrategy = {};
    for (const agg of this.history) {
      if (!byStrategy[agg.strategy]) {
        byStrategy[agg.strategy] = { count: 0, totalConfidence: 0 };
      }
      byStrategy[agg.strategy].count++;
      byStrategy[agg.strategy].totalConfidence += agg.confidence;
    }

    for (const strategy of Object.keys(byStrategy)) {
      byStrategy[strategy].averageConfidence =
        byStrategy[strategy].totalConfidence / byStrategy[strategy].count;
    }

    return {
      totalAggregations: total,
      averageConfidence: (totalConfidence / total * 100).toFixed(1) + '%',
      totalConflicts,
      byStrategy
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.aggregations.clear();
    this.history = [];
    this.emit('history:cleared');
  }
}

export default ResultAggregator;