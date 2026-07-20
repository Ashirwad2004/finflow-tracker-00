/**
 * SqliteService / DatabaseService
 *
 * Provides normalized, indexed local storage operations for all application entities.
 * Ensures zero-latency reads and writes when operating offline.
 */

import db, { LocalEntityRecord } from "./db";

class SqliteService {
  /**
   * Retrieves all records for a table belonging to a specific user.
   */
  async getAll<T = any>(table: string, userId: string): Promise<T[]> {
    try {
      const records = await db.entities
        .where('[table+user_id]')
        .equals([table, userId])
        .toArray();
      return records.map(r => r.data as T);
    } catch (e) {
      console.warn(`[SqliteService] Failed to read ${table} from local storage:`, e);
      return [];
    }
  }

  /**
   * Retrieves a single record by ID.
   */
  async getById<T = any>(recordId: string): Promise<T | null> {
    try {
      const record = await db.entities.get(recordId);
      return record ? (record.data as T) : null;
    } catch (e) {
      console.warn(`[SqliteService] Failed to read record ${recordId}:`, e);
      return null;
    }
  }

  /**
   * Inserts or updates a single record locally.
   */
  async upsert(table: string, userId: string, data: any): Promise<void> {
    if (!data || !data.id) return;
    const updatedAt = data.updated_at || new Date().toISOString();
    
    const record: LocalEntityRecord = {
      id: data.id,
      user_id: userId,
      table,
      updated_at: updatedAt,
      data: { ...data, updated_at: updatedAt }
    };

    await db.entities.put(record);
  }

  /**
   * Bulk inserts or updates records locally for rapid sync hydration.
   */
  async upsertBatch(table: string, userId: string, items: any[]): Promise<void> {
    if (!Array.isArray(items) || items.length === 0) return;

    const records: LocalEntityRecord[] = items
      .filter(item => item && item.id)
      .map(item => {
        const updatedAt = item.updated_at || new Date().toISOString();
        return {
          id: item.id,
          user_id: userId,
          table,
          updated_at: updatedAt,
          data: { ...item, updated_at: updatedAt }
        };
      });

    await db.entities.bulkPut(records);
  }

  /**
   * Removes a record locally.
   */
  async delete(recordId: string): Promise<void> {
    await db.entities.delete(recordId);
  }

  /**
   * Clears all local records for a specific table & user.
   */
  async clearTable(table: string, userId: string): Promise<void> {
    const records = await db.entities
      .where('[table+user_id]')
      .equals([table, userId])
      .toArray();
    
    const ids = records.map(r => r.id);
    await db.entities.bulkDelete(ids);
  }
}

export const sqliteService = new SqliteService();
