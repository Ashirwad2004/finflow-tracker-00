import React from "react";
import { convertAmountToIndianWords } from "@/utils/generateInvoicePDF";

interface InvoicePreviewPaymentInfoProps {
  totalAmount: number;
  notes?: string;
  businessDetails: {
    bank_name: string;
    bank_account_no: string;
    bank_ifsc: string;
    upi_id: string;
  };
  qrCodeDataUrl: string | null;
}

export const InvoicePreviewPaymentInfo: React.FC<InvoicePreviewPaymentInfoProps> = ({
  totalAmount,
  notes,
  businessDetails,
  qrCodeDataUrl,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Invoice Amount In Words
        </p>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-200/60 dark:border-slate-800">
          {convertAmountToIndianWords(totalAmount)}
        </p>
      </div>

      {/* Bank Details & QR code */}
      {(businessDetails.bank_account_no || businessDetails.upi_id) && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bank & Payment Info
            </p>
            {businessDetails.bank_name && (
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Bank:</strong> {businessDetails.bank_name}
              </p>
            )}
            {businessDetails.bank_account_no && (
              <p className="text-slate-600 dark:text-slate-300">
                <strong>A/C:</strong> {businessDetails.bank_account_no}
              </p>
            )}
            {businessDetails.bank_ifsc && (
              <p className="text-slate-600 dark:text-slate-300">
                <strong>IFSC:</strong> {businessDetails.bank_ifsc}
              </p>
            )}
            {businessDetails.upi_id && (
              <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] pt-1">
                <strong>UPI ID:</strong> {businessDetails.upi_id}
              </p>
            )}
          </div>

          {qrCodeDataUrl && (
            <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-slate-200 shadow-2xs">
              <img src={qrCodeDataUrl} alt="UPI Payment QR" className="w-20 h-20" />
              <span className="text-[9px] text-slate-500 font-semibold mt-0.5">
                Scan to Pay
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notes / Terms */}
      {notes && (
        <div className="text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Terms & Notes:</p>
          <p className="whitespace-pre-line text-[11px]">{notes}</p>
        </div>
      )}
    </div>
  );
};
