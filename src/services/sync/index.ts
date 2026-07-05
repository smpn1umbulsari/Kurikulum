/**
 * Sync Services - SIKAD v4.0
 * Centralized exports for all sync-related services.
 */

// Table mapping
export {
  DEXIE_TO_SUPABASE,
  SUPABASE_TO_DEXIE,
  TABLES_WITH_DELTA_SYNC,
  TABLE_DISPLAY_NAMES,
  SYNC_TABLES,
  getSupabaseTableName,
  getDexieTableName,
  hasDeltaSync,
  getTableDisplayName,
} from './tableMap';

// Sync Engine (manual push/pull via UI)
export { syncEngine, SyncEngine } from './SyncEngine';
export type { SyncResult, PullResult } from './SyncEngine';

// Sync Manager (background auto-sync worker)
export { SyncManager } from './SyncManager';

// Queue operations
export { queueOperation } from './queueOperation';
