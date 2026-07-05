# MAKE-PLAN: SIKAD v4.0 — Sync Engine: Sinkron (Push) & Tarik Data (Pull)

**Created:** 2026-07-04
**Orchestrator:** make-plan

---

## Primary User

Indonesian school administrators (guru, admin, kepala sekolah) who work **offline-first** on a local device and need to push their local changes to Supabase (sinkron) and pull the latest cloud data when online (tarik data).

## Primary Task

**Sinkron (Push):** When online, push all pending local operations (INSERT/UPDATE/DELETE) from the IndexedDB sync queue to Supabase — so data is backed up and shareable across devices.

**Tarik Data (Pull):** When online, fetch the latest records from Supabase and update local IndexedDB — so the local app reflects the most recent cloud state.

---

## Non-Goals (do not implement these now)

- Real-time SSE/WebSocket subscriptions (live sync)
- Auto-sync on network restore (automatic background sync)
- Multi-user conflict merging strategies beyond "local wins" / "cloud wins"
- Sync of binary/attachment files
- Selective per-table sync
- Conflict detection during pull (compare timestamps only, not deep diff)

---

## Reference Principles to Optimize For

1. **Resilient (#8 thorough)** — Every network call must handle timeout, abort, and retry gracefully. No silent failures.
2. **Honest (#6)** — The sync status must always reflect reality. Never claim "synced" if the push failed.
3. **Offline-first** — The app must work identically when offline. Network is an enhancement, not a requirement.

---

## PHASE 1: SyncEngine Core — Push (Sinkron) & Pull (Tarik)

### 1.1 — Create `src/services/sync/SyncEngine.ts`

**Existing infrastructure to leverage:**
- `src/infrastructure/supabase/client.ts` — `supabase` client (already configured)
- `src/database/dexie/schema.ts` — `db` (Dexie instance with all tables)
- `src/types/index.ts` — `SyncQueueItem` type (id, table_name, record_id, operation, payload, status, retry_count)
- `src/store/syncStore.ts` — `useSyncStore` (isOnline, isSyncing, pendingCount, lastSyncAt, setSyncing, setPendingCount, setLastSyncAt)
- `supabase/migrations/1200_sync_queue.sql` — `sync_queue` table in Supabase
- `supabase/migrations/1205_sync_functions.sql` — `push_to_sync_queue()` function

**Table-to-supabase mapping** (derive from Dexie table names):
```typescript
const TABLE_MAP: Record<string, string> = {
  gurus: 'gurus',
  siswas: 'siswas',
  kelass: 'kelass',
  mataPelajarans: 'mata_pelajarans',
  academicTerms: 'academic_terms',
  pembagianMengajars: 'pembagian_mengajars',
  assessments: 'assessments',
  assessmentDetails: 'assessment_details',
  catatanWaliKelass: 'catatan_wali_kelass',
  raporSnapshots: 'rapor_snapshots',
  tugasTambahans: 'tugas_tambahans',
  calendarEvents: 'calendar_events',
  examRooms: 'exam_rooms',
};
```

**File:** `src/services/sync/SyncEngine.ts`

```typescript
import { supabase } from '../../infrastructure/supabase/client';
import { db } from '../../database/dexie/schema';
import { useSyncStore } from '../../store/syncStore';
import type { SyncQueueItem } from '@/types';

const TABLE_MAP: Record<string, string> = { /* as above */ };
const SYNC_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export type SyncResult = {
  pushed: number;
  failed: number;
  conflicts: number;
};

class SyncEngine {
  private abortController: AbortController | null = null;

  // ─── PUSH (Sinkron) ───────────────────────────────────────
  // Reads pending items from Dexie syncQueue, pushes to Supabase

  async push(options?: { onProgress?: (done: number, total: number) => void }): Promise<SyncResult> {
    const store = useSyncStore.getState();
    if (!store.isOnline) return { pushed: 0, failed: 0, conflicts: 0 };

    store.setSyncing(true);
    this.abortController = new AbortController();

    let pushed = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // 1. Get all PENDING items from Dexie
      const pending: SyncQueueItem[] = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      if (pending.length === 0) {
        store.setSyncing(false);
        store.setLastSyncAt(new Date().toISOString());
        return { pushed: 0, failed: 0, conflicts: 0 };
      }

      // 2. Process in batches
      for (let i = 0; i < pending.length; i += SYNC_BATCH_SIZE) {
        if (this.abortController.signal.aborted) break;

        const batch = pending.slice(i, i + SYNC_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(item => this.pushItem(item))
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value === 'conflict') conflicts++;
            else pushed++;
          } else {
            failed++;
          }
        }

        options?.onProgress?.(Math.min(i + SYNC_BATCH_SIZE, pending.length), pending.length);
        store.setPendingCount(Math.max(0, pending.length - (pushed + conflicts)));
      }

      store.setLastSyncAt(new Date().toISOString());
      return { pushed, failed, conflicts };
    } catch (err) {
      console.error('[SyncEngine] push failed:', err);
      return { pushed, failed, conflicts };
    } finally {
      store.setSyncing(false);
      this.abortController = null;
    }
  }

  private async pushItem(item: SyncQueueItem): Promise<'ok' | 'conflict' | 'error'> {
    const supabaseTable = TABLE_MAP[item.table_name];
    if (!supabaseTable) return 'error';

    const recordId = item.record_id;

    try {
      if (item.operation === 'INSERT') {
        const { error } = await supabase
          .from(supabaseTable)
          .insert({ ...item.payload, id: recordId });

        if (error?.code === '23505') {
          // Duplicate key — record already exists, try UPDATE
          const { error: updateError } = await supabase
            .from(supabaseTable)
            .update(item.payload)
            .eq('id', recordId);
          if (updateError) throw updateError;
        } else if (error) {
          throw error;
        }
      } else if (item.operation === 'UPDATE') {
        const { error } = await supabase
          .from(supabaseTable)
          .update(item.payload)
          .eq('id', recordId);
        if (error) throw error;
      } else if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(supabaseTable)
          .delete()
          .eq('id', recordId);
        if (error) throw error;
      }

      // Success — remove from queue
      await db.syncQueue.delete(item.id);
      return 'ok';
    } catch (err) {
      // Mark as FAILED with retry
      const updatedRetryCount = item.retry_count + 1;
      if (updatedRetryCount >= MAX_RETRIES) {
        await db.syncQueue.update(item.id, {
          status: 'FAILED' as const,
          last_error: err instanceof Error ? err.message : 'Unknown error',
        });
        return 'error';
      } else {
        await db.syncQueue.update(item.id, {
          status: 'PENDING' as const,
          retry_count: updatedRetryCount,
          last_error: err instanceof Error ? err.message : 'Unknown error',
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });
        return 'error';
      }
    }
  }

  // ─── PULL (Tarik Data) ───────────────────────────────────
  // Fetches all records from Supabase and upserts into Dexie

  async pull(options?: { onProgress?: (done: number, total: number) => void }): Promise<{ pulled: number; errors: number }> {
    const store = useSyncStore.getState();
    if (!store.isOnline) return { pulled: 0, errors: 0 };

    store.setSyncing(true);
    this.abortController = new AbortController();

    try {
      let pulled = 0;
      let errors = 0;
      const tables = Object.keys(TABLE_MAP);

      for (let i = 0; i < tables.length; i++) {
        if (this.abortController.signal.aborted) break;

        const dexieTable = tables[i];
        const supabaseTable = TABLE_MAP[dexieTable];

        try {
          const { data, error } = await supabase
            .from(supabaseTable)
            .select('*');

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

      store.setLastSyncAt(new Date().toISOString());
      return { pulled, errors };
    } catch (err) {
      console.error('[SyncEngine] pull failed:', err);
      return { pulled: 0, errors: tables.length };
    } finally {
      store.setSyncing(false);
      this.abortController = null;
    }
  }

  abort() {
    this.abortController?.abort();
  }

  // ─── COUNT PENDING ──────────────────────────────────────
  async refreshPendingCount(): Promise<number> {
    const count = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .count();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }
}

export const syncEngine = new SyncEngine();
```

**Anti-pattern guards:**
- Do NOT call `supabase.auth.getSession()` — use anonymous key auth (already configured)
- Do NOT process DELETE operations before INSERT/UPDATE — order matters
- Do NOT call `pull()` if `isOnline` is false — check store state first
- Do NOT use `Promise.all` for more than 50 concurrent Supabase requests — use batching

### 1.2 — Create `src/hooks/useSync.ts`

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { syncEngine } from '../services/sync/SyncEngine';
import { useSyncStore } from '../store/syncStore';

export function useSync() {
  const store = useSyncStore();

  // Refresh pending count on mount and when coming online
  useEffect(() => {
    syncEngine.refreshPendingCount();

    const handleOnline = () => {
      syncEngine.refreshPendingCount();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const sinkron = useCallback(async () => {
    const result = await syncEngine.push();
    await syncEngine.refreshPendingCount();
    return result;
  }, []);

  const tarikData = useCallback(async () => {
    const result = await syncEngine.pull();
    return result;
  }, []);

  const abort = useCallback(() => {
    syncEngine.abort();
  }, []);

  return {
    isOnline: store.isOnline,
    isSyncing: store.isSyncing,
    pendingCount: store.pendingCount,
    lastSyncAt: store.lastSyncAt,
    sinkron,
    tarikData,
    abort,
  };
}
```

---

## PHASE 2: Sync Toolbar Integration

### 2.1 — Create `src/components/sync/SyncToolbar.tsx`

Add two buttons to the existing toolbar in `src/app/layouts/MainLayout.tsx`.

**Button design:**
- **Sinkron (Push):** Upload icon + "Sinkron" + pending count badge (if > 0)
- **Tarik Data (Pull):** Download icon + "Tarik Data"
- Both disabled when `isSyncing` or `!isOnline`
- On click: show inline progress (spinner replaces icon)
- On success: show toast with count ("3 data berhasil disinkronkan", "12 data berhasil ditarik")

**File:** `src/components/sync/SyncToolbar.tsx`

```tsx
import { useSync } from '../../hooks/useSync';
import { toast } from '../../store/toastStore';
import { Upload, Download, Loader2 } from 'lucide-react';

export function SyncToolbar() {
  const { isOnline, isSyncing, pendingCount, sinkron, tarikData } = useSync();

  const handleSinkron = async () => {
    if (!isOnline) { toast.warning('Tidak ada koneksi internet'); return; }
    const result = await sinkron();
    if (result.pushed > 0) {
      toast.success(`${result.pushed} data berhasil disinkronkan ke cloud`);
    } else if (result.pushed === 0 && result.failed === 0) {
      toast.info('Semua data sudah sinkron');
    } else if (result.failed > 0) {
      toast.error(`${result.failed} data gagal disinkronkan`);
    }
  };

  const handleTarikData = async () => {
    if (!isOnline) { toast.warning('Tidak ada koneksi internet'); return; }
    const result = await tarikData();
    if (result.pulled > 0) {
      toast.success(`${result.pulled} data berhasil ditarik dari cloud`);
    } else if (result.errors > 0) {
      toast.warning(`${result.errors} tabel gagal ditarik`);
    } else {
      toast.info('Tidak ada data baru dari cloud');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sinkron (Push) */}
      <button
        onClick={handleSinkron}
        disabled={isSyncing || !isOnline}
        title={isOnline ? 'Kirim data lokal ke cloud' : 'Offline'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          !isOnline
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : pendingCount > 0
              ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
              : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
        }`}
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        Sinkron
        {pendingCount > 0 && !isSyncing && (
          <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Tarik Data (Pull) */}
      <button
        onClick={handleTarikData}
        disabled={isSyncing || !isOnline}
        title={isOnline ? 'Ambil data terbaru dari cloud' : 'Offline'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          !isOnline
            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
        }`}
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Tarik Data
      </button>
    </div>
  );
}
```

### 2.2 — Mount in MainLayout toolbar

In `src/app/layouts/MainLayout.tsx`, add `<SyncToolbar />` next to the sync status badge area.

Read the existing toolbar area (`MainLayout.tsx:193–237`) and insert `<SyncToolbar />` between the active term indicator and the sync status row.

---

## PHASE 3: Auto-Queue on Local Write

### 3.1 — Create `src/services/sync/queueOperation.ts`

When any local data is saved/updated/deleted via Dexie, automatically add a `SyncQueueItem` to the queue.

```typescript
import { db } from '../../database/dexie/schema';
import { syncEngine } from './SyncEngine';
import type { SyncQueueItem } from '@/types';

const DEXIE_TO_QUEUE_TABLE: Record<string, string> = {
  gurus: 'gurus',
  siswas: 'siswas',
  kelass: 'kelass',
  // ... same as TABLE_MAP in SyncEngine
};

export async function queueOperation(
  dexieTableName: string,
  recordId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    table_name: DEXIE_TO_QUEUE_TABLE[dexieTableName] ?? dexieTableName,
    record_id: recordId,
    operation,
    payload,
    status: 'PENDING',
    retry_count: 0,
    created_at: new Date().toISOString(),
  };

  await db.syncQueue.add(queueItem);
  // Refresh pending count in store
  await syncEngine.refreshPendingCount();
}
```

### 3.2 — Integrate into each repository

The simplest integration point is the Dexie `useLokalRepository` pattern (if it exists) or wrapping the Dexie `put`/`delete` calls in a repository.

**Audit where local writes happen** — grep for `db.[table].put` and `db.[table].delete` across repositories:

```
Expected call sites to wrap with queueOperation():
- GuruRepository: save/update/delete
- SiswaRepository: save/update/delete
- KelasRepository: save/update/delete
- MataPelajaranRepository: save/update/delete
- AssessmentRepository: save/update/delete
- AcademicTermRepository: save/update/delete
- PembagianMengajarRepository: save/update/delete
- etc.
```

For each `db.table.put()` and `db.table.delete()`, wrap the call:

**Before:**
```typescript
await db.gurus.put(guru);
```

**After:**
```typescript
const operation = existing ? 'UPDATE' : 'INSERT';
await queueOperation('gurus', guru.id, operation, guru);
```

**Anti-pattern guard:**
- Do NOT queue read operations (`.toArray()`, `.get()`)
- Do NOT queue `clear()` or `bulkDelete()` — only individual record operations
- The queue is per-record, not per-batch

---

## PHASE 4: Last-Sync Timestamp in Supabase Metadata

**Evidence:** Supabase has no `updated_at` column tracking for per-record delta sync.

**Move:** After a successful pull, store the sync timestamp in Supabase `sync_metadata` table so next pull only fetches changed records.

**Add to `SyncEngine.pull()`:**
```typescript
// After pulling all tables, update last_sync timestamp
await supabase.from('sync_metadata').upsert({
  key: 'last_pull_at',
  value: new Date().toISOString(),
});
```

**Modify pull queries to filter by `updated_at`:**
```typescript
// For each table, append:
.updated_at.gt(lastPullAt ?? '1970-01-01')
```

---

## PHASE 5: Error Boundary & Retry

### 5.1 — Retry button on failed queue items

In `MonitoringCenterPage.tsx`, add a "Coba Lagi" button per failed `SyncQueueItem`.

### 5.2 — Clear failed items

Add "Hapus Semua Gagal" to the monitoring center to purge items that exceeded `MAX_RETRIES`.

---

## Implementation Order

| Phase | Priority | Reason |
|-------|----------|--------|
| Phase 1 | 1st | Core engine — everything else depends on it |
| Phase 2 | 2nd | UI buttons — makes sync visible and actionable |
| Phase 3 | 3rd | Auto-queue — without this, the queue stays empty |
| Phase 4 | 4th | Delta sync — performance optimization, not critical path |
| Phase 5 | 5th | Error recovery — polish |

---

## Anti-Patterns to Guard Against

- **Do NOT push to Supabase without going through the queue** — always queue first, then push from queue
- **Do NOT pull without checking `isOnline`** — prevent wasted network requests
- **Do NOT ignore `retry_count`** — failed items must be retried, not silently dropped
- **Do NOT use `bulkUpsert` without `onConflict`** — individual upserts are safer for offline-first
- **Do NOT sync all tables on every pull** — implement delta sync (Phase 4) before this becomes slow
- **Do NOT forget to call `refreshPendingCount()` after any queue mutation**
