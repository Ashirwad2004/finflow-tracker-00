import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

export function DayBookTable({ daybook, daybookDate, setDaybookDate, formatCurrency, search }: any) {
  const filtered = useMemo(() => {
    if (!search) return daybook.entries;
    const q = search.toLowerCase();
    return daybook.entries.filter(
      (e: any) => e.particulars.toLowerCase().includes(q) || e.voucherNo.toLowerCase().includes(q)
    );
  }, [daybook.entries, search]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden space-y-2.5">
      {/* Date Picker Bar */}
      <div className="shrink-0 flex items-center justify-between gap-4 py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs border border-slate-200 dark:border-slate-700 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Day Date:</span>
          <Input
            type="date"
            value={daybookDate.toISOString().slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) setDaybookDate(new Date(e.target.value));
            }}
            className="w-36 h-7 text-xs bg-white dark:bg-slate-900 border-slate-300 font-semibold"
          />
        </div>
        <div className="flex items-center gap-4 font-semibold text-xs">
          <div>
            Total Debit: <span className="text-emerald-600">{formatCurrency(daybook.totalDebit)}</span>
          </div>
          <div>
            Total Credit: <span className="text-rose-600">{formatCurrency(daybook.totalCredit)}</span>
          </div>
          <div>
            Net Cash Flow:{" "}
            <span className={daybook.netCashMovement >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {formatCurrency(daybook.netCashMovement)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-slate-200 dark:border-slate-800 rounded-lg overflow-auto bg-white dark:bg-slate-900 shadow-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 w-20 bg-slate-100 dark:bg-slate-800">Time</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Type</th>
              <th className="py-2.5 px-3 w-28 bg-slate-100 dark:bg-slate-800">Voucher #</th>
              <th className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800">Particulars</th>
              <th className="py-2.5 px-3 w-24 bg-slate-100 dark:bg-slate-800">Mode</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Debit (In ₹)</th>
              <th className="py-2.5 px-3 text-right w-32 bg-slate-100 dark:bg-slate-800">Credit (Out ₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e: any) => (
              <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-1.5 px-3 font-mono text-slate-400">{e.time}</td>
                <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300">{e.voucherType}</td>
                <td className="py-1.5 px-3 font-mono font-medium text-blue-600">{e.voucherNo}</td>
                <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200 font-medium">{e.particulars}</td>
                <td className="py-1.5 px-3 text-slate-500">{e.paymentMode}</td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-600 font-semibold">
                  {e.debit > 0 ? formatCurrency(e.debit) : "-"}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-rose-600 font-semibold">
                  {e.credit > 0 ? formatCurrency(e.credit) : "-"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  No entries recorded on {daybook.date}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-xs">
            <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
              <td colSpan={5} className="py-2.5 px-3 text-right bg-slate-100 dark:bg-slate-800">
                TOTAL:
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(daybook.totalDebit)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 bg-slate-100 dark:bg-slate-800">
                {formatCurrency(daybook.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// 4. ALL TRANSACTIONS
