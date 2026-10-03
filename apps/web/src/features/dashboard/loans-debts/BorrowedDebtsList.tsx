import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, Plus, User, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/lib/utils";
import { isRecordOverdue } from "@/core/utils/overdue";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface BorrowedDebtsListProps {
  pendingBorrowed: any[];
  onBorrowClick: () => void;
  onSettleDebt: (id: string) => void;
  isSettlePending: boolean;
  onViewAll: () => void;
}

export const BorrowedDebtsList: React.FC<BorrowedDebtsListProps> = ({
  pendingBorrowed,
  onBorrowClick,
  onSettleDebt,
  isSettlePending,
  onViewAll,
}) => {
  const { formatCurrency } = useCurrency();

  const getDueDateLabel = (dueDateStr: string | null) => {
    if (!dueDateStr) return "No due date";
    const date = new Date(dueDateStr);
    return `Due ${format(date, "MMM d, yyyy")}`;
  };

  if (pendingBorrowed.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20"
      >
        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-rose-500" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Outstanding Debts!</h4>
        <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
          You don't owe any money to anyone right now.
        </p>
        <Button
          onClick={onBorrowClick}
          size="sm"
          className="mt-3.5 h-8 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Record Debt
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1"
    >
      {pendingBorrowed.slice(0, 4).map((debt) => {
        const overdue = isRecordOverdue(debt);
        return (
          <div
            key={debt.id}
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r from-rose-500/5 to-orange-500/5 dark:from-rose-500/[0.02] dark:to-orange-500/[0.02] hover:shadow-sm transition-all duration-200",
              overdue ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-rose-500/10"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                  overdue
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                )}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {debt.person_name}
                </h4>
                <p className="text-[10px] text-muted-foreground truncate">
                  {debt.description || "Borrowed money"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span
                    className={cn(
                      "text-[9px] font-bold",
                      overdue ? "text-rose-500" : "text-muted-foreground"
                    )}
                  >
                    {overdue ? "OVERDUE • " : ""}
                    {getDueDateLabel(debt.due_date)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(debt.amount)}
              </span>

              <Button
                onClick={() => onSettleDebt(debt.id)}
                disabled={isSettlePending}
                size="icon"
                variant="ghost"
                className="w-7 h-7 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-500/10"
                title="Mark as Repaid"
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      {pendingBorrowed.length > 4 && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline pt-1.5 flex items-center justify-center gap-1"
        >
          View all {pendingBorrowed.length} debts <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};
