import React, { useState } from "react";
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
  Printer,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Copy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { toast } from "sonner";
import {
  PaymentReceiptDetails,
  generatePaymentReceiptPDF,
} from "@/utils/generatePaymentReceiptPDF";
import { convertAmountToIndianWords } from "@/utils/generateInvoicePDF";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";

export type { PaymentReceiptDetails };
export type PaymentVoucherDetails = PaymentReceiptDetails;

export interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData?: PaymentReceiptDetails | null;
  voucher?: PaymentReceiptDetails | null;
  voucherId?: string;
  linkedBillId?: string;
  onDeleteVoucher?: (
    voucherNumber: string,
    voucherId?: string,
    linkedBillId?: string
  ) => Promise<void>;
}

export function PaymentReceiptModal({
  open,
  onOpenChange,
  receiptData: propReceiptData,
  voucher,
  voucherId,
  linkedBillId,
  onDeleteVoucher,
}: PaymentReceiptModalProps) {
  const receiptData = propReceiptData || voucher || null;
  const { formatCurrency } = useCurrency();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  if (!receiptData) return null;

  const isReceipt = receiptData.type === "receipt";
  const amount = Number(receiptData.amount || 0);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      toast.loading("Sending payment receipt to printer...", { id: "print-rcpt" });
      await generatePaymentReceiptPDF(receiptData, { action: "print" });
      toast.success("Receipt sent to printer!", { id: "print-rcpt" });
    } catch (e: any) {
      console.error("Receipt print error:", e);
      toast.error("Failed to print receipt: " + (e?.message || "Unknown error"), {
        id: "print-rcpt",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      toast.loading("Generating PDF download...", { id: "dl-rcpt" });
      await generatePaymentReceiptPDF(receiptData, { action: "download" });
      toast.success("Payment receipt downloaded!", { id: "dl-rcpt" });
    } catch (e: any) {
      console.error("Receipt download error:", e);
      toast.error("Failed to download PDF: " + (e?.message || "Unknown error"), {
        id: "dl-rcpt",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyVoucher = () => {
    navigator.clipboard.writeText(receiptData.voucherNumber);
    setCopiedVoucher(true);
    toast.success(`Voucher ${receiptData.voucherNumber} copied!`);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  const confirmDelete = async () => {
    if (!onDeleteVoucher) return;
    setIsDeleting(true);
    try {
      await onDeleteVoucher(
        receiptData.voucherNumber,
        voucherId,
        linkedBillId
      );
      toast.success(`Voucher ${receiptData.voucherNumber} deleted successfully.`);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete voucher error:", err);
      toast.error("Failed to delete voucher: " + (err?.message || "Error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          {/* Header Bar */}
          <div
            className={`px-6 py-4 border-b shrink-0 flex items-center justify-between ${
              isReceipt
                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40"
                : "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  isReceipt ? "bg-emerald-600" : "bg-indigo-600"
                }`}
              >
                {isReceipt ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isReceipt ? "Receipt Voucher" : "Payment Voucher"}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      isReceipt
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300"
                        : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-300"
                    }`}
                  >
                    {isReceipt ? "Payment In" : "Payment Out"}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {receiptData.voucherNumber}
                  </span>
                  <button
                    onClick={handleCopyVoucher}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Copy Voucher #"
                  >
                    {copiedVoucher ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <span>&bull;</span>
                  <span>{receiptData.date}</span>
                  {receiptData.time && <span>{receiptData.time}</span>}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onDeleteVoucher && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  title="Void or Delete this Voucher"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Void
                </Button>
              )}
            </div>
          </div>

          {/* Receipt Body (Document Style) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Top Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Box 1: Business Details */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Issued By
                </span>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {receiptData.businessDetails?.name || "FinFlow Billing Services"}
                </p>
                {receiptData.businessDetails?.address && (
                  <p className="text-[11px] text-slate-500">
                    {receiptData.businessDetails.address}
                  </p>
                )}
                {receiptData.businessDetails?.gst && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    GSTIN: {receiptData.businessDetails.gst}
                  </p>
                )}
              </div>

              {/* Box 2: Party Details */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isReceipt ? "Received From (Customer)" : "Paid To (Vendor)"}
                </span>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {receiptData.partyName}
                </p>
                {receiptData.partyPhone && (
                  <p className="text-[11px] text-slate-500">
                    Ph: {receiptData.partyPhone}
                  </p>
                )}
                {receiptData.partyGstin && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    GSTIN: {receiptData.partyGstin}
                  </p>
                )}
              </div>
            </div>

            {/* Amount Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                isReceipt
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
                  : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800"
              }`}
            >
              <div>
                <span
                  className={`text-[11px] font-extrabold uppercase tracking-wider block ${
                    isReceipt ? "text-emerald-700" : "text-indigo-700"
                  }`}
                >
                  {isReceipt ? "Amount Received" : "Amount Paid"}
                </span>
                <p
                  className={`text-2xl font-black mt-0.5 ${
                    isReceipt
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {formatCurrency(amount)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                  In Words: {convertAmountToIndianWords(amount)}
                </p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payment Mode
                </span>
                <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 uppercase">
                  {receiptData.paymentMethod || "CASH"}
                </span>
                {receiptData.referenceNumber && (
                  <p className="text-[10px] font-mono text-slate-500">
                    Ref: {receiptData.referenceNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Bill Allocation Table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Settlement & Bill Allocation
              </span>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-3 py-2">Bill / Invoice #</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Settled Amount</th>
                      <th className="px-3 py-2 text-right">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receiptData.linkedBills && receiptData.linkedBills.length > 0 ? (
                      receiptData.linkedBills.map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                            {b.billNumber}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {b.date || receiptData.date}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">
                            + {formatCurrency(b.allocatedAmount)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {b.remainingBalance != null && b.remainingBalance <= 0 ? (
                              <span className="text-emerald-600 font-bold">
                                Settled
                              </span>
                            ) : (
                              formatCurrency(b.remainingBalance || 0)
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-2 font-semibold">
                          On Account / Advance Payment
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {receiptData.date}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600">
                          + {formatCurrency(amount)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          Advance Credit
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Party Balance & Notes Box */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Narration / Notes
                </span>
                <p className="text-slate-600 dark:text-slate-300 italic">
                  {receiptData.notes || "Payment settled in full/part."}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isReceipt ? "Customer Remaining Balance" : "Vendor Remaining Balance"}
                </span>
                <p
                  className={`text-base font-extrabold mt-1 ${
                    Number(receiptData.partyCurrentBalance || 0) > 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {Number(receiptData.partyCurrentBalance || 0) > 0
                    ? `${formatCurrency(receiptData.partyCurrentBalance || 0)} Dr`
                    : Number(receiptData.partyCurrentBalance || 0) < 0
                    ? `${formatCurrency(Math.abs(receiptData.partyCurrentBalance || 0))} Cr (Advance)`
                    : "₹0.00 (All Dues Cleared)"}
                </p>
              </div>
            </div>
          </div>

          {/* Dialog Action Footer */}
          <DialogFooter className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold"
            >
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWhatsAppDialog(true)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> PDF
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
                className={`text-xs font-bold text-white shadow-xs ${
                  isReceipt
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Receipt
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void / Delete Confirmation Alert */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Void / Delete Payment Voucher?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to void voucher{" "}
              <strong>{receiptData.voucherNumber}</strong> for{" "}
              <strong>{formatCurrency(amount)}</strong>?
              <br />
              <br />
              This will safely reverse the payment, restore the balance due on any linked
              invoices, and update the party ledger in FinFlow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? "Voiding..." : "Yes, Void Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send WhatsApp Dialog */}
      {showWhatsAppDialog && (
        <SendWhatsAppDialog
          open={showWhatsAppDialog}
          onOpenChange={setShowWhatsAppDialog}
          messageType="receipt"
          recipientName={receiptData.partyName}
          recipientPhone={receiptData.partyPhone || ""}
          metadata={{
            receipt_number: receiptData.voucherNumber,
            amount_received: amount,
            remaining_balance: receiptData.partyCurrentBalance || 0,
            payment_method: receiptData.paymentMethod,
            currency_symbol: "₹",
          }}
          defaultMessage={`Hello ${receiptData.partyName},\n\nPayment Receipt: ${receiptData.voucherNumber}\nAmount: ₹${amount.toLocaleString("en-IN")}\nMode: ${receiptData.paymentMethod.toUpperCase()}${receiptData.referenceNumber ? ` (Ref: ${receiptData.referenceNumber})` : ""}\nRemaining Balance: ₹${Number(receiptData.partyCurrentBalance || 0).toLocaleString("en-IN")}\nDate: ${receiptData.date}\n\nThank you for your business!`}
        />
      )}
    </>
  );
}
