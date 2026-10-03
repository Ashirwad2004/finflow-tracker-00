import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReceiptIndianRupee, FileText } from "lucide-react";

interface InvoiceFinancialSummaryProps {
  deductStock: boolean;
  onDeductStockChange: (val: boolean) => void;
  totalAdvanceRecorded: number;
  alreadyUtilizedAdvance: number;
  netAvailableAdvance: number;
  amountPaid: number;
  onAmountPaidChange: (val: number) => void;
  totalAmount: number;
  subtotal: number;
  taxTotal: number;
  onApplyAdvanceCredit: () => void;
  isSubmitting: boolean;
  selectedCount: number;
  onCancel: () => void;
}

export const InvoiceFinancialSummary: React.FC<InvoiceFinancialSummaryProps> = ({
  deductStock,
  onDeductStockChange,
  totalAdvanceRecorded,
  alreadyUtilizedAdvance,
  netAvailableAdvance,
  amountPaid,
  onAmountPaidChange,
  totalAmount,
  subtotal,
  taxTotal,
  onApplyAdvanceCredit,
  isSubmitting,
  selectedCount,
  onCancel,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <Checkbox
              id="deductStock"
              checked={deductStock}
              onCheckedChange={(c) => onDeductStockChange(!!c)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="deductStock"
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Deduct Physical Inventory Stock
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Reduces catalog quantities for delivered items and releases reserved order stock.
              </p>
            </div>
          </div>

          {totalAdvanceRecorded > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <ReceiptIndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Order Advance Account
                </span>
                <span className="font-mono">
                  ₹{totalAdvanceRecorded.toLocaleString("en-IN")} Total
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex justify-between">
                <span>Already Utilized:</span>
                <span className="font-mono">₹{alreadyUtilizedAdvance.toLocaleString("en-IN")}</span>
              </div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex justify-between font-medium border-t border-emerald-200/60 dark:border-emerald-800/60 pt-1">
                <span>Available to Apply:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  ₹{netAvailableAdvance.toLocaleString("en-IN")}
                </span>
              </div>
              {netAvailableAdvance > 0 && amountPaid < Math.min(netAvailableAdvance, totalAmount) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onApplyAdvanceCredit}
                  className="w-full h-7 text-[11px] font-semibold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 mt-1"
                >
                  Apply ₹{Math.min(netAvailableAdvance, totalAmount).toLocaleString("en-IN")} Advance to this Invoice
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal (Excl. Tax):</span>
            <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tax Amount (GST):</span>
            <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span>Total Invoice Value:</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>Amount Paid / Advance Applied (₹):</span>
            <Input
              type="number"
              min="0"
              max={totalAmount}
              step="any"
              value={amountPaid}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                onAmountPaidChange(Math.min(val, totalAmount));
              }}
              className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Remaining Customer Receivable:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              ₹{Math.max(0, totalAmount - amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
          disabled={isSubmitting || selectedCount === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          {isSubmitting ? "Generating Invoice..." : "Generate Sale Invoice"}
        </Button>
      </div>
    </>
  );
};
