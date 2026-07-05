import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { EventBus } from '../core/EventBus.js';
import { AgentManager } from '../core/AgentManager.js';
import { TaskEngine } from '../core/TaskEngine.js';
import { WorkflowEngine } from '../core/WorkflowEngine.js';

const tempDir = path.resolve('./temp_epic3_test');
const testTaskFile = path.join(tempDir, 'task_test.md');

// Helper to clean up temp directory
function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 3 INTEGRATION TESTS ===');
  
  // Setup temp workspace
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Write initial mock task file
  const initialTaskContent = `# Features Development Task List
- [ ] Implement database migration for table users
- [ ] Write service functions for user authentication
- [ ] Create automation test scripts for testing authentication
`;
  fs.writeFileSync(testTaskFile, initialTaskContent, 'utf-8');

  // Initialize Core Services
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  const eventBus = new EventBus();
  const agentManager = new AgentManager(pm);
  const taskEngine = new TaskEngine();
  const workflowEngine = new WorkflowEngine(eventBus, taskEngine, agentManager);

  // -------------------------------------------------------------
  // Test Case 1: Agent Registration & Mock Execution Fallback
  // -------------------------------------------------------------
  console.log('\n[Test 1] Verifying AgentManager & Fallback...');
  const agents = agentManager.getAvailableAgents();
  assert.strictEqual(agents.length, 3, 'Should have 3 default agents configured.');
  
  const archAgent = agents.find(a => a.id === 'architect');
  assert.ok(archAgent, 'Architect agent profile should exist.');
  assert.strictEqual(archAgent.status, 'standby', 'Initial status should be standby.');

  // Execute task (no keys set -> fallback to mock)
  const taskPrompt = 'Design a table structure for student grades';
  const response = await agentManager.executeAgentTask('architect', taskPrompt);
  
  assert.ok(response.includes('MOCK ARCHITECTURE DESIGN'), 'Should fallback to Mock response.');
  assert.ok(response.includes('CREATE TABLE'), 'Mock should contain SQL table DDL.');
  
  const updatedAgents = agentManager.getAvailableAgents();
  const updatedArch = updatedAgents.find(a => a.id === 'architect');
  assert.strictEqual(updatedArch.status, 'standby', 'Status should return to standby after execution.');
  console.log('✔ Test 1 Passed.');

  // -------------------------------------------------------------
  // Test Case 2: TaskEngine Markdown Checklists Parser
  // -------------------------------------------------------------
  console.log('\n[Test 2] Verifying TaskEngine parsing...');
  const parsedTasks = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(parsedTasks.length, 3, 'Should parse exactly 3 checklist items.');
  assert.strictEqual(parsedTasks[0].status, 'pending', 'First task status should be pending.');
  assert.strictEqual(parsedTasks[1].status, 'pending', 'Second task status should be pending.');
  assert.strictEqual(parsedTasks[2].status, 'pending', 'Third task status should be pending.');
  console.log('✔ Test 2 Passed.');

  // -------------------------------------------------------------
  // Test Case 3: TaskEngine Status Updater
  // -------------------------------------------------------------
  console.log('\n[Test 3] Verifying TaskEngine status updates...');
  taskEngine.updateTaskStatus(testTaskFile, parsedTasks[0].index, 'in_progress');
  
  let reParsed = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(reParsed[0].status, 'in_progress', 'First task should now be in_progress.');
  
  taskEngine.updateTaskStatus(testTaskFile, 'user authentication', 'completed');
  reParsed = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(reParsed[1].status, 'completed', 'Second task should now be completed.');
  console.log('✔ Test 3 Passed.');

  // Reset file content for workflow test
  fs.writeFileSync(testTaskFile, initialTaskContent, 'utf-8');

  // -------------------------------------------------------------
  // Test Case 4: Workflow Engine Lifecycle & Transitions
  // -------------------------------------------------------------
  console.log('\n[Test 4] Verifying WorkflowEngine start & transition flow...');
  let startEventFired = false;
  let taskUpdateEventCount = 0;
  let completedEventFired = false;

  eventBus.subscribe('workflow:started', (data) => {
    assert.strictEqual(data.workflowId, 'test-wf');
    assert.strictEqual(data.taskCount, 3);
    startEventFired = true;
  });

  eventBus.subscribe('workflow:task_updated', () => {
    taskUpdateEventCount++;
  });

  eventBus.subscribe('workflow:completed', (data) => {
    assert.strictEqual(data.workflowId, 'test-wf');
    completedEventFired = true;
  });

  // Start workflow
  const wfState = await workflowEngine.startWorkflow('test-wf', testTaskFile);
  assert.strictEqual(wfState.status, 'running', 'Workflow status should be running.');
  assert.ok(startEventFired, 'workflow:started event should have fired.');
  
  // Verify that start automatically sets first task to in_progress
  let currentTasks = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(currentTasks[0].status, 'in_progress', 'First task should be in_progress.');

  // Transition to next task (completes task 1, starts task 2)
  await workflowEngine.transitionToNextStep('test-wf');
  currentTasks = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(currentTasks[0].status, 'completed', 'First task should be completed.');
  assert.strictEqual(currentTasks[1].status, 'in_progress', 'Second task should be in_progress.');

  // Transition to third task (completes task 2, starts task 3)
  await workflowEngine.transitionToNextStep('test-wf');
  currentTasks = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(currentTasks[1].status, 'completed', 'Second task should be completed.');
  assert.strictEqual(currentTasks[2].status, 'in_progress', 'Third task should be in_progress.');

  // Transition final (completes task 3, workflow completes)
  await workflowEngine.transitionToNextStep('test-wf');
  currentTasks = taskEngine.parseTaskFile(testTaskFile);
  assert.strictEqual(currentTasks[2].status, 'completed', 'Third task should be completed.');
  assert.strictEqual(wfState.status, 'completed', 'Workflow should be completed.');
  assert.ok(completedEventFired, 'workflow:completed event should have fired.');
  console.log('✔ Test 4 Passed.');

  // -------------------------------------------------------------
  // Test Case 5: Workflow Engine Prerequisite Enforcement
  // -------------------------------------------------------------
  console.log('\n[Test 5] Verifying WorkflowEngine prerequisite verification...');
  // Write a task list where second task is in_progress but first task is pending
  const brokenTaskContent = `# Broken Tasks
- [ ] Task A (Pending)
- [/] Task B (In Progress)
- [ ] Task C (Pending)
`;
  fs.writeFileSync(testTaskFile, brokenTaskContent, 'utf-8');

  // Start a new workflow with a clean EventBus and WorkflowEngine to prevent event pollution
  const cleanEventBus = new EventBus();
  const cleanWorkflowEngine = new WorkflowEngine(cleanEventBus, taskEngine, agentManager);
  const brokenWf = await cleanWorkflowEngine.startWorkflow('broken-wf', testTaskFile);
  
  // Retrieve correct line indices from parsed tasks
  const parsedBrokenTasks = taskEngine.parseTaskFile(testTaskFile);
  
  // Manually force Task B to in_progress and Task A back to pending
  taskEngine.updateTaskStatus(testTaskFile, parsedBrokenTasks[0].index, 'pending');
  taskEngine.updateTaskStatus(testTaskFile, parsedBrokenTasks[1].index, 'in_progress');

  // Attempting transition should throw since Task A is pending but Task B is in_progress
  try {
    await cleanWorkflowEngine.transitionToNextStep('broken-wf');
    assert.fail('Should have failed prerequisite check.');
  } catch (error) {
    assert.ok(error.message.includes('Prerequisite verification failed'), 'Error should be a prerequisite failure.');
    console.log('✔ Test 5 Passed (successfully blocked illegal transition).');
  }

  console.log('\n=== ALL EPIC 3 INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .then(() => {
    cleanup();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ TEST FAILURE:', err);
    cleanup();
    process.exit(1);
  });
