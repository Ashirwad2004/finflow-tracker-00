import React from "react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ShoppingCart, AlertCircle } from "lucide-react";

interface PoHeaderProps {
  isEditing: boolean;
  poNumber: string;
  onPoNumberChange: (val: string) => void;
}

export const PoHeader: React.FC<PoHeaderProps> = ({
  isEditing,
  poNumber,
  onPoNumberChange,
}) => {
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? "Edit Purchase Order" : "New Supplier Purchase Order"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Issue formal procurement order to vendor with tracking of inbound delivery and receipt.
            </DialogDescription>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PO No.</span>
          <Input
            value={poNumber}
            onChange={(e) => onPoNumberChange(e.target.value)}
            className="h-8 font-mono text-xs font-bold w-36 text-right bg-white dark:bg-slate-800"
            required
          />
        </div>
      </div>

      {/* CA Stock Accounting Notice */}
      <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-[11px] text-teal-800 dark:text-teal-300">
        <AlertCircle className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
        <span>
          <strong>Inventory Invariant:</strong> Placing a Purchase Order tracks <em>expected incoming stock</em>. Physical stock on hand is unaffected until goods arrive and are converted to a Purchase Bill.
        </span>
      </div>
    </div>
  );
};
