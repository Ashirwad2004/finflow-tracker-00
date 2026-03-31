import { supabase } from "@/core/integrations/supabase/client";
import db, { SyncRecord } from "./db";
import { encryptPayload } from "./crypto";
import { v4 as uuidv4 } from "uuid";

interface OfflineMutateParams {
  table: string;
  action: 'insert' | 'update' | 'delete';
  recordId: string;
  payload?: any;
  userId: string;
}

/**
 * An Offline First wrapper around Supabase mutations.
 * Attempts Live sync -> Caches to Dexie on Drop
 */
export const offlineMutate = async ({ table, action, recordId, payload, userId }: OfflineMutateParams) => {
  // We rely on Supabase's native insert/update conflict resolutions and Dexie's 
  // chronological ordering to manage offline conflict resolution, rather than 
  // forceful updated_at payload mapping which breaks tables lacking this column.

  // Idempotency: Map 'insert' seamlessly into Supabase 'upsert'
  const performLiveCall = async () => {
    if (action === 'insert') {
      const { data, error } = await (supabase as any).from(table).insert({ ...payload, id: recordId }).select().single();
      if (error) throw error;
      return data;
    } else if (action === 'update') {
      const { data, error } = await (supabase as any).from(table).update(payload).eq('id', recordId).select().single();
      if (error) throw error;
      return data;
    } else if (action === 'delete') {
      const { error } = await (supabase as any).from(table).delete().eq('id', recordId);
      if (error) throw error;
      return { id: recordId, deleted: true };
    }
  };

  if (navigator.onLine) {
    try {
      const result = await performLiveCall();
      return { data: result, error: null, offline: false };
    } catch (error: any) {
      // If the error contains a Postgrest 'code', it means the network call succeeded 
      // but the database rejected the payload (e.g., Schema validation, missing required column, RLS).
      // We absolutely MUST throw this to the UI and NOT queue it, otherwise it traps invalid data in a loop.
      if (error && error.code) {
          throw error;
      }
      console.warn(`[Offline Sync] Live call failed natively, routing to Queue:`, error.message);
      // Fallthrough to IndexDB queue caching for actual network connection drops
    }
  }

  // Deduplication Check 
  // If the exact same record is pending the SAME operation natively, we update the existing queue item
  const pendingArray = await db.syncQueue
      .where('recordId').equals(recordId)
      .toArray();
      
  const existingPending = pendingArray.find(
      (item: SyncRecord) => item.userId === userId && item.table === table && item.status === 'pending' && item.action === action
  );

  if (existingPending) {
    await db.syncQueue.update(existingPending.id, {
        payload_encrypted: encryptPayload(payload, userId),
        createdAt: Date.now() // bump time to push to end of strict chronological line
    });
    return { data: payload, error: null, offline: true };
  }

  // Standard Insert to Queue
  const syncRecord: SyncRecord = {
    id: uuidv4(),
    userId,
    action,
    table,
    recordId,
    payload_encrypted: encryptPayload(payload || {}, userId),
    status: 'pending',
    createdAt: Date.now(),
    retryCount: 0
  };

  await db.syncQueue.add(syncRecord);
  return { data: payload, error: null, offline: true };
};
