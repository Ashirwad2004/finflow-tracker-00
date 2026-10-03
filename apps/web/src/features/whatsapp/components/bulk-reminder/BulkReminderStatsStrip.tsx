import React from "react";
import { ReceiptIndianRupee, Users, CheckCircle2 } from "lucide-react";

interface BulkReminderStatsStripProps {
  currencySymbol: string;
  totalOverdueBalance: number;
  validPhoneCount: number;
  invoiceCount: number;
  totalToSend: number;
}

export const BulkReminderStatsStrip: React.FC<BulkReminderStatsStripProps> = ({
  currencySymbol,
  totalOverdueBalance,
  validPhoneCount,
  invoiceCount,
  totalToSend,
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <ReceiptIndianRupee className="w-3.5 h-3.5" /> Total Overdue
        </span>
        <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
          {currencySymbol}
          {totalOverdueBalance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Valid Phone Numbers
        </span>
        <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
          {validPhoneCount} / {invoiceCount}
        </p>
      </div>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selected to Send
        </span>
        <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
          {totalToSend}
        </p>
      </div>
    </div>
  );
};
