/**
 * AETHER Platform - Core TypeScript Types
 * Version: 1.1.0
 * Last Updated: 28 June 2026
 */

// ============================================================
// EVENT BUS TYPES
// ============================================================

export type EventType =
  | 'workflow:started'
  | 'workflow:task_assigned'
  | 'workflow:task_updated'
  | 'workflow:task_completed'
  | 'workflow:task_timeout'
  | 'workflow:completed'
  | 'workflow:aborted'
  | 'workflow:error'
  | 'file:created'
  | 'file:changed'
  | 'file:deleted'
  | 'agent:registered'
  | 'agent:executing'
  | 'agent:completed'
  | 'agent:error'
  | 'agent:idle'
  | 'sync:started'
  | 'sync:completed'
  | 'sync:error'
  | 'sync:conflict'
  | 'deploy:started'
  | 'deploy:completed'
  | 'deploy:error';

export interface BaseEvent {
  type: EventType;
  timestamp: string;
  source?: string;
}

export interface WorkflowEvent extends BaseEvent {
  type: 'workflow:started' | 'workflow:task_updated' | 'workflow:task_completed' | 'workflow:task_timeout' | 'workflow:completed' | 'workflow:aborted' | 'workflow:error';
  workflowId: string;
  taskCount?: number;
  taskIndex?: number;
  status?: TaskStatus;
  text?: string;
  reason?: string;
}

export interface FileEvent extends BaseEvent {
  type: 'file:created' | 'file:changed' | 'file:deleted';
  path: string;
  previousPath?: string;
}

export interface AgentEvent extends BaseEvent {
  type: 'agent:registered' | 'agent:executing' | 'agent:completed' | 'agent:error' | 'agent:idle';
  agentId: string;
  role?: string;
  model?: string;
  error?: string;
}

export interface SyncEvent extends BaseEvent {
  type: 'sync:started' | 'sync:completed' | 'sync:error' | 'sync:conflict';
  recordsAffected?: number;
  conflicts?: SyncConflict[];
}

export interface SyncConflict {
  table: string;
  recordId: string;
  localValue: unknown;
  remoteValue: unknown;
  resolution?: 'local' | 'remote' | 'manual';
}

export type AnyEvent = WorkflowEvent | FileEvent | AgentEvent | SyncEvent | BaseEvent;

// ============================================================
// TASK & WORKFLOW TYPES
// ============================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'timeout';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskType = 'implementation' | 'testing' | 'documentation' | 'review' | 'deployment' | 'other';

export interface Task {
  index: number;
  indent: number;
  status: TaskStatus;
  text: string;
  lineText: string;
  priority?: TaskPriority;
  type?: TaskType;
  assignedAgent?: string;
  startedAt?: number;
  completedAt?: number;
  timeoutMs?: number;
  retries?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowState {
  workflowId: string;
  taskFilePath: string;
  status: 'initialized' | 'running' | 'paused' | 'completed' | 'aborted' | 'failed';
  currentTaskIndex: number;
  tasks: Task[];
  history: WorkflowHistoryEntry[];
  startedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowHistoryEntry {
  action: string;
  message: string;
  timestamp: string;
  agentId?: string;
  taskIndex?: number;
}

export interface WorkflowConfig {
  maxParallelTasks: number;
  taskTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  autoTransition?: boolean;
  failFast?: boolean;
}

// ============================================================
// AGENT TYPES
// ============================================================

export type AgentStatus = 'standby' | 'executing' | 'error' | 'idle';

export type AgentCapability =
  | 'architecture'
  | 'design'
  | 'review'
  | 'prd-analysis'
  | 'schema'
  | 'migration'
  | 'optimization'
  | 'indexing'
  | 'partitioning'
  | 'api'
  | 'backend'
  | 'supabase'
  | 'edge-functions'
  | 'rlpolicies'
  | 'react'
  | 'ui'
  | 'zustand'
  | 'typescript'
  | 'tailwindcss'
  | 'components'
  | 'security'
  | 'rls'
  | 'audit'
  | 'encryption'
  | 'compliance'
  | 'vulnerability'
  | 'testing'
  | 'quality'
  | 'verification'
  | 'e2e'
  | 'unit-tests'
  | 'integration'
  | 'deployment'
  | 'ci-cd'
  | 'infrastructure'
  | 'docker'
  | 'monitoring'
  | 'rollback';

export interface AgentProfile {
  id: string;
  role: string;
  model: string;
  capabilities: AgentCapability[];
  priority: number;
  maxConcurrentTasks: number;
  status?: AgentStatus;
  currentTasks?: number;
  lastActive?: string;
}

export interface AgentExecutionResult {
  agentId: string;
  role: string;
  model: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
  tokensUsed?: number;
  timestamp: string;
}

export interface AgentTaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed';
  priority: TaskPriority;
  estimatedDuration?: number;
}

// ============================================================
// PROJECT & CONFIG TYPES
// ============================================================

export interface ProjectConfig {
  name: string;
  version: string;
  ignoredPaths: string[];
  agentProfiles: AgentProfile[];
  workflowConfig: WorkflowConfig;
  lockTimeoutMs: number;
  eventConfig: EventConfig;
  prdConfig: PRDConfig;
}

export interface EventConfig {
  maxHistorySize: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface PRDConfig {
  autoEnforce: boolean;
  requireGapReport: boolean;
  blockOnMismatch: boolean;
}

export interface ProjectMeta {
  workspacePath: string;
  configFilePath: string;
  status: 'initialized' | 'uninitialized' | 'error';
  config: ProjectConfig;
}

// ============================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================

export type NodeType = 'file' | 'function' | 'class' | 'table' | 'column' | 'api' | 'component';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'references' | 'uses' | 'inherits';
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================================
// QUALITY & SECURITY TYPES
// ============================================================

export interface QualityCheckResult {
  success: boolean;
  lintPassed: boolean;
  testsPassed: boolean;
  timestamp: string;
  errors: QualityError[];
  warnings?: QualityWarning[];
}

export interface QualityError {
  type: 'lint' | 'test' | 'security' | 'type';
  file?: string;
  line?: number;
  message: string;
  severity: 'error' | 'critical';
}

export interface QualityWarning {
  type: 'lint' | 'security' | 'performance';
  file?: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface SecurityCredential {
  key: string;
  encrypted: boolean;
  lastUpdated: string;
  provider?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  hash?: string;
  previousHash?: string;
}

// ============================================================
// VERSION CONTROL TYPES
// ============================================================

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicted: string[];
}

export interface CommitResult {
  hash: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

// ============================================================
// SYNC & OFFLINE TYPES
// ============================================================

export interface SyncStatus {
  lastSyncAt?: string;
  pendingChanges: number;
  conflicts: number;
  status: 'synced' | 'pending' | 'conflict' | 'error' | 'offline';
  error?: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================
// DASHBOARD & MONITORING TYPES
// ============================================================

export interface DashboardMetrics {
  activeWorkflows: number;
  activeAgents: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageTaskDuration: number;
  successRate: number;
  timestamp: string;
}

export interface TokenUsage {
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
}

// ============================================================
// RBAC & PERMISSIONS TYPES
// ============================================================

export type Permission = 'create' | 'read' | 'update' | 'delete' | 'admin';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inheritsFrom?: string;
  createdAt: string;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

// ============================================================
// PLUGIN TYPES
// ============================================================

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  dependencies: string[];
  permissions: string[];
  status: 'active' | 'loaded' | 'error' | 'disabled';
  loadedAt?: string;
  error?: string;
}

export interface PluginConfig {
  plugins: Plugin[];
  autoLoad: string[];
  disabled: string[];
}

// ============================================================
// PRD COMPLIANCE TYPES
// ============================================================

export interface PRDComplianceGap {
  id: string;
  title: string;
  prdStatement: string;
  implementationStatement: string;
  riskLevel: 'high' | 'medium' | 'low';
  recommendation: 'UPDATE_DOCS' | 'UPDATE_CODE' | 'CREATE_REVISION' | 'NO_ACTION';
  affectedFiles: string[];
  affectedAPIs: string[];
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PRDComplianceReport {
  timestamp: string;
  totalGaps: number;
  highRiskGaps: number;
  mediumRiskGaps: number;
  lowRiskGaps: number;
  resolvedGaps: number;
  unresolvedGaps: number;
  overallStatus: 'PASSED' | 'FAILED' | 'WARNING';
  gaps: PRDComplianceGap[];
  recommendations: string[];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function isWorkflowEvent(event: AnyEvent): event is WorkflowEvent {
  return event.type.startsWith('workflow:');
}

export function isFileEvent(event: AnyEvent): event is FileEvent {
  return event.type.startsWith('file:');
}

export function isAgentEvent(event: AnyEvent): event is AgentEvent {
  return event.type.startsWith('agent:');
}

export function isSyncEvent(event: AnyEvent): event is SyncEvent {
  return event.type.startsWith('sync:');
}

export function createWorkflowEvent(
  workflowId: string,
  type: WorkflowEvent['type'],
  additionalData: Partial<WorkflowEvent> = {}
): WorkflowEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    workflowId,
    ...additionalData,
  };
}

export function createTaskStatusChange(
  index: number,
  status: TaskStatus,
  text?: string
): WorkflowEvent {
  return {
    type: 'workflow:task_updated',
    timestamp: new Date().toISOString(),
    workflowId: '',
    taskIndex: index,
    status,
    text,
  };
}