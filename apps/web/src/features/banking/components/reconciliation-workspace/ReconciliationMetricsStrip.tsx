import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { BankAccount } from "../types";

interface ReconciliationMetricsStripProps {
  ledgerBalance: number;
  statementBalance: number;
  difference: number;
  isBalanced: boolean;
  activeAccount: BankAccount | undefined;
  uploadedLinesCount: number;
}

export const ReconciliationMetricsStrip: React.FC<ReconciliationMetricsStripProps> = ({
  ledgerBalance,
  statementBalance,
  difference,
  isBalanced,
  activeAccount,
  uploadedLinesCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Company General Ledger Balance
        </span>
        <span className="text-xl font-bold font-mono text-foreground mt-1">
          ₹{ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          Internal books balance for {activeAccount?.bankName || "All Accounts"}
        </span>
      </div>

      <div className="bg-card border border-border/80 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
          Bank Statement Balance
        </span>
        <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
          ₹{statementBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {uploadedLinesCount > 0 ? `From ${uploadedLinesCount} uploaded statement lines` : "No statement uploaded"}
        </span>
      </div>

      <div
        className={cn(
          "bg-card border p-4 rounded-2xl flex flex-col justify-between shadow-xs",
          isBalanced ? "border-emerald-500/30" : "border-amber-500/30"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Reconciliation Variance
          </span>
          {isBalanced ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] font-bold">
              Balanced
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px] font-bold">
              Delta
            </Badge>
          )}
        </div>
        <span
          className={cn(
            "text-xl font-bold font-mono mt-1",
            isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
          )}
        >
          ₹{difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {isBalanced ? "General ledger perfectly matches bank feeds!" : "Pending reconciliation entries"}
        </span>
      </div>
    </div>
  );
};
