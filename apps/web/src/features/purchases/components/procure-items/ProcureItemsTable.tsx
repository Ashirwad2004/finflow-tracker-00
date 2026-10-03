import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";
import { ProcureRow } from "./types";

interface ProcureItemsTableProps {
  rows: ProcureRow[];
  onUpdateRow: (index: number, field: keyof ProcureRow, value: any) => void;
  onSelectAllRemaining: () => void;
}

export const ProcureItemsTable: React.FC<ProcureItemsTableProps> = ({
  rows,
  onUpdateRow,
  onSelectAllRemaining,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Items to Procure
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAllRemaining}
          className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50"
        >
          Select All Remaining Quantities
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">Include</th>
              <th className="p-3">Product / Service</th>
              <th className="p-3 w-20 text-center">Ordered</th>
              <th className="p-3 w-20 text-center">Already Procured</th>
              <th className="p-3 w-20 text-center font-bold text-blue-600">
                Remaining
              </th>
              <th className="p-3 w-28 text-right">Qty to Procure</th>
              <th className="p-3 w-28 text-right">Unit Cost (₹)</th>
              <th className="p-3 w-28 text-right">Total Est. (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => {
              const lineTotal =
                row.procure_qty * row.price * (1 + (row.tax_rate || 0) / 100);
              const isComplete = row.remaining_qty <= 0;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                    isComplete
                      ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/30"
                      : ""
                  }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={isComplete}
                      onChange={(e) =>
                        onUpdateRow(idx, "selected", e.target.checked)
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                    {row.name}
                    {isComplete && (
                      <span className="ml-2 inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Fully Procured
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {row.ordered_qty} {row.unit}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {row.already_procured} {row.unit}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.remaining_qty} {row.unit}
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      max={row.remaining_qty}
                      step="any"
                      value={row.procure_qty}
                      disabled={!row.selected || isComplete}
                      onChange={(e) =>
                        onUpdateRow(
                          idx,
                          "procure_qty",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs text-right font-semibold w-24 ml-auto"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={row.price}
                      disabled={!row.selected || isComplete}
                      onChange={(e) =>
                        onUpdateRow(
                          idx,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs text-right font-mono w-24 ml-auto"
                    />
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {row.selected
                      ? `₹${lineTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
