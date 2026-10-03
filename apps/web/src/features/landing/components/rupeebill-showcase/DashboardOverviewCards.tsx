import React from "react";
import { Wallet, Landmark, ReceiptText, TrendingUp } from "lucide-react";
import { PeriodMetricData } from "./constants";

interface DashboardOverviewCardsProps {
  metrics: PeriodMetricData;
}

export const DashboardOverviewCards: React.FC<DashboardOverviewCardsProps> = ({
  metrics,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Revenue */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            TOTAL REVENUE
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
            {metrics.revenue}
          </div>
        </div>
      </div>

      {/* Card 2: Gross Profit */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Landmark className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            GROSS PROFIT
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
            {metrics.profit}
          </div>
        </div>
      </div>

      {/* Card 3: Purchases & Expenses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <ReceiptText className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            PURCHASES &amp; EXPENSES
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
            {metrics.purchases}
          </div>
        </div>
      </div>

      {/* Card 4: Net Profit (Cash Flow) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            NET PROFIT (CASH FLOW)
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight truncate">
            {metrics.cashflow}
          </div>
        </div>
      </div>
    </div>
  );
};
