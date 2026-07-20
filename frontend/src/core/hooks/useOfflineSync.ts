import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../offline/db';
import { startSyncInterval, processSyncQueue } from '../offline/syncService';
import { useAuth } from '@/core/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { decryptPayload } from '../offline/crypto';
import { connectivityService } from '../offline/connectivityService';

export const useOfflineSync = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    // Dexie specific reactive hook to observe Queue modifications optimistically
    const pendingItemsCount = useLiveQuery(
        () => user ? db.syncQueue.where('userId').equals(user.id).filter(item => item.status === 'pending').count() : 0,
        [user?.id],
        0
    );

    const failedItemsCount = useLiveQuery(
        () => user ? db.syncQueue.where('userId').equals(user.id).filter(item => item.status === 'failed').count() : 0,
        [user?.id],
        0
    );

    const failedItemsRaw = useLiveQuery(
        () => user ? db.syncQueue.where('userId').equals(user.id).filter(item => item.status === 'failed').toArray() : [],
        [user?.id],
        []
    );

    // Decrypt payloads for display
    const failedItems = failedItemsRaw.map(item => {
        let payload = null;
        if (user) {
            try {
                payload = decryptPayload(item.payload_encrypted, user.id);
            } catch (e) {
                console.error("Failed to decrypt payload for banner", e);
            }
        }
        return {
            ...item,
            payload
        };
    });

    const retryItem = async (id: string) => {
        await db.syncQueue.update(id, { status: 'pending', retryCount: 0, error: undefined });
        if (user) {
            processSyncQueue(user.id).finally(() => {
                queryClient.invalidateQueries();
            });
        }
    };

    const discardItem = async (id: string) => {
        await db.syncQueue.delete(id);
        queryClient.invalidateQueries();
    };

    const retryAllFailed = async () => {
        if (!user) return;
        const items = await db.syncQueue.where('userId').equals(user.id).filter(item => item.status === 'failed').toArray();
        for (const item of items) {
            await db.syncQueue.update(item.id, { status: 'pending', retryCount: 0, error: undefined });
        }
        processSyncQueue(user.id).finally(() => {
            queryClient.invalidateQueries();
        });
    };

    const discardAllFailed = async () => {
        if (!user) return;
        const items = await db.syncQueue.where('userId').equals(user.id).filter(item => item.status === 'failed').toArray();
        for (const item of items) {
            await db.syncQueue.delete(item.id);
        }
        queryClient.invalidateQueries();
    };

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);
            connectivityService.setStatus('online');
            if (user) {
                processSyncQueue(user.id).finally(() => {
                    setIsSyncing(false);
                    queryClient.invalidateQueries(); // Refresh all UI queries once sync completes
                });
            }
        };

        const handleSyncComplete = () => {
            queryClient.invalidateQueries();
        };

        const handleOffline = () => {
            setIsOnline(false);
            connectivityService.setStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('app-online-reconnect', handleOnline);
        window.addEventListener('finflow-sync-complete', handleSyncComplete);

        let cleanup: (() => void) | undefined;
        if (user) {
            cleanup = startSyncInterval(user.id);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('app-online-reconnect', handleOnline);
            window.removeEventListener('finflow-sync-complete', handleSyncComplete);
            if (cleanup) cleanup();
        };
    }, [user?.id, queryClient]);

    return {
        isOnline,
        isSyncing,
        pendingItemsCount,
        failedItemsCount,
        failedItems,
        retryItem,
        discardItem,
        retryAllFailed,
        discardAllFailed
    };
};
