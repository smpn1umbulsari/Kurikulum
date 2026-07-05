import fs from 'fs';
import path from 'path';
import { LockManager } from './LockManager.js';

export class DecisionEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.logsFilePath = path.join(this.projectManager.configDir, 'decision_logs.json');
    this.lockManager = new LockManager(this.projectManager);
  }

  /**
   * Evaluate alternative options based on risk, complexity, and impact
   * @param {Array<{ id: string, name: string, risk: number, complexity: number, impact: number, description: string }>} options 
   * @returns {Promise<{ decisionId: string, timestamp: string, options: Array, selectedOptionId: string, rationale: string }>}
   */
   async evaluateOptions(options) {
    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new Error("Options must be a non-empty array.");
    }

    let bestOption = null;
    let bestScore = -Infinity;

    const evaluatedOptions = options.map((o, idx) => {
      // Validate inputs (bounds 1..10)
      const oId = o.id || `opt_${idx + 1}`;
      const oName = o.name || `Option ${oId}`;
      const rawImpact = Number(o.impact);
      const rawRisk = Number(o.risk);
      const rawComplexity = Number(o.complexity);

      const impact = isNaN(rawImpact) ? 1 : Math.min(10, Math.max(1, rawImpact));
      const risk = isNaN(rawRisk) ? 1 : Math.min(10, Math.max(1, rawRisk));
      const complexity = isNaN(rawComplexity) ? 1 : Math.min(10, Math.max(1, rawComplexity));

      // Formula: Score = (Impact * 10) - (Risk * 5) - (Complexity * 3)
      const score = (impact * 10) - (risk * 5) - (complexity * 3);

      const evaluated = {
        ...o,
        id: oId,
        name: oName,
        impact,
        risk,
        complexity,
        score
      };

      if (score > bestScore) {
        bestScore = score;
        bestOption = evaluated;
      }

      return evaluated;
    });

    if (!bestOption && evaluatedOptions.length > 0) {
      bestOption = evaluatedOptions[0];
      bestScore = bestOption.score;
    }

    const decision = {
      decisionId: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      options: evaluatedOptions,
      selectedOptionId: bestOption.id,
      rationale: `Selected option '${bestOption.name}' with score ${bestScore} based on formula: (Impact * 10) - (Risk * 5) - (Complexity * 3).`
    };

    return decision;
  }

  /**
   * Save a decision record to local logs JSON file with concurrency locks
   * @param {Object} decision 
   */
  async logDecision(decision) {
    const lockKey = this.logsFilePath;
    const agentId = decision.decisionId || 'decision_engine';

    let acquired = false;
    for (let i = 0; i < 10; i++) {
      if (this.lockManager.acquireLock(agentId, lockKey)) {
        acquired = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!acquired) {
      console.warn("[DecisionEngine] Warning: Failed to acquire lock for logging decision. Writing without lock.");
    }

    try {
      let history = [];
      if (fs.existsSync(this.logsFilePath)) {
        try {
          const raw = fs.readFileSync(this.logsFilePath, 'utf-8');
          history = JSON.parse(raw);
          if (!Array.isArray(history)) history = [];
        } catch (err) {
          console.warn("[DecisionEngine] Warning: Failed to parse decision logs, starting fresh.");
        }
      }

      history.push(decision);
      
      // Ensure parent directory exists
      const dir = path.dirname(this.logsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.logsFilePath, JSON.stringify(history, null, 2), 'utf-8');
    } finally {
      if (acquired) {
        this.lockManager.releaseLock(agentId, lockKey);
      }
    }
  }

  /**
   * Get all decision logs
   * @returns {Promise<Array>}
   */
  async getDecisionHistory() {
    if (!fs.existsSync(this.logsFilePath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(this.logsFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * Evaluate a user proposal against baseline architectural templates or custom alternatives.
   * If the user's proposal has a lower calculated score, outputs smart recommendations.
   * @param {Object} userProposal - { name: string, impact: number, risk: number, complexity: number, description: string }
   * @param {Array<Object>} alternatives - Optional list of custom alternative proposals
   * @returns {Promise<{ isOptimal: boolean, scoreDifference: number, feedback: string, recommendedProposal: Object | null, suggestions: Array<string> }>}
   */
  async evaluateUserProposal(userProposal, alternatives = []) {
    if (!userProposal) {
      throw new Error("User proposal is required for evaluation.");
    }

    // Default baseline architectural templates if no alternatives are provided
    const comparisonAlts = alternatives.length > 0 ? alternatives : [
      {
        id: 'service_isolation',
        name: 'Service Layer Isolation with RLS Guard',
        impact: 9,
        risk: 2,
        complexity: 3,
        description: 'Isolates SQL updates behind standard Services containing business validation and strict Supabase RLS policy guards.'
      },
      {
        id: 'sync_queue',
        name: 'Offline-First Local DB Sync Queue',
        impact: 8,
        risk: 3,
        complexity: 6,
        description: 'Caches write operations locally in Dexie.js and queues them for synchronization using exponential backoff retry mechanisms.'
      },
      {
        id: 'direct_db_mutation',
        name: 'Direct DB/Table Modification',
        impact: 4,
        risk: 8,
        complexity: 2,
        description: 'Directly executes inserts/updates on DB tables from UI layers bypassing centralized validation services.'
      },
      {
        id: 'cache_bypass',
        name: 'Frontend-Only Cache Bypass',
        impact: 5,
        risk: 6,
        complexity: 2,
        description: 'Bypasses offline IndexedDB database entirely and performs real-time remote fetch without local fallbacks.'
      }
    ];

    // Evaluate user proposal
    const userEvalResult = await this.evaluateOptions([{ id: 'user_proposal', ...userProposal }]);
    const evaluatedUser = userEvalResult.options[0];

    // Evaluate alternative options
    const altsEvalResult = await this.evaluateOptions(comparisonAlts);
    const evaluatedAlts = altsEvalResult.options;

    // Find the best option from the alternatives
    const bestAlt = evaluatedAlts.reduce((best, current) => current.score > best.score ? current : best, evaluatedAlts[0]);

    const isOptimal = evaluatedUser.score >= bestAlt.score;
    const scoreDifference = bestAlt.score - evaluatedUser.score;

    const suggestions = [];
    let feedback = "";

    if (isOptimal) {
      feedback = `Your proposal '${userProposal.name}' is highly optimal (Score: ${evaluatedUser.score}) and meets or exceeds the best alternative template '${bestAlt.name}' (Score: ${bestAlt.score}).`;
      suggestions.push("Excellent work. Ensure unit tests are in place to cover edge cases and run a full Quality Gate check.");
    } else {
      feedback = `Your proposal '${userProposal.name}' (Score: ${evaluatedUser.score}) is less optimal than '${bestAlt.name}' (Score: ${bestAlt.score}) by ${scoreDifference.toFixed(1)} points.`;
      
      // Analyze and formulate smart feedback recommendations
      if (evaluatedUser.risk > bestAlt.risk) {
        suggestions.push(`[Reduce Risk] Your proposal's risk rating is ${evaluatedUser.risk}/10 compared to ${bestAlt.risk}/10 for '${bestAlt.name}'. Consider adding automatic fallback handlers, transaction rollbacks, or implementing RLS guards.`);
      }
      if (evaluatedUser.complexity > bestAlt.complexity) {
        suggestions.push(`[Reduce Complexity] Your proposal's complexity rating is ${evaluatedUser.complexity}/10 compared to ${bestAlt.complexity}/10 for '${bestAlt.name}'. Consider splitting the monolithic changes into decoupled components.`);
      }
      if (evaluatedUser.impact < bestAlt.impact) {
        suggestions.push(`[Increase Impact] Your proposal's impact is rated ${evaluatedUser.impact}/10 compared to ${bestAlt.impact}/10 for '${bestAlt.name}'. Consider extending the functionality to provide a generalized service rather than a patch.`);
      }

      suggestions.push(`Recommendation: Pivot your approach towards the '${bestAlt.name}' pattern: ${bestAlt.description}`);
    }

    return {
      isOptimal,
      scoreDifference: isOptimal ? 0 : scoreDifference,
      feedback,
      recommendedProposal: isOptimal ? null : bestAlt,
      suggestions
    };
  }
}
