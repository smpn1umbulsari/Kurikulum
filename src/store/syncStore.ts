/**
 * Sync Store - SIKAD v4.0
 * Zustand store for offline sync state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ConflictItem } from '@/types';

// ============ STATE TYPE ============

export interface SyncState {
  // Sync status
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastPullAt: string | null; // Timestamp of last successful pull — used for delta sync filtering
  syncProgress: number; // 0-100

  // Queue stats
  pendingCount: number;
  errorCount: number;

  // Conflicts
  conflicts: ConflictItem[];
  hasUnresolvedConflicts: boolean;

  // Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: number) => void;
  setLastSyncAt: (timestamp: string | null) => void;
  setLastPullAt: (timestamp: string | null) => void;
  setPendingCount: (count: number) => void;
  setErrorCount: (count: number) => void;
  addConflict: (conflict: ConflictItem) => void;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merged') => void;
  clearConflicts: () => void;
  reset: () => void;
}

// ============ STORE ============

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      // Initial state
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncAt: null,
      lastPullAt: null,
      syncProgress: 0,
      pendingCount: 0,
      errorCount: 0,
      conflicts: [],
      hasUnresolvedConflicts: false,

      // Actions
      setOnline: (isOnline: boolean) => set({ isOnline }),

      setSyncing: (isSyncing: boolean) =>
        set({
          isSyncing,
          syncProgress: isSyncing ? 0 : 100,
        }),

      setSyncProgress: (syncProgress: number) => set({ syncProgress }),

      setLastSyncAt: (lastSyncAt: string | null) => set({ lastSyncAt }),

      setLastPullAt: (lastPullAt: string | null) => set({ lastPullAt }),

      setPendingCount: (pendingCount: number) => set({ pendingCount }),

      setErrorCount: (errorCount: number) => set({ errorCount }),

      addConflict: (conflict: ConflictItem) =>
        set((state: SyncState) => ({
          conflicts: [...state.conflicts, conflict],
          hasUnresolvedConflicts: true,
        })),

      resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merged') =>
        set((state: SyncState) => {
          const updatedConflicts = state.conflicts.map((c: ConflictItem) =>
            c.id === conflictId
              ? { ...c, resolved_at: new Date().toISOString(), resolution }
              : c
          );
          const hasUnresolved = updatedConflicts.some(
            (c: ConflictItem) => !c.resolved_at
          );
          return {
            conflicts: updatedConflicts,
            hasUnresolvedConflicts: hasUnresolved,
          };
        }),

      clearConflicts: () =>
        set({
          conflicts: [],
          hasUnresolvedConflicts: false,
        }),

      reset: () =>
        set({
          isOnline: navigator.onLine,
          isSyncing: false,
          lastSyncAt: null,
          lastPullAt: null,
          syncProgress: 0,
          pendingCount: 0,
          errorCount: 0,
          conflicts: [],
          hasUnresolvedConflicts: false,
        }),
    }),
    {
      name: 'sikad-sync',
      storage: createJSONStorage(() => localStorage),
      partialize: (state: SyncState) => ({
        lastSyncAt: state.lastSyncAt,
        lastPullAt: state.lastPullAt,
        conflicts: state.conflicts,
        hasUnresolvedConflicts: state.hasUnresolvedConflicts,
      }),
    }
  )
);

// ============ SELECTORS ============

export const selectIsOnline = (state: SyncState) => state.isOnline;
export const selectIsSyncing = (state: SyncState) => state.isSyncing;
export const selectSyncProgress = (state: SyncState) => state.syncProgress;
export const selectPendingCount = (state: SyncState) => state.pendingCount;
export const selectConflicts = (state: SyncState) => state.conflicts;
export const selectHasConflicts = (state: SyncState) => state.hasUnresolvedConflicts;

// ============ HELPERS ============

/**
 * Format last sync time as relative string
 */
export function getLastSyncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Belum pernah sync';

  const diff = Date.now() - new Date(lastSyncAt).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/**
 * Get sync status label
 */
export function getSyncStatusLabel(state: SyncState): string {
  if (!state.isOnline) return 'Offline';
  if (state.isSyncing) return `Syncing... ${state.syncProgress}%`;
  if (state.hasUnresolvedConflicts) return `${state.conflicts.length} konflik`;
  if (state.pendingCount > 0) return `${state.pendingCount} pending`;
  return 'Synced';
}
