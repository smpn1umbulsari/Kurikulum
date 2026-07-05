/**
 * BaseRepository - SIKAD v4.0
 * Generic offline-first repository class wrapping Dexie operations and Sync Queueing
 */

import { db } from '../dexie/schema';
import type { Table } from 'dexie';
import type { SyncQueueItem } from '@/types';

export class BaseRepository<T extends { id: string; deleted_at?: string | null; deleted_by?: string | null }> {
  constructor(
    protected table: Table<T, string>,
    protected tableName: string
  ) {}

  /**
   * Find a record by its unique ID in local DB
   */
  async getById(id: string): Promise<T | undefined> {
    const record = await this.table.get(id);
    // Ignore soft-deleted records by default
    if (record && record.deleted_at) {
      return undefined;
    }
    return record;
  }

  /**
   * Fetch all non-soft-deleted records in local DB
   */
  async getAll(): Promise<T[]> {
    return (await this.table.toArray()).filter((record) => !record.deleted_at);
  }

  /**
   * Save (Insert/Update) a record in IndexedDB and queue it in Sync Queue
   * @param data The entity to save
   * @param isSyncPayload Set to true if this operation is triggered by the sync worker (prevents looping)
   */
  async save(data: T, isSyncPayload = false): Promise<void> {
    // Determine operation type BEFORE writing to database
    let operation: 'INSERT' | 'UPDATE' = 'INSERT';
    if (!isSyncPayload) {
      const existing = await this.table.get(data.id);
      if (existing) {
        operation = 'UPDATE';
      }
    }

    // 1. Write to local Dexie
    await this.table.put(data);

    // 2. Queue in Sync Queue
    if (!isSyncPayload) {
      const queueItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        table_name: this.tableName,
        record_id: data.id,
        operation,
        payload: data as unknown as Record<string, unknown>,
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      };

      await db.syncQueue.put(queueItem);
    }
  }

  /**
   * Hard delete a record in IndexedDB and queue delete operation
   */
  async delete(id: string, isSyncPayload = false): Promise<void> {
    // 1. Delete from local Dexie
    await this.table.delete(id);

    // 2. Queue in Sync Queue
    if (!isSyncPayload) {
      const queueItem: SyncQueueItem = {
        id: crypto.randomUUID(),
        table_name: this.tableName,
        record_id: id,
        operation: 'DELETE',
        payload: { id },
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString(),
      };

      await db.syncQueue.put(queueItem);
    }
  }

  /**
   * Soft delete a record by setting updated timestamp and deleted_at flag
   */
  async softDelete(id: string, deletedBy: string, isSyncPayload = false): Promise<void> {
    const record = await this.table.get(id);
    if (!record) return;

    record.deleted_at = new Date().toISOString();
    record.deleted_by = deletedBy;

    await this.save(record, isSyncPayload);
  }
}
