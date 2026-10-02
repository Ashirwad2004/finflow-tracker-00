import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface SaleOrderTotalsSectionProps {
    notes: string;
    setNotes: (val: string) => void;
    termsConditions: string;
    setTermsConditions: (val: string) => void;
    subtotal: number;
    taxTotal: number;
    discountAmount: number;
    setDiscountAmount: (val: number) => void;
    netTotal: number;
    advancePaid: number;
    setAdvancePaid: (val: number) => void;
}

export const SaleOrderTotalsSection: React.FC<SaleOrderTotalsSectionProps> = ({
    notes,
    setNotes,
    termsConditions,
    setTermsConditions,
    subtotal,
    taxTotal,
    discountAmount,
    setDiscountAmount,
    netTotal,
    advancePaid,
    setAdvancePaid,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
                <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notes / Remarks</Label>
                    <Textarea
                        placeholder="Special handling instructions, customer notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-16 text-xs mt-1"
                    />
                </div>
                <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Terms & Conditions</Label>
                    <Textarea
                        value={termsConditions}
                        onChange={(e) => setTermsConditions(e.target.value)}
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
                    <span>Total GST:</span>
                    <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
                    <span>Discount (₹):</span>
                    <Input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="h-7 w-28 text-right text-xs font-mono"
                    />
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Total Order Value:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        ₹{netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>Advance Token Received (₹):</span>
                    <Input
                        type="number"
                        min="0"
                        value={advancePaid}
                        onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                        className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                    />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>Balance Due on Delivery:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        ₹{Math.max(0, netTotal - advancePaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
};
