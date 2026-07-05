import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * QualityEngine - Complete Implementation
 * 
 * Runs project tests and linters to verify compliance (DoD)
 * and orchestrates auto-remediation loops with agents.
 * 
 * Part of Phase 6 completion
 */
export class QualityEngine {
  constructor(projectManager, agentManager = null) {
    this.projectManager = projectManager;
    this.agentManager = agentManager;
    this.status = 'idle'; // idle, testing, analyzing, reporting, remediating
    this.lastReport = null;
    this.remediationHistory = [];
  }

  /**
   * Run a full quality check (linting + tests)
   * @param {string} taskId 
   * @returns {Promise<object>} Quality check report
   */
  async runQualityCheck(taskId = 'default') {
    this.status = 'testing';

    try {
      // 1. Run lint check
      const lintReport = await this.checkLintStandards();

      // 2. Run unit & integration tests
      const testReport = await this.executeTests();

      // 3. Run type check
      const typeReport = await this.executeTypeCheck();

      // 4. Run SQL RLS validation check
      const rlsReport = await this.checkSqlMigrationsRls();

      this.status = 'analyzing';
      
      // 5. Parse detailed errors
      const parsedErrors = this._parseErrors(lintReport, testReport, typeReport, rlsReport);

      const success = lintReport.success && testReport.success && typeReport.success && rlsReport.success;

      this.lastReport = {
        taskId,
        success,
        lintPassed: lintReport.success,
        testsPassed: testReport.success,
        typePassed: typeReport.success,
        rlsPassed: rlsReport.success,
        errors: parsedErrors,
        lintOutput: lintReport.output,
        testOutput: testReport.output,
        typeOutput: typeReport.output,
        rlsOutput: rlsReport.output,
        timestamp: new Date().toISOString()
      };

      this.status = 'reporting';
      return this.lastReport;
    } catch (error) {
      this.status = 'idle';
      throw error;
    }
  }

  /**
   * Parse errors from lint, test, type, and RLS reports
   */
  _parseErrors(lintReport, testReport, typeReport, rlsReport) {
    const errors = [];

    // Parse lint errors
    if (!lintReport.success && lintReport.output) {
      const lintErrors = this._extractLintErrors(lintReport.output);
      errors.push(...lintErrors.map(err => {
        const { type, ...rest } = err;
        return { type: 'lint', subtype: type, ...rest };
      }));
    }

    // Parse test errors
    if (!testReport.success && testReport.output) {
      const testErrors = this._extractTestErrors(testReport.output);
      errors.push(...testErrors.map(err => {
        const { type, ...rest } = err;
        return { type: 'test', subtype: type, ...rest };
      }));
    }

    // Parse type errors
    if (typeReport && !typeReport.success && typeReport.output) {
      const typeErrors = this._extractTypeErrors(typeReport.output);
      errors.push(...typeErrors.map(err => {
        return { type: 'typescript', ...err };
      }));
    }

    // Parse RLS errors
    if (rlsReport && !rlsReport.success && rlsReport.errors) {
      errors.push(...rlsReport.errors.map(err => {
        return { type: 'rls', file: err.file, message: err.message };
      }));
    }

    return errors;
  }

  /**
   * Scan SQL migration files to ensure RLS is enabled and policies are defined.
   * @returns {Promise<object>} RLS check result
   */
  async checkSqlMigrationsRls() {
    const RuleEngineModule = await import('./RuleEngine.js');
    const RuleEngine = RuleEngineModule.RuleEngine || RuleEngineModule.default;
    const re = new RuleEngine(this.projectManager);

    const migrationsDir = path.join(this.projectManager.workspacePath, 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return { success: true, output: 'No migrations folder found.', errors: [] };
    }

    try {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      let unifiedSqlContent = '';

      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        unifiedSqlContent += fs.readFileSync(filePath, 'utf-8') + '\n\n';
      }

      const rlsResult = re.scanSqlMigrationsForRls(unifiedSqlContent);
      const allErrors = [];
      let output = '';

      if (!rlsResult.success) {
        allErrors.push(...rlsResult.errors.map(msg => ({
          file: 'supabase/migrations',
          message: msg
        })));
        output = `❌ RLS Validation Failed in migration folder:\n` + rlsResult.errors.join('\n') + '\n';
      } else {
        output = `✅ RLS Validation Passed: All tables created in migrations have Row Level Security enabled and policies defined.\n`;
      }

      return {
        success: allErrors.length === 0,
        output,
        errors: allErrors
      };
    } catch (error) {
      return {
        success: false,
        output: 'Error reading migrations: ' + error.message,
        errors: [{ message: error.message }]
      };
    }
  }

  /**
   * Extract structured lint errors
   */
  _extractLintErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    // ESLint format: file:line:col: error message
    const eslintRegex = /^(.+?):(\d+):(\d+):\s*(error|warning)\s*:\s*(.+)$/gm;
    let match;
    
    while ((match = eslintRegex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        severity: match[4],
        message: match[5],
        rule: 'eslint'
      });
    }

    // Generic error patterns
    if (errors.length === 0) {
      const errorLines = lines.filter(line => 
        line.includes('error') && !line.includes('0 errors')
      );
      if (errorLines.length > 0) {
        errors.push({
          message: errorLines.slice(0, 3).join('\n'),
          severity: 'error'
        });
      }
    }

    return errors;
  }

  /**
   * Extract structured test errors
   */
  _extractTestErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    // Jest/Vitest format
    const jestRegex = /^(.+?)\s+\(\d+\):\s*(PASS|FAIL)$/gm;
    let match;
    
    while ((match = jestRegex.exec(output)) !== null) {
      if (match[2] === 'FAIL') {
        errors.push({
          file: match[1],
          type: 'test-suite',
          message: `Test suite failed: ${match[1]}`
        });
      }
    }

    // Assertion errors
    const assertionRegex = /^\s*at\s+(.+\.test\.[jt]sx?):(\d+)/gm;
    while ((match = assertionRegex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        type: 'assertion'
      });
    }

    // Generic failure patterns
    if (errors.length === 0) {
      const failLines = lines.filter(line => 
        line.includes('FAIL') || 
        line.includes('Expected') || 
        line.includes('Received')
      );
      if (failLines.length > 0) {
        errors.push({
          message: failLines.slice(0, 5).join('\n'),
          type: 'general'
        });
      }
    }

    return errors;
  }

  /**
   * Run the test suite command
   * @returns {Promise<object>} Test result
   */
  async executeTests() {
    const config = this._getConfig();
    const command = config.testCommand || 'npm test';

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectManager.workspacePath,
        timeout: 120000 // 2 min timeout
      });
      
      return {
        success: true,
        output: stdout + '\n' + stderr,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        output: error.stdout + '\n' + error.stderr,
        errors: [{
          message: error.stdout || error.message,
          code: error.code || 1
        }]
      };
    }
  }

  /**
   * Run the lint/formatting check command
   * @returns {Promise<object>} Lint result
   */
  async checkLintStandards() {
    const config = this._getConfig();
    const command = config.lintCommand || 'npm run lint';

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectManager.workspacePath,
        timeout: 60000 // 1 min timeout
      });
      
      return {
        success: true,
        output: stdout + '\n' + stderr,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        output: error.stdout + '\n' + error.stderr,
        errors: [{
          message: error.stdout || error.message,
          code: error.code || 1
        }]
      };
    }
  }

  /**
   * Auto-Remediation Loop - Complete Implementation
   * Triggers the agent with failing check feedback to automatically fix code errors.
   */
  async autoRemediate(agentId, taskPrompt, context, errorReport = null, maxAttempts = 3) {
    if (!this.agentManager) {
      throw new Error("AgentManager is required for auto-remediation.");
    }

    // Use provided error report or run a new quality check
    let currentReport = errorReport || await this.runQualityCheck();
    let attempt = 0;
    const history = [];

    console.log(`[QualityEngine] Starting auto-remediation loop (max ${maxAttempts} attempts)`);

    while (attempt < maxAttempts && !currentReport.success) {
      attempt++;
      this.status = 'remediating';
      
      console.log(`[QualityEngine] Remediation attempt ${attempt}/${maxAttempts}`);
      
      // Enforce status in AgentManager
      this.agentManager.setAgentStatus(agentId, 'executing');

      // Generate detailed remediation prompt
      const remediationPrompt = this._generateRemediationPrompt(taskPrompt, currentReport);
      
      try {
        // Execute remediation task
        const result = await this.agentManager.executeAgentTask(
          agentId, 
          remediationPrompt, 
          context
        );
        
        // Record attempt
        history.push({
          attempt,
          timestamp: new Date().toISOString(),
          errorsCount: currentReport.errors.length,
          result: result.substring(0, 200)
        });

        console.log(`[QualityEngine] Agent executed, re-running quality checks...`);
        
        // Re-run quality checks after a brief delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentReport = await this.runQualityCheck(currentReport.taskId);
        
      } catch (err) {
        console.error(`[QualityEngine] Remediation attempt ${attempt} failed:`, err.message);
        this.agentManager.setAgentStatus(agentId, 'error');
        
        history.push({
          attempt,
          timestamp: new Date().toISOString(),
          error: err.message
        });
        
        throw err;
      }
    }

    // Save remediation history
    this.remediationHistory.push({
      taskId: currentReport.taskId,
      success: currentReport.success,
      attempts: attempt,
      history,
      finalReport: currentReport,
      completedAt: new Date().toISOString()
    });

    this.agentManager.setAgentStatus(agentId, 'standby');
    this.status = 'idle';

    return {
      success: currentReport.success,
      attempts: attempt,
      history,
      finalReport: currentReport
    };
  }

  /**
   * Generate detailed remediation prompt with error specifics
   */
  _generateRemediationPrompt(originalPrompt, errorReport) {
    const errorsFormatted = errorReport.errors.map((err, idx) => {
      let errorDetail = `Error #${idx + 1} (${err.type.toUpperCase()}): `;
      
      if (err.file) {
        errorDetail += `File: ${err.file}`;
        if (err.line) errorDetail += ` Line: ${err.line}`;
        if (err.column) errorDetail += ` Column: ${err.column}`;
        errorDetail += '\n';
      }
      
      errorDetail += `Message: ${err.message || err.description || 'Unknown error'}`;
      
      if (err.rule) {
        errorDetail += `\nRule: ${err.rule}`;
      }
      
      return errorDetail;
    }).join('\n\n');

    return `## QUALITY GATE CHECK FAILED - REMEDIATION REQUIRED
 
 ### Original Task:
 ${originalPrompt}
 
 ### Quality Check Results:
 - Lint Status: ${errorReport.lintPassed ? '✅ PASSED' : '❌ FAILED'}
 - Test Status: ${errorReport.testsPassed ? '✅ PASSED' : '❌ FAILED'}
 - TypeScript Type Check: ${errorReport.typePassed ? '✅ PASSED' : '❌ FAILED'}
 - Total Errors: ${errorReport.errors.length}
 
 ### Detailed Failures:
 ${errorsFormatted || 'Unknown errors - check raw output below'}
 
 ### Raw Output Logs:
 ${'='.repeat(50)}
 --- LINT OUTPUT ---
 ${(errorReport.lintOutput || '').substring(0, 2000)}
 ${'='.repeat(50)}
 --- TEST OUTPUT ---
 ${(errorReport.testOutput || '').substring(0, 2000)}
 ${'='.repeat(50)}
 --- TYPESCRIPT OUTPUT ---
 ${(errorReport.typeOutput || '').substring(0, 2000)}
 ${'='.repeat(50)}
 
 ### Required Actions:
 1. Analyze each error above
 2. Fix the source files to resolve ALL errors
 3. Ensure lint passes with zero errors
 4. Ensure all tests pass
 5. Ensure TypeScript compilation passes with zero type errors
 
 Please fix the files in the workspace so they pass all lint standards, tests, and type-checks successfully.
 Return a summary of what was changed once complete.`;
  }

  /**
   * Quick fix for common issues (without agent)
   */
  async quickFix() {
    const fixes = [];

    // Try auto-fix with eslint
    try {
      await execAsync('npx eslint --fix .', {
        cwd: this.projectManager.workspacePath
      });
      fixes.push('ESLint auto-fix applied');
    } catch (e) {
      // ESLint might fail if there are still errors
    }

    // Try prettier
    try {
      await execAsync('npx prettier --write "**/*.{js,jsx,ts,tsx,json,css}"', {
        cwd: this.projectManager.workspacePath
      });
      fixes.push('Prettier formatting applied');
    } catch (e) {
      // Ignore prettier errors
    }

    return {
      fixes,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get remediation history
   */
  getRemediationHistory() {
    return this.remediationHistory;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      status: this.status,
      lastReport: this.lastReport,
      totalRemediations: this.remediationHistory.length
    };
  }

  _getConfig() {
    try {
      const meta = this.projectManager.getProjectMeta();
      return meta.config || {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Run the TypeScript type check command
   * @returns {Promise<object>} Type check result
   */
  async executeTypeCheck() {
    const command = 'npx tsc --noEmit';

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectManager.workspacePath,
        timeout: 60000 // 1 min timeout
      });
      
      return {
        success: true,
        output: stdout + '\n' + stderr,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        output: (error.stdout || '') + '\n' + (error.stderr || ''),
        errors: [{
          message: error.stdout || error.message,
          code: error.code || 1
        }]
      };
    }
  }

  /**
   * Extract structured TypeScript compiler errors
   */
  _extractTypeErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    const tscRegex = /^(.+?)\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/gm;
    let match;
    
    while ((match = tscRegex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        code: `TS${match[4]}`,
        message: match[5]
      });
    }

    if (errors.length === 0) {
      const errorLines = lines.filter(line => line.includes('error TS'));
      if (errorLines.length > 0) {
        errors.push({
          message: errorLines.slice(0, 5).join('\n')
        });
      }
    }

    return errors;
  }
}

export default QualityEngine;
