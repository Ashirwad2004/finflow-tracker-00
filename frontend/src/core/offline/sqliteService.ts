/**
 * SqliteService / DatabaseService
 *
 * Provides normalized, indexed local storage operations for all application entities.
 * Ensures zero-latency reads and writes when operating offline.
 */

import db, { LocalEntityRecord } from "./db";
import { OPFSStorageManager } from "./opfsStorage";

const OPFS_SNAPSHOT_FILENAME = "finflow_database_snapshot.json";

class SqliteService {
  private snapshotTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Schedules a debounced snapshot write to local OPFS disk.
   */
  private scheduleOPFSSnapshot(): void {
    if (this.snapshotTimeout) {
      clearTimeout(this.snapshotTimeout);
    }
    this.snapshotTimeout = setTimeout(() => {
      this.exportSnapshotToOPFS().catch((err) => {
        console.warn("[SqliteService] Background OPFS disk backup warning:", err);
      });
    }, 2000);
  }

  /**
   * Serializes all local records and saves them directly to an OPFS disk file.
   */
  async exportSnapshotToOPFS(): Promise<boolean> {
    try {
      const records = await db.entities.toArray();
      const payload = JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        count: records.length,
        records
      });
      return await OPFSStorageManager.writeFile(OPFS_SNAPSHOT_FILENAME, payload);
    } catch (err) {
      console.warn("[SqliteService] Failed to export snapshot to OPFS:", err);
      return false;
    }
  }

  /**
   * Rehydrates IndexedDB from OPFS disk snapshot if local IndexedDB was cleared or empty.
   */
  async restoreFromOPFS(): Promise<number> {
    try {
      const content = await OPFSStorageManager.readFile(OPFS_SNAPSHOT_FILENAME);
      if (!content) return 0;

      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.records) && parsed.records.length > 0) {
        await db.entities.bulkPut(parsed.records);
        console.info(`[SqliteService] Restored ${parsed.records.length} records from OPFS disk snapshot.`);
        return parsed.records.length;
      }
    } catch (err) {
      console.warn("[SqliteService] OPFS restoration skipped or failed:", err);
    }
    return 0;
  }

  /**
   * Retrieves all records for a table belonging to a specific user.
   */
  async getAll<T = any>(table: string, userId: string): Promise<T[]> {
    try {
      let records = await db.entities
        .where('[table+user_id]')
        .equals([table, userId])
        .toArray();

      // If empty, check if we can restore from an OPFS disk snapshot
      if (records.length === 0) {
        const restored = await this.restoreFromOPFS();
        if (restored > 0) {
          records = await db.entities
            .where('[table+user_id]')
            .equals([table, userId])
            .toArray();
        }
      }

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
   * Inserts or updates a single record locally and schedules disk backup.
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
    this.scheduleOPFSSnapshot();
  }

  /**
   * Bulk inserts or updates records locally for rapid sync hydration and schedules disk backup.
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
    this.scheduleOPFSSnapshot();
  }

  /**
   * Removes a record locally and schedules disk backup.
   */
  async delete(recordId: string): Promise<void> {
    await db.entities.delete(recordId);
    this.scheduleOPFSSnapshot();
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
    this.scheduleOPFSSnapshot();
  }
}

export const sqliteService = new SqliteService();

