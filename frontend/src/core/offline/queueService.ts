/**
 * QueueService
 *
 * Manages the offline sync queue. Every offline operation (insert, update, delete)
 * is enqueued into local storage, deduplicated, and tracked with retry metrics.
 */

import db, { SyncRecord } from "./db";
import { encryptPayload, decryptPayload } from "./crypto";
import { v4 as uuidv4 } from "uuid";
import { connectivityService } from "./connectivityService";

export class QueueService {
  /**
   * Enqueues an offline action into the sync queue.
   */
  async enqueue(
    userId: string,
    table: string,
    action: 'insert' | 'update' | 'delete',
    recordId: string,
    payload: any = {}
  ): Promise<SyncRecord> {
    const encryptedPayload = encryptPayload(payload, userId);

    // Deduplication check: if there is already a pending operation for this recordId and table, update it
    const existing = await db.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.recordId === recordId && item.table === table && item.status === 'pending')
      .first();

    if (existing) {
      const updatedRecord: Partial<SyncRecord> = {
        payload_encrypted: encryptedPayload,
        action: action === 'delete' ? 'delete' : existing.action,
        createdAt: Date.now() // Push to back of queue
      };
      await db.syncQueue.update(existing.id, updatedRecord);
      await this.updatePendingCount(userId);
      return { ...existing, ...updatedRecord } as SyncRecord;
    }

    const newSyncRecord: SyncRecord = {
      id: uuidv4(),
      userId,
      action,
      table,
      recordId,
      payload_encrypted: encryptedPayload,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0
    };

    await db.syncQueue.add(newSyncRecord);
    await this.updatePendingCount(userId);
    return newSyncRecord;
  }

  /**
   * Gets pending items and failed items for sync processing sorted chronologically.
   */
  async getPending(userId: string): Promise<SyncRecord[]> {
    const rawItems = await db.syncQueue
      .where('userId').equals(userId)
      .filter(item => item.status === 'pending' || item.status === 'failed')
      .toArray();

    return rawItems.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Marks a queue item as synced and removes it.
   */
  async markSynced(queueId: string, userId: string): Promise<void> {
    await db.syncQueue.delete(queueId);
    await this.updatePendingCount(userId);
  }

  /**
   * Marks a queue item as failed or increments retry count.
   */
  async markFailed(queueId: string, userId: string, errorMessage: string, retryCount: number, isPermanent: boolean): Promise<void> {
    if (isPermanent || retryCount >= 5) {
      await db.syncQueue.update(queueId, {
        status: 'failed',
        retryCount,
        error: errorMessage
      });
    } else {
      await db.syncQueue.update(queueId, {
        retryCount,
        error: errorMessage
      });
    }
    await this.updatePendingCount(userId);
  }

  /**
   * Returns decrypted payload for a queue record.
   */
  getPayload(record: SyncRecord): any {
    return decryptPayload(record.payload_encrypted, record.userId) || {};
  }

  /**
   * Updates ConnectivityService pending count.
   */
  async updatePendingCount(userId: string): Promise<number> {
    try {
      const count = await db.syncQueue
        .where('userId').equals(userId)
        .filter(item => item.status === 'pending')
        .count();
      
      connectivityService.setPendingCount(count);
      return count;
    } catch {
      return 0;
    }
  }
}

export const queueService = new QueueService();
