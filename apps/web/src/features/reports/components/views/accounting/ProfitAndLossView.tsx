import React, { useMemo } from "react";

export function ProfitAndLossView({ pnl, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-sm flex items-center justify-between">
        <span>Statement of Profit and Loss (Schedule III)</span>
        <span className="text-xs font-semibold text-emerald-600">
          Gross Margin: {pnl.grossProfitMarginPct.toFixed(1)}% | Net Margin: {pnl.netProfitMarginPct.toFixed(1)}%
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              I. REVENUE FROM OPERATIONS
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Gross Sales / Turnover</td>
            <td className="py-1.5 px-4 text-right font-mono font-medium">{formatCurrency(pnl.grossSalesRevenue)}</td>
          </tr>
          {pnl.salesReturns > 0 && (
            <tr>
              <td className="py-1.5 px-8 text-rose-600">Less: Sales Returns & Credit Notes</td>
              <td className="py-1.5 px-4 text-right font-mono text-rose-600">({formatCurrency(pnl.salesReturns)})</td>
            </tr>
          )}
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Net Revenue from Operations (A)</td>
            <td className="py-2 px-4 text-right font-mono font-bold text-blue-600">{formatCurrency(pnl.netRevenue)}</td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              II. COST OF GOODS SOLD (COGS)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Purchases of Stock-in-Trade</td>
            <td className="py-1.5 px-4 text-right font-mono">{formatCurrency(pnl.purchasesCost)}</td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Direct Production & Packaging Expenses</td>
            <td className="py-1.5 px-4 text-right font-mono">{formatCurrency(pnl.directExpensesTotal)}</td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Total Cost of Goods Sold (B)</td>
            <td className="py-2 px-4 text-right font-mono text-rose-600 font-bold">{formatCurrency(pnl.costOfGoodsSold)}</td>
          </tr>

          <tr className="bg-emerald-50 dark:bg-emerald-950/20 font-bold text-sm border-y border-emerald-200">
            <td className="py-2.5 px-4 text-emerald-800 dark:text-emerald-300">GROSS PROFIT (C = A - B)</td>
            <td className="py-2.5 px-4 text-right font-mono text-emerald-700 dark:text-emerald-300">
              {formatCurrency(pnl.grossProfit)}
            </td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              III. INDIRECT OPERATING EXPENSES
            </td>
          </tr>
          {Object.entries(pnl.indirectCategories).map(([cat, amt]) => (
            <tr key={cat}>
              <td className="py-1.5 px-8">{cat}</td>
              <td className="py-1.5 px-4 text-right font-mono text-slate-600">{formatCurrency(amt)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-6">Total Indirect Overheads (D)</td>
            <td className="py-2 px-4 text-right font-mono text-rose-600 font-bold">
              {formatCurrency(pnl.indirectExpensesTotal)}
            </td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              NET PROFIT BEFORE TAX (C - D)
            </td>
            <td
              className={`py-2.5 px-4 text-right font-mono ${
                pnl.netProfitBeforeTax >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatCurrency(pnl.netProfitBeforeTax)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 8. BALANCE SHEET VIEW
