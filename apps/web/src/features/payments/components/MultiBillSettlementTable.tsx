import React from "react";
import { Layers, Sparkles } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface MultiBillSettlementTableProps {
  isReceipt: boolean;
  selectedPartyId: string;
  partyPendingBills: any[];
  billAllocations: Record<string, number>;
  enteredAmount: number;
  totalAllocated: number;
  advanceAmount: number;
  onAutoAllocate: () => void;
  onClearAllocations: () => void;
  onToggleBill: (bill: any) => void;
  onAllocationChange: (billId: string, val: string) => void;
}

export const MultiBillSettlementTable: React.FC<MultiBillSettlementTableProps> = ({
  isReceipt,
  selectedPartyId,
  partyPendingBills,
  billAllocations,
  enteredAmount,
  totalAllocated,
  advanceAmount,
  onAutoAllocate,
  onClearAllocations,
  onToggleBill,
  onAllocationChange,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Settle Outstanding Invoices / Bills ({partyPendingBills.length} unpaid)
        </label>
        {partyPendingBills.length > 0 && enteredAmount > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAutoAllocate}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded"
            >
              <Sparkles className="w-3 h-3" /> Auto-Allocate (FIFO)
            </button>
            <button
              type="button"
              onClick={onClearAllocations}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {partyPendingBills.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
          {selectedPartyId ? (
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                No unpaid bills found for this {isReceipt ? "customer" : "vendor"}.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The full payment of {formatCurrency(enteredAmount)} will be recorded as an Advance / On-Account payment.
              </p>
            </div>
          ) : (
            "Select a party above to view their pending bills."
          )}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-8 text-center">Settle</th>
                  <th className="px-3 py-2">Bill #</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2 text-right">Balance Due</th>
                  <th className="px-3 py-2 text-right w-28">Amount to Apply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {partyPendingBills.map((bill) => {
                  const allocVal = Number(billAllocations[bill.id] || 0);
                  const isAllocated = allocVal > 0;

                  return (
                    <tr
                      key={bill.id}
                      className={`transition-colors ${
                        isAllocated
                          ? isReceipt
                            ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isAllocated}
                          onChange={() => onToggleBill(bill)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                        {bill.billNumber}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {bill.date}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(bill.balanceDue)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={bill.balanceDue}
                            value={allocVal > 0 ? allocVal : ""}
                            onChange={(e) =>
                              onAllocationChange(bill.id, e.target.value)
                            }
                            placeholder="0.00"
                            className="w-24 h-7 px-2 text-right text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Allocation Summary Strip */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Allocated to Bills:{" "}
              <strong className="text-slate-900 dark:text-white font-bold">
                {formatCurrency(totalAllocated)}
              </strong>
            </span>
            <span className="text-slate-500">
              Unallocated / Advance:{" "}
              <strong
                className={
                  advanceAmount > 0
                    ? "text-emerald-600 font-bold"
                    : "text-slate-900 dark:text-white"
                }
              >
                {formatCurrency(advanceAmount)}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
