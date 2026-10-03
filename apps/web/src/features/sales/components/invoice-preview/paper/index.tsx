import React from "react";
import { InvoiceDetails } from "@/utils/generateInvoicePDF";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { InvoicePreviewHeader } from "./InvoicePreviewHeader";
import { InvoicePreviewCustomer } from "./InvoicePreviewCustomer";
import { InvoicePreviewItemsTable } from "./InvoicePreviewItemsTable";
import { InvoicePreviewPaymentInfo } from "./InvoicePreviewPaymentInfo";
import { InvoicePreviewTotals } from "./InvoicePreviewTotals";
import { InvoicePreviewFooter } from "./InvoicePreviewFooter";

export interface InvoicePreviewPaperProps {
  pdfPayload: InvoiceDetails;
  businessDetails: {
    name: string;
    address: string;
    phone: string;
    gst: string;
    logo_url: string;
    signature_url: string;
    bank_name: string;
    bank_account_no: string;
    bank_ifsc: string;
    bank_branch: string;
    upi_id: string;
  };
  invoice: any;
  salesSettings?: SalesSettings;
  qrCodeDataUrl: string | null;
  formatCurrency: (amount: number) => string;
}

export const InvoicePreviewPaper: React.FC<InvoicePreviewPaperProps> = ({
  pdfPayload,
  businessDetails,
  invoice,
  salesSettings,
  qrCodeDataUrl,
  formatCurrency,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-100 font-sans print:shadow-none print:border-none print:p-0">
        <InvoicePreviewHeader
          businessDetails={businessDetails}
          pdfPayload={pdfPayload}
          invoice={invoice}
        />

        <InvoicePreviewCustomer
          pdfPayload={pdfPayload}
          invoice={invoice}
        />

        <InvoicePreviewItemsTable
          items={pdfPayload.items}
          formatCurrency={formatCurrency}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <InvoicePreviewPaymentInfo
            totalAmount={pdfPayload.total_amount}
            notes={pdfPayload.notes}
            businessDetails={businessDetails}
            qrCodeDataUrl={qrCodeDataUrl}
          />

          <InvoicePreviewTotals
            pdfPayload={pdfPayload}
            salesSettings={salesSettings}
            formatCurrency={formatCurrency}
          />
        </div>

        <InvoicePreviewFooter
          companyName={businessDetails.name}
          signatureUrl={businessDetails.signature_url}
        />
      </div>
    </div>
  );
};
