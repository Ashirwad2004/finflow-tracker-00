import React, { useMemo } from "react";

export function BalanceSheetView({ bs, formatCurrency }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
      {/* Assets */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs border-b">
          ASSETS (Application of Funds)
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Current Assets</td>
            </tr>
            {Object.entries(bs.currentAssets).map(([name, val]) => (
              <tr key={name}>
                <td className="py-1.5 px-6">{name}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(val)}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50 dark:bg-slate-800/40 border-t">
              <td className="py-2 px-3">Total Current Assets</td>
              <td className="py-2 px-3 text-right font-mono">{formatCurrency(bs.totalCurrentAssets)}</td>
            </tr>
            <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-xs border-t-2 border-blue-600">
              <td className="py-2 px-3">TOTAL ASSETS</td>
              <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(bs.totalAssets)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Liabilities & Equity */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs border-b">
          LIABILITIES & EQUITY (Sources of Funds)
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Current Liabilities</td>
            </tr>
            {Object.entries(bs.currentLiabilities).map(([name, val]) => (
              <tr key={name}>
                <td className="py-1.5 px-6">{name}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(val)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold">
              <td className="py-1.5 px-3" colSpan={2}>Owner's Equity & Reserves</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Proprietor's Capital Account</td>
              <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(bs.proprietorCapital)}</td>
            </tr>
            <tr>
              <td className="py-1.5 px-6">Current Period Profit / Loss</td>
              <td className="py-1.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(bs.periodProfit)}</td>
            </tr>
            <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-xs border-t-2 border-blue-600">
              <td className="py-2 px-3">TOTAL LIABILITIES & EQUITY</td>
              <td className="py-2 px-3 text-right font-mono text-blue-600">
                {formatCurrency(bs.totalLiabilitiesAndEquity)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 9. TRIAL BALANCE VIEW
