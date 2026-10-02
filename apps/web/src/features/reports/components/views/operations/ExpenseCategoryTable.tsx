import React, { useMemo } from "react";

export function ExpenseCategoryTable({ expenses, formatCurrency }: any) {
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    let totalAll = 0;
    expenses.forEach((e: any) => {
      const amt = Number(e.amount || 0);
      const cat = e.categories?.name || e.category || "General";
      totalAll += amt;
      map.set(cat, (map.get(cat) || 0) + amt);
    });

    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAll > 0 ? (amount / totalAll) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  return (
    <div className="max-w-3xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
            <th className="py-2 px-3">Expense Category</th>
            <th className="py-2 px-3 text-right w-36">Total Amount (₹)</th>
            <th className="py-2 px-3 text-right w-28">Share (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {categoryStats.map((c) => (
            <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-semibold">{c.name}</td>
              <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                {formatCurrency(c.amount)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono">{c.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 19. BUSINESS HEALTH DIAGNOSTIC VIEW
