import React, { useMemo } from "react";

export function TrialBalanceView({ tb, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Account Particulars</th>
            <th className="py-2 px-3 w-28 text-center">Type</th>
            <th className="py-2 px-3 text-right w-36">Debit (₹)</th>
            <th className="py-2 px-3 text-right w-36">Credit (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {tb.items.map((it: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-medium">{it.accountName}</td>
              <td className="py-1.5 px-3 text-center text-slate-500">{it.accountType}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.debit > 0 ? formatCurrency(it.debit) : "-"}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.credit > 0 ? formatCurrency(it.credit) : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-xs border-t-2 border-slate-300">
            <td colSpan={2} className="py-2 px-3 text-right">TOTALS:</td>
            <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(tb.totalDebit)}</td>
            <td className="py-2 px-3 text-right font-mono text-blue-600">{formatCurrency(tb.totalCredit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// 10. SALE AGING TABLE
