import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { OverdueRowState } from "./types";
import { isValidPhone } from "./phoneUtils";

interface BulkReminderRecipientListProps {
  rows: OverdueRowState[];
  allSelected: boolean;
  validPhoneCount: number;
  isProcessing: boolean;
  currencySymbol: string;
  onSelectAll: (checked: boolean) => void;
  onToggleRow: (index: number) => void;
}

export const BulkReminderRecipientList: React.FC<BulkReminderRecipientListProps> = ({
  rows,
  allSelected,
  validPhoneCount,
  isProcessing,
  currencySymbol,
  onSelectAll,
  onToggleRow,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all-bulk"
            checked={allSelected}
            onCheckedChange={onSelectAll}
            disabled={isProcessing}
          />
          <label
            htmlFor="select-all-bulk"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            Select All ({validPhoneCount} eligible)
          </label>
        </div>
        <span className="text-[11px] text-slate-400">
          Only invoices with valid mobile numbers can receive reminders
        </span>
      </div>

      <ScrollArea className="h-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2">
        <div className="space-y-1.5">
          {rows.map((row, idx) => {
            const hasValidPhone = isValidPhone(row.invoice.customer_phone);
            const bal =
              row.invoice.balance_due != null
                ? Number(row.invoice.balance_due)
                : Math.max(
                    0,
                    Number(row.invoice.total_amount) -
                      Number(row.invoice.amount_paid || 0)
                  );

            return (
              <div
                key={row.invoice.id || row.invoice.invoice_number}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                  row.selected
                    ? "bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-2xs"
                    : "bg-transparent border-transparent opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Checkbox
                    checked={row.selected}
                    onCheckedChange={() => onToggleRow(idx)}
                    disabled={!hasValidPhone || isProcessing}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {row.invoice.customer_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        #{row.invoice.invoice_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      {hasValidPhone ? (
                        <span className="text-slate-600 dark:text-slate-400 font-mono">
                          {row.invoice.customer_phone}
                        </span>
                      ) : (
                        <span className="text-rose-500 flex items-center gap-1 text-[10px] font-medium">
                          <AlertCircle className="w-3 h-3" /> No phone number
                        </span>
                      )}
                      {row.invoice.due_date && (
                        <span>&bull; Due: {row.invoice.due_date}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Balance & Status */}
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="text-right">
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {currencySymbol}
                      {bal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="w-20 text-right">
                    {row.status === "sending" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0.5 border-emerald-300 text-emerald-600"
                      >
                        <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> Sending
                      </Badge>
                    )}
                    {row.status === "success" && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0.5 gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" /> Sent
                      </Badge>
                    )}
                    {row.status === "failed" && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] py-0.5 gap-1 cursor-help"
                        title={row.error}
                      >
                        <XCircle className="w-2.5 h-2.5" /> Failed
                      </Badge>
                    )}
                    {row.status === "idle" && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {row.selected ? "Ready" : "Skipped"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
