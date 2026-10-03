import React from "react";
import { ChartDataPoint } from "./types";

interface TopPeriodsBreakdownCardProps {
  topPeriods: ChartDataPoint[];
  maxRev: number;
  currentRevenue: number;
  netProfit: number;
  formatCurrency: (amount: number) => string;
}

export const TopPeriodsBreakdownCard: React.FC<TopPeriodsBreakdownCardProps> = ({
  topPeriods,
  maxRev,
  currentRevenue,
  netProfit,
  formatCurrency,
}) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col">
      <h4 className="font-bold text-slate-900 dark:text-white mb-1">Top Periods</h4>
      <p className="text-xs text-slate-500 mb-5">Ranked by revenue</p>

      {topPeriods.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          No data available
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {topPeriods.map((period, i) => {
            const pct = maxRev > 0 ? (period.revenue / maxRev) * 100 : 0;
            const profit = period.revenue - (period.purchases || 0) - period.expenses;
            return (
              <div key={period.name} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 ${
                        i === 0
                          ? "bg-amber-400"
                          : i === 1
                          ? "bg-slate-400"
                          : i === 2
                          ? "bg-orange-400"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {period.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(period.revenue)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        profit >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Rev.</p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(currentRevenue)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Net Profit</p>
          <p
            className={`text-sm font-extrabold mt-0.5 ${
              netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>
    </div>
  );
};
