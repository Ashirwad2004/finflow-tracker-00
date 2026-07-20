/**
 * SyncService
 *
 * Background synchronization engine. Processes the offline queue in strict chronological
 * order with exponential backoff retries, newest-wins conflict resolution based on updated_at,
 * and automatic status tracking.
 */

import { queueService } from "./queueService";
import { supabaseRepository } from "./supabaseRepository";
import { sqliteService } from "./sqliteService";
import { connectivityService } from "./connectivityService";

let isSyncingActive = false;

const TABLES_WITHOUT_UPDATED_AT = new Set(['parties', 'categories', 'purchases']);

const sanitizePayloadForTable = (table: string, action: string, payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;

  const clean = { ...payload };

  // Remove updated_at if table schema does not include updated_at column
  if (TABLES_WITHOUT_UPDATED_AT.has(table)) {
    delete clean.updated_at;
  }

  if (table === 'purchases') {
    const { id, user_id, bill_number, vendor_name, date, status, subtotal, tax_amount, total_amount, items } = clean;
    return { id, user_id, bill_number, vendor_name, date, status, subtotal, tax_amount, total_amount, items };
  }
  
  if (table === 'sales') {
    const { id, user_id, invoice_number, customer_name, customer_phone, customer_email, date, status, subtotal, tax_amount, total_amount, payment_method, items } = clean;
    return { id, user_id, invoice_number, customer_name, customer_phone, customer_email, date, status, subtotal, tax_amount, total_amount, payment_method, items };
  }

  return clean;
};

/**
 * Processes all pending items in the sync queue strictly in order of creation.
 */
export const processSyncQueue = async (userId: string): Promise<void> => {
  if (!navigator.onLine) {
    connectivityService.setStatus('offline');
    return;
  }

  if (isSyncingActive) {
    return;
  }

  isSyncingActive = true;
  connectivityService.setStatus('syncing');

  try {
    const pendingItems = await queueService.getPending(userId);

    if (pendingItems.length === 0) {
      connectivityService.setStatus('online');
      return;
    }

    for (const item of pendingItems) {
      if (!navigator.onLine) {
        connectivityService.setStatus('offline');
        break;
      }

      try {
        // Progressive exponential backoff
        if (item.retryCount > 0) {
          const backoffMs = Math.pow(2, item.retryCount) * 1000;
          await new Promise(res => setTimeout(res, backoffMs));
        }

        const rawPayload = queueService.getPayload(item);
        const payload = sanitizePayloadForTable(item.table, item.action, rawPayload);

        // Supabase REST Execution with Conflict Resolution
        if (item.action === 'insert') {
          // Check conflict resolution for inserts if updated_at is supported
          let shouldUpdateRemote = true;
          if (!TABLES_WITHOUT_UPDATED_AT.has(item.table)) {
            try {
              const remoteRecord = await supabaseRepository.fetch(item.table, userId);
              const existing = remoteRecord.find((r: any) => r.id === item.recordId);

              if (existing && existing.updated_at && payload.updated_at) {
                const remoteTime = new Date(existing.updated_at).getTime();
                const localTime = new Date(payload.updated_at).getTime();
                if (remoteTime > localTime) {
                  await sqliteService.upsert(item.table, userId, existing);
                  shouldUpdateRemote = false;
                }
              }
            } catch {
              // Ignore conflict check network failures
            }
          }

          if (shouldUpdateRemote) {
            try {
              const result = await supabaseRepository.upsert(item.table, payload);
              if (result) {
                await sqliteService.upsert(item.table, userId, result);
              }
            } catch (upsertErr: any) {
              const errText = String(upsertErr?.message || upsertErr?.details || '');
              if (errText.includes('Could not find') || upsertErr?.code === '42703' || upsertErr?.code === 'PGRST204') {
                console.warn(`[Sync Engine] Schema mismatch for insert on ${item.table}, retrying with core payload...`);
                const corePayload = sanitizePayloadForTable(item.table, item.action, payload);
                const result = await supabaseRepository.upsert(item.table, corePayload);
                if (result) {
                  await sqliteService.upsert(item.table, userId, result);
                }
              } else {
                throw upsertErr;
              }
            }
          }
        } else if (item.action === 'update') {
          // Execute UPDATE operation directly against remote DB
          try {
            const result = await supabaseRepository.update(item.table, item.recordId, payload);
            if (result) {
              await sqliteService.upsert(item.table, userId, result);
            }
          } catch (updateErr: any) {
            const errText = String(updateErr?.message || updateErr?.details || '');
            if (errText.includes('Could not find') || updateErr?.code === '42703' || updateErr?.code === 'PGRST204') {
              console.warn(`[Sync Engine] Schema mismatch for update on ${item.table}, retrying with core payload...`);
              const corePayload = sanitizePayloadForTable(item.table, item.action, payload);
              const result = await supabaseRepository.update(item.table, item.recordId, corePayload);
              if (result) {
                await sqliteService.upsert(item.table, userId, result);
              }
            } else {
              throw updateErr;
            }
          }
        } else if (item.action === 'delete') {
          await supabaseRepository.delete(item.table, item.recordId);
          await sqliteService.delete(item.recordId);
        }

        // Successfully synced item: mark synced and remove from queue
        await queueService.markSynced(item.id, userId);

      } catch (err: any) {
        console.error(`[Sync Engine] Failed processing item ${item.id} on ${item.table}:`, err);

        const errorMessage = err?.message || err?.details || String(err);
        const isPermanent = err && err.code && (
          err.code.startsWith('23') || // Integrity constraint violations
          (err.code.startsWith('42') && !errorMessage.includes('Could not find')) ||
          err.code === 'P0001'
        );

        const newRetryCount = item.retryCount + 1;
        await queueService.markFailed(item.id, userId, errorMessage, newRetryCount, !!isPermanent);

        if (!isPermanent && newRetryCount < 5) {
          break;
        }
      }
    }

    connectivityService.updateLastSyncTime();
    connectivityService.setStatus('online');
  } finally {
    isSyncingActive = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finflow-sync-complete', { detail: { userId } }));
    }
  }
};

/**
 * Initializes automatic background sync polling and reconnection listeners.
 */
export const startSyncInterval = (userId: string): (() => void) => {
  // Initial sync attempt
  if (navigator.onLine && userId) {
    processSyncQueue(userId);
  }

  // Poll every 30 seconds
  const intervalId = setInterval(() => {
    if (navigator.onLine && userId) {
      processSyncQueue(userId);
    }
  }, 30000);

  const handleOnline = () => {
    connectivityService.setStatus('online');
    if (userId) processSyncQueue(userId);
  };

  const handleOffline = () => {
    connectivityService.setStatus('offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};