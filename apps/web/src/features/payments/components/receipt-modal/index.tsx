import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  Share2,
  AlertCircle,
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
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { PaymentReceiptModalProps } from "./types";
import { useReceiptModalActions } from "./useReceiptModalActions";
import { ReceiptModalHeader } from "./ReceiptModalHeader";
import { ReceiptModalAmountBanner } from "./ReceiptModalAmountBanner";
import { ReceiptModalAllocationsTable } from "./ReceiptModalAllocationsTable";

export * from "./types";
export * from "./useReceiptModalActions";
export * from "./ReceiptModalHeader";
export * from "./ReceiptModalAmountBanner";
export * from "./ReceiptModalAllocationsTable";

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

  const {
    isPrinting,
    isDownloading,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showWhatsAppDialog,
    setShowWhatsAppDialog,
    copiedVoucher,
    handlePrint,
    handleDownload,
    handleCopyVoucher,
    confirmDelete,
  } = useReceiptModalActions(
    receiptData,
    voucherId,
    linkedBillId,
    onDeleteVoucher,
    () => onOpenChange(false)
  );

  if (!receiptData) return null;

  const isReceipt = receiptData.type === "receipt";
  const amount = Number(receiptData.amount || 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <ReceiptModalHeader
            receiptData={receiptData}
            isReceipt={isReceipt}
            copiedVoucher={copiedVoucher}
            hasDeleteHandler={Boolean(onDeleteVoucher)}
            onCopyVoucher={handleCopyVoucher}
            onRequestDelete={() => setShowDeleteConfirm(true)}
          />

          {/* Receipt Body (Document Style) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <ReceiptModalAmountBanner
              receiptData={receiptData}
              isReceipt={isReceipt}
              amount={amount}
              formatCurrency={formatCurrency}
            />

            <ReceiptModalAllocationsTable
              receiptData={receiptData}
              isReceipt={isReceipt}
              amount={amount}
              formatCurrency={formatCurrency}
            />
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

export default PaymentReceiptModal;
