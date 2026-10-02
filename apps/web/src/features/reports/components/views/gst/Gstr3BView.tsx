import React, { useMemo } from "react";

export function Gstr3BView({ sales, purchases, formatCurrency }: any) {
  const outwardTurnover = sales.reduce((s: any, x: any) => s + Number(x.total_amount || 0), 0);
  const outwardTax = sales.reduce((s: any, x: any) => s + Number(x.tax_amount || x.gst_amount || 0), 0);
  const eligibleItc = purchases.reduce(
    (s: any, x: any) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );
  const netGstPayable = Math.max(0, outwardTax - eligibleItc);

  return (
    <div className="max-w-4xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-sm border-b">
        GSTR-3B Monthly Statutory Summary
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              3.1 Outward Taxable Supplies (Other than zero rated, nil and exempted)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Total Outward Turnover</td>
            <td className="py-1.5 px-4 text-right font-mono font-semibold">{formatCurrency(outwardTurnover)}</td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">Total Output Tax Liability</td>
            <td className="py-1.5 px-4 text-right font-mono text-blue-600 font-bold">{formatCurrency(outwardTax)}</td>
          </tr>

          <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
            <td className="py-2 px-4" colSpan={2}>
              4. Eligible Input Tax Credit (ITC)
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-8">All Other ITC (Purchases of Goods & Services)</td>
            <td className="py-1.5 px-4 text-right font-mono text-emerald-600 font-bold">{formatCurrency(eligibleItc)}</td>
          </tr>

          <tr className="bg-blue-50 dark:bg-blue-950/30 font-bold text-sm border-t-2 border-blue-600">
            <td className="py-2.5 px-4 text-blue-900 dark:text-blue-200">
              6.1 Net Tax Payable in Cash (Output Tax - Eligible ITC)
            </td>
            <td className="py-2.5 px-4 text-right font-mono text-blue-700 dark:text-blue-200 font-bold">
              {formatCurrency(netGstPayable)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 13. GSTR-9 ANNUAL VIEW
