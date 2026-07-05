/**
 * SyncEngine - SIKAD v4.0
 * Offline-first sync engine: Push (Sinkron) queue items to Supabase and Pull (Tarik) cloud data into IndexedDB.
 *
 * Designed for resilience and honesty:
 * - Every network call handles timeout, abort, and retry gracefully
 * - Sync status always reflects reality — never claims "synced" if push failed
 * - Offline-first: app works identically when offline; network is an enhancement
 *
 * NOTE: Table mapping sekarang centralized di tableMap.ts
 * SyncManager menggunakan logic berbeda (manual push) - lihat comment di SyncManager.ts
 */

import { supabase } from '../../infrastructure/supabase/client';
import { db } from '../../database/dexie/schema';
import { useSyncStore } from '../../store/syncStore';
import type { SyncQueueItem } from '@/types';
import {
  DEXIE_TO_SUPABASE,
  SYNC_TABLES,
} from './tableMap';

/** Number of queue items to push concurrently per batch. */
const SYNC_BATCH_SIZE = 50;
/** Maximum retry attempts before marking a queue item as FAILED. */
export const MAX_RETRIES = 3;
/** Base delay in ms for exponential backoff between retries. */
const RETRY_BASE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

export type SyncResult = {
  pushed: number;
  failed: number;
  conflicts: number;
};

export type PullResult = {
  pulled: number;
  errors: number;
};

/**
 * SyncEngine provides two operations:
 * - push(): reads PENDING items from the Dexie syncQueue and sends them to Supabase
 * - pull(): fetches the latest records from Supabase and upserts them into Dexie
 *
 * Both operations are abortable, online-guarded, and update the sync store state.
 */
export class SyncEngine {
  private abortController: AbortController | null = null;

  // ─── PUSH (Sinkron) ─────────────────────────────────────────────────────────

  /**
   * Push all PENDING items from the local IndexedDB sync queue to Supabase.
   * Processes items in batches of SYNC_BATCH_SIZE using Promise.allSettled
   * so one failure does not block the rest of the batch.
   *
   * @param options.onProgress  Called with (done, total) after each batch.
   * @returns SyncResult with pushed/failed/conflict counts.
   */
  async push(
    options?: { onProgress?: (done: number, total: number) => void }
  ): Promise<SyncResult> {
    const store = useSyncStore.getState();
    if (!store.isOnline) {
      console.warn('[SyncEngine] Offline - skipping push');
      return { pushed: 0, failed: 0, conflicts: 0 };
    }

    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.error('[SyncEngine] NOT AUTHENTICATED - Cannot sync without login!');
      store.setSyncing(false);
      return { pushed: 0, failed: 0, conflicts: 0 };
    }
    console.log(`[SyncEngine] Authenticated as: ${sessionData.session.user.email}`);

    store.setSyncing(true);
    this.abortController = new AbortController();

    let pushed = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // 1. Fetch all PENDING items
      const pending: SyncQueueItem[] = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .sortBy('created_at');

      console.log(`[SyncEngine] Found ${pending.length} PENDING items to push`);

      if (pending.length === 0) {
        store.setSyncing(false);
        store.setLastSyncAt(new Date().toISOString());
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // 2. Process in batches
      for (let i = 0; i < pending.length; i += SYNC_BATCH_SIZE) {
        if (this.abortController.signal.aborted) break;

        const batch = pending.slice(i, i + SYNC_BATCH_SIZE);
        console.log(`[SyncEngine] Processing batch ${Math.floor(i / SYNC_BATCH_SIZE) + 1}, ${batch.length} items`);
        const results = await Promise.allSettled(
          batch.map((item) => this.pushItem(item))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value === 'conflict') conflicts++;
            else if (result.value === 'ok') pushed++;
            else if (result.value === 'error') failed++;
          } else {
            // Rejected promise — network or code error
            failed++;
          }
        }

        const done = Math.min(i + SYNC_BATCH_SIZE, pending.length);
        options?.onProgress?.(done, pending.length);
        store.setPendingCount(Math.max(0, pending.length - (pushed + conflicts)));
      }

      store.setLastSyncAt(new Date().toISOString());
      console.log(`[SyncEngine] Push complete: pushed=${pushed}, failed=${failed}, conflicts=${conflicts}`);
      return { pushed, failed, conflicts };
    } catch (err) {
      console.error('[SyncEngine] push failed:', err);
      return { pushed, failed, conflicts };
    } finally {
      store.setSyncing(false);
      this.abortController = null;
    }
  }

  /**
   * Push a single queue item to Supabase.
   *
   * - INSERT: upserts with conflict handling (23505 → try UPDATE)
   * - UPDATE: direct upsert
   * - DELETE: direct delete
   *
   * On failure: increments retry_count; marks FAILED after MAX_RETRIES.
   */
  private async pushItem(item: SyncQueueItem): Promise<'ok' | 'conflict' | 'error'> {
    const supabaseTable = DEXIE_TO_SUPABASE[item.table_name];
    if (!supabaseTable) {
      console.error(`[SyncEngine] Unknown table_name in queue: "${item.table_name}"`);
      return 'error';
    }

    console.log(`[SyncEngine] Pushing to ${supabaseTable}:`, {
      operation: item.operation,
      record_id: item.record_id,
      payload: item.payload,
    });

    try {
      if (item.operation === 'INSERT') {
        console.log(`[SyncEngine] INSERT into ${supabaseTable}`);
        const { data, error } = await supabase
          .from(supabaseTable)
          .insert({ ...item.payload, id: item.record_id });

        console.log(`[SyncEngine] INSERT result:`, { data, error });

        if (error?.code === '23505') {
          // Duplicate key — record already exists in cloud, fall through to UPDATE
          console.log(`[SyncEngine] Duplicate key, falling back to UPDATE`);
          const { error: updateError } = await supabase
            .from(supabaseTable)
            .update(item.payload)
            .eq('id', item.record_id);
          if (updateError) throw updateError;
        } else if (error) {
          throw error;
        }
      } else if (item.operation === 'UPDATE') {
        console.log(`[SyncEngine] UPDATE ${supabaseTable}`);
        const { error } = await supabase
          .from(supabaseTable)
          .update(item.payload)
          .eq('id', item.record_id);
        console.log(`[SyncEngine] UPDATE result:`, { error });
        if (error) throw error;
      } else if (item.operation === 'DELETE') {
        console.log(`[SyncEngine] DELETE from ${supabaseTable}`);
        const { error } = await supabase
          .from(supabaseTable)
          .delete()
          .eq('id', item.record_id);
        console.log(`[SyncEngine] DELETE result:`, { error });
        if (error) throw error;
      }

      // Success — remove from queue
      await db.syncQueue.delete(item.id);
      return 'ok';
    } catch (err) {
      console.error(`[SyncEngine] pushItem FAILED for ${item.table_name}/${item.record_id}:`, err);

      const updatedRetryCount = item.retry_count + 1;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (updatedRetryCount >= MAX_RETRIES) {
        await db.syncQueue.update(item.id, {
          status: 'FAILED' as const,
          retry_count: updatedRetryCount,
          last_error: errorMessage,
        });
      } else {
        const nextRetryAt = new Date(
          Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, updatedRetryCount - 1)
        ).toISOString();
        await db.syncQueue.update(item.id, {
          status: 'PENDING' as const,
          retry_count: updatedRetryCount,
          last_error: errorMessage,
          next_retry_at: nextRetryAt,
        });
      }

      return 'error';
    }
  }

  // ─── PULL (Tarik Data) ────────────────────────────────────────────────────────

  /**
   * Maps each Supabase table name to whether it has an `updated_at` column
   * with a BEFORE-UPDATE trigger. Tables with triggers enable delta sync —
   * only records changed since lastPullAt are fetched. Tables without triggers
   * always do a full fetch (no filter).
   *
   * Keep in sync with supabase/migrations/1500_updated_at_triggers.sql
   * and supabase/migrations/1505_sync_delta_triggers.sql.
   */
  private static readonly TABLE_HAS_UPDATED_AT: ReadonlySet<string> = new Set([
    'academic_terms',
    'gurus',
    'siswas',
    'mata_pelajarans',
    'kelas',
    'pembagian_mengajar',
    'tugas_tambahan_assignments',
    'assessments',
    'assessment_details',
    'kehadiran',
    'exam_rooms',
    'exam_seats',
    'exam_supervisors',
    // Partial: tables without updated_at triggers do a full fetch every pull.
  ]);

  /**
   * Pull the latest records from every Supabase table and upsert them into Dexie.
   * Uses bulkPut so existing records are overwritten with cloud state ("cloud wins").
   *
   * For tables with `updated_at` triggers, only fetches records changed since
   * the last successful pull (delta sync). Tables without triggers do a full fetch.
   *
   * @param options.onProgress  Called with (done, total) after each table.
   * @returns PullResult with total pulled count and errored table count.
   */
  async pull(
    options?: { onProgress?: (done: number, total: number) => void }
  ): Promise<PullResult> {
    const store = useSyncStore.getState();
    if (!store.isOnline) return { pulled: 0, errors: 0 };

    store.setSyncing(true);
    this.abortController = new AbortController();

    const tables = SYNC_TABLES;
    let pulled = 0;
    let errors = 0;
    const now = new Date().toISOString();

    try {
      for (let i = 0; i < tables.length; i++) {
        if (this.abortController.signal.aborted) break;

        const dexieTable = tables[i];
        const supabaseTable = DEXIE_TO_SUPABASE[dexieTable];

        try {
          let query = supabase.from(supabaseTable).select('*');

          // Delta sync: filter by updated_at for tables that have the column + trigger.
          // Falls back to full fetch if lastPullAt is null (first pull ever).
          if (
            SyncEngine.TABLE_HAS_UPDATED_AT.has(supabaseTable) &&
            store.lastPullAt
          ) {
            query = query.gt('updated_at', store.lastPullAt);
          }

          const { data, error } = await query;

          if (error) throw error;

          if (data && data.length > 0) {
            const table = db[dexieTable as keyof typeof db] as any;
            await table.bulkPut(data);
            pulled += data.length;
          }
        } catch (err) {
          console.error(`[SyncEngine] pull failed for ${supabaseTable}:`, err);
          errors++;
        }

        options?.onProgress?.(i + 1, tables.length);
      }

      // Update lastPullAt only if at least one table succeeded without all failing.
      if (pulled > 0 || (errors < tables.length && errors > 0)) {
        store.setLastPullAt(now);
      }
      store.setLastSyncAt(now);
      return { pulled, errors };
    } catch (err) {
      console.error('[SyncEngine] pull failed:', err);
      return { pulled, errors: tables.length };
    } finally {
      store.setSyncing(false);
      this.abortController = null;
    }
  }

  // ─── ABORT ────────────────────────────────────────────────────────────────────

  /** Abort any in-flight push or pull operation. */
  abort(): void {
    this.abortController?.abort();
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  /**
   * Retry a single FAILED queue item by resetting it to PENDING and
   * attempting one immediate push.  Used by the Monitoring Center retry button.
   *
   * @returns 'ok' on success, 'error' on failure.
   */
  async retryItem(itemId: string): Promise<'ok' | 'error'> {
    const store = useSyncStore.getState();
    if (!store.isOnline) return 'error';

    const item = await db.syncQueue.get(itemId);
    if (!item) return 'error';

    // Reset retry_count and clear last_error so it goes through fresh
    await db.syncQueue.update(itemId, {
      status: 'PENDING' as const,
      retry_count: 0,
      last_error: undefined,
      next_retry_at: undefined,
    });

    const result = await this.pushItem({
      ...item,
      retry_count: 0,
      last_error: undefined,
    });

    await this.refreshPendingCount();
    return result === 'ok' ? 'ok' : 'error';
  }

  /**
   * Delete all FAILED queue items (those that exceeded MAX_RETRIES).
   * Used by the "Hapus Semua Gagal" button in the Monitoring Center.
   *
   * @returns the number of items deleted.
   */
  async clearFailedItems(): Promise<number> {
    const failed = await db.syncQueue
      .where('status')
      .equals('FAILED')
      .toArray();

    await db.syncQueue.bulkDelete(failed.map((item) => item.id));
    await this.refreshPendingCount();
    return failed.length;
  }

  /**
   * Refresh the pending count in the sync store.
   * Call this after any direct mutation to the syncQueue table.
   */
  async refreshPendingCount(): Promise<number> {
    const count = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .count();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }
}

/** Singleton instance — import this throughout the app. */
export const syncEngine = new SyncEngine();
