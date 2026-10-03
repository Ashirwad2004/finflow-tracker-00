import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, Plus, User, Calendar, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/lib/utils";
import { isRecordOverdue } from "@/core/utils/overdue";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface LentLoansListProps {
  pendingLent: any[];
  onLendClick: () => void;
  onSettleLoan: (id: string) => void;
  isSettlePending: boolean;
  onViewAll: () => void;
}

export const LentLoansList: React.FC<LentLoansListProps> = ({
  pendingLent,
  onLendClick,
  onSettleLoan,
  isSettlePending,
  onViewAll,
}) => {
  const { formatCurrency } = useCurrency();

  const handleWhatsAppReminder = (record: any) => {
    const text = `Hi ${record.person_name}, this is a friendly reminder regarding the outstanding amount of ${formatCurrency(record.amount)} lent for "${record.description || "personal transaction"}". Please settle it when you get a chance. Thanks!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const getDueDateLabel = (dueDateStr: string | null) => {
    if (!dueDateStr) return "No due date";
    const date = new Date(dueDateStr);
    return `Due ${format(date, "MMM d, yyyy")}`;
  };

  if (pendingLent.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-emerald-500" />
        </div>
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">All Settled Up!</h4>
        <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
          No outstanding money lent to others right now.
        </p>
        <Button
          onClick={onLendClick}
          size="sm"
          className="mt-3.5 h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Lend Money
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
      {pendingLent.slice(0, 4).map((loan) => {
        const overdue = isRecordOverdue(loan);
        return (
          <div
            key={loan.id}
            className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/[0.02] dark:to-teal-500/[0.02] hover:shadow-sm transition-all duration-200",
              overdue ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-emerald-500/10"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                  overdue
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                )}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {loan.person_name}
                </h4>
                <p className="text-[10px] text-muted-foreground truncate">
                  {loan.description || "Lent money"}
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
                    {getDueDateLabel(loan.due_date)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(loan.amount)}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  onClick={() => handleWhatsAppReminder(loan)}
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/10"
                  title="Send WhatsApp Reminder"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => onSettleLoan(loan.id)}
                  disabled={isSettlePending}
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-500/10"
                  title="Mark as Settled"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {pendingLent.length > 4 && (
        <button
          onClick={onViewAll}
          className="w-full text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1.5 flex items-center justify-center gap-1"
        >
          View all {pendingLent.length} loans <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};
