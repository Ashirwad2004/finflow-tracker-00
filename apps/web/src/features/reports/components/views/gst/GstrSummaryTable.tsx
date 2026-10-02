import React, { useMemo } from "react";

export function GstrSummaryTable({ sales, purchases, formatCurrency, type }: any) {
  const isGstr1 = type === "gstr1";
  const records = isGstr1 ? sales || [] : purchases || [];

  return (
    <div className="space-y-3">
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-between">
        <span>{isGstr1 ? "GSTR-1 Outward Supplies Summary" : "GSTR-2B Inward ITC Reconciliation"}</span>
        <span>Total Records: {records.length}</span>
      </div>
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3 w-24">Date</th>
              <th className="py-2 px-3 w-28">Doc #</th>
              <th className="py-2 px-3">Party Name</th>
              <th className="py-2 px-3 w-36">GSTIN</th>
              <th className="py-2 px-3 text-right w-28">Taxable (₹)</th>
              <th className="py-2 px-3 text-right w-28">{isGstr1 ? "Output Tax (₹)" : "ITC Tax (₹)"}</th>
              <th className="py-2 px-3 text-right w-28">Invoice Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r: any) => {
              const tx = isGstr1
                ? Number(r.tax_amount || r.gst_amount || 0)
                : Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0);
              const tot = Number(r.total_amount || 0);
              const txbl = Number(r.subtotal || tot - tx);

              return (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-500">{(r.date || r.created_at || "").slice(0, 10)}</td>
                  <td className="py-1.5 px-3 font-mono font-medium text-blue-600">
                    {r.invoice_number || r.bill_number || r.id?.slice(0, 6)}
                  </td>
                  <td className="py-1.5 px-3 font-medium">{r.customer_name || r.vendor_name || "Direct Party"}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-500">{r.customer_gstin || r.vendor_gstin || "URP"}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">{formatCurrency(tx)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">{formatCurrency(tot)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 12. GSTR-3B VIEW
