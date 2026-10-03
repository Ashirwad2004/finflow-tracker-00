import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProcureSummaryNotesProps {
  notes: string;
  onNotesChange: (val: string) => void;
  selectedRowsCount: number;
  totalUnits: number;
  estimatedTotal: number;
}

export const ProcureSummaryNotes: React.FC<ProcureSummaryNotesProps> = ({
  notes,
  onNotesChange,
  selectedRowsCount,
  totalUnits,
  estimatedTotal,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      <div>
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Supplier Instructions
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="h-20 text-xs mt-1"
        />
      </div>

      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Items in this PO:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {selectedRowsCount} item(s)
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Total Units Procured:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {totalUnits} units
            </span>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Estimated PO Total:
          </span>
          <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
            ₹{estimatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
