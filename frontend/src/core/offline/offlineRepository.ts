/**
 * OfflineRepository
 *
 * Unified single source of truth for all application data reads and writes.
 * Reads and writes hit the local database immediately (zero latency), queue offline
 * actions, and trigger background synchronization seamlessly when online.
 */

import { sqliteService } from "./sqliteService";
import { queueService } from "./queueService";
import { supabaseRepository } from "./supabaseRepository";
import { connectivityService } from "./connectivityService";
import { processSyncQueue } from "./syncService";
import { v4 as uuidv4 } from "uuid";

class OfflineRepository {
  /**
   * Reads data for a table. Always returns local records immediately.
   * Hydrates local DB from Supabase asynchronously when online.
   */
  async query<T = any>(table: string, userId: string): Promise<T[]> {
    // 1. Instant local read
    const localData = await sqliteService.getAll<T>(table, userId);

    // 2. Background sync hydration if online
    if (connectivityService.getState().status === 'online') {
      this.hydrateFromRemote(table, userId).catch(err => {
        console.warn(`[OfflineRepository] Remote hydration skipped for ${table}:`, err.message);
      });
    }

    return localData;
  }

  /**
   * Reads a single record by ID.
   */
  async getById<T = any>(table: string, recordId: string): Promise<T | null> {
    return sqliteService.getById<T>(recordId);
  }

  /**
   * Saves a record (insert or update).
   * Writes to local database instantly, enqueues offline mutation, and triggers sync if online.
   */
  async save<T extends { id?: string; [key: string]: any }>(
    table: string,
    userId: string,
    record: T
  ): Promise<T> {
    const isNew = !record.id;
    const recordId = record.id || uuidv4();
    const updatedAt = record.updated_at || new Date().toISOString();

    const fullRecord = {
      ...record,
      id: recordId,
      user_id: record.user_id || userId,
      updated_at: updatedAt
    };

    // 1. Instant local write
    await sqliteService.upsert(table, userId, fullRecord);

    // 2. Enqueue sync operation
    await queueService.enqueue(
      userId,
      table,
      isNew ? 'insert' : 'update',
      recordId,
      fullRecord
    );

    // 3. Trigger background sync if online
    if (connectivityService.getState().status === 'online') {
      processSyncQueue(userId).catch(() => {});
    }

    return fullRecord as T;
  }

  /**
   * Deletes a record by ID.
   * Deletes from local database instantly, enqueues delete mutation, and triggers sync if online.
   */
  async delete(table: string, userId: string, recordId: string): Promise<void> {
    // 1. Instant local delete
    await sqliteService.delete(recordId);

    // 2. Enqueue delete operation
    await queueService.enqueue(userId, table, 'delete', recordId, { id: recordId });

    // 3. Trigger background sync if online
    if (connectivityService.getState().status === 'online') {
      processSyncQueue(userId).catch(() => {});
    }
  }

  /**
   * Hydrates local SQLite database from remote Supabase table.
   */
  private async hydrateFromRemote(table: string, userId: string): Promise<void> {
    try {
      const remoteRecords = await supabaseRepository.fetch(table, userId);
      if (Array.isArray(remoteRecords) && remoteRecords.length > 0) {
        await sqliteService.upsertBatch(table, userId, remoteRecords);
      }
    } catch (e) {
      // Ignore transient network failures during hydration
    }
  }
}

export const offlineRepository = new OfflineRepository();
