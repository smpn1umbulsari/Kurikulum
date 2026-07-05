/**
 * Rule Engine
 * 
 * Evaluates agent actions against project rules and engineering handbook.
 * Calculates compliance scores and tracks violations.
 * Part of Phase 7.1 Enhancement
 */

import fs from 'fs';
import path from 'path';

export class RuleEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.rulesDir = path.join(projectManager.workspacePath || projectManager.projectPath, 'docs', 'engineering-handbook');
    this.rulesFile = path.join(this.rulesDir, 'rules.json');
    this.violationsLogFile = path.join(projectManager.configDir, 'violations.json');
    this.complianceHistoryFile = path.join(projectManager.configDir, 'compliance_history.json');
    
    this.rules = [];
    this.violations = [];
    this.complianceHistory = [];
    
    this._initialize();
  }

  /**
   * Initialize and load rules
   */
  _initialize() {
    this._ensureConfigDir();
    this.loadRules();
    this._loadViolationHistory();
    this._loadComplianceHistory();
  }

  /**
   * Ensure config directory exists
   */
  _ensureConfigDir() {
    if (!fs.existsSync(this.projectManager.configDir)) {
      fs.mkdirSync(this.projectManager.configDir, { recursive: true });
    }
  }

  /**
   * Load rules from rules.json
   */
  loadRules() {
    try {
      if (fs.existsSync(this.rulesFile)) {
        const content = fs.readFileSync(this.rulesFile, 'utf-8');
        const data = JSON.parse(content);
        this.rules = data.rules || [];
      } else {
        this.rules = this._getDefaultRules();
      }
    } catch (error) {
      console.error('[RuleEngine] Error loading rules:', error.message);
      this.rules = this._getDefaultRules();
    }
    return this.rules;
  }

  /**
   * Get default rules if no rules file exists
   */
  _getDefaultRules() {
    return [
      {
        id: 'SECURITY-001',
        category: 'security',
        description: 'No hardcoded credentials in source code',
        severity: 'critical',
        pattern: /(password|api_key|secret|token)\s*=\s*["'][^"']+["']/gi
      },
      {
        id: 'QUALITY-001',
        category: 'quality',
        description: 'Code must have proper error handling',
        severity: 'high',
        pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g
      },
      {
        id: 'STYLE-001',
        category: 'style',
        description: 'Use consistent indentation',
        severity: 'low',
        pattern: /(\t| {4})/g
      },
      {
        id: 'PERF-001',
        category: 'performance',
        description: 'Avoid synchronous file operations in hot paths',
        severity: 'medium',
        pattern: /readFileSync|writeFileSync/g
      }
    ];
  }

  /**
   * Validate an agent action against rules
   */
  validateAction(action) {
    const result = {
      actionId: action.id || Date.now().toString(),
      timestamp: new Date().toISOString(),
      compliant: true,
      score: 100,
      violations: [],
      warnings: [],
      passedRules: []
    };

    // Check each rule
    for (const rule of this.rules) {
      const matches = this._checkRule(action, rule);
      
      if (matches) {
        const violation = {
          ruleId: rule.id,
          category: rule.category,
          description: rule.description,
          severity: rule.severity,
          match: matches
        };
        
        // Deduct points based on severity
        const penalty = this._getSeverityPenalty(rule.severity);
        result.score -= penalty;
        result.compliant = false;
        result.violations.push(violation);
        
        this.violations.push(violation);
      } else {
        result.passedRules.push(rule.id);
      }
    }

    // Ensure score doesn't go below 0
    result.score = Math.max(0, result.score);
    
    // Save violation
    this._saveViolation(result.violations);
    
    // Update compliance history
    this._updateComplianceHistory(result);
    
    return result;
  }

  /**
   * Check if action matches a rule
   */
  _checkRule(action, rule) {
    if (!rule.pattern) return false;
    
    const content = action.content || action.fileContent || '';
    const matches = content.match(rule.pattern);
    
    return matches ? matches.slice(0, 3) : null; // Return max 3 matches
  }

  /**
   * Get severity penalty
   */
  _getSeverityPenalty(severity) {
    const penalties = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };
    return penalties[severity] || 10;
  }

  /**
   * Get rule details by ID
   */
  getRuleDetails(ruleId) {
    return this.rules.find(r => r.id === ruleId) || null;
  }

  /**
   * Calculate overall compliance score for project
   */
  calculateOverallCompliance() {
    const stats = this._getViolationStats();
    const totalActions = this.complianceHistory.length;
    
    if (totalActions === 0) {
      return {
        score: 100,
        level: 'excellent',
        status: 'No actions recorded yet'
      };
    }

    const avgScore = this.complianceHistory.reduce((sum, c) => sum + c.score, 0) / totalActions;
    const criticalViolations = stats.bySeverity.critical || 0;
    const highViolations = stats.bySeverity.high || 0;

    let level = 'excellent';
    let status = 'All rules followed consistently';

    if (avgScore < 50 || criticalViolations > 5) {
      level = 'critical';
      status = 'Immediate attention required';
    } else if (avgScore < 70 || highViolations > 3) {
      level = 'warning';
      status = 'Several violations detected';
    } else if (avgScore < 85) {
      level = 'good';
      status = 'Minor improvements needed';
    } else if (avgScore < 95) {
      level = 'very-good';
      status = 'Almost fully compliant';
    }

    return {
      score: Math.round(avgScore * 10) / 10,
      level,
      status,
      totalActions,
      criticalViolations,
      highViolations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get violation statistics
   */
  _getViolationStats() {
    const stats = {
      total: this.violations.length,
      byCategory: {},
      bySeverity: {},
      recent: this.violations.slice(-10)
    };

    this.violations.forEach(v => {
      stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;
      stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get compliance report
   */
  getComplianceReport() {
    return {
      overall: this.calculateOverallCompliance(),
      violations: this._getViolationStats(),
      topViolations: this._getTopViolations(),
      complianceTrend: this._getComplianceTrend(),
      rulesSummary: this.rules.map(r => ({
        id: r.id,
        category: r.category,
        description: r.description,
        severity: r.severity,
        violationsCount: this.violations.filter(v => v.ruleId === r.id).length
      }))
    };
  }

  /**
   * Get top violations
   */
  _getTopViolations() {
    const countMap = {};
    this.violations.forEach(v => {
      countMap[v.ruleId] = (countMap[v.ruleId] || 0) + 1;
    });

    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ruleId, count]) => ({
        ruleId,
        rule: this.getRuleDetails(ruleId),
        count
      }));
  }

  /**
   * Get compliance trend over time
   */
  _getComplianceTrend() {
    const recent = this.complianceHistory.slice(-20);
    return recent.map(c => ({
      timestamp: c.timestamp,
      score: c.score
    }));
  }

  /**
   * Save violation to log
   */
  _saveViolation(violations) {
    if (violations.length === 0) return;
    
    try {
      let data = { violations: [] };
      if (fs.existsSync(this.violationsLogFile)) {
        data = JSON.parse(fs.readFileSync(this.violationsLogFile, 'utf-8'));
      }
      data.violations.push(...violations);
      fs.writeFileSync(this.violationsLogFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[RuleEngine] Error saving violation:', error.message);
    }
  }

  /**
   * Load violation history
   */
  _loadViolationHistory() {
    try {
      if (fs.existsSync(this.violationsLogFile)) {
        const data = JSON.parse(fs.readFileSync(this.violationsLogFile, 'utf-8'));
        this.violations = data.violations || [];
      }
    } catch (error) {
      console.error('[RuleEngine] Error loading violation history:', error.message);
    }
  }

  /**
   * Update compliance history
   */
  _updateComplianceHistory(result) {
    this.complianceHistory.push({
      timestamp: result.timestamp,
      actionId: result.actionId,
      score: result.score,
      violationsCount: result.violations.length
    });
    
    // Keep only last 100 entries
    if (this.complianceHistory.length > 100) {
      this.complianceHistory = this.complianceHistory.slice(-100);
    }
    
    this._saveComplianceHistory();
  }

  /**
   * Save compliance history
   */
  _saveComplianceHistory() {
    try {
      fs.writeFileSync(
        this.complianceHistoryFile, 
        JSON.stringify({ history: this.complianceHistory }, null, 2), 
        'utf-8'
      );
    } catch (error) {
      console.error('[RuleEngine] Error saving compliance history:', error.message);
    }
  }

  /**
   * Load compliance history
   */
  _loadComplianceHistory() {
    try {
      if (fs.existsSync(this.complianceHistoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.complianceHistoryFile, 'utf-8'));
        this.complianceHistory = data.history || [];
      }
    } catch (error) {
      console.error('[RuleEngine] Error loading compliance history:', error.message);
    }
  }

  /**
   * Reset all violation data
   */
  resetViolations() {
    this.violations = [];
    this.complianceHistory = [];
    
    if (fs.existsSync(this.violationsLogFile)) {
      fs.unlinkSync(this.violationsLogFile);
    }
    if (fs.existsSync(this.complianceHistoryFile)) {
      fs.unlinkSync(this.complianceHistoryFile);
    }
    
    return { success: true };
  }

  /**
   * Add custom rule
   */
  addRule(rule) {
    if (!rule.id || !rule.pattern) {
      throw new Error('Rule must have id and pattern');
    }
    
    this.rules.push(rule);
    return { success: true, ruleCount: this.rules.length };
  }

  /**
   * Remove rule by ID
   */
  removeRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    this.rules.splice(index, 1);
    return { success: true, ruleCount: this.rules.length };
  }

  /**
   * Verify if the agent has read all mandatory onboarding documents.
   * @param {string[]} readFiles List of absolute or relative file paths read in this session
   */
  verifyOnboardingRead(readFiles = []) {
    const mandatory = [
      '00-Engineering-Handbook.md',
      '06-Definition-of-Ready.md',
      '07-Definition-of-Done.md'
    ];
    
    const missing = mandatory.filter(mFile => {
      return !readFiles.some(rFile => rFile.includes(mFile));
    });
    
    return {
      success: missing.length === 0,
      missingFiles: missing
    };
  }

  /**
   * Verify if the active role matches the technical requirements of the file being modified.
   * @param {string} activeRole 
   * @param {string} filePath 
   */
  verifyRoleForFile(activeRole, filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const isSql = normalizedPath.endsWith('.sql') || normalizedPath.includes('/supabase/migrations/');
    const isReact = normalizedPath.endsWith('.tsx') || normalizedPath.endsWith('.jsx') || normalizedPath.includes('/components/') || normalizedPath.includes('/store/') || normalizedPath.includes('/pages/');
    const isBackend = normalizedPath.includes('/services/') || normalizedPath.includes('/api/');
    const isTest = normalizedPath.includes('.test.') || normalizedPath.includes('.spec.') || normalizedPath.includes('/tests/');

    let expectedRoles = [];
    if (isSql) {
      expectedRoles = ['Database Architect', 'Security Architect', 'Software Architect'];
    } else if (isReact) {
      expectedRoles = ['Frontend Lead', 'Software Architect'];
    } else if (isBackend) {
      expectedRoles = ['Backend Lead', 'Software Architect'];
    } else if (isTest) {
      expectedRoles = ['QA Architect', 'Software Architect'];
    }

    if (expectedRoles.length === 0) {
      return { success: true, expectedRoles: [] };
    }

    return {
      success: expectedRoles.includes(activeRole),
      expectedRoles
    };
  }

  /**
   * Scan SQL migration content to ensure RLS is enabled and policies are defined for all created tables.
   * @param {string} sqlContent 
   */
  scanSqlMigrationsForRls(sqlContent) {
    const errors = [];
    
    // Find all CREATE TABLE <tableName> statements (case-insensitive)
    const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let match;
    const tables = [];
    
    while ((match = createTableRegex.exec(sqlContent)) !== null) {
      tables.push(match[1]);
    }

    tables.forEach(table => {
      // Check for ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
      const rlsRegex = new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
      if (!rlsRegex.test(sqlContent)) {
        errors.push(`Table "${table}" does not have Row Level Security enabled via "ALTER TABLE ... ENABLE ROW LEVEL SECURITY"`);
      }
      
      // Check for CREATE POLICY on table
      const policyRegex = new RegExp(`create\\s+policy\\s+.*?\\s+on\\s+(?:public\\.)?${table}`, 'i');
      if (!policyRegex.test(sqlContent)) {
        errors.push(`Table "${table}" does not have any Row Level Security policies defined via "CREATE POLICY"`);
      }
    });

    return {
      success: errors.length === 0,
      errors
    };
  }
}

export default RuleEngine;
