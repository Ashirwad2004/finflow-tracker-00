import React, { useMemo } from "react";

export function PurchaseRegisterTable({ purchases, search, formatCurrency }: any) {
  const filtered = useMemo(() => {
    if (!search) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      (p: any) =>
        (p.bill_number && p.bill_number.toLowerCase().includes(q)) ||
        (p.vendor_name && p.vendor_name.toLowerCase().includes(q))
    );
  }, [purchases, search]);

  const totals = useMemo(() => {
    let taxable = 0;
    let itc = 0;
    let total = 0;
    let paid = 0;
    let balance = 0;
    filtered.forEach((p: any) => {
      const tot = Number(p.total_amount || 0);
      const pd = Number(p.amount_paid || 0);
      const bal = p.balance_due !== undefined ? Number(p.balance_due) : tot - pd;
      const tx = Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0);
      const txbl = Number(p.subtotal || tot - tx);
      taxable += txbl;
      itc += tx;
      total += tot;
      paid += pd;
      balance += bal;
    });
    return { taxable, itc, total, paid, balance };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* KPI Ribbon */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Bills: <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Taxable: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.taxable)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          ITC Tax: <span className="font-bold text-emerald-600">{formatCurrency(totals.itc)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Purchases: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.total)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Paid: <span className="font-bold text-emerald-600">{formatCurrency(totals.paid)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Balance Due: <span className="font-bold text-rose-600">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full min-w-[700px] text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Bill #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Vendor Name</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">ITC (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Total (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Due (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p: any) => {
              const tot = Number(p.total_amount || 0);
              const pd = Number(p.amount_paid || 0);
              const bal = p.balance_due !== undefined ? Number(p.balance_due) : tot - pd;
              const tx = Number(p.cgst || 0) + Number(p.sgst || 0) + Number(p.igst || 0);
              const txbl = Number(p.subtotal || tot - tx);

              return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {(p.date || p.created_at || "").slice(0, 10)}
                  </td>
                  <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {p.bill_number || `BILL-${p.id?.slice(0, 6)}`}
                  </td>
                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {p.vendor_name || "Vendor"}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600">
                    {formatCurrency(tx)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                    {formatCurrency(tot)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(pd)}</td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono tabular-nums font-semibold ${
                      bal > 0 ? "text-rose-600" : "text-slate-400"
                    }`}
                  >
                    {bal > 0 ? formatCurrency(bal) : "-"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  No purchase bills recorded for this period
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={3} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.taxable)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.itc)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.total)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.paid)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 3. DAY BOOK TABLE
