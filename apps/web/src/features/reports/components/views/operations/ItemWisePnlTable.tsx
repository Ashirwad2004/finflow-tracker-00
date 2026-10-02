import React, { useMemo } from "react";

export function ItemWisePnlTable({ items, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((it: any) => it.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Item Name</th>
            <th className="py-2 px-3 text-right w-24">Units Sold</th>
            <th className="py-2 px-3 text-right w-28">Revenue (₹)</th>
            <th className="py-2 px-3 text-right w-28">Cost (₹)</th>
            <th className="py-2 px-3 text-right w-28">Gross Profit (₹)</th>
            <th className="py-2 px-3 text-right w-24">Margin (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((it: any) => (
            <tr key={it.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-semibold">{it.name}</td>
              <td className="py-1.5 px-3 text-right font-mono">{it.unitsSold}</td>
              <td className="py-1.5 px-3 text-right font-mono font-semibold">{formatCurrency(it.revenue)}</td>
              <td className="py-1.5 px-3 text-right font-mono text-slate-500">{formatCurrency(it.cost)}</td>
              <td
                className={`py-1.5 px-3 text-right font-mono font-bold ${
                  it.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {formatCurrency(it.profit)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono font-semibold">{it.marginPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// 17. EXPENSE REGISTER TABLE
