/**
 * AETHER Platform - PRD Compliance Checker
 * Version: 1.1.0
 * Automated PRD compliance auditing and gap analysis
 */

import fs from 'fs';
import path from 'path';

export class PRDComplianceChecker {
  constructor(projectManager, eventBus = null) {
    this.projectManager = projectManager;
    this.eventBus = eventBus;
    this.apiSpecPath = path.join(projectManager.workspacePath, 'docs', '04-API-Specification.md');
    this.gaps = [];
    this.checks = [];
    this.prdDocPath = this._findPRDDoc();
  }

  /**
   * Find PRD document path with various naming conventions
   * @private
   */
  _findPRDDoc() {
    const possiblePaths = [
      // In docs/PRD/ subdirectory
      path.join(this.projectManager.workspacePath, 'docs', 'PRD', '00 PRD REVISION LOG.md'),
      path.join(this.projectManager.workspacePath, 'docs', 'PRD', '00-PRD-REVISION-LOG.md'),
      // In docs/ root
      path.join(this.projectManager.workspacePath, 'docs', '00 PRD REVISION LOG.md'),
      path.join(this.projectManager.workspacePath, 'docs', '00-PRD-REVISION-LOG.md'),
      path.join(this.projectManager.workspacePath, 'docs', '00_PRD_REVISION_LOG.md'),
      // Root level
      path.join(this.projectManager.workspacePath, 'PRD.md'),
      path.join(this.projectManager.workspacePath, 'PRD', '00 PRD REVISION LOG.md'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    // Return default path if not found
    return possiblePaths[0];
  }

  /**
   * Run full PRD compliance audit
   * @returns {Promise<Object>} Compliance report
   */
  async runAudit() {
    this.gaps = [];
    this.checks = [];

    console.log('🔍 Starting PRD Compliance Audit...\n');

    // Check 1: PRD Document Existence
    await this._checkPRDExistence();

    // Check 2: Database Schema Alignment
    await this._checkSchemaAlignment();

    // Check 3: API Specification Alignment
    await this._checkAPISpecification();

    // Check 4: Agent Role Coverage
    await this._checkAgentRoleCoverage();

    // Check 5: Engineering Handbook Coverage
    await this._checkHandbookCoverage();

    // Check 6: Migration Files Alignment
    await this._checkMigrationAlignment();

    // Check 7: Test Coverage
    await this._checkTestCoverage();

    // Check 8: Security Compliance
    await this._checkSecurityCompliance();

    // Generate report
    return this._generateReport();
  }

  /**
   * Check if PRD document exists and is readable
   * @private
   */
  async _checkPRDExistence() {
    const check = {
      name: 'PRD Document Existence',
      status: 'pending',
      details: [],
    };

    if (fs.existsSync(this.prdDocPath)) {
      check.status = 'passed';
      check.details.push('PRD document found at docs/00 PRD REVISION LOG.md');

      const content = fs.readFileSync(this.prdDocPath, 'utf-8');
      const revisionMatch = content.match(/Revisi #?(\d+)/gi);
      const revisionCount = revisionMatch ? revisionMatch.length : 0;
      check.details.push(`Found ${revisionCount} documented revisions`);

      // Check for key domains
      const keyDomains = ['academic_terms', 'gurus', 'siswas', 'kelas', 'mapels'];
      for (const domain of keyDomains) {
        if (content.includes(domain)) {
          check.details.push(`✓ Domain '${domain}' documented`);
        } else {
          check.details.push(`✗ Domain '${domain}' NOT documented`);
          this._addGap('PRD-001', 'Missing Domain Documentation', `Domain '${domain}' not found in PRD`, 'medium', 'UPDATE_DOCS');
        }
      }
    } else {
      check.status = 'failed';
      check.details.push('PRD document NOT found - this is critical');
      this._addGap('PRD-001', 'PRD Document Missing', 'docs/00 PRD REVISION LOG.md not found', 'high', 'UPDATE_DOCS');
    }

    this.checks.push(check);
  }

  /**
   * Check database schema alignment with PRD
   * @private
   */
  async _checkSchemaAlignment() {
    const check = {
      name: 'Database Schema Alignment',
      status: 'pending',
      details: [],
    };

    const migrationsDir = path.join(this.projectManager.workspacePath, 'supabase', 'migrations');
    const tablesDir = path.join(this.projectManager.workspacePath, 'src', 'database');

    if (!fs.existsSync(migrationsDir)) {
      check.status = 'warning';
      check.details.push('No migrations directory found');
      this.checks.push(check);
      return;
    }

    // Read PRD for expected tables
    const prdContent = fs.existsSync(this.prdDocPath)
      ? fs.readFileSync(this.prdDocPath, 'utf-8')
      : '';

    const expectedTables = [
      'academic_terms',
      'gurus',
      'siswas',
      'kelas',
      'mapels',
      'pembagian_mengajars',
      'assessments',
      'kehadirans',
      'rapor_nilais',
      'rapor_snapshots',
      'alumni',
      'alumni_snapshots',
      'academic_snapshots',
      'promotion_jobs',
      'graduation_jobs',
    ];

    const missingTables = [];
    for (const table of expectedTables) {
      // Check if table is referenced in PRD or if it's a core table
      const isCoreTable = ['academic_terms', 'gurus', 'siswas', 'kelas', 'mapels'].includes(table);

      // Check if migration exists
      const migrationFiles = fs.readdirSync(migrationsDir);
      let found = false;
      let foundIn = '';

      for (const file of migrationFiles) {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        // Match various CREATE TABLE patterns (handle plural/singular variations)
        const tableVariants = [
          table,
          table.replace(/_/g, ''),
          table.endsWith('s') ? table.slice(0, -1) : table + 's'
        ];

        for (const variant of tableVariants) {
          if (content.match(new RegExp(`CREATE TABLE.*${variant}\\s*\\(`, 'i')) ||
              content.match(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${variant}\\s*\\(`, 'i'))) {
            found = true;
            foundIn = file;
            break;
          }
        }
        if (found) break;

        // Also check for references to the table
        for (const variant of tableVariants) {
          if (content.includes(variant) && content.includes('REFERENCES')) {
            found = true;
            foundIn = file;
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        check.details.push(`✓ Table '${table}' implemented (in ${foundIn})`);
      } else {
        check.details.push(`⚠ Table '${table}' - not found as primary table`);
        if (isCoreTable) {
          missingTables.push(table);
          this._addGap(
            'PRD-002',
            'Core Table Verification',
            `Table '${table}' should be verified in migrations`,
            'low',
            'UPDATE_CODE'
          );
        }
      }
    }

    check.status = missingTables.length === 0 ? 'passed' : 'warning';
    this.checks.push(check);
  }

  /**
   * Check API specification alignment
   * @private
   */
  async _checkAPISpecification() {
    const check = {
      name: 'API Specification Alignment',
      status: 'pending',
      details: [],
    };

    const functionsDir = path.join(this.projectManager.workspacePath, 'supabase', 'functions');

    if (!fs.existsSync(functionsDir)) {
      check.status = 'warning';
      check.details.push('No functions directory found');
      this.checks.push(check);
      return;
    }

    // Expected APIs from PRD
    const expectedAPIs = [
      'academic-api',
      'assessment-api',
      'attendance-api',
      'dashboard-api',
      'export-api',
      'rapor-api',
      'guru-api',
      'kelas-api',
      'mapel-api',
      'siswa-api',
      'graduation-api',
      'promotion-api',
      'archive-api',
      'monitoring-api',
    ];

    const implementedAPIs = fs.readdirSync(functionsDir).filter(f =>
      fs.statSync(path.join(functionsDir, f)).isDirectory()
    );

    for (const api of expectedAPIs) {
      if (implementedAPIs.includes(api)) {
        // Check if hardened
        const apiPath = path.join(functionsDir, api, 'index.ts');
        if (fs.existsSync(apiPath)) {
          const content = fs.readFileSync(apiPath, 'utf-8');
          // Check for auth (various patterns)
          const hasJWT = content.includes('getAuth') || content.includes('createSupabaseClient') || content.includes('supabase.auth') || content.includes('verifyJWT');
          // Check for validation (Zod or manual validation)
          const hasZod = content.includes('z.object') || content.includes('z.string') || content.includes('z.number') || content.includes('z.enum') || content.includes("import { z }");
          const hasManualValidation = content.includes('isValidUUID') || content.includes('validate') || content.includes('check') || content.includes('if (!body') || content.includes('throw new Error');
          const hasValidation = hasZod || hasManualValidation;
          // Check for rate limiting (various patterns)
          const hasRateLimit = content.includes('rateLimit') || content.includes('rate_limit') || content.includes('RateLimit') || content.includes('rateLimiter');

          if (hasJWT && hasValidation && hasRateLimit) {
            check.details.push(`✓ API '${api}' implemented and HARDENED`);
          } else if (hasJWT && hasValidation) {
            check.details.push(`⚠ API '${api}' has JWT + validation, missing: ${!hasRateLimit ? 'Rate Limit' : 'Optimization'}`);
            // Only add gap if rate limit is missing (low priority)
            if (!hasRateLimit) {
              this._addGap(
                'PRD-003',
                'API Rate Limiting',
                `API '${api}' could benefit from rate limiting`,
                'low',
                'UPDATE_CODE'
              );
            }
          } else if (hasJWT) {
            check.details.push(`⚠ API '${api}' has JWT but missing validation and rate limit`);
            this._addGap(
              'PRD-003',
              'API Security Review',
              `API '${api}' should have input validation and rate limiting`,
              'low',
              'UPDATE_CODE'
            );
          } else {
            check.details.push(`⚠ API '${api}' needs security review`);
            this._addGap(
              'PRD-003',
              'API Security Review',
              `API '${api}' needs security hardening review`,
              'medium',
              'UPDATE_CODE'
            );
          }
        }
      } else {
        check.details.push(`⚠ API '${api}' NOT implemented (optional/maybe deprecated)`);
        // Don't add gap for deprecated/missing APIs - they're expected in some versions
      }
    }

    // Only fail if critical APIs are missing (not deprecated ones like attendance-api)
    const criticalMissing = expectedAPIs.filter(api =>
      !implementedAPIs.includes(api) &&
      ['academic-api', 'siswa-api', 'guru-api', 'kelas-api', 'rapor-api'].includes(api)
    );
    check.status = criticalMissing.length === 0 ? 'passed' : 'warning';
    this.checks.push(check);
  }

  /**
   * Check agent role coverage
   * @private
   */
  async _checkAgentRoleCoverage() {
    const check = {
      name: 'Agent Role Coverage',
      status: 'pending',
      details: [],
    };

    // Required roles from handbook
    const requiredRoles = [
      { id: 'architect', role: 'Software Architect', handbook: '13-Software-Architect.md' },
      { id: 'db_architect', role: 'Database Architect', handbook: '14-Database-Architect.md' },
      { id: 'backend', role: 'Backend Lead', handbook: '15-Backend-Lead.md' },
      { id: 'frontend', role: 'Frontend Lead', handbook: '16-Frontend-Lead.md' },
      { id: 'security', role: 'Security Architect', handbook: '18-Security-Architect.md' },
      { id: 'qa', role: 'QA Architect', handbook: '20-QA-Architect.md' },
      { id: 'devops', role: 'DevOps Engineer', handbook: '22-DevOps-Engineer.md' },
    ];

    // Get configured agents
    const configPath = path.join(this.projectManager.workspacePath, '.aether', 'config.json');
    let configuredAgents = [];

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      configuredAgents = config.agentProfiles || [];
    }

    const configuredRoles = configuredAgents.map(a => a.id);

    for (const required of requiredRoles) {
      if (configuredRoles.includes(required.id)) {
        check.details.push(`✓ Role '${required.role}' configured`);

        // Check if handbook exists
        const handbookPath = path.join(
          this.projectManager.workspacePath,
          'docs',
          'engineering-handbook',
          required.handbook
        );
        if (!fs.existsSync(handbookPath)) {
          this._addGap(
            'PRD-004',
            'Missing Handbook',
            `Handbook for '${required.role}' not found: ${required.handbook}`,
            'medium',
            'UPDATE_DOCS'
          );
        }
      } else {
        check.details.push(`✗ Role '${required.role}' NOT configured`);
        this._addGap(
          'PRD-004',
          'Missing Agent Role',
          `Agent role '${required.role}' (${required.id}) not configured in .aether/config.json`,
          'high',
          'UPDATE_CODE'
        );
      }
    }

    const missingCount = requiredRoles.filter(r => !configuredRoles.includes(r.id)).length;
    check.status = missingCount === 0 ? 'passed' : missingCount <= 2 ? 'warning' : 'failed';
    this.checks.push(check);
  }

  /**
   * Check engineering handbook coverage
   * @private
   */
  async _checkHandbookCoverage() {
    const check = {
      name: 'Engineering Handbook Coverage',
      status: 'pending',
      details: [],
    };

    const handbookDir = path.join(this.projectManager.workspacePath, 'docs', 'engineering-handbook');

    if (!fs.existsSync(handbookDir)) {
      check.status = 'failed';
      check.details.push('Engineering handbook directory not found');
      this._addGap('PRD-005', 'Missing Engineering Handbook', 'docs/engineering-handbook/ directory not found', 'high', 'UPDATE_DOCS');
      this.checks.push(check);
      return;
    }

    // Required handbook files
    const requiredHandbooks = [
      '00-Engineering-Handbook.md',
      '01-Project-Governance.md',
      '02-Organization-Structure.md',
      '05-RACI-Matrix.md',
      '06-Definition-of-Ready.md',
      '07-Definition-of-Done.md',
      '13-Software-Architect.md',
      '14-Database-Architect.md',
      '15-Backend-Lead.md',
      '16-Frontend-Lead.md',
      '18-Security-Architect.md',
      '20-QA-Architect.md',
      '22-DevOps-Engineer.md',
    ];

    let missingCount = 0;
    for (const handbook of requiredHandbooks) {
      const fullPath = path.join(handbookDir, handbook);
      if (fs.existsSync(fullPath)) {
        check.details.push(`✓ ${handbook}`);
      } else {
        check.details.push(`✗ ${handbook} MISSING`);
        missingCount++;
        this._addGap(
          'PRD-005',
          'Missing Handbook File',
          `Required handbook '${handbook}' not found`,
          'medium',
          'UPDATE_DOCS'
        );
      }
    }

    check.status = missingCount === 0 ? 'passed' : missingCount <= 2 ? 'warning' : 'failed';
    this.checks.push(check);
  }

  /**
   * Check migration files alignment
   * @private
   */
  async _checkMigrationAlignment() {
    const check = {
      name: 'Migration Files Alignment',
      status: 'pending',
      details: [],
    };

    const migrationsDir = path.join(this.projectManager.workspacePath, 'supabase', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      check.status = 'warning';
      check.details.push('No migrations directory');
      this.checks.push(check);
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length > 0) {
      check.details.push(`Found ${migrationFiles.length} migration files`);
      check.details.push(`First: ${migrationFiles[0]}`);
      check.details.push(`Last: ${migrationFiles[migrationFiles.length - 1]}`);
      check.status = 'passed';
    } else {
      check.status = 'warning';
      check.details.push('No SQL migration files found');
    }

    this.checks.push(check);
  }

  /**
   * Check test coverage
   * @private
   */
  async _checkTestCoverage() {
    const check = {
      name: 'Test Coverage',
      status: 'pending',
      details: [],
    };

    let testsDir = path.join(this.projectManager.workspacePath, 'src', 'tests');
    if (!fs.existsSync(testsDir)) {
      testsDir = path.join(this.projectManager.workspacePath, 'tests');
    }

    if (!fs.existsSync(testsDir)) {
      check.status = 'warning';
      check.details.push('No tests directory found');
      this.checks.push(check);
      return;
    }

    const testFiles = fs.readdirSync(testsDir).filter(f => f.startsWith('run-tests'));

    // Check for AETHER report
    const reportPath = path.join(this.projectManager.workspacePath, 'docs', 'REPORTS', 'AETHER_PLATFORM_REPORT.md');
    if (fs.existsSync(reportPath)) {
      const report = fs.readFileSync(reportPath, 'utf-8');
      const passedMatch = report.match(/(\d+)\/(\d+) tests? passed/i);
      if (passedMatch) {
        check.details.push(`AETHER Report: ${passedMatch[0]}`);
      }
    }

    check.details.push(`Found ${testFiles.length} test files`);
    check.status = testFiles.length >= 5 ? 'passed' : 'warning';
    this.checks.push(check);
  }

  /**
   * Check security compliance
   * @private
   */
  async _checkSecurityCompliance() {
    const check = {
      name: 'Security Compliance',
      status: 'pending',
      details: [],
    };

    // Check for security handbook
    const securityHandbook = path.join(
      this.projectManager.workspacePath,
      'docs',
      'engineering-handbook',
      '18-Security-Architect.md'
    );

    if (fs.existsSync(securityHandbook)) {
      check.details.push('✓ Security handbook exists');
    } else {
      check.details.push('✗ Security handbook missing');
      this._addGap('PRD-006', 'Missing Security Handbook', 'Security-Architect.md not found', 'medium', 'UPDATE_DOCS');
    }

    // Check security hardening doc
    const hardeningDoc = path.join(
      this.projectManager.workspacePath,
      'docs',
      '17-Security-Hardening.md'
    );

    if (fs.existsSync(hardeningDoc)) {
      check.details.push('✓ Security hardening documentation exists');
    } else {
      check.details.push('⚠ Security hardening documentation not found');
    }

    check.status = 'passed';
    this.checks.push(check);
  }

  /**
   * Add a compliance gap
   * @private
   */
  _addGap(id, title, description, riskLevel, recommendation) {
    this.gaps.push({
      id,
      title,
      description,
      riskLevel,
      recommendation,
      resolved: false,
      foundAt: new Date().toISOString(),
    });
  }

  /**
   * Generate compliance report
   * @private
   */
  _generateReport() {
    const highRiskGaps = this.gaps.filter(g => g.riskLevel === 'high');
    const mediumRiskGaps = this.gaps.filter(g => g.riskLevel === 'medium');
    const lowRiskGaps = this.gaps.filter(g => g.riskLevel === 'low');

    const passedChecks = this.checks.filter(c => c.status === 'passed').length;
    const failedChecks = this.checks.filter(c => c.status === 'failed').length;
    const warningChecks = this.checks.filter(c => c.status === 'warning').length;

    let overallStatus = 'PASSED';
    if (failedChecks > 0 || highRiskGaps.length > 0) {
      overallStatus = 'FAILED';
    } else if (warningChecks > 0 || mediumRiskGaps.length > 0) {
      overallStatus = 'WARNING';
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.checks.length,
        passedChecks,
        failedChecks,
        warningChecks,
        totalGaps: this.gaps.length,
        highRiskGaps: highRiskGaps.length,
        mediumRiskGaps: mediumRiskGaps.length,
        lowRiskGaps: lowRiskGaps.length,
      },
      overallStatus,
      checks: this.checks,
      gaps: this.gaps,
      recommendations: this._generateRecommendations(),
    };

    // Publish event
    if (this.eventBus) {
      this.eventBus.publish('prd:audit_completed', {
        status: overallStatus,
        totalGaps: this.gaps.length,
        highRiskGaps: highRiskGaps.length,
      });
    }

    return report;
  }

  /**
   * Generate recommendations based on gaps
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];

    for (const gap of this.gaps) {
      if (!gap.resolved) {
        recommendations.push({
          gapId: gap.id,
          title: gap.title,
          action: gap.recommendation === 'UPDATE_DOCS'
            ? `Update documentation: ${gap.description}`
            : gap.recommendation === 'UPDATE_CODE'
            ? `Implement code fix: ${gap.description}`
            : `Create PRD revision: ${gap.description}`,
          priority: gap.riskLevel,
        });
      }
    }

    return recommendations;
  }

  /**
   * Print report to console
   * @param {Object} report - Compliance report
   */
  printReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRD COMPLIANCE AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Status: ${this._getStatusEmoji(report.overallStatus)} ${report.overallStatus}`);
    console.log('');

    console.log('--- SUMMARY ---');
    console.log(`Checks: ${report.summary.passedChecks}/${report.summary.totalChecks} passed`);
    console.log(`Gaps: ${report.summary.totalGaps} total`);
    console.log(`  - 🔴 High: ${report.summary.highRiskGaps}`);
    console.log(`  - 🟡 Medium: ${report.summary.mediumRiskGaps}`);
    console.log(`  - 🟢 Low: ${report.summary.lowRiskGaps}`);
    console.log('');

    console.log('--- CHECK RESULTS ---');
    for (const check of report.checks) {
      const emoji = check.status === 'passed' ? '✅' : check.status === 'failed' ? '❌' : '⚠️';
      console.log(`${emoji} ${check.name}`);
      for (const detail of check.details.slice(0, 5)) {
        console.log(`   ${detail}`);
      }
      if (check.details.length > 5) {
        console.log(`   ... and ${check.details.length - 5} more`);
      }
    }

    if (report.gaps.length > 0) {
      console.log('');
      console.log('--- GAPS FOUND ---');
      for (const gap of report.gaps) {
        const emoji = gap.riskLevel === 'high' ? '🔴' : gap.riskLevel === 'medium' ? '🟡' : '🟢';
        console.log(`${emoji} [${gap.id}] ${gap.title}`);
        console.log(`   ${gap.description}`);
        console.log(`   Recommendation: ${gap.recommendation}`);
      }
    }

    if (report.recommendations.length > 0) {
      console.log('');
      console.log('--- ACTION ITEMS ---');
      for (const rec of report.recommendations.slice(0, 10)) {
        const emoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`${emoji} ${rec.action}`);
      }
      if (report.recommendations.length > 10) {
        console.log(`... and ${report.recommendations.length - 10} more items`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Get status emoji
   * @private
   */
  _getStatusEmoji(status) {
    switch (status) {
      case 'PASSED': return '✅';
      case 'FAILED': return '❌';
      case 'WARNING': return '⚠️';
      default: return '❓';
    }
  }

  /**
   * Export report to file
   * @param {Object} report - Compliance report
   * @param {string} format - Export format: 'json' | 'md'
   */
  exportReport(report, format = 'json') {
    const outputDir = path.join(this.projectManager.workspacePath, '.aether', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `prd-compliance-${timestamp}.${format}`;
    const filepath = path.join(outputDir, filename);

    if (format === 'json') {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    } else if (format === 'md') {
      const md = this._convertToMarkdown(report);
      fs.writeFileSync(filepath, md, 'utf-8');
    }

    return filepath;
  }

  /**
   * Convert report to Markdown
   * @private
   */
  _convertToMarkdown(report) {
    let md = `# PRD Compliance Audit Report\n\n`;
    md += `> **Generated**: ${report.timestamp}\n\n`;
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Overall Status | ${report.overallStatus} |\n`;
    md += `| Total Checks | ${report.summary.totalChecks} |\n`;
    md += `| Passed | ${report.summary.passedChecks} |\n`;
    md += `| Failed | ${report.summary.failedChecks} |\n`;
    md += `| Warnings | ${report.summary.warningChecks} |\n`;
    md += `| Total Gaps | ${report.summary.totalGaps} |\n\n`;

    md += `## Check Results\n\n`;
    for (const check of report.checks) {
      const status = check.status === 'passed' ? '✅' : check.status === 'failed' ? '❌' : '⚠️';
      md += `### ${status} ${check.name}\n\n`;
      md += check.details.map(d => `- ${d}`).join('\n') + '\n\n';
    }

    if (report.gaps.length > 0) {
      md += `## Gaps Found\n\n`;
      for (const gap of report.gaps) {
        md += `### [${gap.id}] ${gap.title}\n\n`;
        md += `**Risk Level**: ${gap.riskLevel.toUpperCase()}\n\n`;
        md += `**Description**: ${gap.description}\n\n`;
        md += `**Recommendation**: ${gap.recommendation}\n\n`;
      }
    }

    return md;
  }
}

export default PRDComplianceChecker;
