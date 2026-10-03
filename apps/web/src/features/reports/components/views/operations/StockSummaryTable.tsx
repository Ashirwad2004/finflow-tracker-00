import React, { useMemo } from "react";

export function StockSummaryTable({ stock, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return stock.items;
    const q = search.toLowerCase();
    return stock.items.filter(
      (it: any) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
    );
  }, [stock.items, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Products: <span className="font-bold">{stock.totalProducts}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Total Quantity: <span className="font-bold">{stock.totalStockQty}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Stock Cost Valuation: <span className="font-bold text-blue-600">{formatCurrency(stock.totalCostValuation)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          Retail Value: <span className="font-bold text-emerald-600">{formatCurrency(stock.totalRetailValuation)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3">Item Name</th>
              <th className="py-2 px-3">SKU / Barcode</th>
              <th className="py-2 px-3 text-right w-24">Stock Qty</th>
              <th className="py-2 px-3 text-right w-24">Cost (₹)</th>
              <th className="py-2 px-3 text-right w-24">Price (₹)</th>
              <th className="py-2 px-3 text-right w-28">Total Cost (₹)</th>
              <th className="py-2 px-3 text-right w-28">Retail Value (₹)</th>
              <th className="py-2 px-3 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((it: any) => (
              <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-semibold">{it.name}</td>
                <td className="py-1.5 px-3 font-mono text-slate-500">{it.sku}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold">{it.currentStock}</td>
                <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(it.costPrice)}</td>
                <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(it.sellingPrice)}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-600">
                  {formatCurrency(it.totalCost)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600">
                  {formatCurrency(it.totalRetail)}
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      it.status === "In Stock"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {it.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 16. ITEM-WISE P&L TABLE
