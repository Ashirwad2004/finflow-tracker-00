import React, { useMemo } from "react";

export function BusinessHealthDiagnosticView({ health, bs, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Working Capital</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(health.workingCapital)}
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Current Ratio</div>
          <div className="text-base font-bold text-blue-600 mt-1">
            {health.currentRatio.toFixed(2)} : 1
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Quick Ratio</div>
          <div className="text-base font-bold text-emerald-600 mt-1">
            {health.quickRatio.toFixed(2)} : 1
          </div>
        </div>
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 font-medium">Debt-to-Equity</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            {health.debtToEquity.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
