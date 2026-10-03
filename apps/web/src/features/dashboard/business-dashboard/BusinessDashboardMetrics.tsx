import { Wallet, Landmark, ReceiptText, TrendingUp, Settings } from "lucide-react";

interface BusinessDashboardMetricsProps {
  totalRevenue: number;
  grossProfit: number;
  totalPurchases: number;
  totalExpenses: number;
  netProfit: number;
  formatCurrency: (amount: number) => string;
  onOpenProfile: () => void;
}

export function BusinessDashboardMetrics({
  totalRevenue,
  grossProfit,
  totalPurchases,
  totalExpenses,
  netProfit,
  formatCurrency,
  onOpenProfile,
}: BusinessDashboardMetricsProps) {
  return (
    <>
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Financial Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time financial overview and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-white border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <button
              className="px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md"
              onClick={onOpenProfile}
            >
              <Settings className="inline-block w-4 h-4 mr-1" /> Profile
            </button>
            <button className="px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-md">
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Card 1 */}
        <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg text-primary bg-primary/10">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Total Revenue
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalRevenue)}
          </h3>
        </div>

        {/* Card 2 */}
        <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 text-teal-600 bg-teal-100 rounded-lg dark:bg-teal-900/30">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Gross Profit
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(grossProfit)}
          </h3>
        </div>

        {/* Card 3 */}
        <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 text-rose-600 bg-rose-100 rounded-lg dark:bg-rose-900/30">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Purchases & Expenses
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalPurchases + totalExpenses)}
          </h3>
        </div>

        {/* Card 4 */}
        <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 text-indigo-600 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Net Profit (Cash Flow)
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(netProfit)}
          </h3>
        </div>
      </div>
    </>
  );
}
