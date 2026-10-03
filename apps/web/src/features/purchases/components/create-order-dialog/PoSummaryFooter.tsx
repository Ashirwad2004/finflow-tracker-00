import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PoSummaryFooterProps {
  notes: string;
  onNotesChange: (val: string) => void;
  termsConditions: string;
  onTermsConditionsChange: (val: string) => void;
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  onDiscountAmountChange: (val: number) => void;
  netTotal: number;
  advancePaid: number;
  onAdvancePaidChange: (val: number) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

export const PoSummaryFooter: React.FC<PoSummaryFooterProps> = ({
  notes,
  onNotesChange,
  termsConditions,
  onTermsConditionsChange,
  subtotal,
  taxTotal,
  discountAmount,
  onDiscountAmountChange,
  netTotal,
  advancePaid,
  onAdvancePaidChange,
  isSubmitting,
  isEditing,
  onCancel,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supplier Instructions</Label>
            <Textarea
              placeholder="Delivery instructions, quality remarks..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="h-16 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Terms of Purchase</Label>
            <Textarea
              value={termsConditions}
              onChange={(e) => onTermsConditionsChange(e.target.value)}
              className="h-16 text-xs mt-1"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal (Excl. Tax):</span>
            <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Total Estimated Tax:</span>
            <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
            <span>Supplier Discount (₹):</span>
            <Input
              type="number"
              min="0"
              value={discountAmount}
              onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
              className="h-7 w-28 text-right text-xs font-mono"
            />
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span>Total Purchase Commitment:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              ₹{netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>Advance Paid to Supplier (₹):</span>
            <Input
              type="number"
              min="0"
              value={advancePaid}
              onChange={(e) => onAdvancePaidChange(parseFloat(e.target.value) || 0)}
              className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Balance Payable on Receipt:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              ₹{Math.max(0, netTotal - advancePaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between -mx-6 -mb-6 mt-6 rounded-b-2xl">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 shadow-md shadow-emerald-500/20"
        >
          {isSubmitting
            ? "Issuing PO..."
            : isEditing
            ? "Update Purchase Order"
            : "Issue Purchase Order"}
        </Button>
      </div>
    </>
  );
};
