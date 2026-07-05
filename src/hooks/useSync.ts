/**
 * useSync — SIKAD v4.0
 * React hook for interacting with the SyncEngine.
 *
 * Provides:
 * - Current sync state (online, syncing, pending count, last sync time)
 * - `sinkron()` — push local queue to Supabase (triggered manually)
 * - `tarikData()` — pull cloud data into local IndexedDB (triggered manually)
 * - `abort()` — cancel an in-flight sync
 *
 * Auto-initializes:
 * - Online/offline listeners (updates `isOnline` in the store)
 * - Pending count refresh on mount and on reconnect
 */

import { useCallback, useEffect, useRef } from 'react';
import { syncEngine } from '../services/sync/SyncEngine';
import { useSyncStore } from '../store/syncStore';

export function useSync() {
  const store = useSyncStore();
  const abortRef = useRef(false);

  // ─── Online / offline listeners ──────────────────────────────────────────────

  useEffect(() => {
    const syncStore = useSyncStore.getState();

    const handleOnline = () => {
      syncStore.setOnline(true);
      syncEngine.refreshPendingCount();
    };

    const handleOffline = () => {
      syncStore.setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialise online state from navigator
    syncStore.setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Refresh pending count on mount ─────────────────────────────────────────

  useEffect(() => {
    syncEngine.refreshPendingCount();
  }, []);

  // ─── Sinkron (Push) ─────────────────────────────────────────────────────────

  /**
   * Push all pending local changes to Supabase.
   * Automatically refreshes the pending count afterward.
   */
  const sinkron = useCallback(async () => {
    const result = await syncEngine.push();
    await syncEngine.refreshPendingCount();
    return result;
  }, []);

  // ─── Tarik Data (Pull) ──────────────────────────────────────────────────────

  /**
   * Pull the latest cloud data into local IndexedDB.
   */
  const tarikData = useCallback(async () => {
    return syncEngine.pull();
  }, []);

  // ─── Abort ─────────────────────────────────────────────────────────────────

  /**
   * Abort any in-flight push or pull operation.
   */
  const abort = useCallback(() => {
    abortRef.current = true;
    syncEngine.abort();
  }, []);

  return {
    isOnline: store.isOnline,
    isSyncing: store.isSyncing,
    pendingCount: store.pendingCount,
    lastSyncAt: store.lastSyncAt,
    lastPullAt: store.lastPullAt,
    sinkron,
    tarikData,
    abort,
  };
}
