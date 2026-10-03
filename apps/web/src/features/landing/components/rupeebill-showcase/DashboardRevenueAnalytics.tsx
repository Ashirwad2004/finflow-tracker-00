import React from "react";
import { ArrowUpRight, Activity } from "lucide-react";
import { AnalyticsPeriod, PeriodMetricData } from "./constants";

interface DashboardRevenueAnalyticsProps {
  analyticsPeriod: AnalyticsPeriod;
  onSelectPeriod: (period: AnalyticsPeriod) => void;
  metrics: PeriodMetricData;
}

export const DashboardRevenueAnalytics: React.FC<DashboardRevenueAnalyticsProps> = ({
  analyticsPeriod,
  onSelectPeriod,
  metrics,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1.5 h-4 bg-violet-600 rounded-full inline-block" />
            Revenue Analytics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Last 12 Months — revenue, expenses &amp; profitability at a glance
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => onSelectPeriod("daily")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                analyticsPeriod === "daily"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => onSelectPeriod("monthly")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                analyticsPeriod === "monthly"
                  ? "bg-violet-600 text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onSelectPeriod("yearly")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                analyticsPeriod === "yearly"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500"
              }`}
            >
              Yearly
            </button>
          </div>

          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs text-slate-400">
            <span className="px-2 py-0.5 font-bold cursor-pointer text-violet-600">~</span>
            <span className="px-2 py-0.5 font-bold cursor-pointer">||</span>
          </div>
        </div>
      </div>

      {/* 4 Mini Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 text-xs font-bold">
              ₹
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> 100.0%
            </span>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              REVENUE
            </div>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
              {metrics.analyticsRev}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xs font-bold">
              ⛁
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> 100.0%
            </span>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              EXPENSES
            </div>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
              {metrics.expenses}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xs font-bold">
              📉
            </div>
            <span className="text-[10px] text-slate-400">--</span>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              NET PROFIT
            </div>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
              {metrics.netProfit}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 text-xs font-bold">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] text-slate-400">--</span>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              AVG PER PERIOD
            </div>
            <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
              {metrics.avgPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Revenue vs Costs Chart & Top Periods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* Left Chart Area */}
        <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Revenue vs Costs</span>
              <span className="text-slate-400 text-[11px] ml-2">Last 12 Months</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Purchases
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Expenses
              </span>
            </div>
          </div>

          {/* Simulated Authentic SVG Curve Chart */}
          <div className="h-44 w-full relative pt-2">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 160"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Guideline Grids */}
              <line
                x1="0"
                y1="30"
                x2="500"
                y2="30"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1="80"
                x2="500"
                y2="80"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1="130"
                x2="500"
                y2="130"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />

              {/* Rose Area Curve (Purchases spike as in user screenshot) */}
              <path
                d="M 0,140 Q 250,140 380,140 T 430,30 T 470,140 L 500,140 L 500,160 L 0,160 Z"
                fill="url(#roseGradient)"
              />
              <path
                d="M 0,140 Q 250,140 380,140 T 430,30 T 470,140 L 500,140"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
              />

              {/* Violet Revenue Line */}
              <path
                d="M 0,135 Q 120,135 240,130 T 360,90 T 440,50 L 500,45"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
              />

              {/* Teal Expenses Line */}
              <path
                d="M 0,150 Q 150,150 300,148 T 450,145 L 500,145"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2"
              />
            </svg>

            {/* Y-Axis Label Hints */}
            <div className="absolute top-1 left-0 text-[9px] font-mono text-slate-400">
              100000k
            </div>
            <div className="absolute top-12 left-0 text-[9px] font-mono text-slate-400">
              10000k
            </div>
            <div className="absolute top-24 left-0 text-[9px] font-mono text-slate-400">
              1000k
            </div>
          </div>
        </div>

        {/* Right Top Periods Leaderboard */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Top Periods</div>
            <div className="text-[10px] text-slate-400">Ranked by revenue</div>

            <div className="space-y-3 pt-3">
              {/* Item 1 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-950 font-black text-[9px] flex items-center justify-center">
                      1
                    </span>
                    <span>{metrics.topPeriod1}</span>
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                    {metrics.topAmount1}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="w-[95%] h-full bg-violet-600 rounded-full" />
                </div>
              </div>

              {/* Item 2 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[9px] flex items-center justify-center">
                      2
                    </span>
                    <span>{metrics.topPeriod2}</span>
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                    {metrics.topAmount2}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="w-[35%] h-full bg-violet-400/60 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom App Watermark */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Satyam Hardware Live Sync</span>
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-bold text-[10px]">
              ₹
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
