import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOfflineSync } from "@/core/hooks/useOfflineSync";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingItemsCount, failedItemsCount } = useOfflineSync();

  // Hide if fully online, complete, and clean
  if (isOnline && pendingItemsCount === 0 && failedItemsCount === 0) return null;

  return (
    <div className={`w-full py-1.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-300 z-[100] sticky top-0 left-0 right-0 ${
      !isOnline ? "bg-amber-500 text-amber-950" : (failedItemsCount > 0 && !isSyncing) ? "bg-red-500 text-white" : "bg-blue-500 text-white"
    }`}>
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode: Your changes are safely stored locally.</span>
        </>
      )}
      
      {isOnline && isSyncing && pendingItemsCount > 0 && (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingItemsCount} background tasks...</span>
        </>
      )}

      {isOnline && !isSyncing && pendingItemsCount > 0 && (
        <>
          <RefreshCw className="w-4 h-4 opacity-70" />
          <span>{pendingItemsCount} items preparing to sync.</span>
        </>
      )}

      {failedItemsCount > 0 && (
        <>
          <span className="mx-2 opacity-50">|</span>
          <AlertTriangle className="w-4 h-4" />
          <span>{failedItemsCount} actions failed permanently.</span>
        </>
      )}
    </div>
  );
}
