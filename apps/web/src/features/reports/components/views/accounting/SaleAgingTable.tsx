import React, { useMemo } from "react";

export function SaleAgingTable({ aging, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return aging.parties;
    const q = search.toLowerCase();
    return aging.parties.filter((p: any) => p.partyName.toLowerCase().includes(q));
  }, [aging.parties, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Aging Summary Bar */}
      <div className="shrink-0 flex items-center gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="shrink-0">
          Total Outstanding: <span className="font-bold text-rose-600">{formatCurrency(aging.totalOutstanding)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          0-30 Days: <span className="font-bold text-emerald-600">{formatCurrency(aging.tot0_30)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          31-60 Days: <span className="font-bold text-blue-600">{formatCurrency(aging.tot31_60)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          61-90 Days: <span className="font-bold text-amber-600">{formatCurrency(aging.tot61_90)}</span>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="shrink-0">
          &gt;90 Days: <span className="font-bold text-rose-600">{formatCurrency(aging.tot90Plus)}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b">
              <th className="py-2 px-3">Customer / Party Name</th>
              <th className="py-2 px-3 text-right w-28">Total Due (₹)</th>
              <th className="py-2 px-3 text-right w-24">0-30 Days</th>
              <th className="py-2 px-3 text-right w-24">31-60 Days</th>
              <th className="py-2 px-3 text-right w-24">61-90 Days</th>
              <th className="py-2 px-3 text-right w-24">&gt;90 Days</th>
              <th className="py-2 px-3 text-center w-24">MSME 45D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p: any) => (
              <tr key={p.partyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.partyName}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                  {formatCurrency(p.totalOutstanding)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-emerald-600">
                  {p.bucket0_30 > 0 ? formatCurrency(p.bucket0_30) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-blue-600">
                  {p.bucket31_60 > 0 ? formatCurrency(p.bucket31_60) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-amber-600">
                  {p.bucket61_90 > 0 ? formatCurrency(p.bucket61_90) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-rose-600 font-bold">
                  {p.bucket90Plus > 0 ? formatCurrency(p.bucket90Plus) : "-"}
                </td>
                <td className="py-1.5 px-3 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      p.isMsmeExceeded ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {p.isMsmeExceeded ? "Overdue" : "Normal"}
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

// 11. GSTR SUMMARY TABLE
