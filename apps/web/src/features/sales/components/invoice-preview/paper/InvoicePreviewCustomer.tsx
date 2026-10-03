import React from "react";
import { InvoiceDetails } from "@/utils/generateInvoicePDF";

interface InvoicePreviewCustomerProps {
  pdfPayload: InvoiceDetails;
  invoice: any;
}

export const InvoicePreviewCustomer: React.FC<InvoicePreviewCustomerProps> = ({
  pdfPayload,
  invoice,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-md border border-slate-200/80 dark:border-slate-800 text-xs">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
          Billed To (Customer Details)
        </p>
        <p className="font-bold text-sm text-slate-900 dark:text-white">
          {pdfPayload.customer_name}
        </p>
        {pdfPayload.customer_phone && (
          <p className="text-slate-600 dark:text-slate-300">
            Phone: {pdfPayload.customer_phone}
          </p>
        )}
        {pdfPayload.customer_email && (
          <p className="text-slate-600 dark:text-slate-300">
            Email: {pdfPayload.customer_email}
          </p>
        )}
        {pdfPayload.customer_gstin && (
          <p className="text-slate-700 dark:text-slate-200 font-semibold mt-0.5">
            GSTIN: {pdfPayload.customer_gstin}
          </p>
        )}
      </div>

      {(invoice?.billing_address || invoice?.shipping_address) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Address
          </p>
          {invoice.billing_address && (
            <p className="text-slate-600 dark:text-slate-300">
              {invoice.billing_address}
            </p>
          )}
          {invoice.shipping_address && invoice.shipping_address !== invoice.billing_address && (
            <p className="text-slate-500 text-[11px] mt-1">
              Ship To: {invoice.shipping_address}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
