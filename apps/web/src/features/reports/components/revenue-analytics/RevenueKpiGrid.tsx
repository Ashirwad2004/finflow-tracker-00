import React from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Layers,
  Minus,
  Activity,
} from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  trend: number;
  icon: any;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  trend,
  icon: Icon,
  color,
}) => {
  const isPositive = trend >= 0;
  const TrendIcon = trend === 0 ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const trendColor =
    trend === 0
      ? "text-slate-400"
      : isPositive
      ? "text-emerald-500"
      : "text-rose-500";

  return (
    <div className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-bold ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {trend !== 0 && <span>{Math.abs(trend).toFixed(1)}%</span>}
          {trend === 0 && <span>—</span>}
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
        {value}
      </p>
    </div>
  );
};

interface RevenueKpiGridProps {
  currentRevenue: number;
  currentExpenses: number;
  netProfit: number;
  avgRevenue: number;
  revTrend: number;
  expTrend: number;
  profitTrend: number;
  formatCurrency: (amount: number) => string;
}

export const RevenueKpiGrid: React.FC<RevenueKpiGridProps> = ({
  currentRevenue,
  currentExpenses,
  netProfit,
  avgRevenue,
  revTrend,
  expTrend,
  profitTrend,
  formatCurrency,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="Revenue"
        value={formatCurrency(currentRevenue)}
        trend={revTrend}
        icon={IndianRupee}
        color="text-primary bg-primary/10"
      />
      <KpiCard
        label="Expenses"
        value={formatCurrency(currentExpenses)}
        trend={expTrend}
        icon={Layers}
        color="text-rose-600 bg-rose-100 dark:bg-rose-900/30"
      />
      <KpiCard
        label="Net Profit"
        value={formatCurrency(netProfit)}
        trend={profitTrend}
        icon={netProfit >= 0 ? TrendingUp : TrendingDown}
        color={
          netProfit >= 0
            ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30"
            : "text-rose-600 bg-rose-100 dark:bg-rose-900/30"
        }
      />
      <KpiCard
        label="Avg per Period"
        value={formatCurrency(isFinite(avgRevenue) ? avgRevenue : 0)}
        trend={0}
        icon={Activity}
        color="text-violet-600 bg-violet-100 dark:bg-violet-900/30"
      />
    </div>
  );
};
