import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "./sqliteService";
import { queueService } from "./queueService";

const TABLES_WITHOUT_UPDATED_AT = new Set(['parties', 'categories', 'purchases']);

export const sanitizePayload = (table: string, action: string, payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;

  const clean = { ...payload };

  if (TABLES_WITHOUT_UPDATED_AT.has(table)) {
    delete clean.updated_at;
  }

  return clean;
};

interface OfflineMutateParams {
  table: string;
  action: 'insert' | 'update' | 'delete';
  recordId: string;
  payload?: any;
  userId: string;
}

/**
 * An Offline-First wrapper around Supabase mutations.
 * Reads and writes update local storage immediately, queue offline tasks,
 * and synchronize with Supabase asynchronously.
 */
export const offlineMutate = async ({ table, action, recordId, payload, userId }: OfflineMutateParams) => {
  const basePayload = {
    id: recordId,
    user_id: userId,
    ...(payload || {})
  };

  if (!TABLES_WITHOUT_UPDATED_AT.has(table) && !basePayload.updated_at) {
    basePayload.updated_at = new Date().toISOString();
  }

  const cleanPayload = sanitizePayload(table, action, basePayload);

  // 1. Instant local SQLite/IndexedDB write
  if (action === 'delete') {
    await sqliteService.delete(recordId);
  } else {
    await sqliteService.upsert(table, userId, cleanPayload);
  }

  // 2. Perform live call if network is online
  const performLiveCall = async () => {
    const keyColumn = table === 'profiles' ? 'user_id' : 'id';
    if (action === 'insert') {
      const { data, error } = await (supabase as any)
        .from(table)
        .upsert({ ...cleanPayload, [keyColumn]: recordId })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data || cleanPayload;
    } else if (action === 'update') {
      const { data, error } = await (supabase as any)
        .from(table)
        .update(cleanPayload)
        .eq(keyColumn, recordId)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data || cleanPayload;
    } else if (action === 'delete') {
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq(keyColumn, recordId);
      if (error) throw error;
      return { [keyColumn]: recordId, deleted: true };
    }
  };

  if (navigator.onLine) {
    try {
      const result = await performLiveCall();
      if (result && action !== 'delete') {
        await sqliteService.upsert(table, userId, result);
      }
      return { data: result || cleanPayload, error: null, offline: false };
    } catch (error: any) {
      // Postgrest schema errors (non-network drops)
      if (error && error.code) {
        throw error;
      }
      console.warn(`[Offline Sync] Live call failed, enqueueing to offline Queue:`, error.message);
    }
  }

  // 3. Queue for offline background sync
  await queueService.enqueue(userId, table, action, recordId, cleanPayload);
  return { data: cleanPayload, error: null, offline: true };
};