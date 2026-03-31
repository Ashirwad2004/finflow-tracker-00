import db, { SyncRecord } from "./db";
import { decryptPayload } from "./crypto";
import { supabase } from "@/core/integrations/supabase/client";

/**
 * Iteratively flushes the offline synchronization queue strictly in chronological order.
 * If a request fails, it halts the entire batch process to prevent order corruption (Partial Fallback).
 */
export const processSyncQueue = async (userId: string) => {
    if (!navigator.onLine) return;

    // Strict Ordering by Creation Time (ASC)
    const rawItems = await db.syncQueue
        .where('userId').equals(userId)
        .filter(item => item.status === 'pending')
        .toArray();
        
    const pendingItems = rawItems.sort((a, b) => a.createdAt - b.createdAt);

    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
        if (!navigator.onLine) break; // Halt progressively if connection drops mid-batch

        try {
            // Progressive Backoff implementation
            if (item.retryCount > 0) {
                const backoffDelay = Math.pow(2, item.retryCount) * 1000;
                await new Promise(res => setTimeout(res, backoffDelay));
            }
            
            const rawPayload = decryptPayload(item.payload_encrypted, userId);
            const payload = rawPayload ? JSON.parse(rawPayload) : {};

            // Supabase API Execution
            if (item.action === 'insert') {
                const { error } = await (supabase as any).from(item.table).insert({ ...payload, id: item.recordId });
                if (error) throw error;
            } else if (item.action === 'update') {
                // "Last write wins" enforced by updated_at payload mapping applied in apiService
                const { error } = await (supabase as any).from(item.table).update(payload).eq('id', item.recordId);
                if (error) throw error;
            } else if (item.action === 'delete') {
                const { error } = await (supabase as any).from(item.table).delete().eq('id', item.recordId);
                if (error) throw error;
            }

            // Optimistic Commit
            await db.syncQueue.update(item.id, { status: 'synced' });

        } catch (err: any) {
            console.error(`[Sync Engine] Interrupted on item ID ${item.id}`, err);
            
            // Progressive Failure Handling
            const newRetryCount = item.retryCount + 1;
            if (newRetryCount >= 5) {
                // Exhausted retries: Mark as failed gracefully so we don't indefinitely block the queue
                await db.syncQueue.update(item.id, { status: 'failed', retryCount: newRetryCount });
            } else {
                // Standard retry increment
                await db.syncQueue.update(item.id, { retryCount: newRetryCount });
                // We BREAK here to ensure strict ordering. 
                // E.g., if "Update Expense" fails, we must not jump to "Delete Expense"
                break;
            }
        }
    }
};

/**
 * Bootstraps standard JS fallback Interval Loop for Sync
 */
export const startSyncInterval = (userId: string) => {
    processSyncQueue(userId);

    // Poll every 30 seconds
    const interval = setInterval(() => {
        if (navigator.onLine) processSyncQueue(userId);
    }, 30000);

    const handleOnline = () => processSyncQueue(userId);
    window.addEventListener('online', handleOnline);

    return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
    };
};
