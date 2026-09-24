import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Send,
  Users,
  AlertTriangle,
  ReceiptIndianRupee,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useWhatsAppStatus } from "../hooks/useWhatsApp";
import apiClient from "@/core/api/apiClient";
import { WhatsAppSendResult } from "../types";
import { useQueryClient } from "@tanstack/react-query";

export interface OverdueInvoiceItem {
  id?: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  amount_paid?: number;
  balance_due?: number;
  due_date?: string | null;
  party_id?: string | null;
}

export interface BulkWhatsAppReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: OverdueInvoiceItem[];
  currencySymbol?: string;
  onSuccess?: () => void;
  onOpenSettings?: () => void;
}

type SendItemStatus = "idle" | "sending" | "success" | "failed";

interface OverdueRowState {
  invoice: OverdueInvoiceItem;
  selected: boolean;
  status: SendItemStatus;
  error?: string;
  resultMessageId?: string;
}

function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

function isValidPhone(phone?: string | null): boolean {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) {
    return ["6", "7", "8", "9"].includes(digits[0]);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return ["6", "7", "8", "9"].includes(digits[2]);
  }
  return digits.length >= 10 && digits.length <= 15;
}

export const BulkWhatsAppReminderDialog: React.FC<BulkWhatsAppReminderDialogProps> = ({
  open,
  onOpenChange,
  invoices,
  currencySymbol = "₹",
  onSuccess,
  onOpenSettings,
}) => {
  const queryClient = useQueryClient();
  const { data: connStatus, isLoading: isCheckingStatus, refetch: refetchStatus } = useWhatsAppStatus();

  const [customNote, setCustomNote] = useState<string>("");
  const [rows, setRows] = useState<OverdueRowState[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Initialize or reset row states when dialog opens or invoices change
  useEffect(() => {
    if (open) {
      setRows(
        invoices.map((inv) => ({
          invoice: inv,
          selected: isValidPhone(inv.customer_phone),
          status: "idle",
        }))
      );
      setSentCount(0);
      setFailedCount(0);
      setCurrentIndex(-1);
      setIsProcessing(false);
    }
  }, [open, invoices]);

  const isConnected = connStatus?.status === "connected";

  const totalOverdueBalance = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      const bal =
        inv.balance_due != null
          ? Number(inv.balance_due)
          : Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid || 0));
      return acc + bal;
    }, 0);
  }, [invoices]);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const validPhoneCount = useMemo(
    () => invoices.filter((inv) => isValidPhone(inv.customer_phone)).length,
    [invoices]
  );

  const allSelected = selectedRows.length === rows.filter((r) => isValidPhone(r.invoice.customer_phone)).length && rows.length > 0;

  const handleSelectAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: checked ? isValidPhone(r.invoice.customer_phone) : false,
      }))
    );
  };

  const handleToggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSendBulk = async () => {
    if (!isConnected) {
      toast.error("WhatsApp is not connected. Please connect your device first.");
      return;
    }

    const toSendIndices = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.selected && isValidPhone(r.invoice.customer_phone));

    if (toSendIndices.length === 0) {
      toast.info("Please select at least one customer with a valid phone number.");
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toSendIndices.length; i++) {
      const { r, idx } = toSendIndices[i];
      setCurrentIndex(i + 1);

      // Mark row as sending
      setRows((prev) =>
        prev.map((row, rowIdx) =>
          rowIdx === idx ? { ...row, status: "sending" } : row
        )
      );

      const bal =
        r.invoice.balance_due != null
          ? Number(r.invoice.balance_due)
          : Math.max(0, Number(r.invoice.total_amount) - Number(r.invoice.amount_paid || 0));

      try {
        const payload = {
          party_id: r.invoice.party_id || undefined,
          customer_name: r.invoice.customer_name,
          customer_phone: r.invoice.customer_phone || "",
          outstanding_amount: bal,
          invoice_number: r.invoice.invoice_number,
          due_date: r.invoice.due_date || undefined,
          currency_symbol: currencySymbol,
          custom_notes: customNote.trim() || undefined,
          force_resend: true,
        };

        const res = await apiClient.post<WhatsAppSendResult>(
          "/api/v1/whatsapp/send-reminder",
          payload
        );

        if (res.data?.success) {
          successCount++;
          setSentCount(successCount);
          setRows((prev) =>
            prev.map((row, rowIdx) =>
              rowIdx === idx
                ? {
                    ...row,
                    status: "success",
                    resultMessageId: res.data.message_id,
                  }
                : row
            )
          );
        } else {
          throw new Error(res.data?.detail || "Send failed");
        }
      } catch (err: any) {
        failCount++;
        setFailedCount(failCount);
        const errMsg =
          err.response?.data?.detail || err.message || "Failed to deliver WhatsApp reminder";
        setRows((prev) =>
          prev.map((row, rowIdx) =>
            rowIdx === idx ? { ...row, status: "failed", error: errMsg } : row
          )
        );
      }

      // Gentle pause of 600ms between sends to avoid rate limiting
      if (i < toSendIndices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["whatsapp_messages"] });

    if (successCount > 0) {
      toast.success(
        `Dispatched WhatsApp reminders to ${successCount} customer${successCount === 1 ? "" : "s"}!`
      );
      if (onSuccess) onSuccess();
    }
    if (failCount > 0) {
      toast.warning(`${failCount} reminder${failCount === 1 ? "" : "s"} could not be sent.`);
    }
  };

  const totalToSend = selectedRows.filter((r) => isValidPhone(r.invoice.customer_phone)).length;
  const progressPercent = totalToSend > 0 ? (sentCount + failedCount) / totalToSend * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <MessageCircle className="w-5 h-5 fill-emerald-500/20" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  Send WhatsApp Reminders
                  <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                    {invoices.length} Overdue
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deliver polite outstanding payment reminders directly to customers via WhatsApp.
                </DialogDescription>
              </div>
            </div>

            {/* Connection Pill */}
            <div className="flex items-center gap-2">
              {isCheckingStatus ? (
                <Badge variant="outline" className="text-xs text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Checking WhatsApp
                </Badge>
              ) : isConnected ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 text-xs gap-1.5 py-1 px-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected {connStatus?.phone_number ? `(+${connStatus.phone_number})` : ""}
                </Badge>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 text-xs gap-1.5 py-1 px-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Disconnected
                  </Badge>
                  {onOpenSettings && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-primary hover:text-primary/80 px-2"
                      onClick={onOpenSettings}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Overdue Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ReceiptIndianRupee className="w-3.5 h-3.5" /> Total Overdue
              </span>
              <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                {currencySymbol}
                {totalOverdueBalance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Valid Phone Numbers
              </span>
              <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {validPhoneCount} / {invoices.length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selected to Send
              </span>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalToSend}
              </p>
            </div>
          </div>

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
            <div className="space-y-2 p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Sending reminder {currentIndex} of {totalToSend}...
                </span>
                <span className="text-slate-500 font-mono">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-slate-200 dark:bg-slate-800" />
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Sent: <strong className="text-emerald-600">{sentCount}</strong></span>
                <span>Failed: <strong className="text-rose-600">{failedCount}</strong></span>
                <span>Remaining: <strong>{totalToSend - sentCount - failedCount}</strong></span>
              </div>
            </div>
          )}

          {/* Recipient Selection Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-bulk"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={isProcessing}
                />
                <label
                  htmlFor="select-all-bulk"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Select All ({validPhoneCount} eligible)
                </label>
              </div>
              <span className="text-[11px] text-slate-400">
                Only invoices with valid mobile numbers can receive reminders
              </span>
            </div>

            <ScrollArea className="h-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2">
              <div className="space-y-1.5">
                {rows.map((row, idx) => {
                  const hasValidPhone = isValidPhone(row.invoice.customer_phone);
                  const bal =
                    row.invoice.balance_due != null
                      ? Number(row.invoice.balance_due)
                      : Math.max(
                          0,
                          Number(row.invoice.total_amount) - Number(row.invoice.amount_paid || 0)
                        );

                  return (
                    <div
                      key={row.invoice.id || row.invoice.invoice_number}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                        row.selected
                          ? "bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-2xs"
                          : "bg-transparent border-transparent opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => handleToggleRow(idx)}
                          disabled={!hasValidPhone || isProcessing}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {row.invoice.customer_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              #{row.invoice.invoice_number}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {hasValidPhone ? (
                              <span className="text-slate-600 dark:text-slate-400 font-mono">
                                {row.invoice.customer_phone}
                              </span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-1 text-[10px] font-medium">
                                <AlertCircle className="w-3 h-3" /> No phone number
                              </span>
                            )}
                            {row.invoice.due_date && (
                              <span>&bull; Due: {row.invoice.due_date}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Balance & Status */}
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <div className="text-right">
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                            {currencySymbol}
                            {bal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="w-20 text-right">
                          {row.status === "sending" && (
                            <Badge variant="outline" className="text-[10px] py-0.5 border-emerald-300 text-emerald-600">
                              <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> Sending
                            </Badge>
                          )}
                          {row.status === "success" && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0.5 gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Sent
                            </Badge>
                          )}
                          {row.status === "failed" && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] py-0.5 gap-1 cursor-help"
                              title={row.error}
                            >
                              <XCircle className="w-2.5 h-2.5" /> Failed
                            </Badge>
                          )}
                          {row.status === "idle" && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {row.selected ? "Ready" : "Skipped"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

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
              <span>Ready to dispatch {totalToSend} reminder{totalToSend === 1 ? "" : "s"}</span>
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
