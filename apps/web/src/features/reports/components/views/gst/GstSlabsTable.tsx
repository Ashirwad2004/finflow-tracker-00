import React, { useMemo } from "react";

export function GstSlabsTable({ slabs, formatCurrency }: any) {
  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">GST Rate</th>
            <th className="py-2 px-3 text-right">Taxable Turnover (₹)</th>
            <th className="py-2 px-3 text-right">CGST (₹)</th>
            <th className="py-2 px-3 text-right">SGST (₹)</th>
            <th className="py-2 px-3 text-right">Total Tax (₹)</th>
            <th className="py-2 px-3 text-center">Invoices</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {slabs.map((s: any) => (
            <tr key={s.rate} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-bold">{s.rate}% GST</td>
              <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(s.taxableValue)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(s.cgst)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(s.sgst)}</td>
              <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-600">{formatCurrency(s.totalTax)}</td>
              <td className="py-1.5 px-3 text-center">{s.invoiceCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 15. STOCK SUMMARY TABLE
