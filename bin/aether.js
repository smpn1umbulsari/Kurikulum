#!/usr/bin/env node

// Load environment variables from .env file
import 'dotenv/config';

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { ProjectManager } from '../src/core/ProjectManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { FileWatcher } from '../src/core/FileWatcher.js';
import { ContextEngine } from '../src/core/ContextEngine.js';
import { KnowledgeGraph } from '../src/core/KnowledgeGraph.js';
import { AgentManager } from '../src/core/AgentManager.js';
import { TaskEngine } from '../src/core/TaskEngine.js';
import { WorkflowEngine } from '../src/core/WorkflowEngine.js';
import { QualityEngine } from '../src/core/QualityEngine.js';
import { startDashboardServer } from '../src/core/dashboard/server.js';
import { VersionManager } from '../src/core/VersionManager.js';
import { SecurityEngine } from '../src/core/SecurityEngine.js';
import { SemanticIndexer } from '../src/core/SemanticIndexer.js';
import { PromptEngine } from '../src/core/PromptEngine.js';
import { DecisionEngine } from '../src/core/DecisionEngine.js';
import { ReleaseManager } from '../src/core/ReleaseManager.js';
import { PRDComplianceChecker } from '../src/core/PRDComplianceChecker.js';
import { AgentProtocol } from '../src/core/AgentProtocol.js';
import { PlanningEngine } from '../src/core/PlanningEngine.js';
import { AgentExecutor } from '../src/core/AgentExecutor.js';
import { TaskQueue } from '../src/core/TaskQueue.js';
import { CoordinationLayer } from '../src/core/CoordinationLayer.js';
import { CodeAnalysisEngine } from '../src/core/CodeAnalysisEngine.js';
import { AgentFallbackEngine } from '../src/core/AgentFallbackEngine.js';
import fs from 'fs';

const program = new Command();
const projectManager = new ProjectManager(process.cwd());

program
  .name('aether')
  .description('AI Engineering Workspace Platform (AEWP) CLI')
  .version('1.1.0');

program
  .command('init')
  .description('Initialize AETHER workspace layout and configuration')
  .action(async () => {
    console.log(chalk.blue('Initializing AETHER workspace...'));
    try {
      const meta = await projectManager.initializeProject();
      console.log(chalk.green('✔ AETHER workspace successfully initialized!'));
      console.log(chalk.gray(`Config File: ${projectManager.configFilePath}`));
      console.log(chalk.white(JSON.stringify(meta.config, null, 2)));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show status and configuration of the active workspace')
  .action(() => {
    try {
      const meta = projectManager.getProjectMeta();
      console.log(chalk.blue(`Workspace Status: ${chalk.green(meta.status.toUpperCase())}`));
      console.log(chalk.gray(`Path: ${meta.workspacePath}`));
      console.log(chalk.white(`Configured Agents:`));
      meta.config.agentProfiles.forEach(agent => {
        console.log(`  - ${chalk.yellow(agent.role)} (${agent.id}) using ${chalk.cyan(agent.model)}`);
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Start watching workspace file changes recursively')
  .action(async () => {
    console.log(chalk.blue('Starting AETHER File Watcher...'));
    try {
      projectManager.initializeProject();
      const eventBus = new EventBus();
      const watcher = new FileWatcher(projectManager, eventBus);

      // Subscribe to events
      eventBus.subscribe('file:created', (data) => {
        console.log(`${chalk.green('[CREATED]')} ${data.path}`);
      });
      eventBus.subscribe('file:changed', (data) => {
        console.log(`${chalk.yellow('[CHANGED]')} ${data.path}`);
      });
      eventBus.subscribe('file:deleted', (data) => {
        console.log(`${chalk.red('[DELETED]')} ${data.path}`);
      });

      watcher.start();
      console.log(chalk.green('✔ Watcher is active. Press Ctrl+C to stop.'));

      // Keep process alive
      process.on('SIGINT', async () => {
        console.log(chalk.blue('\nStopping watcher...'));
        await watcher.stop();
        console.log(chalk.green('Watcher stopped. Bye!'));
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync workspace files and parse SQL schemas to cache')
  .action(async () => {
    console.log(chalk.blue('Syncing AETHER workspace context...'));
    try {
      const contextEngine = new ContextEngine(projectManager);
      await contextEngine.syncWorkspace();
      console.log(chalk.green('✔ Context sync complete!'));
      contextEngine.close();
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('graph <file>')
  .description('Show impacted files (impact analysis) for a target file/table')
  .action(async (file) => {
    console.log(chalk.blue(`Performing impact analysis for: ${chalk.yellow(file)}`));
    try {
      const contextEngine = new ContextEngine(projectManager);
      // Run sync to ensure graph has latest data
      await contextEngine.syncWorkspace();
      
      const graph = new KnowledgeGraph(contextEngine);
      await graph.buildGraph();
      
      const impacts = graph.findImpactedNodes(file);
      contextEngine.close();
      
      if (impacts.length === 0) {
        console.log(chalk.green('No impacted nodes found. This node is isolated.'));
      } else {
        console.log(chalk.white(`Found ${impacts.length} impacted node(s):`));
        impacts.forEach(imp => {
          const typeColor = imp.type === 'table' ? chalk.cyan : chalk.yellow;
          console.log(`  - ${chalk.white(imp.node)} [${typeColor(imp.type.toUpperCase())}]`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

  program
    .command('agents')
    .description('List registered AI agents and their status')
    .action(() => {
      try {
        const agentManager = new AgentManager(projectManager);
        const list = agentManager.getAvailableAgents();
        console.log(chalk.blue('Available Agents:'));
        list.forEach(agent => {
          const statusColor = agent.status === 'standby' ? chalk.green : agent.status === 'executing' ? chalk.yellow : chalk.red;
          console.log(`  - ${chalk.yellow(agent.role)} (${chalk.cyan(agent.id)}) - Model: ${chalk.gray(agent.model)} - Status: ${statusColor(agent.status.toUpperCase())}`);
        });
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  const workflowCmd = program.command('workflow').description('Manage multi-agent workflows');

  workflowCmd
    .command('start <taskFile>')
    .description('Start a new workflow from a task checklist file')
    .action(async (taskFile) => {
      try {
        const eventBus = new EventBus();
        const taskEngine = new TaskEngine();
        const agentManager = new AgentManager(projectManager);
        const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

        // Print workflow events
        eventBus.subscribe('workflow:started', (data) => {
          console.log(chalk.green(`[STARTED] Workflow '${data.workflowId}' started with ${data.taskCount} tasks.`));
        });
        eventBus.subscribe('workflow:task_updated', (data) => {
          console.log(chalk.yellow(`[UPDATED] Task index ${data.taskIndex} status is now ${data.status.toUpperCase()}: "${data.text || ''}"`));
        });

        const state = await workflowEngine.startWorkflow('default', path.resolve(taskFile));
        
        // Save state
        const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

        console.log(chalk.green('✔ Workflow started successfully.'));
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  workflowCmd
    .command('status')
    .description('Show status of the active workflow')
    .action(() => {
      try {
        const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
        if (!fs.existsSync(stateFile)) {
          console.log(chalk.yellow('No active workflow found. Run "aether workflow start <taskFile>" first.'));
          return;
        }

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        console.log(chalk.blue(`Workflow ID: ${chalk.green(state.workflowId)}`));
        console.log(chalk.white(`Status: ${state.status.toUpperCase()}`));
        console.log(chalk.white(`Task File: ${state.taskFilePath}`));
        console.log(chalk.white('\nTasks:'));

        const taskEngine = new TaskEngine();
        const tasks = taskEngine.parseTaskFile(state.taskFilePath);
        tasks.forEach(t => {
          const statusChar = t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '/' : ' ';
          const color = t.status === 'completed' ? chalk.green : t.status === 'in_progress' ? chalk.yellow : chalk.gray;
          console.log(color(`  [${statusChar}] ${t.text}`));
        });

        console.log(chalk.white('\nHistory:'));
        state.history.forEach(h => {
          console.log(chalk.gray(`  [${h.timestamp}] [${h.action.toUpperCase()}] ${h.message}`));
        });
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  workflowCmd
    .command('transition')
    .description('Transition the active workflow to the next step')
    .action(async () => {
      try {
        const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
        if (!fs.existsSync(stateFile)) {
          console.log(chalk.yellow('No active workflow found. Run "aether workflow start <taskFile>" first.'));
          return;
        }

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        const eventBus = new EventBus();
        const taskEngine = new TaskEngine();
        const agentManager = new AgentManager(projectManager);
        const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

        // Load into engine's activeWorkflows map
        workflowEngine.activeWorkflows.set(state.workflowId, state);

        eventBus.subscribe('workflow:task_updated', (data) => {
          console.log(chalk.yellow(`[UPDATED] Task status: ${data.status.toUpperCase()} - "${data.text || ''}"`));
        });
        eventBus.subscribe('workflow:completed', () => {
          console.log(chalk.green('✔ [COMPLETED] All tasks finished. Workflow completed!'));
        });

        const updatedState = await workflowEngine.transitionToNextStep(state.workflowId);

        // Save updated state
        fs.writeFileSync(stateFile, JSON.stringify(updatedState, null, 2), 'utf-8');
        console.log(chalk.green('✔ Workflow transitioned successfully.'));
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

  workflowCmd
    .command('abort <reason>')
    .description('Abort the active workflow')
    .action(async (reason) => {
      try {
        const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
        if (!fs.existsSync(stateFile)) {
          console.log(chalk.yellow('No active workflow found.'));
          return;
        }

        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        const eventBus = new EventBus();
        const taskEngine = new TaskEngine();
        const agentManager = new AgentManager(projectManager);
        const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

        workflowEngine.activeWorkflows.set(state.workflowId, state);

        eventBus.subscribe('workflow:aborted', (data) => {
          console.log(chalk.red(`[ABORTED] Workflow '${data.workflowId}' aborted. Reason: ${data.reason}`));
        });

        const updatedState = await workflowEngine.abortWorkflow(state.workflowId, reason);
        fs.writeFileSync(stateFile, JSON.stringify(updatedState, null, 2), 'utf-8');
        console.log(chalk.green('✔ Workflow aborted.'));
      } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    });

program
  .command('check')
  .description('Run a quality check on the current workspace')
  .action(async () => {
    console.log(chalk.blue('Running AETHER Quality Check...'));
    try {
      const qualityEngine = new QualityEngine(projectManager);
      const report = await qualityEngine.runQualityCheck('cli-manual');

      console.log('\n' + chalk.bold('=== QUALITY GATE REPORT ==='));
      console.log(`Timestamp: ${chalk.gray(report.timestamp)}`);
      console.log(`Overall Status: ${report.success ? chalk.green('PASSED') : chalk.red('FAILED')}`);
      console.log(`Lint Check: ${report.lintPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
      console.log(`Test Execution: ${report.testsPassed ? chalk.green('PASSED') : chalk.red('FAILED')}`);

      if (report.errors.length > 0) {
        console.log('\n' + chalk.red('Errors Detected:'));
        report.errors.forEach((err, idx) => {
          console.log(chalk.yellow(`  [${err.type.toUpperCase()}] Error #${idx + 1}:`));
          console.log(chalk.white(`  ${err.message}`));
        });
        process.exit(1);
      } else {
        console.log('\n' + chalk.green('✔ All quality checks passed successfully!'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Start the local real-time monitoring dashboard')
  .option('-p, --port <port>', 'Port to run the dashboard server on', '3005')
  .action((options) => {
    const port = parseInt(options.port, 10);
    console.log(chalk.blue('Starting AETHER Monitoring Dashboard...'));
    try {
      projectManager.initializeProject();
      startDashboardServer(projectManager, port);
      console.log(chalk.green(`✔ Real-time Monitoring Dashboard is active.`));
      console.log(chalk.gray(`Press Ctrl+C to shut down the server.`));
    } catch (error) {
      console.error(chalk.red(`Error starting dashboard: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('commit')
  .description('Stage all changes and commit them, auto-generating a message if omitted')
  .option('-m, --message <message>', 'Commit message (optional)')
  .action(async (options) => {
    console.log(chalk.blue('Staging changes and committing...'));
    try {
      const versionManager = new VersionManager(projectManager);
      const hash = await versionManager.createGitCommit(options.message);
      console.log(chalk.green(`✔ Committed successfully!`));
      console.log(`Commit Hash: ${chalk.yellow(hash)}`);
    } catch (error) {
      console.error(chalk.red(`Error committing changes: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('branch <name>')
  .description('Create a new git branch and switch to it')
  .action(async (name) => {
    console.log(chalk.blue(`Creating and switching to branch '${name}'...`));
    try {
      const versionManager = new VersionManager(projectManager);
      await versionManager.createBranch(name);
      console.log(chalk.green(`✔ Branch '${name}' created and checked out successfully.`));
    } catch (error) {
      console.error(chalk.red(`Error creating branch: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('checkout <revision>')
  .description('Checkout a git revision (branch, commit, or tag)')
  .action(async (revision) => {
    console.log(chalk.blue(`Checking out revision '${revision}'...`));
    try {
      const versionManager = new VersionManager(projectManager);
      await versionManager.checkoutRevision(revision);
      console.log(chalk.green(`✔ Successfully checked out revision '${revision}'.`));
    } catch (error) {
      console.error(chalk.red(`Error checking out revision: ${error.message}`));
      process.exit(1);
    }
  });

const secureCmd = program.command('secure').description('Manage encrypted credential keys');

secureCmd
  .command('set <key> <value>')
  .description('Encrypt and save a key-value credential pair')
  .action(async (key, value) => {
    console.log(chalk.blue(`Encrypting and storing key '${key}'...`));
    try {
      const securityEngine = new SecurityEngine(projectManager);
      await securityEngine.encryptCredential(key, value);
      console.log(chalk.green(`✔ Credential '${key}' stored successfully.`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

secureCmd
  .command('get <key>')
  .description('Decrypt and display a credential key')
  .action(async (key) => {
    console.log(chalk.blue(`Decrypting key '${key}'...`));
    try {
      const securityEngine = new SecurityEngine(projectManager);
      const val = await securityEngine.decryptCredential(key);
      if (val === null) {
        console.log(chalk.yellow(`Credential '${key}' not found.`));
      } else {
        console.log(chalk.red('⚠️ WARNING: Decrypted value displayed below:'));
        console.log(chalk.white(val));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Search workspace files semantically using local vector index')
  .option('-k, --limit <number>', 'Number of results to return', '5')
  .action(async (query, options) => {
    const limit = parseInt(options.limit, 10);
    console.log(chalk.blue(`Searching workspace semantically for: "${chalk.yellow(query)}"...`));
    try {
      const contextEngine = new ContextEngine(projectManager);
      // Run sync to ensure latest files are indexed
      await contextEngine.syncWorkspace();

      const indexer = new SemanticIndexer(contextEngine);
      const results = await indexer.search(query, limit);
      contextEngine.close();

      if (results.length === 0) {
        console.log(chalk.yellow('No matching files found.'));
      } else {
        console.log(chalk.green(`\nFound ${results.length} matching file(s):`));
        results.forEach((res, idx) => {
          const scorePercent = (res.score * 100).toFixed(1);
          console.log(`  ${idx + 1}. ${chalk.cyan(res.path)} - Score: ${chalk.yellow(scorePercent + '%')}`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

const promptCmd = program.command('prompt').description('Manage system prompts and template registries');

promptCmd
  .command('assemble <agentId> <taskId>')
  .description('Assemble a fully-scrubbed system prompt for a specific agent and task')
  .option('-c, --context <text>', 'Code/file context to inject', '')
  .option('-t, --template <name>', 'Template name to use', 'default')
  .action(async (agentId, taskId, options) => {
    console.log(chalk.blue(`Assembling prompt for agent '${agentId}' and task '${taskId}'...`));
    try {
      const contextEngine = new ContextEngine(projectManager);
      const taskEngine = new TaskEngine();
      const promptEngine = new PromptEngine(projectManager, contextEngine, taskEngine);

      const assembled = await promptEngine.assembleSystemPrompt(agentId, taskId, options.context, options.template);
      console.log(chalk.green('\n--- ASSEMBLED SYSTEM PROMPT (SCRUBBED) ---'));
      console.log(chalk.white(assembled));
      console.log(chalk.green('------------------------------------------'));
      contextEngine.close();
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

const releaseCmd = program.command('release').description('Manage database migrations and rollback releases');

releaseCmd
  .command('migrate')
  .description('Run outstanding database migrations')
  .option('-d, --dir <path>', 'Directory containing SQL migrations', '.aether/migrations')
  .action(async (options) => {
    console.log(chalk.blue('Running database migrations...'));
    try {
      const releaseManager = new ReleaseManager(projectManager);
      const migrationDir = path.resolve(options.dir);
      
      // Ensure migrations directory exists if using default
      if (options.dir === '.aether/migrations' && !fs.existsSync(migrationDir)) {
        fs.mkdirSync(migrationDir, { recursive: true });
      }

      const applied = await releaseManager.runMigrations(migrationDir);
      releaseManager.close();

      if (applied.length === 0) {
        console.log(chalk.green('✔ No new migrations to apply. Database is up to date.'));
      } else {
        console.log(chalk.green(`✔ Successfully applied ${applied.length} migration(s):`));
        applied.forEach(m => {
          console.log(`  - ${chalk.yellow(m.filename)} (Version ${m.version})`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

releaseCmd
  .command('rollback <backupFile>')
  .description('Rollback release and restore database from a backup snapshot file')
  .action(async (backupFile) => {
    const backupPath = path.resolve(backupFile);
    console.log(chalk.blue(`Rolling back database using snapshot: ${chalk.yellow(backupPath)}...`));
    try {
      const releaseManager = new ReleaseManager(projectManager);
      const doctorReport = await releaseManager.rollback(backupPath);
      releaseManager.close();

      console.log(chalk.green('✔ Rollback successful. Database restored.'));
      console.log('\n' + chalk.bold('=== POST-ROLLBACK HEALTH CHECK (DOCTOR) ==='));
      console.log(`Overall Status: ${doctorReport.success ? chalk.green('PASSED') : chalk.red('FAILED')}`);
      doctorReport.checks.forEach(c => {
        const status = c.passed ? chalk.green('✔') : chalk.red('❌');
        console.log(`  ${status} [${c.name}] - ${c.message}`);
      });
      
      if (!doctorReport.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error rolling back: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Run diagnostic health checks on the AETHER workspace')
  .action(async () => {
    console.log(chalk.blue('Running workspace diagnostics...'));
    try {
      const releaseManager = new ReleaseManager(projectManager);
      const report = await releaseManager.doctor();
      releaseManager.close();

      console.log('\n' + chalk.bold('=== AETHER DIAGNOSTIC REPORT ==='));
      console.log(`Overall Status: ${report.success ? chalk.green('PASSED') : chalk.red('FAILED')}`);
      report.checks.forEach(c => {
        const status = c.passed ? chalk.green('✔') : chalk.red('❌');
        console.log(`  ${status} [${c.name}] - ${c.message}`);
      });

      if (!report.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error running doctor: ${error.message}`));
      process.exit(1);
    }
  });

// UI/UX Research Recipe Finder Command
program
  .command('ui-research [query]')
  .description('Search and display Spenturi premium UI/UX design recipes')
  .action(async (query = '') => {
    const { UiResearchEngine } = await import('../src/core/UiResearchEngine.js');
    console.log(chalk.blue('🔍 AETHER UI/UX Research Engine...\n'));
    try {
      const uiEngine = new UiResearchEngine(projectManager);
      const results = query ? uiEngine.searchRecipes(query) : uiEngine.getRecipes();

      if (results.length === 0) {
        console.log(chalk.yellow(`No matching UI/UX design recipes found for: "${query}"`));
      } else {
        console.log(chalk.green(`Found ${results.length} design recipe(s):\n`));
        results.forEach(r => {
          console.log(chalk.bold.yellow(`=== ${r.name} (${r.category.toUpperCase()}) ===`));
          console.log(`${chalk.gray('Description:')} ${r.description}`);
          console.log(chalk.cyan('Code Snippet:'));
          console.log(chalk.white(r.code));
          console.log('-'.repeat(50) + '\n');
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// User Proposal Evaluator Command
program
  .command('evaluate-proposal <name> <impact> <risk> <complexity>')
  .description('Evaluate a proposed plan against baseline system templates and output suggestions')
  .action(async (name, impact, risk, complexity) => {
    const { DecisionEngine } = await import('../src/core/DecisionEngine.js');
    console.log(chalk.blue('🧠 AETHER User Proposal Evaluator...\n'));
    try {
      const decisionEngine = new DecisionEngine(projectManager);
      const userProposal = {
        name,
        impact: parseInt(impact, 10),
        risk: parseInt(risk, 10),
        complexity: parseInt(complexity, 10)
      };

      const result = await decisionEngine.evaluateUserProposal(userProposal);

      console.log(chalk.bold('=== EVALUATION SUMMARY ==='));
      console.log(`Status: ${result.isOptimal ? chalk.green('OPTIMAL') : chalk.red('SUBOPTIMAL')}`);
      console.log(`Feedback: ${result.feedback}\n`);

      console.log(chalk.yellow('Constructive Suggestions:'));
      result.suggestions.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s}`);
      });
      console.log();
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// PRD Compliance Audit Command
program
  .command('audit-prd')
  .description('Run PRD compliance audit and generate gap analysis report')
  .option('-f, --format <format>', 'Export format: json, md, or console (default)', 'console')
  .option('-o, --output <path>', 'Output file path (for json/md exports)')
  .option('--fix', 'Attempt to auto-fix minor gaps')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Starting PRD Compliance Audit...\n'));
    try {
      const eventBus = new EventBus();
      const checker = new PRDComplianceChecker(projectManager, eventBus);

      // Run the audit
      const report = await checker.runAudit();

      // Print report based on format
      if (options.format === 'console') {
        checker.printReport(report);
      }

      // Export to file if specified
      if (options.output) {
        const ext = options.output.split('.').pop();
        const format = ext === 'md' ? 'md' : 'json';
        const filepath = checker.exportReport(report, format);
        console.log(chalk.green(`\n📄 Report exported to: ${filepath}`));
      }

      // Exit with error code if failed
      if (report.overallStatus === 'FAILED') {
        console.log(chalk.red('\n❌ PRD Compliance FAILED - High risk gaps found'));
        console.log(chalk.yellow('\nRecommended actions:'));
        report.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec.action}`);
        });
        process.exit(1);
      } else if (report.overallStatus === 'WARNING') {
        console.log(chalk.yellow('\n⚠️ PRD Compliance WARNING - Medium risk gaps found'));
        console.log(chalk.yellow('\nRecommended actions:'));
        report.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec.action}`);
        });
      } else {
        console.log(chalk.green('\n✅ PRD Compliance PASSED'));
      }
    } catch (error) {
      console.error(chalk.red(`Error running PRD audit: ${error.message}`));
      process.exit(1);
    }
  });

// Agent Protocol Commands
const agentCmd = program.command('agent').description('Manage agent communication and collaboration');

agentCmd
  .command('list')
  .description('List all registered agents and their status')
  .action(() => {
    try {
      const agentManager = new AgentManager(projectManager);
      const agents = agentManager.getAvailableAgents();
      const stats = agentManager.getStatistics();

      console.log(chalk.blue('\n=== AGENT STATUS ===\n'));
      console.log(chalk.gray(`Total Agents: ${stats.totalAgents}`));
      console.log(chalk.gray(`Total Executions: ${stats.totalExecutions}`));
      console.log(chalk.gray(`Success Rate: ${stats.successRate.toFixed(1)}%`));
      console.log(chalk.gray(`Average Duration: ${(stats.averageDuration / 1000).toFixed(1)}s\n`));

      agents.forEach(agent => {
        const statusColor = agent.status === 'standby' ? chalk.green :
                          agent.status === 'executing' ? chalk.yellow :
                          agent.status === 'error' ? chalk.red : chalk.gray;
        console.log(`${statusColor('●')} ${chalk.yellow(agent.role)} (${agent.id})`);
        console.log(`   Model: ${chalk.cyan(agent.model)}`);
        console.log(`   Status: ${statusColor(agent.status.toUpperCase())}`);
        console.log(`   Tasks: ${agent.currentTasks}/${agent.maxConcurrentTasks}`);
        console.log(`   Capabilities: ${agent.capabilities.slice(0, 3).join(', ')}${agent.capabilities.length > 3 ? '...' : ''}\n`);
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

agentCmd
  .command('stats')
  .description('Show agent execution statistics')
  .action(() => {
    try {
      const agentManager = new AgentManager(projectManager);
      const stats = agentManager.getStatistics();
      const load = agentManager.getLoadDistribution();

      console.log(chalk.blue('\n=== AGENT STATISTICS ===\n'));
      console.log(chalk.gray('Status Distribution:'));
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      console.log(chalk.gray('\nRole Distribution:'));
      Object.entries(stats.byRole).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });

      console.log(chalk.gray('\nLoad Distribution:'));
      load.forEach(l => {
        const bar = '█'.repeat(Math.floor(l.utilizationPercent / 10)) + '░'.repeat(10 - Math.floor(l.utilizationPercent / 10));
        const loadColor = l.utilizationPercent > 80 ? chalk.red :
                         l.utilizationPercent > 50 ? chalk.yellow : chalk.green;
        console.log(`  ${l.role}: [${loadColor(bar)}] ${l.utilizationPercent.toFixed(0)}% (${l.currentTasks}/${l.maxConcurrentTasks})`);
      });

      console.log(chalk.gray(`\nPerformance:`));
      console.log(`  Total Executions: ${chalk.white(stats.totalExecutions)}`);
      console.log(`  Success Rate: ${stats.successRate >= 90 ? chalk.green : stats.successRate >= 70 ? chalk.yellow : chalk.red(stats.successRate.toFixed(1) + '%')}`);
      console.log(`  Avg Duration: ${chalk.white((stats.averageDuration / 1000).toFixed(1) + 's')}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

agentCmd
  .command('history')
  .description('Show recent agent execution history')
  .option('-n, --limit <number>', 'Number of recent executions to show', '10')
  .action((options) => {
    try {
      const agentManager = new AgentManager(projectManager);
      const history = agentManager.getExecutionHistory(parseInt(options.limit));

      console.log(chalk.blue('\n=== RECENT EXECUTIONS ===\n'));
      if (history.length === 0) {
        console.log(chalk.gray('No execution history yet.'));
        return;
      }

      history.forEach((exec, i) => {
        const statusColor = exec.success ? chalk.green : chalk.red;
        const time = new Date(exec.timestamp).toLocaleTimeString();
        console.log(`${statusColor(exec.success ? '✓' : '✗')} [${time}] ${chalk.yellow(exec.role)}`);
        console.log(`   Duration: ${(exec.duration / 1000).toFixed(1)}s`);
        console.log(`   Prompt: ${exec.prompt.substring(0, 60)}...`);
        if (exec.error) {
          console.log(`   ${chalk.red('Error:')} ${exec.error.substring(0, 80)}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Workflow Enhancement Commands
// Note: workflowCmd already defined at line 170

// Add parallel task execution command
workflowCmd
  .command('parallel <taskIndices...>')
  .description('Start multiple tasks in parallel (space-separated indices)')
  .action(async (taskIndices) => {
    try {
      const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
      if (!fs.existsSync(stateFile)) {
        console.log(chalk.yellow('No active workflow found. Run "aether workflow start <taskFile>" first.'));
        return;
      }

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      const eventBus = new EventBus();
      const taskEngine = new TaskEngine();
      const agentManager = new AgentManager(projectManager, eventBus);
      const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

      workflowEngine.activeWorkflows.set(state.workflowId, state);

      const indices = taskIndices.map(i => parseInt(i));
      console.log(chalk.blue(`Starting ${indices.length} tasks in parallel...`));

      await workflowEngine.startParallelTasks(state.workflowId, indices);

      // Save updated state
      const updatedState = workflowEngine.getWorkflowState(state.workflowId);
      fs.writeFileSync(stateFile, JSON.stringify(updatedState, null, 2), 'utf-8');

      console.log(chalk.green(`✔ Parallel execution started for ${indices.length} tasks.`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

workflowCmd
  .command('running')
  .description('Show currently running tasks')
  .action(() => {
    try {
      const eventBus = new EventBus();
      const taskEngine = new TaskEngine();
      const agentManager = new AgentManager(projectManager, eventBus);
      const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

      const running = workflowEngine.getRunningTasks();

      if (running.length === 0) {
        console.log(chalk.yellow('No tasks currently running.'));
        return;
      }

      console.log(chalk.blue('\n=== RUNNING TASKS ===\n'));
      running.forEach(task => {
        const elapsed = (Date.now() - new Date(task.startTime).getTime()) / 1000;
        console.log(`${chalk.yellow('●')} Task #${task.taskIndex}: ${task.taskText}`);
        console.log(`   Agent: ${chalk.cyan(task.agentId)}`);
        console.log(`   Elapsed: ${elapsed.toFixed(0)}s`);
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

workflowCmd
  .command('skip <taskIndex> <reason>')
  .description('Skip a task with a reason')
  .action(async (taskIndex, reason) => {
    try {
      const stateFile = path.join(projectManager.configDir, 'workflow_state.json');
      if (!fs.existsSync(stateFile)) {
        console.log(chalk.yellow('No active workflow found.'));
        return;
      }

      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      const eventBus = new EventBus();
      const taskEngine = new TaskEngine();
      const agentManager = new AgentManager(projectManager, eventBus);
      const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

      workflowEngine.activeWorkflows.set(state.workflowId, state);

      await workflowEngine.skipTask(state.workflowId, parseInt(taskIndex), reason);

      const updatedState = workflowEngine.getWorkflowState(state.workflowId);
      fs.writeFileSync(stateFile, JSON.stringify(updatedState, null, 2), 'utf-8');

      console.log(chalk.green(`✔ Task #${taskIndex} skipped: ${reason}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================
// PLANNING ENGINE COMMANDS
// ============================================================

const planCmd = program.command('plan').description('Detailed planning and task breakdown');

// Task Breakdown Command
planCmd
  .command('breakdown <task>')
  .description('Generate detailed task breakdown with subtasks')
  .option('-t, --type <type>', 'Task type: implementation, api, ui, database, testing, documentation', 'implementation')
  .option('-p, --priority <priority>', 'Priority: critical, high, medium, low', 'medium')
  .option('-o, --output <path>', 'Output file path')
  .action(async (task, options) => {
    console.log(chalk.blue('📋 AETHER Task Breakdown Generator...\n'));
    try {
      const planningEngine = new PlanningEngine(projectManager);

      const breakdown = planningEngine.breakdownTask(task, {
        type: options.type,
        priority: options.priority
      });

      console.log(chalk.bold('=== TASK BREAKDOWN ===\n'));
      console.log(`${chalk.gray('Original Task:')} ${chalk.white(task)}`);
      console.log(`${chalk.gray('Type:')} ${chalk.cyan(breakdown.type)}`);
      console.log(`${chalk.gray('Priority:')} ${chalk.yellow(breakdown.priority)}`);
      console.log(`${chalk.gray('Complexity:')} ${breakdown.complexity}/10`);
      console.log('');

      breakdown.breakdown.phases.forEach(phase => {
        console.log(chalk.bold.cyan(`\n${phase.phase}`));
        console.log(chalk.gray(`Estimated: ${phase.estimatedHours} hours\n`));
        phase.subtasks.forEach(subtask => {
          console.log(`  ${chalk.green('○')} ${subtask.id}: ${subtask.text}`);
          console.log(`      ${chalk.gray('Effort:')} ${subtask.effort}h`);
        });
      });

      console.log(chalk.bold('\n=== ESTIMATIONS ==='));
      console.log(`${chalk.gray('Total Hours:')} ${chalk.white(breakdown.estimations.estimatedHours)}`);
      console.log(`${chalk.gray('Story Points:')} ${chalk.yellow(breakdown.estimations.storyPoints)} (Fibonacci)`);
      console.log(`${chalk.gray('Range:')} ${breakdown.estimations.minHours} - ${breakdown.estimations.maxHours} hours`);
      console.log(`${chalk.gray('Total Subtasks:')} ${breakdown.breakdown.totalSubtasks}`);

      // Save to file if specified
      if (options.output) {
        const format = options.output.endsWith('.md') ? 'markdown' : 'json';
        const filepath = planningEngine.savePlan(breakdown, options.output, format);
        console.log(chalk.green(`\n✔ Plan saved to: ${filepath}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Gherkin Generator Command
planCmd
  .command('gherkin <feature>')
  .description('Generate Gherkin BDD scenarios from user story')
  .option('-a, --ac <criteria...>', 'Acceptance criteria (can specify multiple)')
  .option('-o, --output <path>', 'Output file path')
  .action(async (feature, options) => {
    console.log(chalk.blue('🥒 AETHER Gherkin Scenario Generator...\n'));
    try {
      const planningEngine = new PlanningEngine(projectManager);

      const userStory = {
        feature: feature,
        acceptanceCriteria: options.ac || []
      };

      const scenarios = planningEngine.generateGherkinScenarios(userStory);
      const gherkinText = planningEngine.exportToGherkin(scenarios);

      console.log(chalk.bold.green('=== GENERATED GHERKIN SCENARIOS ===\n'));
      console.log(chalk.white(gherkinText));

      // Save to file if specified
      if (options.output) {
        fs.writeFileSync(options.output, gherkinText, 'utf-8');
        console.log(chalk.green(`\n✔ Gherkin saved to: ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Technical Specification Command
planCmd
  .command('spec <name>')
  .description('Generate technical specification document')
  .option('-o, --output <path>', 'Output file path')
  .action(async (name, options) => {
    console.log(chalk.blue('📐 AETHER Technical Specification Generator...\n'));
    try {
      const planningEngine = new PlanningEngine(projectManager);

      const feature = {
        name: name,
        description: 'Feature description - please update',
        goal: 'Goal - please update'
      };

      const spec = planningEngine.generateTechnicalSpec(feature);

      console.log(chalk.bold.green('=== TECHNICAL SPECIFICATION ===\n'));
      console.log(chalk.bold.cyan('\n1. OVERVIEW'));
      console.log(`   Feature: ${spec.overview.featureName}`);
      console.log(`   Description: ${spec.overview.description}`);

      console.log(chalk.bold.cyan('\n2. REQUIREMENTS'));
      console.log(chalk.gray('   Functional:'));
      spec.requirements.functional.slice(0, 3).forEach(r => {
        console.log(`     - ${r}`);
      });
      console.log(chalk.gray('   Non-Functional:'));
      spec.requirements.nonFunctional.forEach(r => {
        console.log(`     - ${r}`);
      });

      console.log(chalk.bold.cyan('\n3. API SPECIFICATION'));
      console.log(`   Auth: ${spec.api.authentication.method}`);
      console.log(`   Rate Limit: ${spec.api.rateLimiting.maxRequests} req/${spec.api.rateLimiting.windowMs/1000}s`);

      console.log(chalk.bold.cyan('\n4. SECURITY'));
      console.log(`   Auth: ${spec.security.authentication}`);
      console.log(`   Authorization: ${spec.security.authorization}`);
      console.log(`   Input Validation: ${spec.security.inputValidation}`);

      console.log(chalk.bold.cyan('\n5. TESTING'));
      console.log(`   Unit Test Coverage: ${spec.testing.unitTests.coverage}`);
      console.log(`   Tools: ${spec.testing.unitTests.tools.join(', ')}`);

      // Save to file if specified
      if (options.output) {
        const content = JSON.stringify(spec, null, 2);
        fs.writeFileSync(options.output, content, 'utf-8');
        console.log(chalk.green(`\n✔ Specification saved to: ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Test Plan Generator Command
planCmd
  .command('testplan <feature>')
  .description('Generate comprehensive test plan')
  .option('-o, --output <path>', 'Output file path')
  .action(async (feature, options) => {
    console.log(chalk.blue('🧪 AETHER Test Plan Generator...\n'));
    try {
      const planningEngine = new PlanningEngine(projectManager);

      const featureObj = {
        name: feature
      };

      const testPlan = planningEngine.generateTestPlan(featureObj);

      console.log(chalk.bold.green('=== TEST PLAN ===\n'));
      console.log(`${chalk.gray('Feature:')} ${chalk.white(testPlan.summary.projectName)}`);
      console.log(`${chalk.gray('Objective:')} ${testPlan.summary.testObjective}`);

      console.log(chalk.bold.cyan('\nSCOPE'));
      console.log(chalk.gray('In Scope:'));
      testPlan.scope.inScope.forEach(s => console.log(`  • ${s}`));
      console.log(chalk.gray('Out of Scope:'));
      testPlan.scope.outOfScope.forEach(s => console.log(`  • ${s}`));

      console.log(chalk.bold.cyan('\nTEST STRATEGY'));
      console.log(`   Approach: ${testPlan.testStrategy.approach}`);
      console.log(`   Unit Tests: ${testPlan.testStrategy.automation.unitTests}`);
      console.log(`   E2E Tests: ${testPlan.testStrategy.automation.e2eTests}`);

      console.log(chalk.bold.cyan('\nTEST CASES'));
      console.log(`   Functional: ${testPlan.testCases.functional.length} cases`);
      console.log(`   Boundary: ${testPlan.testCases.boundary.length} cases`);
      console.log(`   Negative: ${testPlan.testCases.negative.length} cases`);
      console.log(`   Security: ${testPlan.testCases.security.length} cases`);

      console.log(chalk.bold.cyan('\nSCHEDULE'));
      testPlan.schedule.phases.forEach(p => {
        console.log(`   ${chalk.yellow(p.phase)}: ${p.duration} (${p.start})`);
      });

      console.log(chalk.bold.cyan('\nDELIVERABLES'));
      testPlan.deliverables.forEach(d => console.log(`   • ${d}`));

      // Save to file if specified
      if (options.output) {
        const content = JSON.stringify(testPlan, null, 2);
        fs.writeFileSync(options.output, content, 'utf-8');
        console.log(chalk.green(`\n✔ Test plan saved to: ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Export Plan Command
planCmd
  .command('export <planFile>')
  .description('Export a saved plan to different formats')
  .option('-f, --format <format>', 'Output format: md, json, task', 'md')
  .option('-o, --output <path>', 'Output file path')
  .action(async (planFile, options) => {
    console.log(chalk.blue('📤 AETHER Plan Exporter...\n'));
    try {
      if (!fs.existsSync(planFile)) {
        console.error(chalk.red(`Plan file not found: ${planFile}`));
        process.exit(1);
      }

      const planData = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
      const planningEngine = new PlanningEngine(projectManager);

      const output = planningEngine.exportPlan(planData, options.format);
      const outputPath = options.output || planFile.replace('.json', `.${options.format}`);

      fs.writeFileSync(outputPath, output, 'utf-8');
      console.log(chalk.green(`✔ Plan exported to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Quick Plan - All-in-one Command
planCmd
  .command('quick <task>')
  .description('Generate complete planning package (breakdown + gherkin + spec)')
  .option('-o, --output <directory>', 'Output directory', './plans')
  .action(async (task, options) => {
    console.log(chalk.blue('🚀 AETHER Quick Planning - Generating Complete Package...\n'));
    try {
      const planningEngine = new PlanningEngine(projectManager);
      const timestamp = Date.now();
      const safeName = task.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const outputDir = path.join(options.output, `${safeName}_${timestamp}`);

      // Ensure output directory exists
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });

      // 1. Generate Task Breakdown
      console.log(chalk.cyan('  1/4 Generating task breakdown...'));
      const breakdown = planningEngine.breakdownTask(task);
      planningEngine.savePlan(breakdown, path.join(outputDir, '01_breakdown.json'), 'json');
      planningEngine.savePlan(breakdown, path.join(outputDir, '01_breakdown.md'), 'markdown');

      // 2. Generate Gherkin Scenarios
      console.log(chalk.cyan('  2/4 Generating Gherkin scenarios...'));
      const scenarios = planningEngine.generateGherkinScenarios({ feature: task });
      fs.writeFileSync(path.join(outputDir, '02_gherkin.feature'), planningEngine.exportToGherkin(scenarios), 'utf-8');

      // 3. Generate Technical Spec
      console.log(chalk.cyan('  3/4 Generating technical specification...'));
      const spec = planningEngine.generateTechnicalSpec({ name: task, description: task });
      fs.writeFileSync(path.join(outputDir, '03_technical_spec.json'), JSON.stringify(spec, null, 2), 'utf-8');

      // 4. Generate Test Plan
      console.log(chalk.cyan('  4/4 Generating test plan...'));
      const testPlan = planningEngine.generateTestPlan({ name: task });
      fs.writeFileSync(path.join(outputDir, '04_test_plan.json'), JSON.stringify(testPlan, null, 2), 'utf-8');

      // Create summary README
      const readme = `# Quick Plan: ${task}

Generated: ${new Date().toISOString()}

## Contents

1. **01_breakdown.json** - Detailed task breakdown with subtasks
2. **01_breakdown.md** - Markdown formatted breakdown
3. **02_gherkin.feature** - BDD scenarios in Gherkin format
4. **03_technical_spec.json** - Technical specification
5. **04_test_plan.json** - Comprehensive test plan

## Summary

- **Total Subtasks:** ${breakdown.breakdown.totalSubtasks}
- **Estimated Hours:** ${breakdown.estimations.estimatedHours}
- **Story Points:** ${breakdown.estimations.storyPoints}
- **Complexity:** ${breakdown.complexity}/10
- **Type:** ${breakdown.type}
- **Priority:** ${breakdown.priority}

## Phases

${breakdown.breakdown.phases.map(p => `- ${p.phase}: ${p.estimatedHours}h (${p.subtasks.length} subtasks)`).join('\n')}

---
_Generated by AETHER Planning Engine v1.1.0_
`;
      fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf-8');

      console.log(chalk.green('\n✔ Quick Planning Complete!\n'));
      console.log(chalk.bold('Generated Files:'));
      console.log(`  📁 ${outputDir}`);
      console.log(`    ├── 01_breakdown.json`);
      console.log(`    ├── 01_breakdown.md`);
      console.log(`    ├── 02_gherkin.feature`);
      console.log(`    ├── 03_technical_spec.json`);
      console.log(`    ├── 04_test_plan.json`);
      console.log(`    └── README.md`);
      console.log(`\n${chalk.gray('Total Hours:')} ${chalk.white(breakdown.estimations.estimatedHours)}`);
      console.log(`${chalk.gray('Story Points:')} ${chalk.yellow(breakdown.estimations.storyPoints)}`);
      console.log(`${chalk.gray('Total Subtasks:')} ${chalk.cyan(breakdown.breakdown.totalSubtasks)}`);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================
// EXECUTION ENGINE COMMANDS
// ============================================================

const execCmd = program.command('exec').description('Execute tasks with AI agents');

execCmd
  .command('task <prompt>')
  .description('Execute a single task with an AI agent')
  .option('-a, --agent <agentId>', 'Agent ID to use', 'architect')
  .option('-m, --model <model>', 'Model to use (overrides agent default)')
  .option('-p, --priority <priority>', 'Task priority: critical, high, medium, low', 'medium')
  .option('--stream', 'Enable streaming output', false)
  .action(async (prompt, options) => {
    console.log(chalk.blue('🚀 AETHER Task Execution...\n'));
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);

      // Get agent
      const agentManager = new AgentManager(projectManager);
      const agents = agentManager.getAvailableAgents();
      const agent = agents.find(a => a.id === options.agent) || agents[0];

      if (!agent) {
        console.error(chalk.red(`Agent '${options.agent}' not found`));
        process.exit(1);
      }

      // Override model if specified
      if (options.model) {
        agent.model = options.model;
      }

      console.log(chalk.gray(`Agent: ${chalk.cyan(agent.role)} (${agent.model})`));
      console.log(chalk.gray(`Priority: ${options.priority}\n`));
      console.log(chalk.bold('Task:'), prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
      console.log(chalk.gray('\nExecuting...\n'));

      // Execute
      const startTime = Date.now();
      const result = await coordinationLayer.executeTask(prompt, {
        agentProfile: agent,
        priority: options.priority
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (result.success) {
        console.log(chalk.green.bold('\n✓ Execution Successful!'));
        console.log(chalk.gray(`Duration: ${duration}s`));
        console.log(chalk.gray(`Tokens: ${result.tokenUsage?.input || 0} in / ${result.tokenUsage?.output || 0} out`));
        console.log(chalk.gray(`Cost: $${result.cost?.toFixed(6) || '0.00'}`));
        console.log(chalk.bold('\n--- OUTPUT ---'));
        console.log(chalk.white(result.output));
      } else {
        console.log(chalk.red.bold('\n✗ Execution Failed!'));
        console.log(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

execCmd
  .command('parallel <prompts...>')
  .description('Execute multiple tasks in parallel')
  .option('-a, --agents <agentIds>', 'Comma-separated agent IDs to use')
  .option('-s, --strategy <strategy>', 'Aggregation strategy: consensus, priority, majority', 'consensus')
  .action(async (prompts, options) => {
    console.log(chalk.blue('🚀 AETHER Parallel Execution...\n'));
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const agentManager = new AgentManager(projectManager);
      const allAgents = agentManager.getAvailableAgents();

      // Parse agents
      const selectedAgents = options.agents
        ? allAgents.filter(a => options.agents.split(',').includes(a.id))
        : allAgents.slice(0, Math.min(3, allAgents.length));

      if (selectedAgents.length === 0) {
        console.error(chalk.red('No agents available'));
        process.exit(1);
      }

      console.log(chalk.gray(`Tasks: ${prompts.length}`));
      console.log(chalk.gray(`Agents: ${selectedAgents.map(a => a.role).join(', ')}`));
      console.log(chalk.gray(`Strategy: ${options.strategy}\n`));

      const startTime = Date.now();
      const result = await coordinationLayer.executeParallel(prompts, {
        agents: selectedAgents,
        strategy: options.strategy
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(chalk.green.bold('\n✓ Parallel Execution Complete!'));
      console.log(chalk.gray(`Duration: ${duration}s`));
      console.log(chalk.gray(`Successful: ${result.summary.successful}/${result.summary.total}`));
      console.log(chalk.gray(`Confidence: ${(result.aggregation.confidence * 100).toFixed(1)}%`));

      console.log(chalk.bold('\n--- SUMMARY ---'));
      console.log(chalk.white(`Total Tasks: ${result.summary.total}`));
      console.log(chalk.green(`Completed: ${result.summary.successful}`));
      if (result.summary.failed > 0) {
        console.log(chalk.red(`Failed: ${result.summary.failed}`));
      }
    } catch (error) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

execCmd
  .command('stats')
  .description('Show execution statistics')
  .action(() => {
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const stats = coordinationLayer.getStatistics();

      console.log(chalk.blue('\n=== EXECUTION STATISTICS ===\n'));

      // Executor stats
      if (stats.executor) {
        console.log(chalk.bold.cyan('Agent Executor:'));
        console.log(`  Total Executions: ${chalk.white(stats.executor.totalExecutions)}`);
        console.log(`  Success Rate: ${stats.executor.successRate >= 90 ? chalk.green : stats.executor.successRate >= 70 ? chalk.yellow : chalk.red(stats.executor.successRate + '%')}`);
        console.log(`  Total Cost: ${chalk.yellow('$' + stats.executor.totalCost)}`);
        console.log(`  Tokens Used: ${chalk.cyan(stats.executor.totalTokens.toLocaleString())}`);
        console.log(`  Avg Duration: ${chalk.gray((stats.executor.averageDuration / 1000).toFixed(1) + 's')}`);
      }

      // Queue stats
      if (stats.queue) {
        console.log(chalk.bold.cyan('\nTask Queue:'));
        console.log(`  Pending: ${chalk.white(stats.queue.pending)}`);
        console.log(`  Processing: ${chalk.yellow(stats.queue.processing)}`);
        console.log(`  Completed: ${chalk.green(stats.queue.completed)}`);
        console.log(`  Failed: ${chalk.red(stats.queue.failed)}`);
      }

      // Aggregator stats
      if (stats.aggregator) {
        console.log(chalk.bold.cyan('\nResult Aggregator:'));
        console.log(`  Total Aggregations: ${chalk.white(stats.aggregator.totalAggregations)}`);
        console.log(`  Avg Confidence: ${chalk.green(stats.aggregator.averageConfidence)}`);
        console.log(`  Total Conflicts: ${chalk.gray(stats.aggregator.totalConflicts)}`);
      }

      console.log('');
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Queue Management Commands
const queueCmd = program.command('queue').description('Manage task queue');

queueCmd
  .command('list')
  .description('List pending tasks in queue')
  .action(() => {
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const queue = coordinationLayer.getQueue();
      const stats = queue.getStats();
      const pending = queue.getPendingTasks();

      console.log(chalk.blue('\n=== TASK QUEUE ===\n'));
      console.log(chalk.gray(`Queue Depth: ${stats.queueDepth}`));
      console.log(chalk.gray(`Running: ${stats.processing}`));
      console.log(chalk.gray(`Dead Letter: ${stats.deadLetter}\n`));

      if (pending.length === 0) {
        console.log(chalk.gray('No pending tasks'));
      } else {
        console.log(chalk.bold('Pending Tasks:'));
        pending.slice(0, 10).forEach((task, i) => {
          const priorityColors = {
            0: chalk.red,
            1: chalk.yellow,
            2: chalk.green,
            3: chalk.gray,
            4: chalk.gray
          };
          const priorityName = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BACKGROUND'][task.priority];
          const priorityColor = priorityColors[task.priority] || chalk.white;

          console.log(`  ${i + 1}. [${priorityColor(priorityName)}] ${task.id}`);
        });
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

queueCmd
  .command('add <task>')
  .description('Add a task to the queue')
  .option('-p, --priority <priority>', 'Priority: critical, high, medium, low', 'medium')
  .action(async (task, options) => {
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const taskId = coordinationLayer.enqueueTask(task, {
        priority: options.priority
      });

      console.log(chalk.green(`\n✓ Task added to queue: ${taskId}`));
      console.log(chalk.gray(`Priority: ${options.priority}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

queueCmd
  .command('deadletter')
  .description('List failed tasks in dead letter queue')
  .action(() => {
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const queue = coordinationLayer.getQueue();
      const deadLetter = queue.getDeadLetterQueue();

      console.log(chalk.blue('\n=== DEAD LETTER QUEUE ===\n'));

      if (deadLetter.length === 0) {
        console.log(chalk.green('No failed tasks in dead letter queue'));
      } else {
        console.log(chalk.red(`Found ${deadLetter.length} failed task(s):\n`));
        deadLetter.forEach((task, i) => {
          console.log(`${i + 1}. ${chalk.yellow(task.id)}`);
          console.log(`   Payload: ${JSON.stringify(task.payload)?.substring(0, 50)}...`);
          console.log(`   Error: ${task.error}`);
          console.log(`   Retries: ${task.retries}/${task.maxRetries}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

queueCmd
  .command('retry <taskId>')
  .description('Retry a failed task from dead letter queue')
  .action(async (taskId) => {
    try {
      const coordinationLayer = new CoordinationLayer(projectManager);
      const queue = coordinationLayer.getQueue();
      const success = queue.retryDeadLetter(taskId);

      if (success) {
        console.log(chalk.green(`\n✓ Task ${taskId} has been requeued for retry`));
      } else {
        console.error(chalk.red(`\n✗ Task ${taskId} not found in dead letter queue`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================
// CODE ANALYSIS COMMANDS
// ============================================================

const analyzeCmd = program.command('analyze').description('Deep code analysis for comprehensive understanding');

analyzeCmd
  .command('feature <featureName>')
  .description('Analyze a feature comprehensively (data flow, DB schema, relationships)')
  .option('-o, --output <file>', 'Output file path (optional)')
  .option('-f, --format <format>', 'Output format: markdown, json', 'markdown')
  .action(async (featureName, options) => {
    console.log(chalk.blue(`\n🔍 AETHER Code Analysis Engine...`));
    console.log(chalk.gray(`Analyzing feature: ${chalk.yellow(featureName)}\n`));

    try {
      const engine = new CodeAnalysisEngine(projectManager);
      const analysis = await engine.analyzeFeatureComprehensively(featureName);

      // Display summary
      console.log(chalk.bold('\n📊 ANALYSIS SUMMARY\n'));

      // Data Flow
      if (analysis.dataFlow) {
        console.log(chalk.bold('### Data Flow Analysis'));
        console.log(chalk.gray(`Local tables: ${analysis.dataFlow.localStorage?.tables?.length || 0}`));
        console.log(chalk.gray(`API calls: ${analysis.dataFlow.apiCalls?.length || 0}`));
        console.log(chalk.gray(`Database tables: ${analysis.dataFlow.databaseTables?.length || 0}`));
        console.log(chalk.gray(`Sync steps: ${analysis.dataFlow.syncFlow?.steps?.length || 0}`));
        console.log(chalk.gray(`Gaps found: ${analysis.dataFlow.gaps?.length || 0}\n`));

        if (analysis.dataFlow.gaps?.length > 0) {
          console.log(chalk.yellow('⚠️  Gaps Identified:'));
          for (const gap of analysis.dataFlow.gaps) {
            const severityColor = gap.severity === 'high' ? chalk.red : gap.severity === 'medium' ? chalk.yellow : chalk.gray;
            console.log(`  ${severityColor(`[${gap.severity.toUpperCase()}]`)} ${gap.message}`);
            console.log(`  ${chalk.gray('→')} ${gap.recommendation}\n`);
          }
        }
      }

      // Database Schema
      if (analysis.databaseSchema) {
        console.log(chalk.bold('\n### Database Schema'));
        for (const table of analysis.databaseSchema) {
          console.log(chalk.cyan(`\nTable: ${table.name}`));
          console.log(chalk.gray(`Columns: ${table.columns?.length || 0}`));
          console.log(chalk.gray(`Foreign Keys: ${table.foreignKeys?.length || 0}`));
          console.log(chalk.gray(`RLS Policies: ${table.rlsPolicies?.length || 0}`));
          console.log(chalk.gray(`Triggers: ${table.triggers?.length || 0}`));

          if (table.foreignKeys?.length > 0) {
            console.log(chalk.gray('\nForeign Keys:'));
            for (const fk of table.foreignKeys) {
              console.log(`  → ${fk.column} → ${fk.referenceTable}.${fk.referenceColumn}`);
            }
          }
        }
      }

      // Relationships
      if (analysis.relationships) {
        console.log(chalk.bold('\n### Database Relationships'));
        console.log(chalk.gray(`Direct relations: ${analysis.relationships.directRelations?.length || 0}`));
        console.log(chalk.gray(`Affected by: ${analysis.relationships.affectedBy?.length || 0}`));

        if (analysis.relationships.directRelations?.length > 0) {
          console.log(chalk.gray('\nHas relations:'));
          for (const rel of analysis.relationships.directRelations) {
            console.log(`  → ${rel.targetTable} (via ${rel.column})`);
          }
        }

        if (analysis.relationships.affectedBy?.length > 0) {
          console.log(chalk.gray('\nReferenced by:'));
          for (const rel of analysis.relationships.affectedBy) {
            console.log(`  ← ${rel.sourceTable} (via ${rel.column})`);
          }
        }
      }

      // Module Dependencies
      if (analysis.moduleDependencies) {
        console.log(chalk.bold('\n### Module Dependencies'));
        console.log(chalk.gray(`Internal deps: ${analysis.moduleDependencies.internalDependencies?.length || 0}`));
        console.log(chalk.gray(`External deps: ${analysis.moduleDependencies.externalDependencies?.length || 0}`));
        console.log(chalk.gray(`Circular deps: ${analysis.moduleDependencies.circularDependencies?.length || 0}`));
      }

      // Recommendations
      if (analysis.recommendations?.length > 0) {
        console.log(chalk.bold('\n### Recommendations\n'));
        for (const rec of analysis.recommendations) {
          const priorityColor = rec.priority === 'high' ? chalk.red : rec.priority === 'medium' ? chalk.yellow : chalk.green;
          console.log(`${priorityColor(`[${rec.priority.toUpperCase()}]`)} ${chalk.bold(rec.category)}`);
          console.log(`  Finding: ${rec.finding}`);
          console.log(`  → ${rec.recommendation}\n`);
        }
      }

      // Output to file if specified
      if (options.output) {
        const engine = new CodeAnalysisEngine(projectManager);
        const content = engine.exportToMarkdown(analysis);
        fs.writeFileSync(options.output, content, 'utf-8');
        console.log(chalk.green(`\n✓ Analysis exported to ${options.output}`));
      }

    } catch (error) {
      console.error(chalk.red(`\n✗ Analysis failed: ${error.message}`));
      process.exit(1);
    }
  });

analyzeCmd
  .command('dataflow <featureName>')
  .description('Analyze data flow between frontend and backend')
  .action(async (featureName) => {
    console.log(chalk.blue(`\n🔄 Analyzing Data Flow for: ${chalk.yellow(featureName)}\n`));

    try {
      const engine = new CodeAnalysisEngine(projectManager);
      const flow = await engine.analyzeDataFlow(featureName);

      console.log(chalk.bold('📱 Local Storage (Dexie):'));
      if (flow.localStorage?.tables?.length > 0) {
        for (const table of flow.localStorage.tables) {
          console.log(`  • ${chalk.cyan(table.name)} (${table.type})`);
        }
      } else {
        console.log(chalk.gray('  No local tables found'));
      }

      console.log(chalk.bold('\n🌐 API Calls:'));
      if (flow.apiCalls?.length > 0) {
        for (const api of flow.apiCalls) {
          console.log(`  • ${chalk.cyan(api.table || api.endpoint)}`);
          console.log(`    Operations: ${api.operations?.join(', ') || 'N/A'}`);
          console.log(`    Auth: ${api.authRequired ? 'Yes' : 'No'} | RLS: ${api.hasRLS ? 'Yes' : 'No'} | Validation: ${api.hasValidation ? 'Yes' : 'No'}`);
        }
      } else {
        console.log(chalk.gray('  No API calls found'));
      }

      console.log(chalk.bold('\n🗄️  Database Tables:'));
      if (flow.databaseTables?.length > 0) {
        for (const table of flow.databaseTables) {
          console.log(`  • ${chalk.cyan(table.name)}`);
          console.log(`    Columns: ${table.columns?.length || 0} | FKs: ${table.foreignKeys?.length || 0}`);
        }
      } else {
        console.log(chalk.gray('  No database tables found'));
      }

      console.log(chalk.bold('\n🔄 Sync Flow:'));
      for (const step of flow.syncFlow?.steps || []) {
        console.log(`  ${chalk.green(step.step)}.')} ${chalk.bold(step.action)}`);
        console.log(`     ${step.description}`);
      }

      if (flow.gaps?.length > 0) {
        console.log(chalk.bold('\n⚠️  Gaps:'));
        for (const gap of flow.gaps) {
          console.log(`  [${gap.severity}] ${gap.message}`);
          console.log(`  → ${gap.recommendation}\n`);
        }
      }

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

analyzeCmd
  .command('relationships <tableName>')
  .description('Analyze database relationships for a table')
  .action(async (tableName) => {
    console.log(chalk.blue(`\n🔗 Analyzing Relationships for: ${chalk.yellow(tableName)}\n`));

    try {
      const engine = new CodeAnalysisEngine(projectManager);
      const rel = await engine.analyzeRelationships(tableName);

      console.log(chalk.bold('Direct Relations (has_many):'));
      if (rel.directRelations?.length > 0) {
        for (const r of rel.directRelations) {
          console.log(`  → ${chalk.cyan(r.targetTable)} (${r.column})`);
        }
      } else {
        console.log(chalk.gray('  None'));
      }

      console.log(chalk.bold('\nReferenced By:'));
      if (rel.affectedBy?.length > 0) {
        for (const r of rel.affectedBy) {
          console.log(`  ← ${chalk.cyan(r.sourceTable)} (${r.column})`);
        }
      } else {
        console.log(chalk.gray('  None'));
      }

      console.log(chalk.bold('\nDependency Tree:'));
      console.log(chalk.gray(_printTree(rel.dependencyTree)));

    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================================
// FALLBACK SYSTEM COMMANDS
// ============================================================

const fallbackCmd = program.command('fallback').description('Manage cascading fallback system for AI agents');

fallbackCmd
  .command('execute <task>')
  .description('Execute task with cascading fallback (Agent A → B → C)')
  .option('-t, --type <taskType>', 'Task type (architecture, backend, frontend, etc.)', 'default')
  .option('-r, --require-all', 'Require all agents to respond', false)
  .action(async (task, options) => {
    console.log(chalk.blue('\n🔄 AETHER Cascading Fallback Execution...\n'));
    console.log(chalk.gray(`Task: ${task.substring(0, 80)}${task.length > 80 ? '...' : ''}`));
    console.log(chalk.gray(`Task Type: ${options.type}\n`));

    try {
      const agentManager = new AgentManager(projectManager);
      const fallbackEngine = new AgentFallbackEngine(agentManager, {
        maxRetriesPerAgent: 2,
        retryDelayMs: 2000,
        fallbackTimeoutMs: 120000
      });

      // Get chain for task type
      const chain = fallbackEngine.getFallbackChain(options.type);
      console.log(chalk.bold('Fallback Chain:'));
      chain.forEach((agentId, index) => {
        const agent = agentManager.agents.get(agentId);
        console.log(`  ${index + 1}. ${chalk.cyan(agentId)} (${agent?.model || 'unknown'})`);
      });
      console.log('');

      // Execute with fallback
      const result = await fallbackEngine.executeWithFallback(task, {
        taskType: options.type,
        requireAll: options.requireAll
      });

      // Display results
      if (result.success) {
        console.log(chalk.green.bold('\n✓ Execution Successful!'));
        console.log(chalk.gray(`Final Agent: ${result.result?.agentId || 'N/A'}`));
        console.log(chalk.gray(`Fallback Count: ${result.fallbackCount}`));
        console.log(chalk.gray(`Duration: ${result.duration}ms`));
        console.log(chalk.gray(`Attempts: ${result.attempts?.length || 0}`));

        console.log(chalk.bold('\n--- OUTPUT ---'));
        console.log(chalk.white(result.result?.result || 'No output'));

        // Show attempt history
        if (result.attempts?.length > 1) {
          console.log(chalk.bold('\n--- ATTEMPT HISTORY ---'));
          for (const attempt of result.attempts) {
            const status = attempt.success ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${status} ${attempt.agentId}: ${attempt.success ? 'Success' : attempt.error}`);
          }
        }
      } else {
        console.log(chalk.red.bold('\n✗ All agents failed!'));
        console.log(chalk.gray(`Total Attempts: ${result.attempts?.length || 0}`));
        console.log(chalk.bold('\n--- ERRORS ---'));
        for (const error of result.errors || []) {
          console.log(chalk.red(`  • ${error}`));
        }
      }

    } catch (error) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

fallbackCmd
  .command('chains')
  .description('Show all defined fallback chains')
  .action(() => {
    console.log(chalk.blue('\n📋 AETHER Fallback Chains\n'));

    const meta = projectManager.getProjectMeta();
    const chains = meta.config.fallbackChains || {};

    for (const [taskType, agents] of Object.entries(chains)) {
      console.log(chalk.bold(`${taskType}:`));
      agents.forEach((agentId, index) => {
        const priority = index === 0 ? chalk.green('(Primary)') :
                        index === 1 ? chalk.yellow('(Fallback 1)') :
                        chalk.gray(`(Fallback ${index})`);
        console.log(`  ${index + 1}. ${chalk.cyan(agentId)} ${priority}`);
      });
      console.log('');
    }
  });

fallbackCmd
  .command('set-chain <taskType> <agents...>')
  .description('Set custom fallback chain for a task type')
  .action((taskType, agents) => {
    console.log(chalk.blue(`\n🔧 Setting fallback chain for '${taskType}'...\n`));
    console.log(chalk.gray('Note: This updates the in-memory config only.'));
    console.log(chalk.gray('To persist, update .aether/config.json manually.\n'));
    console.log(chalk.bold('Chain:'));
    agents.forEach((agentId, index) => {
      console.log(`  ${index + 1}. ${chalk.cyan(agentId)}`);
    });
    console.log(chalk.yellow('\n⚠️  Configuration update not persisted.'));
  });

fallbackCmd
  .command('analytics')
  .description('Show fallback system analytics')
  .action(() => {
    console.log(chalk.blue('\n📊 Fallback System Analytics\n'));

    const agentManager = new AgentManager(projectManager);
    const fallbackEngine = new AgentFallbackEngine(agentManager);

    const analytics = fallbackEngine.getAnalytics();

    console.log(chalk.bold('Overall Statistics:'));
    console.log(`  Total Executions: ${chalk.cyan(analytics.totalExecutions)}`);
    console.log(`  Success Rate: ${chalk.green(analytics.successRate)}`);
    console.log(`  Avg Fallback Count: ${chalk.yellow(analytics.avgFallbackCount)}`);
    console.log(`  Avg Duration: ${chalk.gray(analytics.avgDuration)}`);
    console.log(`  Total Fallbacks: ${chalk.yellow(analytics.totalFallbacks)}`);

    if (Object.keys(analytics.agentReliability).length > 0) {
      console.log(chalk.bold('\nAgent Reliability:'));
      for (const [agentId, stats] of Object.entries(analytics.agentReliability)) {
        const rateColor = parseFloat(stats.successRate) > 70 ? chalk.green :
                         parseFloat(stats.successRate) > 50 ? chalk.yellow : chalk.red;
        console.log(`  ${chalk.cyan(agentId)}:`);
        console.log(`    Success Rate: ${rateColor(stats.successRate)}`);
        console.log(`    Total Attempts: ${stats.attempts}`);
      }
    }
  });

fallbackCmd
  .command('history')
  .description('Show recent fallback execution history')
  .option('-l, --limit <number>', 'Number of records', '10')
  .action((options) => {
    console.log(chalk.blue('\n📜 Fallback Execution History\n'));

    const agentManager = new AgentManager(projectManager);
    const fallbackEngine = new AgentFallbackEngine(agentManager);

    const history = fallbackEngine.getHistory(parseInt(options.limit));

    if (history.length === 0) {
      console.log(chalk.gray('No execution history yet.'));
      return;
    }

    for (const record of history) {
      const status = record.success ? chalk.green('✓') : chalk.red('✗');
      console.log(`${status} [${new Date(record.timestamp).toLocaleTimeString()}]`);
      console.log(`  Task: ${record.task.substring(0, 60)}...`);
      console.log(`  Type: ${chalk.gray(record.taskType)}`);
      console.log(`  Fallbacks: ${chalk.yellow(record.fallbackCount)}`);
      console.log(`  Duration: ${chalk.gray(record.duration + 'ms')}`);
      console.log('');
    }
  });

// Helper to print tree
function _printTree(node, prefix = '', isLast = true) {
  if (!node) return '';
  let result = prefix + (isLast ? '└── ' : '├── ') + node.name + '\n';
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      result += _printTree(node.children[i], childPrefix, i === node.children.length - 1);
    }
  }
  return result;
}

program.parse(process.argv);
