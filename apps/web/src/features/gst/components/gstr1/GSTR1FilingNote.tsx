import React from "react";
import { CheckCircle2 } from "lucide-react";

export const GSTR1FilingNote: React.FC = () => {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <span className="font-bold text-slate-800 dark:text-white block mb-1">
          Filing Reminder
        </span>
        GSTR-1 is due on the <strong>11th of the following month</strong> (monthly
        filers) or <strong>13th of the month after the quarter end</strong> (quarterly
        QRMP filers). Export the data above and upload to the <strong>GSTN portal</strong>{" "}
        (gst.gov.in) under <em>Returns → GSTR-1 → Upload JSON or manual entry</em>. Always
        verify B2B GSTIN validity before filing at <strong>mastergst.com</strong> or
        the official GSTN search.
      </div>
    </div>
  );
};
