import React from "react";
import { CreateInvoiceDialog } from "../../components/CreateInvoiceDialog";
import { UniversalPaymentDialog } from "@/features/payments/components/UniversalPaymentDialog";
import { BillPaymentTranscriptDialog } from "@/features/payments/components/BillPaymentTranscriptDialog";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { BulkWhatsAppReminderDialog } from "@/features/whatsapp/components/BulkWhatsAppReminderDialog";
import { SalesSettingsDialog } from "../../components/SalesSettingsDialog";
import { Sale } from "../../types";

interface SalesPageModalsProps {
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  editingInvoice: any;
  setEditingInvoice: (inv: any) => void;
  settings: any;
  updateSetting: any;
  resetSettings: any;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isPaymentInOpen: boolean;
  setIsPaymentInOpen: (open: boolean) => void;
  paymentTarget: any;
  setPaymentTarget: (target: any) => void;
  transcriptTarget: any;
  setTranscriptTarget: (target: any) => void;
  whatsappInvoice: any;
  setWhatsappInvoice: (inv: any) => void;
  whatsappPdfBase64: string | null;
  isBulkWhatsAppOpen: boolean;
  setIsBulkWhatsAppOpen: (open: boolean) => void;
  invoices: Sale[];
  navigate: (path: string) => void;
}

export const SalesPageModals: React.FC<SalesPageModalsProps> = ({
  isCreateOpen,
  setIsCreateOpen,
  editingInvoice,
  setEditingInvoice,
  settings,
  updateSetting,
  resetSettings,
  isSettingsOpen,
  setIsSettingsOpen,
  isPaymentInOpen,
  setIsPaymentInOpen,
  paymentTarget,
  setPaymentTarget,
  transcriptTarget,
  setTranscriptTarget,
  whatsappInvoice,
  setWhatsappInvoice,
  whatsappPdfBase64,
  isBulkWhatsAppOpen,
  setIsBulkWhatsAppOpen,
  invoices,
  navigate,
}) => {
  return (
    <>
      <CreateInvoiceDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        invoiceToEdit={editingInvoice}
        salesSettings={settings}
        onSuccess={(_newInv) => {
          // Handled natively by InvoicePreview inside CreateInvoiceDialog
        }}
      />

      {/* Universal Payment In (Receipt) Dialog */}
      <UniversalPaymentDialog
        open={isPaymentInOpen || !!paymentTarget}
        onOpenChange={(open) => {
          if (!open) {
            setIsPaymentInOpen(false);
            setPaymentTarget(null);
          }
        }}
        mode="payment_in"
        initialBill={paymentTarget}
      />

      {/* CA Bill Payment Transcript / Ledger Audit Dialog */}
      <BillPaymentTranscriptDialog
        open={!!transcriptTarget}
        onOpenChange={(open) => !open && setTranscriptTarget(null)}
        bill={transcriptTarget}
        onOpenRecordPayment={(target) => setPaymentTarget(target)}
      />

      {/* WhatsApp Invoice Dialog */}
      {whatsappInvoice && (
        <SendWhatsAppDialog
          open={!!whatsappInvoice}
          onOpenChange={(open) => !open && setWhatsappInvoice(null)}
          messageType="invoice"
          recipientName={whatsappInvoice.customer_name}
          recipientPhone={whatsappInvoice.customer_phone || ""}
          attachmentName={`Invoice_${whatsappInvoice.invoice_number}.pdf`}
          attachmentBase64={whatsappPdfBase64}
          metadata={{
            invoice_id: whatsappInvoice.id,
            invoice_number: whatsappInvoice.invoice_number,
            total_amount: Number(whatsappInvoice.total_amount || 0),
            amount_paid: Number(whatsappInvoice.amount_paid || 0),
            balance_due: Number(
              whatsappInvoice.balance_due != null
                ? whatsappInvoice.balance_due
                : Math.max(
                    0,
                    Number(whatsappInvoice.total_amount) - Number(whatsappInvoice.amount_paid || 0)
                  )
            ),
            due_date: whatsappInvoice.due_date || undefined,
          }}
        />
      )}

      {/* Bulk WhatsApp Reminders Dialog */}
      <BulkWhatsAppReminderDialog
        open={isBulkWhatsAppOpen}
        onOpenChange={setIsBulkWhatsAppOpen}
        invoices={invoices.filter((inv) => inv.status === "overdue")}
        currencySymbol="₹"
        onOpenSettings={() => navigate("/settings?tab=whatsapp")}
      />

      {/* Sales Settings Dialog */}
      <SalesSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
      />
    </>
  );
};
