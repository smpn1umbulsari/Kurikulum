/**
 * queueOperation — SIKAD v4.0
 * Appends a local write operation to the IndexedDB sync queue.
 *
 * Call this immediately after any Dexie put/add/delete that is NOT
 * triggered by the sync worker (i.e. not `isSyncPayload`).
 *
 * Anti-pattern guards:
 * - Do NOT call this for read operations (.toArray, .get)
 * - Do NOT call this for clear() or bulkDelete() — only individual records
 * - The queue is per-record, not per-batch
 */

import { db } from '../../database/dexie/schema';
import { syncEngine } from './SyncEngine';
import { getSupabaseTableName } from './tableMap';
import type { SyncQueueItem } from '@/types';

export async function queueOperation(
  /** Dexie table property name, e.g. 'examRooms', 'examSeats' */
  dexieTableName: string,
  recordId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    table_name: getSupabaseTableName(dexieTableName),
    record_id: recordId,
    operation,
    payload,
    status: 'PENDING',
    retry_count: 0,
    created_at: new Date().toISOString(),
  };

  await db.syncQueue.add(queueItem);
  await syncEngine.refreshPendingCount();
}
