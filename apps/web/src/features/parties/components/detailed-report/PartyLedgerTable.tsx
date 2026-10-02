import React from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { LedgerTransaction, parseSafeDate } from "../../lib/detailedLedgerCalculations";

interface PartyLedgerTableProps {
  fullLedger: LedgerTransaction[];
  displayLedger: LedgerTransaction[];
  dateRange: { from?: Date; to?: Date };
  initialBroughtForward: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  closingBalance: number;
  formatCurrency: (amount: number) => string;
}

export const PartyLedgerTable: React.FC<PartyLedgerTableProps> = ({
  fullLedger,
  displayLedger,
  dateRange,
  initialBroughtForward,
  totalPeriodDebit,
  totalPeriodCredit,
  closingBalance,
  formatCurrency,
}) => {
  if (fullLedger.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">No transactions found</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          There are no sales, purchases, or opening balances for this party in the selected date range.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs w-full min-w-0 bg-white dark:bg-slate-900">
      <div className="overflow-x-auto w-full">
        <Table className="w-full min-w-[640px] sm:min-w-[720px]">
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <TableRow>
              <TableHead className="w-[100px] whitespace-nowrap">Date</TableHead>
              <TableHead className="min-w-[200px]">Particulars / Reference</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Voucher Type</TableHead>
              <TableHead className="text-right text-blue-700 dark:text-blue-400 font-bold w-[110px] whitespace-nowrap">
                Debit (Dr)
              </TableHead>
              <TableHead className="text-right text-emerald-700 dark:text-emerald-400 font-bold w-[110px] whitespace-nowrap">
                Credit (Cr)
              </TableHead>
              <TableHead className="text-right bg-slate-100/70 dark:bg-slate-800/70 font-bold w-[130px] whitespace-nowrap">
                Running Balance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {displayLedger.map((tx) => {
              const isBF = tx.id === "opening-balance-bfwd";
              const isOpeningMaster = tx.id.startsWith("open-bal-");
              const isDrEntry = tx.debit > 0;
              const isCrEntry = tx.credit > 0;

              return (
                <TableRow
                  key={tx.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                    (isBF || isOpeningMaster) && "bg-slate-50/60 dark:bg-slate-900/40 font-semibold"
                  )}
                >
                  {/* Date */}
                  <TableCell className="font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {format(parseSafeDate(tx.date), "dd MMM yyyy")}
                  </TableCell>

                  {/* Particulars & Reference */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{tx.ref}</span>
                        {tx.balance_due != null && tx.balance_due > 0 && tx.type === "sale" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200"
                          >
                            Due: {formatCurrency(tx.balance_due)}
                          </Badge>
                        )}
                      </div>
                      {tx.notes && !tx.notes.includes("<!-- FINFLOW_PAYMENTS") && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-md">
                          {tx.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Voucher Type Badge */}
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-mono tracking-tight",
                        tx.type === "sale"
                          ? "border-blue-200 text-blue-700 bg-blue-50/50 dark:bg-blue-950/30"
                          : tx.type === "purchase"
                          ? "border-indigo-200 text-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30"
                          : tx.type === "payment_received"
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30"
                          : tx.type === "payment_made"
                          ? "border-amber-200 text-amber-700 bg-amber-50/50 dark:bg-amber-950/30"
                          : tx.type === "credit_note"
                          ? "border-rose-200 text-rose-700 bg-rose-50/50 dark:bg-rose-950/30"
                          : tx.type === "debit_note"
                          ? "border-teal-200 text-teal-700 bg-teal-50/50 dark:bg-teal-950/30"
                          : "border-slate-300 text-slate-700 bg-slate-100 dark:bg-slate-800"
                      )}
                    >
                      {tx.type.replace("_", " ")}
                    </Badge>
                  </TableCell>

                  {/* Debit (Dr) */}
                  <TableCell className="text-right font-mono font-medium text-blue-700 dark:text-blue-400">
                    {isDrEntry ? formatCurrency(tx.debit) : "-"}
                  </TableCell>

                  {/* Credit (Cr) */}
                  <TableCell className="text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {isCrEntry ? formatCurrency(tx.credit) : "-"}
                  </TableCell>

                  {/* Running Balance */}
                  <TableCell className="text-right font-mono font-bold bg-slate-50/40 dark:bg-slate-900/40 border-l border-slate-200 dark:border-slate-800">
                    <span
                      className={cn(
                        tx.runningBalance > 0
                          ? "text-blue-700 dark:text-blue-400"
                          : tx.runningBalance < 0
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-600"
                      )}
                    >
                      {formatCurrency(Math.abs(tx.runningBalance))}{" "}
                      {tx.runningBalance > 0 ? "Dr" : tx.runningBalance < 0 ? "Cr" : "Nil"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Final Summary Row */}
      <div className="bg-slate-100/90 dark:bg-slate-900/90 p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs font-bold w-full min-w-0">
        <div className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
          Total <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{displayLedger.length}</span> verified entries
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[11px] sm:text-xs w-full md:w-auto justify-between md:justify-end">
          {dateRange.from && initialBroughtForward !== 0 && (
            <div className="text-slate-600 dark:text-slate-400">
              Opening: {formatCurrency(Math.abs(initialBroughtForward))} {initialBroughtForward > 0 ? "Dr" : "Cr"}
            </div>
          )}
          <div className="text-blue-700 dark:text-blue-400">
            Dr: {formatCurrency(totalPeriodDebit)}
          </div>
          <div className="text-emerald-700 dark:text-emerald-400">
            Cr: {formatCurrency(totalPeriodCredit)}
          </div>
          <div
            className={cn(
              "px-2 py-0.5 rounded font-semibold",
              closingBalance > 0
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                : closingBalance < 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            Closing: {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : "Nil"}
          </div>
        </div>
      </div>
    </div>
  );
};
