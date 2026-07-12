import { useState } from "react";
import { WifiOff, RefreshCw, AlertTriangle, Trash2, Play, Info, Database } from "lucide-react";
import { useOfflineSync } from "@/core/hooks/useOfflineSync";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function getRecordSummary(table: string, action: 'insert' | 'update' | 'delete', payload: any): string {
  if (!payload || Object.keys(payload).length === 0) {
    return `${action === 'insert' ? 'Create' : action === 'update' ? 'Update' : 'Delete'} record in ${table}`;
  }

  const name = payload.name || payload.title || payload.customer_name || payload.borrower_name || payload.invoice_number || payload.order_number || payload.category;
  const amount = payload.amount || payload.total || payload.total_amount || payload.grand_total || payload.price || payload.total_price;
  const description = payload.description || payload.note || payload.remarks;

  const formattedAmount = amount !== undefined ? ` (₹${Number(amount).toLocaleString('en-IN')})` : '';
  const actionLabel = action === 'insert' ? 'Create' : action === 'update' ? 'Update' : 'Delete';
  
  let tableLabel = table.charAt(0).toUpperCase() + table.slice(1);
  if (tableLabel.endsWith('s')) {
    tableLabel = tableLabel.slice(0, -1);
  }

  let detail = '';
  if (name && description) {
    detail = `${name} - ${description}`;
  } else if (name) {
    detail = name;
  } else if (description) {
    detail = description;
  } else {
    detail = `ID: ${payload.id || 'Unknown'}`;
  }

  return `${actionLabel} ${tableLabel}: ${detail}${formattedAmount}`;
}

export function OfflineBanner() {
  const { 
    isOnline, 
    isSyncing, 
    pendingItemsCount, 
    failedItemsCount,
    failedItems,
    retryItem,
    discardItem,
    retryAllFailed,
    discardAllFailed
  } = useOfflineSync();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Hide if fully online, complete, and clean
  if (isOnline && pendingItemsCount === 0 && failedItemsCount === 0) return null;

  return (
    <>
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
          <div className="flex items-center gap-2">
            {isOnline && pendingItemsCount > 0 && <span className="mx-2 opacity-50">|</span>}
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>{failedItemsCount} actions failed permanently.</span>
            <button 
              onClick={() => setIsDetailsOpen(true)}
              className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/35 active:bg-white/10 rounded text-xs transition-colors underline cursor-pointer"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl w-[92vw] max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Failed Sync Actions ({failedItemsCount})
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              The following changes could not be synced to the server due to database or validation errors. You can retry them, or discard them to clear the errors and remove the warning banner.
            </DialogDescription>
          </DialogHeader>

          {failedItemsCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Database className="w-12 h-12 mb-3 text-emerald-500 animate-bounce" />
              <p className="font-semibold text-foreground">All actions synced successfully!</p>
              <p className="text-sm">There are no failed actions left in the queue.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-3 border-b bg-muted/40 px-3 rounded-lg mt-2 mb-2 gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">
                  Bulk Operations:
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs flex items-center gap-1 cursor-pointer"
                    onClick={retryAllFailed}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Retry All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-8 text-xs flex items-center gap-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white border-none"
                    onClick={discardAllFailed}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Discard All
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 pr-1 -mr-2 overflow-y-auto">
                <div className="space-y-4 my-2">
                  {failedItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 border rounded-xl bg-card hover:bg-accent/10 transition-colors shadow-sm relative group overflow-hidden border-red-100 dark:border-red-950/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge 
                              variant={item.action === 'insert' ? 'default' : item.action === 'update' ? 'secondary' : 'destructive'}
                              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
                            >
                              {item.action === 'insert' ? 'Create' : item.action}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                              {item.table}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="font-semibold text-sm leading-tight text-foreground truncate">
                            {getRecordSummary(item.table, item.action, item.payload)}
                          </p>
                          {item.error ? (
                            <div className="bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 p-2.5 rounded-lg text-xs font-mono border border-red-100/50 dark:border-red-950/30 flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="break-all whitespace-pre-wrap leading-relaxed">{item.error}</span>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5 font-medium">
                              <Info className="w-3.5 h-3.5" />
                              Unknown server/network sync error (exhausted retries).
                            </p>
                          )}
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0 justify-end self-end sm:self-start">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 text-xs px-2.5 font-medium flex items-center gap-1.5 cursor-pointer"
                            onClick={() => retryItem(item.id)}
                          >
                            <Play className="w-3 h-3" />
                            Retry
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1.5 cursor-pointer"
                            onClick={() => discardItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Discard
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-end pt-4 border-t mt-auto">
            <Button 
              variant="outline" 
              onClick={() => setIsDetailsOpen(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
