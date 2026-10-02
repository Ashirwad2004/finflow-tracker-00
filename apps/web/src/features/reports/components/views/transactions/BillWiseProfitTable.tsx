import React, { useMemo } from "react";

export function BillWiseProfitTable({ data, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (b: any) => b.invoiceNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totals = useMemo(() => {
    let sales = 0;
    let cost = 0;
    let profit = 0;
    filtered.forEach((b: any) => {
      sales += b.invoiceTotal;
      cost += b.costOfInvoice;
      profit += b.profit;
    });
    const margin = sales > 0 ? (profit / sales) * 100 : 0;
    return { sales, cost, profit, margin };
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Bills: <span className="font-bold">{filtered.length}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Revenue: <span className="font-bold text-blue-600">{formatCurrency(totals.sales)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Cost of Goods: <span className="font-bold text-slate-700">{formatCurrency(totals.cost)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Gross Profit: <span className="font-bold text-emerald-600">{formatCurrency(totals.profit)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Avg Margin: <span className="font-bold text-emerald-600">{totals.margin.toFixed(1)}%</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 px-3 w-24">Date</th>
              <th className="py-2 px-3 w-28">Invoice #</th>
              <th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3 text-right w-28">Invoice Value (₹)</th>
              <th className="py-2 px-3 text-right w-28">Cost Value (₹)</th>
              <th className="py-2 px-3 text-right w-28">Gross Profit (₹)</th>
              <th className="py-2 px-3 text-right w-24">Margin (%)</th>
              <th className="py-2 px-3 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((b: any) => (
              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-500">{b.date?.slice(0, 10)}</td>
                <td className="py-1.5 px-3 font-mono font-semibold text-blue-600">{b.invoiceNumber}</td>
                <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{b.customerName}</td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                  {formatCurrency(b.invoiceTotal)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">
                  {formatCurrency(b.costOfInvoice)}
                </td>
                <td
                  className={`py-1.5 px-3 text-right font-mono tabular-nums font-bold ${
                    b.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(b.profit)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                  {b.marginPct.toFixed(1)}%
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      b.statusTier === "High"
                        ? "bg-emerald-100 text-emerald-800"
                        : b.statusTier === "Normal"
                        ? "bg-blue-100 text-blue-800"
                        : b.statusTier === "Low"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {b.statusTier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={3} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.sales)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.cost)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(totals.profit)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums bg-slate-100 dark:bg-slate-800">{totals.margin.toFixed(1)}%</td>
              <td className="bg-slate-100 dark:bg-slate-800"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 6. CASH FLOW STATEMENT VIEW
