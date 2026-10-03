import React from "react";

interface InvoicePreviewFooterProps {
  companyName: string;
  signatureUrl?: string;
}

export const InvoicePreviewFooter: React.FC<InvoicePreviewFooterProps> = ({
  companyName,
  signatureUrl,
}) => {
  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-500">
      <div>
        <p className="text-[10px] text-slate-400">
          Thank you for your business!
        </p>
        <p className="text-[10px] text-slate-400">
          This is a computer generated invoice and requires no signature.
        </p>
      </div>

      <div className="text-right">
        <div className="h-12 flex items-center justify-end">
          {signatureUrl && (
            <img
              src={signatureUrl}
              alt="Authorized Signature"
              className="h-10 w-auto object-contain"
            />
          )}
        </div>
        <p className="font-semibold text-slate-800 dark:text-slate-200 border-t border-slate-300 dark:border-slate-700 pt-1">
          For {companyName}
        </p>
        <p className="text-[10px] text-slate-400">Authorized Signatory</p>
      </div>
    </div>
  );
};
