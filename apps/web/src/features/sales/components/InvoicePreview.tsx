import React from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import {
  InvoicePreviewProps,
  useInvoicePreview,
  InvoicePreviewActionBar,
  InvoicePreviewPaper,
} from "./invoice-preview";

export * from "./invoice-preview/types";

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  invoice,
  profile,
  salesSettings,
  onEdit,
  onClose,
  isDraft = false,
  onSave,
}) => {
  const { formatCurrency } = useCurrency();
  const {
    businessDetails,
    qrCodeDataUrl,
    pdfPayload,
    isPrinting,
    isDownloading,
    isPreparingWhatsApp,
    isWhatsAppOpen,
    setIsWhatsAppOpen,
    whatsappPdfBase64,
    handlePrint,
    handleDownload,
    handleOpenWhatsApp,
  } = useInvoicePreview({ invoice, profile, salesSettings });

  return (
    <div className="flex flex-col h-full max-h-[92vh] overflow-hidden bg-slate-50 dark:bg-slate-950">
      <DialogTitle className="sr-only">
        Invoice Preview - {pdfPayload.invoice_number}
      </DialogTitle>

      <InvoicePreviewActionBar
        invoiceNumber={pdfPayload.invoice_number}
        status={pdfPayload.status}
        isDraft={isDraft}
        onEdit={onEdit}
        onSave={onSave}
        onClose={onClose}
        onPrint={handlePrint}
        isPrinting={isPrinting}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        onOpenWhatsApp={handleOpenWhatsApp}
        isPreparingWhatsApp={isPreparingWhatsApp}
      />

      <InvoicePreviewPaper
        pdfPayload={pdfPayload}
        businessDetails={businessDetails}
        invoice={invoice}
        salesSettings={salesSettings}
        qrCodeDataUrl={qrCodeDataUrl}
        formatCurrency={formatCurrency}
      />

      {isWhatsAppOpen && (
        <SendWhatsAppDialog
          open={isWhatsAppOpen}
          onOpenChange={setIsWhatsAppOpen}
          messageType="invoice"
          recipientName={pdfPayload.customer_name || "Customer"}
          recipientPhone={pdfPayload.customer_phone || ""}
          attachmentName={`Invoice_${pdfPayload.invoice_number}.pdf`}
          attachmentBase64={whatsappPdfBase64}
          metadata={{
            invoice_id: invoice?.id,
            invoice_number: pdfPayload.invoice_number,
            total_amount: Number(pdfPayload.total_amount || 0),
            amount_paid: Number(pdfPayload.amount_paid || 0),
            balance_due: Number(pdfPayload.balance_due || 0),
            due_date: pdfPayload.due_date || undefined,
          }}
          onSuccess={() => {
            toast.success("Invoice sent via WhatsApp successfully!");
          }}
        />
      )}
    </div>
  );
};

export default InvoicePreview;
