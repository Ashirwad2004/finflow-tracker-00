import React from "react";
import { Badge } from "@/components/ui/badge";
import { Phone, Building, MessageCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";

interface PartySummaryBannerProps {
  selectedParty: string;
  activePartyRecord: any;
  closingBalance: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  formatCurrency: (amount: number) => string;
  onSendWhatsAppReminder: () => void;
}

export const PartySummaryBanner: React.FC<PartySummaryBannerProps> = ({
  selectedParty,
  activePartyRecord,
  closingBalance,
  totalPeriodDebit,
  totalPeriodCredit,
  formatCurrency,
  onSendWhatsAppReminder,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 w-full shadow-2xs space-y-4">
      {/* 1. Header: Party Identity & Contact Information */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {selectedParty}
            </h2>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
            >
              {activePartyRecord?.type ? activePartyRecord.type.toUpperCase() : "PARTY"}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
            {activePartyRecord?.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-medium">{activePartyRecord.phone}</span>
              </div>
            )}
            {activePartyRecord?.gst && (
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono font-medium">GSTIN: {activePartyRecord.gst}</span>
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Reminder Button */}
        {activePartyRecord?.phone && closingBalance > 0 && (
          <div className="shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={onSendWhatsAppReminder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Send WhatsApp Reminder</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Three Financial Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
        {/* Card 1: Total Debit (Dr) */}
        <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Debit (Dr)
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950 px-1.5 py-0.5 rounded">
              Dr
            </span>
          </div>
          <div
            className="text-lg sm:text-2xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-2 truncate"
            title={formatCurrency(totalPeriodDebit)}
          >
            {formatCurrency(totalPeriodDebit)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Total Invoiced / Outward
          </div>
        </div>

        {/* Card 2: Total Credit (Cr) */}
        <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Credit (Cr)
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
              Cr
            </span>
          </div>
          <div
            className="text-lg sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-2 truncate"
            title={formatCurrency(totalPeriodCredit)}
          >
            {formatCurrency(totalPeriodCredit)}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Total Payments Received
          </div>
        </div>

        {/* Card 3: Net Closing Balance */}
        <div
          className={cn(
            "rounded-xl p-3.5 sm:p-4 border flex flex-col justify-between",
            closingBalance > 0
              ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              : closingBalance < 0
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
          )}
        >
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                closingBalance > 0
                  ? "text-blue-800 dark:text-blue-300"
                  : closingBalance < 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-emerald-800 dark:text-emerald-300"
              )}
            >
              Closing Balance
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                closingBalance > 0
                  ? "bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200"
                  : closingBalance < 0
                  ? "bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                  : "bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200"
              )}
            >
              {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : "Nil"}
            </span>
          </div>
          <div
            className={cn(
              "text-lg sm:text-2xl font-bold font-mono mt-2 truncate",
              closingBalance > 0
                ? "text-blue-700 dark:text-blue-300"
                : closingBalance < 0
                ? "text-amber-700 dark:text-amber-300"
                : "text-emerald-700 dark:text-emerald-300"
            )}
            title={formatCurrency(Math.abs(closingBalance))}
          >
            {formatCurrency(Math.abs(closingBalance))}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {closingBalance > 0
              ? "Net Receivable from Party"
              : closingBalance < 0
              ? "Net Payable to Party"
              : "All Accounts Settled (Nil)"}
          </div>
        </div>
      </div>
    </div>
  );
};
