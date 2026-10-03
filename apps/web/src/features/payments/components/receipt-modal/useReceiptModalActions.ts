import { useState } from "react";
import { toast } from "sonner";
import {
  PaymentReceiptDetails,
  generatePaymentReceiptPDF,
} from "@/utils/generatePaymentReceiptPDF";

export function useReceiptModalActions(
  receiptData: PaymentReceiptDetails | null,
  voucherId: string | undefined,
  linkedBillId: string | undefined,
  onDeleteVoucher: ((voucherNumber: string, voucherId?: string, linkedBillId?: string) => Promise<void>) | undefined,
  onClose: () => void
) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const handlePrint = async () => {
    if (!receiptData) return;
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
    if (!receiptData) return;
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
    if (!receiptData) return;
    navigator.clipboard.writeText(receiptData.voucherNumber);
    setCopiedVoucher(true);
    toast.success(`Voucher ${receiptData.voucherNumber} copied!`);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  const confirmDelete = async () => {
    if (!onDeleteVoucher || !receiptData) return;
    setIsDeleting(true);
    try {
      await onDeleteVoucher(
        receiptData.voucherNumber,
        voucherId,
        linkedBillId
      );
      toast.success(`Voucher ${receiptData.voucherNumber} deleted successfully.`);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      console.error("Delete voucher error:", err);
      toast.error("Failed to delete voucher: " + (err?.message || "Error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
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
  };
}
