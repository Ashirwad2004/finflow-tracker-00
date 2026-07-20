import { useState, useEffect } from "react";
import { connectivityService, ConnectivityState } from "@/core/offline/connectivityService";
import { processSyncQueue } from "@/core/offline/syncService";
import { useAuth } from "@/core/lib/auth";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const SyncStatusBadge = () => {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<ConnectivityState>(connectivityService.getState());

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = () => {
    if (user?.id) {
      processSyncQueue(user.id);
    }
  };

  const formattedSyncTime = syncState.lastSyncTime
    ? formatDistanceToNow(syncState.lastSyncTime, { addSuffix: true })
    : null;

  return (
    <div className="flex items-center gap-2">
      {syncState.status === 'online' && (
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm transition-all"
          title={formattedSyncTime ? `Last synced ${formattedSyncTime}` : 'All data synced'}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Online</span>
          {syncState.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold">
              {syncState.pendingCount}
            </span>
          )}
        </div>
      )}

      {syncState.status === 'syncing' && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 shadow-sm animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
          <span className="hidden sm:inline">Syncing...</span>
        </div>
      )}

      {syncState.status === 'offline' && (
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-sm"
          title="Working offline. Changes are saved locally."
        >
          <WifiOff className="w-3.5 h-3.5 text-rose-500" />
          <span>Offline</span>
          {syncState.pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-bold">
              {syncState.pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* Manual Sync Trigger Button when items are pending */}
      {syncState.status === 'online' && syncState.pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          className="h-7 px-2 text-xs font-bold gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          title="Force Sync Pending Changes"
        >
          <RefreshCw className="w-3 h-3" /> Sync Now
        </Button>
      )}
    </div>
  );
};
