import React, { useMemo } from "react";

export function AllTransactionsTable({ transactions, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t: any) => t.reference.toLowerCase().includes(q) || t.partyName.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Date</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Type</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Reference #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Party / Particulars</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Category</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Mode</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Amount (₹)</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((t: any) => (
            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="py-1.5 px-3 font-mono text-slate-500">{t.date}</td>
              <td className="py-1.5 px-3 font-semibold">{t.type}</td>
              <td className="py-1.5 px-3 font-mono font-medium text-blue-600">{t.reference}</td>
              <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">{t.partyName}</td>
              <td className="py-1.5 px-3 text-slate-500">{t.category}</td>
              <td className="py-1.5 px-3 text-slate-500">{t.paymentMode}</td>
              <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                {formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                No transactions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// 5. BILL-WISE PROFIT
