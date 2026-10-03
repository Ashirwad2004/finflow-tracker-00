import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, RefreshCw, Loader2, Send } from "lucide-react";
import { BulkWhatsAppReminderDialogProps } from "./types";
import { useBulkWhatsAppReminder } from "./useBulkWhatsAppReminder";
import { BulkReminderHeader } from "./BulkReminderHeader";
import { BulkReminderStatsStrip } from "./BulkReminderStatsStrip";
import { BulkReminderProgress } from "./BulkReminderProgress";
import { BulkReminderRecipientList } from "./BulkReminderRecipientList";

export * from "./types";
export * from "./phoneUtils";
export * from "./useBulkWhatsAppReminder";
export * from "./BulkReminderHeader";
export * from "./BulkReminderStatsStrip";
export * from "./BulkReminderProgress";
export * from "./BulkReminderRecipientList";

export const BulkWhatsAppReminderDialog: React.FC<BulkWhatsAppReminderDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  currencySymbol = "₹",
  onSuccess,
  onOpenSettings,
}) => {
  const {
    connStatus,
    isCheckingStatus,
    refetchStatus,
    isConnected,
    customNote,
    setCustomNote,
    rows,
    isProcessing,
    sentCount,
    failedCount,
    currentIndex,
    totalOverdueBalance,
    validPhoneCount,
    allSelected,
    totalToSend,
    progressPercent,
    handleSelectAll,
    handleToggleRow,
    handleSendBulk,
  } = useBulkWhatsAppReminder({
    open,
    invoices,
    currencySymbol,
    onSuccess,
  });

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <BulkReminderHeader
          invoiceCount={invoices.length}
          isCheckingStatus={isCheckingStatus}
          isConnected={isConnected}
          phoneNumber={connStatus?.phone_number}
          onOpenSettings={onOpenSettings}
        />

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Overdue Summary Stats */}
          <BulkReminderStatsStrip
            currencySymbol={currencySymbol}
            totalOverdueBalance={totalOverdueBalance}
            validPhoneCount={validPhoneCount}
            invoiceCount={invoices.length}
            totalToSend={totalToSend}
          />

          {/* Warning Banner if not connected */}
          {!isConnected && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="flex-1">
                <p className="font-semibold">WhatsApp Gateway Disconnected</p>
                <p className="text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                  Link your merchant phone in Settings &rarr; WhatsApp to enable instant reminder deliveries.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                className="h-7 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Check
              </Button>
            </div>
          )}

          {/* Progress Bar while sending */}
          {isProcessing && (
            <BulkReminderProgress
              currentIndex={currentIndex}
              totalToSend={totalToSend}
              progressPercent={progressPercent}
              sentCount={sentCount}
              failedCount={failedCount}
            />
          )}

          {/* Recipient Selection Table */}
          <BulkReminderRecipientList
            rows={rows}
            allSelected={allSelected}
            validPhoneCount={validPhoneCount}
            isProcessing={isProcessing}
            currencySymbol={currencySymbol}
            onSelectAll={handleSelectAll}
            onToggleRow={handleToggleRow}
          />

          {/* Optional Custom Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Custom Note in Reminder (Optional)
            </label>
            <Textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please clear your dues via UPI to payments@finflow or visit our store. Thank you!"
              className="h-16 text-xs resize-none"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {sentCount > 0 ? (
              <span className="text-emerald-600 font-medium">
                Sent {sentCount} of {totalToSend} reminders
              </span>
            ) : (
              <span>
                Ready to dispatch {totalToSend} reminder{totalToSend === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="text-xs"
            >
              {sentCount > 0 ? "Close" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={handleSendBulk}
              disabled={isProcessing || !isConnected || totalToSend === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending Reminders...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send {totalToSend} WhatsApp Reminder{totalToSend === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkWhatsAppReminderDialog;
