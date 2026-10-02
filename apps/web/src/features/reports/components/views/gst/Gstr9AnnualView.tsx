import React, { useMemo } from "react";

export function Gstr9AnnualView({ sales, purchases, formatCurrency, gstin }: any) {
  const outwardTurnover = sales.reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const b2b = sales
    .filter((x: any) => !!x.customer_gstin && x.customer_gstin.length === 15)
    .reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const b2c = outwardTurnover - b2b;
  const outwardTax = sales.reduce((s: any, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
  const itc = purchases.reduce(
    (s: any, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-sm border-b flex items-center justify-between">
        <span>GSTR-9 Annual Return Reconciliation</span>
        <span className="text-xs font-mono font-normal">GSTIN: {gstin || "URP"}</span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr>
            <td className="py-2 px-4 font-medium">Table 4A: B2B Registered Outward Supplies</td>
            <td className="py-2 px-4 text-right font-mono">{formatCurrency(b2b)}</td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 4B: B2C Unregistered Consumer Supplies</td>
            <td className="py-2 px-4 text-right font-mono">{formatCurrency(b2c)}</td>
          </tr>
          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2 px-4">Total Declared Turnover (Table 4N)</td>
            <td className="py-2 px-4 text-right font-mono text-blue-600">{formatCurrency(outwardTurnover)}</td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 9: Total Output Tax Payable</td>
            <td className="py-2 px-4 text-right font-mono text-slate-800 dark:text-slate-200 font-semibold">
              {formatCurrency(outwardTax)}
            </td>
          </tr>
          <tr>
            <td className="py-2 px-4 font-medium">Table 6A: Cumulative Input Tax Credit Availed</td>
            <td className="py-2 px-4 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(itc)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 14. GST SLABS TABLE
