/**
 * SyncManager - SIKAD v4.0
 * Handles offline sync queue processing, exponential backoff retries, and conflict detection
 */

import { db } from '../../database/dexie/schema';
import { supabase } from '../../infrastructure/supabase/client';
import { useSyncStore } from '../../store/syncStore';
import { syncEngine } from './SyncEngine';
import type { SyncQueueItem, ConflictItem } from '@/types';

export class SyncManager {
  private static isProcessing = false;
  private static syncTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize online/offline listeners
   */
  static init() {
    window.addEventListener('online', () => {
      const syncStore = useSyncStore.getState();
      syncStore.setOnline(true);
      this.triggerSync(1000);
    });

    window.addEventListener('offline', () => {
      const syncStore = useSyncStore.getState();
      syncStore.setOnline(false);
    });

    // Initial check
    const online = navigator.onLine;
    useSyncStore.getState().setOnline(online);

    // Register device health in background (optional - won't break app if edge function doesn't exist)
    if (online) {
      this.registerDevice().catch((err) => {
        // Silently handle - device registration is optional
        console.debug('[SyncManager] Device registration skipped:', err instanceof Error ? err.message : 'Unknown');
      });
    }
  }

  /**
   * Register unique device ID and app health status
   */
  private static async registerDevice(): Promise<void> {
    let deviceId = localStorage.getItem('sikad-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('sikad-device-id', deviceId);
    }

    try {
      const { error } = await supabase.functions.invoke('monitoring-api', {
        method: 'POST',
        body: {
          device_id: deviceId,
          app_version: '4.0.0',
          status: 'HEALTHY',
          action: 'device-update',
        },
      });

      if (error) {
        // Edge function might not exist yet - that's OK, just log
        console.warn('[SyncManager] Device registration skipped (edge function not deployed):', error.message);
      }
    } catch (e) {
      // Network error or edge function not found - not critical, skip silently
      console.warn('[SyncManager] Device registration skipped:', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  /**
   * Debounced sync trigger called by repositories when data changes.
   * Refreshes pendingCount immediately so the UI reflects the updated queue,
   * then schedules processQueue() to handle the actual network push.
   */
  static triggerSync(delayMs = 5000) {
    // Immediately refresh the pending count in the store so the Sinkron
    // button becomes enabled right after a save/import (no waiting for
    // processQueue to run 5 seconds later).
    syncEngine.refreshPendingCount().catch((err) =>
      console.error('[SyncManager] refreshPendingCount failed:', err)
    );

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.processQueue().catch((err) =>
        console.error('[SyncManager] Background sync trigger failed:', err)
      );
    }, delayMs);
  }

  /**
   * Main worker loop that processes pending items in the IndexedDB sync queue
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const syncStore = useSyncStore.getState();
    const online = navigator.onLine;
    syncStore.setOnline(online);

    if (!online) {
      return;
    }

    // Retrieve all pending queue items sorted by creation order
    const pendingItems = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .sortBy('created_at');

    if (pendingItems.length === 0) {
      syncStore.setPendingCount(0);
      return;
    }

    this.isProcessing = true;
    syncStore.setSyncing(true);
    syncStore.setPendingCount(pendingItems.length);

    try {
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i] as SyncQueueItem;

        // Check if retry is scheduled for future
        if (item.next_retry_at && new Date(item.next_retry_at) > new Date()) {
          continue;
        }
        
        // Update store progress indicator
        const progress = Math.round(((i + 1) / pendingItems.length) * 100);
        syncStore.setSyncProgress(progress);

        // Mark as syncing in Dexie
        await db.syncQueue.update(item.id, { status: 'SYNCING' });

        try {
          let hasConflict = false;
          
          if (item.operation !== 'DELETE') {
            // Check for conflict: fetch current version on cloud
            const { data: cloudRecord, error: fetchError } = await supabase
              .from(item.table_name)
              .select('*')
              .eq('id', item.record_id)
              .maybeSingle();

            if (!fetchError && cloudRecord) {
              const localUpdatedAt = new Date((item.payload.updated_at as string) || 0);
              const cloudUpdatedAt = new Date((cloudRecord.updated_at as string) || 0);

              // Conflict: cloud record is newer than local
              if (cloudUpdatedAt > localUpdatedAt) {
                hasConflict = true;
                
                // Add conflict record
                const conflictItem: ConflictItem = {
                  id: crypto.randomUUID(),
                  table_name: item.table_name,
                  record_id: item.record_id,
                  local_data: item.payload,
                  cloud_data: cloudRecord,
                  resolved: false,
                  created_at: new Date().toISOString(),
                };

                await db.conflicts.put(conflictItem);
                await db.syncQueue.update(item.id, { status: 'CONFLICT' });
                
                // Increment conflicts count in store
                syncStore.setPendingCount(syncStore.pendingCount - 1);
                console.warn(`[SyncManager] Conflict detected on table ${item.table_name} for record ${item.record_id}`);
              }
            }
          }

          if (hasConflict) {
            continue;
          }

          // Execute operation
          let resultError = null;
          if (item.operation === 'DELETE') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id);
            resultError = error;
          } else {
            const { error } = await supabase
              .from(item.table_name)
              .upsert(item.payload);
            resultError = error;
          }

          if (resultError) {
            throw resultError;
          }

          // Mark as successfully synced in local DB and clean up queue
          await db.syncQueue.delete(item.id);
        } catch (itemError) {
          console.error(`[SyncManager] Failed to sync queue item ${item.id}:`, itemError);
          
          const err = itemError as { message?: string };
          const nextRetryCount = item.retry_count + 1;
          const nextRetryDelay = Math.pow(2, nextRetryCount) * 1000; // Exponential backoff in ms
          const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

          await db.syncQueue.update(item.id, { 
            status: 'FAILED',
            retry_count: nextRetryCount,
            last_error: err.message || 'Unknown network error',
            next_retry_at: nextRetryAt
          });
          
          // Increment global error count
          syncStore.setErrorCount(syncStore.errorCount + 1);
        }
      }

      syncStore.setLastSyncAt(new Date().toISOString());
      
      // Re-fetch remaining pending items count
      const remainingCount = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .count();
      syncStore.setPendingCount(remainingCount);

    } catch (globalError) {
      console.error('[SyncManager] Critical sync queue worker failure:', globalError);
    } finally {
      this.isProcessing = false;
      syncStore.setSyncing(false);
    }
  }
}
