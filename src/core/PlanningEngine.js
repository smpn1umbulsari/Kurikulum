/**
 * AETHER Platform - Planning Engine
 * Version: 1.1.0
 *
 * Fokus: Perencanaan Detail yang Komprehensif
 * - Task Breakdown dengan Subtasks
 * - Gherkin Scenario Generator
 * - Technical Specification Generator
 * - Test Plan Generator
 * - Dependency Analysis
 * - Time Estimation (Story Points)
 */

import fs from 'fs';
import path from 'path';

export class PlanningEngine {
  constructor(projectManager, contextEngine = null) {
    this.projectManager = projectManager;
    this.contextEngine = contextEngine;
    this.templateDir = path.join(projectManager.workspacePath, 'docs', 'engineering-handbook', 'Appendix', 'Templates');
  }

  // ============================================================
  // TASK BREAKDOWN ENGINE
  // ============================================================

  /**
   * Breakdown task menjadi subtasks yang granular
   * @param {string} taskText - Task description
   * @param {Object} options - Breakdown options
   * @returns {Object} Breakdown result
   */
  breakdownTask(taskText, options = {}) {
    const {
      includeSubtasks = true,
      includeEstimations = true,
      includeDependencies = true,
      persona = 'engineer' // engineer, qa, manager
    } = options;

    const result = {
      id: `plan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      originalTask: taskText,
      type: this._detectTaskType(taskText),
      priority: this._detectPriority(taskText),
      complexity: this._estimateComplexity(taskText),
      breakdown: {
        phases: [],
        totalSubtasks: 0
      },
      estimations: {},
      dependencies: []
    };

    // Generate phases based on task type
    const taskType = result.type;

    if (taskType === 'implementation') {
      result.breakdown.phases = this._generateImplementationPhases(taskText);
    } else if (taskType === 'api') {
      result.breakdown.phases = this._generateAPIPhases(taskText);
    } else if (taskType === 'ui') {
      result.breakdown.phases = this._generateUIPhases(taskText);
    } else if (taskType === 'database') {
      result.breakdown.phases = this._generateDatabasePhases(taskText);
    } else if (taskType === 'testing') {
      result.breakdown.phases = this._generateTestingPhases(taskText);
    } else if (taskType === 'documentation') {
      result.breakdown.phases = this._generateDocumentationPhases(taskText);
    } else {
      result.breakdown.phases = this._generateGenericPhases(taskText);
    }

    // Count total subtasks
    result.breakdown.totalSubtasks = result.breakdown.phases.reduce(
      (acc, phase) => acc + phase.subtasks.length, 0
    );

    // Add estimations if requested
    if (includeEstimations) {
      result.estimations = this._generateEstimations(result);
    }

    // Add dependencies if requested
    if (includeDependencies) {
      result.dependencies = this._analyzeDependencies(result);
    }

    return result;
  }

  /**
   * Generate detailed implementation phases
   * @private
   */
  _generateImplementationPhases(taskText) {
    return [
      {
        phase: '1. ANALYSIS & PLANNING',
        order: 1,
        estimatedHours: 2,
        subtasks: [
          { id: 'A1', text: 'Analyze requirements and acceptance criteria', status: 'pending', effort: 1 },
          { id: 'A2', text: 'Review existing codebase and patterns', status: 'pending', effort: 1 },
          { id: 'A3', text: 'Create technical design document', status: 'pending', effort: 1 },
          { id: 'A4', text: 'Identify and document API contracts', status: 'pending', effort: 1 },
          { id: 'A5', text: 'Create database schema if needed', status: 'pending', effort: 1 },
          { id: 'A6', text: 'Review PRDs for alignment', status: 'pending', effort: 1 }
        ]
      },
      {
        phase: '2. BACKEND DEVELOPMENT',
        order: 2,
        estimatedHours: 8,
        subtasks: [
          { id: 'B1', text: 'Create/update database migrations', status: 'pending', effort: 2 },
          { id: 'B2', text: 'Implement database triggers and functions', status: 'pending', effort: 1 },
          { id: 'B3', text: 'Implement API endpoint handlers', status: 'pending', effort: 3 },
          { id: 'B4', text: 'Add RLS policies if needed', status: 'pending', effort: 1 },
          { id: 'B5', text: 'Implement edge cases and error handling', status: 'pending', effort: 1 },
          { id: 'B6', text: 'Add input validation (Zod)', status: 'pending', effort: 1 },
          { id: 'B7', text: 'Add rate limiting if applicable', status: 'pending', effort: 0.5 },
          { id: 'B8', text: 'Write database seed data if needed', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '3. FRONTEND DEVELOPMENT',
        order: 3,
        estimatedHours: 6,
        subtasks: [
          { id: 'F1', text: 'Create/update TypeScript types', status: 'pending', effort: 0.5 },
          { id: 'F2', text: 'Implement Zustand store if needed', status: 'pending', effort: 1 },
          { id: 'F3', text: 'Create API service layer', status: 'pending', effort: 1 },
          { id: 'F4', text: 'Build UI components', status: 'pending', effort: 2 },
          { id: 'F5', text: 'Add form validation', status: 'pending', effort: 0.5 },
          { id: 'F6', text: 'Implement loading/error states', status: 'pending', effort: 0.5 },
          { id: 'F7', text: 'Add responsive design support', status: 'pending', effort: 0.5 },
          { id: 'F8', text: 'Integrate with offline sync if needed', status: 'pending', effort: 1 }
        ]
      },
      {
        phase: '4. QUALITY ASSURANCE',
        order: 4,
        estimatedHours: 4,
        subtasks: [
          { id: 'Q1', text: 'Write unit tests (coverage > 80%)', status: 'pending', effort: 1.5 },
          { id: 'Q2', text: 'Write integration tests', status: 'pending', effort: 1 },
          { id: 'Q3', text: 'Write E2E tests for critical flows', status: 'pending', effort: 1 },
          { id: 'Q4', text: 'Manual testing and edge cases', status: 'pending', effort: 0.5 },
          { id: 'Q5', text: 'Security testing (SQL injection, XSS)', status: 'pending', effort: 0.5 },
          { id: 'Q6', text: 'Performance testing if applicable', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '5. DOCUMENTATION & REVIEW',
        order: 5,
        estimatedHours: 2,
        subtasks: [
          { id: 'D1', text: 'Update API documentation', status: 'pending', effort: 0.5 },
          { id: 'D2', text: 'Update database schema documentation', status: 'pending', effort: 0.5 },
          { id: 'D3', text: 'Update user documentation if needed', status: 'pending', effort: 0.5 },
          { id: 'D4', text: 'Code review and address feedback', status: 'pending', effort: 1 },
          { id: 'D5', text: 'Update CHANGELOG', status: 'pending', effort: 0.5 }
        ]
      }
    ];
  }

  /**
   * Generate API development phases
   * @private
   */
  _generateAPIPhases(taskText) {
    return [
      {
        phase: '1. API DESIGN',
        order: 1,
        estimatedHours: 2,
        subtasks: [
          { id: 'API1', text: 'Define endpoint contracts (REST/GraphQL)', status: 'pending', effort: 0.5 },
          { id: 'API2', text: 'Define request/response schemas', status: 'pending', effort: 0.5 },
          { id: 'API3', text: 'Define error codes and messages', status: 'pending', effort: 0.5 },
          { id: 'API4', text: 'Document authentication requirements', status: 'pending', effort: 0.5 },
          { id: 'API5', text: 'Review with frontend team', status: 'pending', effort: 0.5 },
          { id: 'API6', text: 'Update API specification', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. API IMPLEMENTATION',
        order: 2,
        estimatedHours: 6,
        subtasks: [
          { id: 'API7', text: 'Create Supabase Edge Function', status: 'pending', effort: 1 },
          { id: 'API8', text: 'Implement JWT authentication', status: 'pending', effort: 1 },
          { id: 'API9', text: 'Implement Zod validation', status: 'pending', effort: 0.5 },
          { id: 'API10', text: 'Implement business logic', status: 'pending', effort: 2 },
          { id: 'API11', text: 'Add rate limiting', status: 'pending', effort: 0.5 },
          { id: 'API12', text: 'Implement CORS headers', status: 'pending', effort: 0.5 },
          { id: 'API13', text: 'Add comprehensive error handling', status: 'pending', effort: 0.5 },
          { id: 'API14', text: 'Implement logging and monitoring', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '3. API TESTING',
        order: 3,
        estimatedHours: 3,
        subtasks: [
          { id: 'API15', text: 'Unit tests for business logic', status: 'pending', effort: 1 },
          { id: 'API16', text: 'Integration tests with Supabase', status: 'pending', effort: 1 },
          { id: 'API17', text: 'API endpoint tests (Happy path)', status: 'pending', effort: 0.5 },
          { id: 'API18', text: 'API endpoint tests (Edge cases)', status: 'pending', effort: 0.5 },
          { id: 'API19', text: 'Load testing', status: 'pending', effort: 0.5 },
          { id: 'API20', text: 'Security testing', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '4. API DOCUMENTATION',
        order: 4,
        estimatedHours: 1,
        subtasks: [
          { id: 'API21', text: 'Document using OpenAPI/Swagger', status: 'pending', effort: 0.5 },
          { id: 'API22', text: 'Create usage examples', status: 'pending', effort: 0.5 },
          { id: 'API23', text: 'Document error codes', status: 'pending', effort: 0.25 },
          { id: 'API24', text: 'Document rate limits', status: 'pending', effort: 0.25 }
        ]
      }
    ];
  }

  /**
   * Generate UI development phases
   * @private
   */
  _generateUIPhases(taskText) {
    return [
      {
        phase: '1. UI DESIGN & PLANNING',
        order: 1,
        estimatedHours: 2,
        subtasks: [
          { id: 'UI1', text: 'Review design mockups/wireframes', status: 'pending', effort: 0.5 },
          { id: 'UI2', text: 'Create component inventory', status: 'pending', effort: 0.5 },
          { id: 'UI3', text: 'Identify shared components needed', status: 'pending', effort: 0.5 },
          { id: 'UI4', text: 'Plan state management approach', status: 'pending', effort: 0.5 },
          { id: 'UI5', text: 'Define responsive breakpoints', status: 'pending', effort: 0.5 },
          { id: 'UI6', text: 'Review accessibility requirements', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. COMPONENT DEVELOPMENT',
        order: 2,
        estimatedHours: 8,
        subtasks: [
          { id: 'UI7', text: 'Create TypeScript interfaces', status: 'pending', effort: 0.5 },
          { id: 'UI8', text: 'Build shared components first', status: 'pending', effort: 2 },
          { id: 'UI9', text: 'Build feature-specific components', status: 'pending', effort: 3 },
          { id: 'UI10', text: 'Implement animations/transitions', status: 'pending', effort: 1 },
          { id: 'UI11', text: 'Add loading skeletons', status: 'pending', effort: 0.5 },
          { id: 'UI12', text: 'Implement error boundaries', status: 'pending', effort: 0.5 },
          { id: 'UI13', text: 'Add empty states', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '3. INTEGRATION & TESTING',
        order: 3,
        estimatedHours: 4,
        subtasks: [
          { id: 'UI14', text: 'Connect to API services', status: 'pending', effort: 1 },
          { id: 'UI15', text: 'Implement form handling', status: 'pending', effort: 1 },
          { id: 'UI16', text: 'Add client-side validation', status: 'pending', effort: 0.5 },
          { id: 'UI17', text: 'Implement offline support', status: 'pending', effort: 1 },
          { id: 'UI18', text: 'Visual regression testing', status: 'pending', effort: 0.5 },
          { id: 'UI19', text: 'Cross-browser testing', status: 'pending', effort: 0.5 },
          { id: 'UI20', text: 'Accessibility testing (WCAG)', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '4. POLISH & OPTIMIZATION',
        order: 4,
        estimatedHours: 2,
        subtasks: [
          { id: 'UI21', text: 'Performance optimization', status: 'pending', effort: 0.5 },
          { id: 'UI22', text: 'Bundle size optimization', status: 'pending', effort: 0.5 },
          { id: 'UI23', text: 'Add keyboard navigation', status: 'pending', effort: 0.5 },
          { id: 'UI24', text: 'Final visual polish', status: 'pending', effort: 0.5 }
        ]
      }
    ];
  }

  /**
   * Generate database development phases
   * @private
   */
  _generateDatabasePhases(taskText) {
    return [
      {
        phase: '1. DATABASE DESIGN',
        order: 1,
        estimatedHours: 2,
        subtasks: [
          { id: 'DB1', text: 'Design ERD diagram', status: 'pending', effort: 0.5 },
          { id: 'DB2', text: 'Define table structures', status: 'pending', effort: 0.5 },
          { id: 'DB3', text: 'Define relationships (FK)', status: 'pending', effort: 0.5 },
          { id: 'DB4', text: 'Define indexes strategy', status: 'pending', effort: 0.5 },
          { id: 'DB5', text: 'Define constraints (CHECK, UNIQUE)', status: 'pending', effort: 0.5 },
          { id: 'DB6', text: 'Review with team', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. MIGRATION IMPLEMENTATION',
        order: 2,
        estimatedHours: 4,
        subtasks: [
          { id: 'DB7', text: 'Create migration file', status: 'pending', effort: 0.5 },
          { id: 'DB8', text: 'Implement CREATE TABLE statements', status: 'pending', effort: 1 },
          { id: 'DB9', text: 'Implement constraints', status: 'pending', effort: 0.5 },
          { id: 'DB10', text: 'Implement indexes', status: 'pending', effort: 0.5 },
          { id: 'DB11', text: 'Implement triggers', status: 'pending', effort: 1 },
          { id: 'DB12', text: 'Implement RLS policies', status: 'pending', effort: 1 },
          { id: 'DB13', text: 'Create seed data', status: 'pending', effort: 0.5 },
          { id: 'DB14', text: 'Test migration rollback', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '3. DATABASE TESTING',
        order: 3,
        estimatedHours: 2,
        subtasks: [
          { id: 'DB15', text: 'Test data integrity constraints', status: 'pending', effort: 0.5 },
          { id: 'DB16', text: 'Test foreign key relationships', status: 'pending', effort: 0.5 },
          { id: 'DB17', text: 'Test RLS policies', status: 'pending', effort: 0.5 },
          { id: 'DB18', text: 'Performance testing (query plans)', status: 'pending', effort: 0.5 },
          { id: 'DB19', text: 'Security audit', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '4. DOCUMENTATION',
        order: 4,
        estimatedHours: 1,
        subtasks: [
          { id: 'DB20', text: 'Update data dictionary', status: 'pending', effort: 0.5 },
          { id: 'DB21', text: 'Document relationships', status: 'pending', effort: 0.25 },
          { id: 'DB22', text: 'Document RLS policies', status: 'pending', effort: 0.25 }
        ]
      }
    ];
  }

  /**
   * Generate testing phases
   * @private
   */
  _generateTestingPhases(taskText) {
    return [
      {
        phase: '1. TEST PLANNING',
        order: 1,
        estimatedHours: 1,
        subtasks: [
          { id: 'T1', text: 'Identify test scope', status: 'pending', effort: 0.25 },
          { id: 'T2', text: 'Define test strategy', status: 'pending', effort: 0.25 },
          { id: 'T3', text: 'Create test plan document', status: 'pending', effort: 0.5 },
          { id: 'T4', text: 'Identify test data requirements', status: 'pending', effort: 0.25 },
          { id: 'T5', text: 'Setup test environment', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. UNIT TESTING',
        order: 2,
        estimatedHours: 3,
        subtasks: [
          { id: 'T6', text: 'Identify units to test', status: 'pending', effort: 0.5 },
          { id: 'T7', text: 'Write unit tests (Happy path)', status: 'pending', effort: 1 },
          { id: 'T8', text: 'Write unit tests (Edge cases)', status: 'pending', effort: 1 },
          { id: 'T9', text: 'Write unit tests (Error cases)', status: 'pending', effort: 0.5 },
          { id: 'T10', text: 'Achieve >80% coverage', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '3. INTEGRATION TESTING',
        order: 3,
        estimatedHours: 3,
        subtasks: [
          { id: 'T11', text: 'Test API integrations', status: 'pending', effort: 1 },
          { id: 'T12', text: 'Test database operations', status: 'pending', effort: 0.5 },
          { id: 'T13', text: 'Test third-party integrations', status: 'pending', effort: 0.5 },
          { id: 'T14', text: 'Test RLS policy enforcement', status: 'pending', effort: 0.5 },
          { id: 'T15', text: 'Test offline sync scenarios', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '4. E2E TESTING',
        order: 4,
        estimatedHours: 3,
        subtasks: [
          { id: 'T16', text: 'Identify critical user flows', status: 'pending', effort: 0.5 },
          { id: 'T17', text: 'Write E2E test scenarios', status: 'pending', effort: 1 },
          { id: 'T18', text: 'Implement E2E tests', status: 'pending', effort: 1 },
          { id: 'T19', text: 'Setup CI/CD test pipeline', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '5. REPORTING',
        order: 5,
        estimatedHours: 1,
        subtasks: [
          { id: 'T20', text: 'Generate test report', status: 'pending', effort: 0.5 },
          { id: 'T21', text: 'Document test results', status: 'pending', effort: 0.5 }
        ]
      }
    ];
  }

  /**
   * Generate documentation phases
   * @private
   */
  _generateDocumentationPhases(taskText) {
    return [
      {
        phase: '1. CONTENT RESEARCH',
        order: 1,
        estimatedHours: 2,
        subtasks: [
          { id: 'DOC1', text: 'Gather existing documentation', status: 'pending', effort: 0.5 },
          { id: 'DOC2', text: 'Interview stakeholders', status: 'pending', effort: 0.5 },
          { id: 'DOC3', text: 'Review code for accuracy', status: 'pending', effort: 0.5 },
          { id: 'DOC4', text: 'Identify gaps in documentation', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. DOCUMENTATION WRITING',
        order: 2,
        estimatedHours: 6,
        subtasks: [
          { id: 'DOC5', text: 'Write overview section', status: 'pending', effort: 0.5 },
          { id: 'DOC6', text: 'Write user guide sections', status: 'pending', effort: 2 },
          { id: 'DOC7', text: 'Write API documentation', status: 'pending', effort: 1.5 },
          { id: 'DOC8', text: 'Write troubleshooting guide', status: 'pending', effort: 1 },
          { id: 'DOC9', text: 'Write FAQ section', status: 'pending', effort: 0.5 },
          { id: 'DOC10', text: 'Add code examples', status: 'pending', effort: 1 }
        ]
      },
      {
        phase: '3. REVIEW & PUBLISH',
        order: 3,
        estimatedHours: 2,
        subtasks: [
          { id: 'DOC11', text: 'Technical review', status: 'pending', effort: 1 },
          { id: 'DOC12', text: 'Editorial review', status: 'pending', effort: 0.5 },
          { id: 'DOC13', text: 'Publish documentation', status: 'pending', effort: 0.5 }
        ]
      }
    ];
  }

  /**
   * Generate generic phases
   * @private
   */
  _generateGenericPhases(taskText) {
    return [
      {
        phase: '1. INITIALIZATION',
        order: 1,
        estimatedHours: 1,
        subtasks: [
          { id: 'GEN1', text: 'Understand requirements', status: 'pending', effort: 0.5 },
          { id: 'GEN2', text: 'Plan approach', status: 'pending', effort: 0.5 }
        ]
      },
      {
        phase: '2. IMPLEMENTATION',
        order: 2,
        estimatedHours: 6,
        subtasks: [
          { id: 'GEN3', text: 'Execute main task', status: 'pending', effort: 4 },
          { id: 'GEN4', text: 'Handle edge cases', status: 'pending', effort: 1 },
          { id: 'GEN5', text: 'Review and refine', status: 'pending', effort: 1 }
        ]
      },
      {
        phase: '3. VALIDATION',
        order: 3,
        estimatedHours: 2,
        subtasks: [
          { id: 'GEN6', text: 'Test implementation', status: 'pending', effort: 1 },
          { id: 'GEN7', text: 'Fix issues found', status: 'pending', effort: 1 }
        ]
      },
      {
        phase: '4. COMPLETION',
        order: 4,
        estimatedHours: 1,
        subtasks: [
          { id: 'GEN8', text: 'Document changes', status: 'pending', effort: 0.5 },
          { id: 'GEN9', text: 'Submit for review', status: 'pending', effort: 0.5 }
        ]
      }
    ];
  }

  /**
   * Detect task type from text
   * @private
   */
  _detectTaskType(taskText) {
    const lower = taskText.toLowerCase();
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('rest')) return 'api';
    if (lower.includes('ui') || lower.includes('component') || lower.includes('page') || lower.includes('interface')) return 'ui';
    if (lower.includes('database') || lower.includes('table') || lower.includes('migration') || lower.includes('schema')) return 'database';
    if (lower.includes('test') || lower.includes('qa') || lower.includes('verification')) return 'testing';
    if (lower.includes('doc') || lower.includes('readme') || lower.includes('documentation')) return 'documentation';
    if (lower.includes('feature') || lower.includes('implement') || lower.includes('create') || lower.includes('add')) return 'implementation';
    return 'generic';
  }

  /**
   * Detect priority from text
   * @private
   */
  _detectPriority(taskText) {
    const upper = taskText.toUpperCase();
    if (upper.includes('[CRITICAL]') || upper.includes('!!!')) return 'critical';
    if (upper.includes('[HIGH]') || upper.includes('!!')) return 'high';
    if (upper.includes('[LOW]') || upper.includes('!')) return 'low';
    return 'medium';
  }

  /**
   * Estimate complexity
   * @private
   */
  _estimateComplexity(taskText) {
    let score = 5; // Base complexity
    const lower = taskText.toLowerCase();

    // Increase for complex keywords
    if (lower.includes('complex') || lower.includes('multiple')) score += 2;
    if (lower.includes('integration') || lower.includes('async')) score += 1;
    if (lower.includes('real-time') || lower.includes('websocket')) score += 2;
    if (lower.includes('security') || lower.includes('auth')) score += 1;
    if (lower.includes('offline') || lower.includes('sync')) score += 2;

    // Decrease for simple keywords
    if (lower.includes('simple') || lower.includes('basic')) score -= 2;
    if (lower.includes('crud') || lower.includes('basic')) score -= 1;

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Generate time estimations
   * @private
   */
  _generateEstimations(breakdown) {
    const totalHours = breakdown.breakdown.phases.reduce(
      (acc, phase) => acc + phase.estimatedHours, 0
    );

    // Convert to story points (Fibonacci-like)
    const storyPoints = this._hoursToStoryPoints(totalHours);

    return {
      estimatedHours: totalHours,
      storyPoints: storyPoints,
      minHours: Math.round(totalHours * 0.7),
      maxHours: Math.round(totalHours * 1.5),
      breakdown: breakdown.breakdown.phases.map(phase => ({
        phase: phase.phase,
        hours: phase.estimatedHours,
        subtasks: phase.subtasks.length
      }))
    };
  }

  /**
   * Convert hours to story points
   * @private
   */
  _hoursToStoryPoints(hours) {
    if (hours <= 2) return 1;
    if (hours <= 4) return 2;
    if (hours <= 8) return 3;
    if (hours <= 13) return 5;
    if (hours <= 21) return 8;
    if (hours <= 34) return 13;
    return 21;
  }

  /**
   * Analyze dependencies
   * @private
   */
  _analyzeDependencies(breakdown) {
    const deps = [];

    // Between phases
    const phases = breakdown.breakdown.phases;
    for (let i = 1; i < phases.length; i++) {
      deps.push({
        type: 'sequence',
        from: phases[i - 1].phase,
        to: phases[i].phase,
        reason: 'Sequential development order'
      });
    }

    return deps;
  }

  // ============================================================
  // GHERKIN SCENARIO GENERATOR
  // ============================================================

  /**
   * Generate Gherkin scenarios from user story
   * @param {Object} userStory - User story object
   * @returns {Object} Gherkin scenarios
   */
  generateGherkinScenarios(userStory) {
    const {
      feature,
      asA,
      iWant,
      soThat,
      acceptanceCriteria = []
    } = userStory;

    const scenarios = {
      id: `gherkin_${Date.now()}`,
      timestamp: new Date().toISOString(),
      feature: feature || 'Feature to be defined',
      background: this._generateBackground(userStory),
      scenarios: [],
      edgeCases: [],
      errorScenarios: []
    };

    // Generate happy path scenario
    scenarios.scenarios.push({
      name: 'Happy Path - Successful execution',
      given: this._generateGiven(userStory, 'happy'),
      when: this._generateWhen(userStory, 'happy'),
      then: this._generateThen(userStory, 'happy')
    });

    // Generate scenarios from acceptance criteria
    for (const criteria of acceptanceCriteria) {
      scenarios.scenarios.push(this._generateScenarioFromCriteria(criteria, userStory));
    }

    // Generate edge cases
    scenarios.edgeCases = this._generateEdgeCases(userStory);

    // Generate error scenarios
    scenarios.errorScenarios = this._generateErrorScenarios(userStory);

    return scenarios;
  }

  /**
   * Generate background section
   * @private
   */
  _generateBackground(userStory) {
    return {
      text: 'Background:',
      steps: [
        'Given pengguna sudah login ke sistem',
        'And pengguna memiliki hak akses yang sesuai',
        'And data yang diperlukan sudah tersedia di sistem'
      ]
    };
  }

  /**
   * Generate Given steps
   * @private
   */
  _generateGiven(userStory, scenarioType) {
    const steps = [];

    if (scenarioType === 'happy') {
      steps.push('Given data yang diperlukan sudah ada di database');
      steps.push('And kondisi sistem normal');
    } else if (scenarioType === 'edge') {
      steps.push('Given kondisi batas (boundary condition)');
    }

    return steps;
  }

  /**
   * Generate When steps
   * @private
   */
  _generateWhen(userStory, scenarioType) {
    const steps = [];

    if (scenarioType === 'happy') {
      steps.push('When pengguna melakukan aksi sesuai skenario');
      steps.push('And data input valid');
    }

    return steps;
  }

  /**
   * Generate Then steps
   * @private
   */
  _generateThen(userStory, scenarioType) {
    const steps = [];

    if (scenarioType === 'happy') {
      steps.push('Then sistem menampilkan hasil yang expected');
      steps.push('And data tersimpan dengan benar');
      steps.push('And respons time sesuai SLA');
    }

    return steps;
  }

  /**
   * Generate scenario from criteria
   * @private
   */
  _generateScenarioFromCriteria(criteria, userStory) {
    return {
      name: `Criteria: ${criteria}`,
      given: [
        `Given ${criteria.split('Dengan (Given)')[1]?.trim() || 'precondition'}`
      ].filter(Boolean),
      when: [
        `When ${criteria.split('Ketika (When)')[1]?.trim() || 'action'}`
      ].filter(Boolean),
      then: [
        `Then ${criteria.split('Maka (Then)')[1]?.trim() || 'expected result'}`
      ].filter(Boolean)
    };
  }

  /**
   * Generate edge cases
   * @private
   */
  _generateEdgeCases(userStory) {
    return [
      {
        name: 'Edge Case - Empty data',
        given: ['Given tidak ada data yang tersedia'],
        when: ['When pengguna melakukan request'],
        then: ['Then sistem menampilkan empty state yang sesuai']
      },
      {
        name: 'Edge Case - Maximum data',
        given: ['Given data dalam jumlah maksimum'],
        when: ['When pengguna melakukan operasi'],
        then: ['Then sistem menangani dengan baik tanpa timeout']
      }
    ];
  }

  /**
   * Generate error scenarios
   * @private
   */
  _generateErrorScenarios(userStory) {
    return [
      {
        name: 'Error - Invalid input',
        given: ['Given data input tidak valid'],
        when: ['When pengguna submit form'],
        then: ['Then sistem menampilkan pesan error yang jelas']
      },
      {
        name: 'Error - Unauthorized access',
        given: ['Given pengguna tidak memiliki akses'],
        when: ['When pengguna mencoba mengakses fitur'],
        then: ['Then sistem mengembalikan error 403 Forbidden']
      }
    ];
  }

  /**
   * Export scenarios to Gherkin format
   * @param {Object} scenarios - Scenarios object
   * @returns {string} Gherkin formatted text
   */
  exportToGherkin(scenarios) {
    let output = `Feature: ${scenarios.feature}\n\n`;

    // Background
    if (scenarios.background) {
      output += `${scenarios.background.text}\n`;
      for (const step of scenarios.background.steps) {
        output += `  ${step}\n`;
      }
      output += '\n';
    }

    // Scenarios
    for (const scenario of scenarios.scenarios) {
      output += `  Scenario: ${scenario.name}\n`;
      for (const step of scenario.given || []) {
        output += `    ${step}\n`;
      }
      for (const step of scenario.when || []) {
        output += `    ${step}\n`;
      }
      for (const step of scenario.then || []) {
        output += `    ${step}\n`;
      }
      output += '\n';
    }

    // Edge cases
    output += '  # Edge Cases\n';
    for (const scenario of scenarios.edgeCases || []) {
      output += `  Scenario: ${scenario.name}\n`;
      for (const step of scenario.given || []) {
        output += `    ${step}\n`;
      }
      for (const step of scenario.when || []) {
        output += `    ${step}\n`;
      }
      for (const step of scenario.then || []) {
        output += `    ${step}\n`;
      }
      output += '\n';
    }

    return output;
  }

  // ============================================================
  // TECHNICAL SPECIFICATION GENERATOR
  // ============================================================

  /**
   * Generate technical specification
   * @param {Object} feature - Feature definition
   * @returns {Object} Technical specification
   */
  generateTechnicalSpec(feature) {
    return {
      id: `spec_${Date.now()}`,
      timestamp: new Date().toISOString(),
      overview: this._generateOverview(feature),
      requirements: this._generateRequirements(feature),
      architecture: this._generateArchitecture(feature),
      api: this._generateAPISpec(feature),
      database: this._generateDatabaseSpec(feature),
      frontend: this._generateFrontendSpec(feature),
      security: this._generateSecuritySpec(feature),
      testing: this._generateTestingSpec(feature),
      deployment: this._generateDeploymentSpec(feature),
      monitoring: this._generateMonitoringSpec(feature)
    };
  }

  /**
   * Generate overview section
   * @private
   */
  _generateOverview(feature) {
    return {
      featureName: feature.name || 'Feature Name',
      description: feature.description || 'No description provided',
      goal: feature.goal || 'Goal to be defined',
      scope: {
        inScope: feature.inScope || [],
        outOfScope: feature.outOfScope || []
      },
      successCriteria: feature.successCriteria || [],
      constraints: feature.constraints || []
    };
  }

  /**
   * Generate requirements section
   * @private
   */
  _generateRequirements(feature) {
    return {
      functional: feature.functionalRequirements || [
        'FR-01: Sistem harus dapat menerima input dari pengguna',
        'FR-02: Sistem harus memvalidasi input sesuai rules',
        'FR-03: Sistem harus menyimpan data ke database',
        'FR-04: Sistem harus menampilkan feedback ke pengguna'
      ],
      nonFunctional: feature.nonFunctionalRequirements || [
        'NFR-01: Response time < 200ms',
        'NFR-02: Availability 99.9%',
        'NFR-03: Security compliance dengan standar'
      ],
      dataRequirements: feature.dataRequirements || [
        'Data harus tersimpan dengan aman',
        'Data harus dapat di-audit'
      ]
    };
  }

  /**
   * Generate architecture section
   * @private
   */
  _generateArchitecture(feature) {
    return {
      highLevelDesign: feature.highLevelDesign || 'TBD',
      componentDiagram: feature.componentDiagram || 'TBD',
      sequenceDiagrams: feature.sequenceDiagrams || [],
      dataFlow: feature.dataFlow || 'TBD',
      technologyStack: {
        frontend: ['React', 'TypeScript', 'Zustand', 'TailwindCSS'],
        backend: ['Supabase Edge Functions', 'PostgreSQL'],
        infrastructure: ['Supabase', 'Vercel']
      }
    };
  }

  /**
   * Generate API specification
   * @private
   */
  _generateAPISpec(feature) {
    return {
      endpoints: feature.endpoints || [],
      schemas: feature.schemas || [],
      authentication: {
        method: 'JWT Bearer Token',
        header: 'Authorization: Bearer <token>'
      },
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000
      },
      errorCodes: feature.errorCodes || [
        { code: 400, message: 'Bad Request', description: 'Invalid input' },
        { code: 401, message: 'Unauthorized', description: 'Invalid or missing token' },
        { code: 403, message: 'Forbidden', description: 'Insufficient permissions' },
        { code: 404, message: 'Not Found', description: 'Resource not found' },
        { code: 500, message: 'Internal Server Error', description: 'Server error' }
      ]
    };
  }

  /**
   * Generate database specification
   * @private
   */
  _generateDatabaseSpec(feature) {
    return {
      tables: feature.tables || [],
      migrations: feature.migrations || [],
      indexes: feature.indexes || [],
      rlsPolicies: feature.rlsPolicies || [],
      triggers: feature.triggers || []
    };
  }

  /**
   * Generate frontend specification
   * @private
   */
  _generateFrontendSpec(feature) {
    return {
      pages: feature.pages || [],
      components: feature.components || [],
      stores: feature.stores || [],
      routes: feature.routes || [],
      stateManagement: 'Zustand with persistence',
      styling: 'TailwindCSS'
    };
  }

  /**
   * Generate security specification
   * @private
   */
  _generateSecuritySpec(feature) {
    return {
      authentication: 'JWT with Supabase Auth',
      authorization: 'RLS policies at database level',
      inputValidation: 'Zod schemas on both client and server',
      outputEncoding: 'Proper escaping to prevent XSS',
      sqlInjection: 'Parameterized queries via Supabase client',
      csrf: 'Handled by Supabase',
      dataPrivacy: 'Encryption at rest and in transit'
    };
  }

  /**
   * Generate testing specification
   * @private
   */
  _generateTestingSpec(feature) {
    return {
      unitTests: {
        coverage: '>80%',
        tools: ['Vitest', 'React Testing Library'],
        responsibilities: feature.unitTestResponsibilities || ['Backend Developer', 'Frontend Developer']
      },
      integrationTests: {
        coverage: '>60%',
        tools: ['Vitest', 'Supabase Testing'],
        responsibilities: ['QA Engineer']
      },
      e2eTests: {
        coverage: 'Critical paths only',
        tools: ['Playwright'],
        responsibilities: ['QA Engineer']
      }
    };
  }

  /**
   * Generate deployment specification
   * @private
   */
  _generateDeploymentSpec(feature) {
    return {
      environment: 'Production',
      ciCd: {
        provider: 'GitHub Actions',
        stages: ['Build', 'Test', 'Deploy']
      },
      rollback: 'Automatic on failed health check',
      deploymentStrategy: 'Blue-Green'
    };
  }

  /**
   * Generate monitoring specification
   * @private
   */
  _generateMonitoringSpec(feature) {
    return {
      metrics: [
        'API Response Time',
        'Error Rate',
        'Active Users',
        'Database Performance'
      ],
      alerting: {
        channels: ['Email', 'Slack'],
        thresholds: {
          errorRate: '>1%',
          responseTime: '>500ms'
        }
      },
      logging: {
        level: 'INFO',
        retention: '30 days'
      }
    };
  }

  // ============================================================
  // TEST PLAN GENERATOR
  // ============================================================

  /**
   * Generate comprehensive test plan
   * @param {Object} feature - Feature to test
   * @returns {Object} Test plan
   */
  generateTestPlan(feature) {
    return {
      id: `testplan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary: this._generateTestSummary(feature),
      scope: this._generateTestScope(feature),
      testStrategy: this._generateTestStrategy(feature),
      testCases: this._generateTestCases(feature),
      testData: this._generateTestData(feature),
      environment: this._generateTestEnvironment(feature),
      schedule: this._generateTestSchedule(feature),
      deliverables: this._generateTestDeliverables(feature),
      risks: this._generateTestRisks(feature)
    };
  }

  /**
   * Generate test summary
   * @private
   */
  _generateTestSummary(feature) {
    return {
      projectName: feature.name || 'Project',
      testObjective: 'Validate feature functionality, performance, and security',
      scope: 'Full feature validation',
      startDate: new Date().toISOString().split('T')[0],
      endDate: 'TBD',
      resources: {
        testers: 1,
        automationEngineers: 1
      }
    };
  }

  /**
   * Generate test scope
   * @private
   */
  _generateTestScope(feature) {
    return {
      inScope: [
        'Unit testing of all components',
        'Integration testing of APIs',
        'E2E testing of user flows',
        'Security testing',
        'Performance testing'
      ],
      outOfScope: [
        'Third-party integrations (external)',
        'Legacy system testing'
      ]
    };
  }

  /**
   * Generate test strategy
   * @private
   */
  _generateTestStrategy(feature) {
    return {
      approach: 'Black-box testing with risk-based prioritization',
      levels: ['Unit', 'Integration', 'System', 'E2E'],
      techniques: [
        'Equivalence Partitioning',
        'Boundary Value Analysis',
        'Decision Table Testing',
        'State Transition Testing'
      ],
      automation: {
        unitTests: '80% automation',
        integrationTests: '60% automation',
        e2eTests: '40% automation (critical paths only)'
      }
    };
  }

  /**
   * Generate test cases
   * @private
   */
  _generateTestCases(feature) {
    return {
      functional: this._generateFunctionalTestCases(feature),
      boundary: this._generateBoundaryTestCases(feature),
      negative: this._generateNegativeTestCases(feature),
      performance: this._generatePerformanceTestCases(feature),
      security: this._generateSecurityTestCases(feature)
    };
  }

  /**
   * Generate functional test cases
   * @private
   */
  _generateFunctionalTestCases(feature) {
    return [
      {
        id: 'TC-FUNC-001',
        title: 'Verify basic functionality',
        preconditions: ['User is logged in'],
        steps: ['Perform action', 'Verify result'],
        expectedResult: 'Action completes successfully',
        priority: 'High',
        status: 'Ready'
      }
    ];
  }

  /**
   * Generate boundary test cases
   * @private
   */
  _generateBoundaryTestCases(feature) {
    return [
      {
        id: 'TC-BOUND-001',
        title: 'Test maximum input length',
        preconditions: [],
        steps: ['Enter maximum allowed characters', 'Submit form'],
        expectedResult: 'Input accepted',
        priority: 'Medium',
        status: 'Ready'
      }
    ];
  }

  /**
   * Generate negative test cases
   * @private
   */
  _generateNegativeTestCases(feature) {
    return [
      {
        id: 'TC-NEG-001',
        title: 'Test with invalid input',
        preconditions: [],
        steps: ['Enter invalid data', 'Submit form'],
        expectedResult: 'Error message displayed',
        priority: 'High',
        status: 'Ready'
      }
    ];
  }

  /**
   * Generate performance test cases
   * @private
   */
  _generatePerformanceTestCases(feature) {
    return [
      {
        id: 'TC-PERF-001',
        title: 'Response time under load',
        preconditions: ['System under normal load'],
        steps: ['Measure response time'],
        expectedResult: '<200ms response time',
        priority: 'Medium',
        status: 'Ready'
      }
    ];
  }

  /**
   * Generate security test cases
   * @private
   */
  _generateSecurityTestCases(feature) {
    return [
      {
        id: 'TC-SEC-001',
        title: 'Test SQL injection prevention',
        preconditions: [],
        steps: ['Input SQL injection payload', 'Submit'],
        expectedResult: 'Attack prevented, error logged',
        priority: 'Critical',
        status: 'Ready'
      }
    ];
  }

  /**
   * Generate test data requirements
   * @private
   */
  _generateTestData(feature) {
    return {
      required: ['Test user accounts', 'Sample data set'],
      sensitive: 'Use anonymized data',
      preparation: 'Seed scripts will be provided'
    };
  }

  /**
   * Generate test environment
   * @private
   */
  _generateTestEnvironment(feature) {
    return {
      environments: [
        { name: 'Development', url: 'localhost' },
        { name: 'Staging', url: 'staging.example.com' }
      ],
      browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
      devices: ['Desktop', 'Tablet', 'Mobile']
    };
  }

  /**
   * Generate test schedule
   * @private
   */
  _generateTestSchedule(feature) {
    return {
      phases: [
        { phase: 'Test Planning', duration: '1 day', start: 'Day 1' },
        { phase: 'Test Case Development', duration: '2 days', start: 'Day 2' },
        { phase: 'Test Execution', duration: '3 days', start: 'Day 4' },
        { phase: 'Defect Reporting', duration: 'Ongoing', start: 'Day 4' },
        { phase: 'Test Closure', duration: '1 day', start: 'Day 7' }
      ]
    };
  }

  /**
   * Generate test deliverables
   * @private
   */
  _generateTestDeliverables(feature) {
    return [
      'Test Plan Document',
      'Test Cases (Excel/Confluence)',
      'Test Execution Report',
      'Defect Reports',
      'Test Summary Report'
    ];
  }

  /**
   * Generate test risks
   * @private
   */
  _generateTestRisks(feature) {
    return [
      {
        risk: 'Delayed requirement changes',
        impact: 'High',
        mitigation: 'Daily sync with development team'
      },
      {
        risk: 'Environment instability',
        impact: 'Medium',
        mitigation: 'Environment health monitoring'
      }
    ];
  }

  // ============================================================
  // EXPORT UTILITIES
  // ============================================================

  /**
   * Export plan to markdown format
   * @param {Object} plan - Plan object
   * @param {string} format - Output format
   * @returns {string} Formatted output
   */
  exportPlan(plan, format = 'markdown') {
    if (format === 'markdown') {
      return this._exportToMarkdown(plan);
    } else if (format === 'json') {
      return JSON.stringify(plan, null, 2);
    } else if (format === 'task') {
      return this._exportToTaskFile(plan);
    }
    return JSON.stringify(plan, null, 2);
  }

  /**
   * Export to markdown
   * @private
   */
  _exportToMarkdown(plan) {
    let output = `# ${plan.originalTask || 'Task Breakdown'}\n\n`;
    output += `> Generated: ${plan.timestamp}\n\n`;

    if (plan.type) {
      output += `**Type:** ${plan.type}\n`;
    }
    if (plan.priority) {
      output += `**Priority:** ${plan.priority}\n`;
    }
    if (plan.complexity) {
      output += `**Complexity:** ${plan.complexity}/10\n`;
    }

    output += '\n## Phases\n\n';

    for (const phase of plan.breakdown?.phases || []) {
      output += `### ${phase.phase}\n`;
      output += `*Estimated: ${phase.estimatedHours} hours*\n\n`;

      for (const subtask of phase.subtasks || []) {
        output += `- [ ] ${subtask.id}: ${subtask.text} *(Effort: ${subtask.effort}h)*\n`;
      }
      output += '\n';
    }

    if (plan.estimations) {
      output += '## Estimations\n\n';
      output += `- **Total Hours:** ${plan.estimations.estimatedHours}\n`;
      output += `- **Story Points:** ${plan.estimations.storyPoints}\n`;
      output += `- **Range:** ${plan.estimations.minHours} - ${plan.estimations.maxHours} hours\n\n`;
    }

    if (plan.dependencies?.length) {
      output += '## Dependencies\n\n';
      for (const dep of plan.dependencies) {
        output += `- ${dep.from} → ${dep.to}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Export to task file format
   * @private
   */
  _exportToTaskFile(plan) {
    let output = `# Task: ${plan.originalTask || 'Generated Task'}\n\n`;
    output += `> Generated: ${plan.timestamp}\n\n`;
    output += `## Subtasks\n\n`;

    for (const phase of plan.breakdown?.phases || []) {
      output += `### ${phase.phase}\n\n`;
      for (const subtask of phase.subtasks || []) {
        output += `- [ ] ${subtask.text}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Save plan to file
   * @param {Object} plan - Plan object
   * @param {string} filePath - Output file path
   * @param {string} format - Output format
   */
  savePlan(plan, filePath, format = 'json') {
    const content = this.exportPlan(plan, format);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }
}

export default PlanningEngine;
