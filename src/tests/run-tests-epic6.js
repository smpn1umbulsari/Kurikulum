import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ProjectManager } from '../core/ProjectManager.js';
import { ContextEngine } from '../core/ContextEngine.js';
import { TaskEngine } from '../core/TaskEngine.js';
import { DecisionEngine } from '../core/DecisionEngine.js';
import { PromptEngine } from '../core/PromptEngine.js';

const tempDir = path.resolve('./temp_epic6_test');

function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('=== STARTING EPIC 6 (DECISION & PROMPT ENGINE) INTEGRATION TESTS ===');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // 1. Initialize ProjectManager
  const pm = new ProjectManager(tempDir);
  await pm.initializeProject();

  // Initialize helper engines
  const ce = new ContextEngine(pm);
  const te = new TaskEngine();

  // ----------------------------------------------------
  // Test 1: DecisionEngine Option Evaluation & Persistence
  // ----------------------------------------------------
  console.log('\n[Test 1] Verifying DecisionEngine Option Evaluation...');
  const de = new DecisionEngine(pm);

  const options = [
    { id: 'opt1', name: 'Option A', impact: 8, risk: 3, complexity: 4, description: 'High impact, moderate risk' },
    { id: 'opt2', name: 'Option B', impact: 9, risk: 6, complexity: 5, description: 'Highest impact, high risk' },
    { id: 'opt3', name: 'Option C', impact: 5, risk: 2, complexity: 2, description: 'Low impact, low risk' }
  ];

  const decision = await de.evaluateOptions(options);

  // Opt 1 score: (8*10) - (3*5) - (4*3) = 80 - 15 - 12 = 53
  // Opt 2 score: (9*10) - (6*5) - (5*3) = 90 - 30 - 15 = 45
  // Opt 3 score: (5*10) - (2*5) - (2*3) = 50 - 10 - 6 = 34
  assert.strictEqual(decision.selectedOptionId, 'opt1', 'Should select Option A (opt1) as it has the highest score of 53.');
  assert.ok(decision.rationale.includes('Option A'), 'Rationale should mention the selected option.');
  assert.strictEqual(decision.options[0].score, 53, 'Option A score should be computed as 53.');

  console.log('\n[Test 2] Verifying DecisionEngine Logging & Persistence...');
  await de.logDecision(decision);

  const history = await de.getDecisionHistory();
  assert.strictEqual(history.length, 1, 'Decision history should contain 1 log.');
  assert.strictEqual(history[0].selectedOptionId, 'opt1', 'Logged decision should match option evaluated.');
  console.log('✔ DecisionEngine evaluation and logging verified.');

  // ----------------------------------------------------
  // Test 3: PromptEngine Token budget & Context Compression
  // ----------------------------------------------------
  console.log('\n[Test 3] Verifying PromptEngine Context Compression...');
  const pe = new PromptEngine(pm, ce, te);

  const longContext = 'word '.repeat(1000); // 1000 words ≈ 1300 tokens
  const compressed = pe.compressContext(longContext, 200); // limit to 200 tokens
  
  const compWords = compressed.split(/\s+/).length;
  const compTokens = Math.ceil(compWords * 1.3);
  assert.ok(compTokens <= 200, `Compressed context (${compTokens} tokens) should be within budget limit (200 tokens).`);
  assert.ok(compressed.includes('[... CONTEXT TRUNCATED DUE TO TOKEN BUDGET LIMIT ...]'), 'Should contain truncation message.');
  console.log('✔ Context compression and budget calculation verified.');

  // ----------------------------------------------------
  // Test 4: Credential Scrubber / Key Redaction
  // ----------------------------------------------------
  console.log('\n[Test 4] Verifying Credential Scrubber / API Key Redaction...');
  
  // Set test credentials
  process.env.GEMINI_API_KEY = 'AIzaSyTestApiKeyForGeminiScrubbing_99';
  process.env.OPENAI_API_KEY = 'sk-TestApiKeyForOpenAIScrubbing_88';
  process.env.AETHER_MASTER_PASSWORD = 'super-secret-password-xyz';

  const dirtyText = `Here is my Gemini Key: AIzaSyTestApiKeyForGeminiScrubbing_99.
Here is my OpenAI Key: sk-TestApiKeyForOpenAIScrubbing_88.
Here is my master password: super-secret-password-xyz.
And a pattern key: sk-proj-1234567890abcdef1234567890abcdef.`;

  const cleanText = pe.scrubCredentials(dirtyText);
  
  assert.ok(!cleanText.includes('AIzaSyTestApiKeyForGeminiScrubbing_99'), 'Gemini API key should be redacted.');
  assert.ok(!cleanText.includes('sk-TestApiKeyForOpenAIScrubbing_88'), 'OpenAI API key should be redacted.');
  assert.ok(!cleanText.includes('super-secret-password-xyz'), 'Master password should be redacted.');
  assert.ok(cleanText.includes('[REDACTED_API_KEY]') || cleanText.includes('[REDACTED_SECRET]'), 'Should contain redaction tokens.');
  console.log('✔ Credential scrubbing verified successfully.');

  // ----------------------------------------------------
  // Test 5: System Prompt Assembly
  // ----------------------------------------------------
  console.log('\n[Test 5] Verifying System Prompt Assembly...');
  
  // Create folders and files needed
  const agentsDir = path.join(tempDir, '.agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const agentsMdPath = path.join(agentsDir, 'AGENTS.md');
  const taskFilePath = path.join(agentsDir, 'task.md');
  
  fs.writeFileSync(agentsMdPath, 'Rules: Always use clean architecture.', 'utf-8');
  fs.writeFileSync(taskFilePath, '- [/] Implement prompt assembler\n- [ ] Write integration tests', 'utf-8');

  // Verify prompt assembly
  const prompt = await pe.assembleSystemPrompt('developer', 'task-1', 'Context: API key AIzaSyTestApiKeyForGeminiScrubbing_99 should be scrubbed here too.');
  
  assert.ok(prompt.includes('Backend Lead') || prompt.includes('developer') || prompt.includes('AI Agent'), 'Prompt should include agent role.');
  assert.ok(prompt.includes('Rules: Always use clean architecture.'), 'Prompt should include governance rules.');
  assert.ok(prompt.includes('Implement prompt assembler'), 'Prompt should include parsed tasks.');
  assert.ok(prompt.includes('Context: API key'), 'Prompt should include context.');
  assert.ok(!prompt.includes('AIzaSyTestApiKeyForGeminiScrubbing_99'), 'Assembled prompt should be scrubbed of credentials.');
  console.log('✔ System prompt assembly verified.');

  ce.close();
  console.log('\n=== ALL EPIC 6 DECISION & PROMPT ENGINE TESTS PASSED SUCCESSFULLY ===');
}

runTests()
  .then(() => {
    setTimeout(() => {
      cleanup();
      process.exit(0);
    }, 200);
  })
  .catch(err => {
    console.error('❌ TEST FAILURE:', err);
    setTimeout(() => {
      cleanup();
      process.exit(1);
    }, 200);
  });
