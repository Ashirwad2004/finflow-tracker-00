import React, { useMemo } from "react";

export function ExpenseRegisterTable({ expenses, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e: any) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
    );
  }, [expenses, search]);

  const total = useMemo(() => {
    return filtered.reduce((s: any, x: any) => s + Number(x.amount || 0), 0);
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      <div className="shrink-0 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-between">
        <span>Total Expenses: {formatCurrency(total)}</span>
        <span>Count: {filtered.length} entries</span>
      </div>
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
              <th className="py-2 px-3 w-28">Date</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 w-28">Payment Mode</th>
              <th className="py-2 px-3 text-right w-32">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-500">{e.date?.slice(0, 10)}</td>
                <td className="py-1.5 px-3 font-semibold">{e.title || e.description || "Expense"}</td>
                <td className="py-1.5 px-3 text-slate-600">{e.categories?.name || e.category || "General"}</td>
                <td className="py-1.5 px-3 text-slate-500">{e.payment_method || "Cash"}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                  {formatCurrency(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 18. EXPENSE CATEGORY TABLE
