import { Card } from "@/components/ui/card";
import { Receipt, Calendar, PieChart, Wallet } from "lucide-react";

interface ExpensesMetricsCardsProps {
  totalExpenses: number;
  spentThisMonth: number;
  topCategoryName: string;
  topCategoryAmount: number;
  avgExpense: number;
  expensesCount: number;
  formatCurrency: (amount: number) => string;
}

export function ExpensesMetricsCards({
  totalExpenses,
  spentThisMonth,
  topCategoryName,
  topCategoryAmount,
  avgExpense,
  expensesCount,
  formatCurrency,
}: ExpensesMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Expenses
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
            {expensesCount} transaction{expensesCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Receipt className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Spent This Month
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(spentThisMonth)}
          </p>
          <p className="text-[10px] font-medium text-emerald-500 mt-0.5">
            Current calendar month
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Calendar className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Top Category
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[130px]" title={topCategoryName}>
            {topCategoryName}
          </p>
          <p className="text-[10px] font-medium text-violet-500 mt-0.5">
            {formatCurrency(topCategoryAmount)}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
          <PieChart className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg. Expense
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(avgExpense)}
          </p>
          <p className="text-[10px] font-medium text-amber-500 mt-0.5">
            Per transaction ticket
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Wallet className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}
