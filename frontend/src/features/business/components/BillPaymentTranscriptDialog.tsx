import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  FileSpreadsheet,
  Printer,
  Copy,
  Plus,
  ShieldCheck,
  AlertCircle,
  Hash,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import {
  BillPaymentVoucher,
  parsePaymentTranscript,
  getPaymentMethodDetails,
} from "../utils/paymentTranscript";
import { BillPaymentTarget } from "./RecordBillPaymentDialog";

interface BillPaymentTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillPaymentTarget | null;
  onOpenRecordPayment?: (bill: BillPaymentTarget) => void;
}

export function BillPaymentTranscriptDialog({
  open,
  onOpenChange,
  bill,
  onOpenRecordPayment,
}: BillPaymentTranscriptDialogProps) {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const isReceipt = bill?.type === "sale";
  const totalAmount = Number(bill?.totalAmount || 0);
  const currentPaid = Number(bill?.amountPaid || 0);
  const currentBalance =
    bill?.balanceDue != null
      ? Number(bill.balanceDue)
      : Math.max(0, totalAmount - currentPaid);

  const { cleanNotes, payments } = useMemo(() => {
    if (!bill) return { cleanNotes: "", payments: [] };
    return parsePaymentTranscript(bill.notes, {
      total_amount: totalAmount,
      amount_paid: currentPaid,
      balance_due: currentBalance,
      status: bill.rawRecord?.status,
      payment_method: bill.paymentMethod || "cash",
      date: bill.date,
      due_date: bill.dueDate,
      type: bill.type,
    });
  }, [bill, totalAmount, currentPaid, currentBalance]);

  if (!bill) return null;

  const percentSettled =
    totalAmount > 0 ? Math.min(100, Math.round((currentPaid / totalAmount) * 100)) : 0;

  const handleCopyTranscript = () => {
    const lines = [
      `FINFLOW TRANSACTION TRANSCRIPT — ${isReceipt ? "RECEIPT LEDGER" : "DISBURSEMENT LEDGER"}`,
      `Bill Ref: ${bill.billNumber}`,
      `Party: ${bill.partyName}`,
      `Total Bill Amount: ${formatCurrency(totalAmount)}`,
      `Amount Settled: ${formatCurrency(currentPaid)}`,
      `Balance Due: ${formatCurrency(currentBalance)}`,
      `Status: ${currentBalance <= 0 ? "Fully Paid" : "Partial / Outstanding"}`,
      "",
      "--- PAYMENT VOUCHERS ---",
      ...payments.map(
        (p, idx) =>
          `#${idx + 1} [${p.voucher_number}] | Date: ${p.date}${p.time ? " " + p.time : ""} | Amount: ${formatCurrency(p.amount)} | Mode: ${p.payment_method.toUpperCase()}${p.reference_number ? ` | Ref: ${p.reference_number}` : ""}${p.notes ? ` | Notes: ${p.notes}` : ""} | Bal After: ${formatCurrency(p.balance_after)}`
      ),
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    toast({
      title: "Transcript Copied! 📋",
      description: "Complete bill payment ledger copied to clipboard.",
    });
  };

  const handlePrintTranscript = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] p-0 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800">
        {/* Header Strip */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                  isReceipt
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 text-white"
                }`}
              >
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Transaction Transcript</span>
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                      currentBalance <= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {currentBalance <= 0 ? "Fully Settled" : "Balance Due"}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chronological payment audit ledger for{" "}
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {bill.billNumber}
                  </span>{" "}
                  &bull; {bill.partyName}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyTranscript}
                className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 gap-1.5"
                title="Copy Transcript Text"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintTranscript}
                className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 gap-1.5"
                title="Print Transcript"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Financial Settlement Strip & Progress Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Bill Total
                </span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="border-x border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Total Settled
                </span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(currentPaid)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Outstanding
                </span>
                <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                <span>Settlement Progress</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {percentSettled}% Settled
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    percentSettled >= 100
                      ? "bg-emerald-500"
                      : percentSettled > 0
                      ? "bg-indigo-500"
                      : "bg-slate-300"
                  }`}
                  style={{ width: `${percentSettled}%` }}
                />
              </div>
            </div>
          </div>

          {/* Transcript Vouchers List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Voucher Audit Trail ({payments.length})
              </span>
              {currentBalance > 0 && onOpenRecordPayment && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenRecordPayment(bill);
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isReceipt ? "Record New Receipt" : "Record New Payment"}
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No payment vouchers recorded yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Full amount of {formatCurrency(totalAmount)} is currently pending.
                  </p>
                </div>
                {onOpenRecordPayment && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenRecordPayment(bill);
                    }}
                    className={
                      isReceipt
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {isReceipt ? "Record First Receipt" : "Record First Payment"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {payments.map((voucher, index) => {
                  const methodInfo = getPaymentMethodDetails(
                    voucher.payment_method
                  );
                  return (
                    <div
                      key={voucher.id || index}
                      className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                            {voucher.voucher_number || `#${index + 1}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${methodInfo.badgeClass}`}
                          >
                            {methodInfo.label}
                          </span>
                          {voucher.reference_number && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Ref: {voucher.reference_number}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {voucher.date}
                          </span>
                          {voucher.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {voucher.time}
                            </span>
                          )}
                          {voucher.notes && (
                            <span className="text-slate-600 dark:text-slate-300 italic">
                              &bull; "{voucher.notes}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div
                          className={`text-sm font-extrabold ${
                            isReceipt
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {isReceipt ? "+" : "-"}
                          {formatCurrency(voucher.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Bal After: {formatCurrency(voucher.balance_after)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Original Bill Terms/Notes (if present) */}
          {cleanNotes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Bill Terms / Remarks:
              </span>
              <p className="whitespace-pre-wrap">{cleanNotes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-xs font-semibold"
          >
            Close
          </Button>
          {currentBalance > 0 && onOpenRecordPayment && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenRecordPayment(bill);
              }}
              className={`rounded-lg text-xs font-bold text-white shadow-sm transition-all ${
                isReceipt
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isReceipt
                ? `Receive Payment (${formatCurrency(currentBalance)} Due)`
                : `Pay Vendor (${formatCurrency(currentBalance)} Due)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
