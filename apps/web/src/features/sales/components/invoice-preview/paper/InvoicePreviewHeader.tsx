import React from "react";
import { InvoiceDetails } from "@/utils/generateInvoicePDF";

interface InvoicePreviewHeaderProps {
  businessDetails: {
    name: string;
    address: string;
    phone: string;
    gst: string;
    logo_url: string;
  };
  pdfPayload: InvoiceDetails;
  invoice: any;
}

export const InvoicePreviewHeader: React.FC<InvoicePreviewHeaderProps> = ({
  businessDetails,
  pdfPayload,
  invoice,
}) => {
  return (
    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
      <div className="space-y-1 max-w-[60%]">
        {businessDetails.logo_url && (
          <img
            src={businessDetails.logo_url}
            alt={businessDetails.name}
            className="h-12 w-auto object-contain mb-2"
          />
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
          {businessDetails.name}
        </h1>
        {businessDetails.address && (
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
            {businessDetails.address}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
          {businessDetails.phone && (
            <span>
              <strong>Phone:</strong> {businessDetails.phone}
            </span>
          )}
          {businessDetails.gst && (
            <span>
              <strong>GSTIN:</strong> {businessDetails.gst}
            </span>
          )}
        </div>
      </div>

      <div className="text-right space-y-1">
        <div className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1 rounded text-xs font-black tracking-wider uppercase mb-1">
          TAX INVOICE
        </div>
        <p className="text-xs text-slate-500">
          Invoice No:{" "}
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {pdfPayload.invoice_number}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Date:{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {pdfPayload.date}
          </span>
        </p>
        {pdfPayload.due_date && (
          <p className="text-xs text-slate-500">
            Due Date:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pdfPayload.due_date}
            </span>
          </p>
        )}
        {invoice?.place_of_supply && (
          <p className="text-xs text-slate-500">
            Place of Supply:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {invoice.place_of_supply}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};
