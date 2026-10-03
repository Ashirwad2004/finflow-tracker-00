import React from "react";
import { Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliveryRow } from "./types";

interface DeliveryItemsTableProps {
  rows: DeliveryRow[];
  onUpdateRow: (index: number, field: keyof DeliveryRow, value: any) => void;
  onDeliverAllRemaining: () => void;
}

export const DeliveryItemsTable: React.FC<DeliveryItemsTableProps> = ({
  rows,
  onUpdateRow,
  onDeliverAllRemaining,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Fulfillment & Delivery Quantities
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDeliverAllRemaining}
          className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Deliver All Remaining Items (1-Click)
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">Deliver</th>
              <th className="p-3">Product / Service</th>
              <th className="p-3 w-20 text-center">Ordered</th>
              <th className="p-3 w-20 text-center">Delivered So Far</th>
              <th className="p-3 w-20 text-center font-bold text-indigo-600">Remaining</th>
              <th className="p-3 w-28 text-right">Qty to Deliver Now</th>
              <th className="p-3 w-24 text-right">Unit Rate (₹)</th>
              <th className="p-3 w-20 text-center">GST %</th>
              <th className="p-3 w-28 text-right">Invoice Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => {
              const lineSub = row.deliver_qty * row.price;
              const lineTax = (lineSub * (row.tax_rate || 0)) / 100;
              const lineTotal = lineSub + lineTax;
              const isComplete = row.remaining_qty <= 0;

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                    isComplete ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/30" : ""
                  }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      disabled={isComplete}
                      onChange={(e) => onUpdateRow(idx, "selected", e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                    {row.name}
                    {row.hsn_code && (
                      <span className="text-[10px] text-slate-400 block">HSN: {row.hsn_code}</span>
                    )}
                    {isComplete && (
                      <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold mt-0.5">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Fully Delivered
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {row.ordered_qty} {row.unit}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {row.already_delivered} {row.unit}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {row.remaining_qty} {row.unit}
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      max={row.remaining_qty}
                      step="any"
                      value={row.deliver_qty}
                      disabled={!row.selected || isComplete}
                      onChange={(e) =>
                        onUpdateRow(idx, "deliver_qty", parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-xs text-right font-semibold w-24 ml-auto"
                    />
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    ₹{row.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                    {row.tax_rate}%
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
