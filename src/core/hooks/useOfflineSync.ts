import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../offline/db';
import { startSyncInterval, processSyncQueue } from '../offline/syncService';
import { useAuth } from '@/core/lib/auth';

export const useOfflineSync = () => {
    const { user } = useAuth();
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

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);
            if (user) {
                processSyncQueue(user.id).finally(() => setIsSyncing(false));
            }
        };
        
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        let cleanup: (() => void) | undefined;
        if (user) {
            cleanup = startSyncInterval(user.id);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (cleanup) cleanup();
        };
    }, [user?.id]);

    return {
        isOnline,
        isSyncing,
        pendingItemsCount,
        failedItemsCount
    };
};
