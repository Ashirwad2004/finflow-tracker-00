import React, { useMemo } from "react";

export function SaleRegisterTable({ sales, search, formatCurrency }: any) {
  const filtered = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s: any) =>
        (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q))
    );
  }, [sales, search]);

  const totals = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    let total = 0;
    let paid = 0;
    let balance = 0;
    filtered.forEach((s: any) => {
      const tot = Number(s.total_amount || 0);
      const pd = Number(s.amount_paid || 0);
      const bal = s.balance_due !== undefined ? Number(s.balance_due) : tot - pd;
      const tx = Number(s.tax_amount || s.gst_amount || 0);
      const txbl = Number(s.subtotal || tot - tx);
      taxable += txbl;
      tax += tx;
      total += tot;
      paid += pd;
      balance += bal;
    });
    return { taxable, tax, total, paid, balance };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Compact KPI Ribbon */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Invoices: <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Taxable: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.taxable)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Tax: <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.tax)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Amount: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.total)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Paid: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.paid)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Balance Due: <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totals.balance)}</span>
        </div>
      </div>

      {/* Grid Table Container - Fills 100% remaining height with smooth internal scrolling */}
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full min-w-[700px] text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Invoice #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Customer Name</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Payment</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Taxable (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Tax (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Total (₹)</th>
              <th className="py-2.5 px-3 text-right w-24 bg-slate-100 dark:bg-slate-800">Paid (₹)</th>
              <th className="py-2.5 px-3 text-right w-28 bg-slate-100 dark:bg-slate-800">Due (₹)</th>
              <th className="py-2.5 px-3 text-center w-20 bg-slate-100 dark:bg-slate-800">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((s: any) => {
              const tot = Number(s.total_amount || 0);
              const pd = Number(s.amount_paid || 0);
              const bal = s.balance_due !== undefined ? Number(s.balance_due) : tot - pd;
              const tx = Number(s.tax_amount || s.gst_amount || 0);
              const txbl = Number(s.subtotal || tot - tx);

              return (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {(s.date || s.created_at || "").slice(0, 10)}
                  </td>
                  <td className="py-1.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {s.invoice_number || `INV-${s.id?.slice(0, 6)}`}
                  </td>
                  <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {s.customer_name || "Direct Customer"}
                  </td>
                  <td className="py-1.5 px-3 text-slate-500">{s.payment_method || "Cash"}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums">{formatCurrency(txbl)}</td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">
                    {formatCurrency(tx)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                    {formatCurrency(tot)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600">
                    {formatCurrency(pd)}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono tabular-nums font-semibold ${
                      bal > 0 ? "text-rose-600" : "text-slate-400"
                    }`}
                  >
                    {bal > 0 ? formatCurrency(bal) : "-"}
                  </td>
                  <td className="py-1.5 px-3 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        s.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : bal > 0
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {s.status || "Paid"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                  No sales invoices recorded for this period
                </td>
              </tr>
            )}
          </tbody>
          {/* Pinned Totals Row */}
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={4} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.taxable)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.tax)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.total)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.paid)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.balance)}
              </td>
              <td className="bg-slate-100 dark:bg-slate-800"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 2. PURCHASE REGISTER TABLE
