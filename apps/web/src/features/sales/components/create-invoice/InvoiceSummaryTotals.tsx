import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Percent, Wallet } from "lucide-react";
import { UseFormRegister } from "react-hook-form";
import { useCurrency } from "@/core/contexts/CurrencyContext";

export interface InvoiceSummaryTotalsProps {
    register: UseFormRegister<any>;
    subtotal: number;
    overallDiscountAmount: number;
    isItemWiseTax: boolean;
    salesSettings?: any;
    taxRate: number;
    taxAmount: number;
    roundOffDiff: number;
    totalAmount: number;
    watchCustomerName: string;
    selectedParty?: any;
    partyPreviousBalance: number;
    currentInvoiceDue: number;
    partyClosingDue: number;
    formatCurrency?: (amount: number) => string;
}

export const InvoiceSummaryTotals: React.FC<InvoiceSummaryTotalsProps> = ({
    register,
    subtotal,
    overallDiscountAmount,
    isItemWiseTax,
    salesSettings,
    taxRate,
    taxAmount,
    roundOffDiff,
    totalAmount,
    watchCustomerName,
    selectedParty,
    partyPreviousBalance,
    currentInvoiceDue,
    partyClosingDue,
    formatCurrency: customFormatCurrency,
}) => {
    const { formatCurrency: defaultFormatCurrency } = useCurrency();
    const formatCurrency = customFormatCurrency || defaultFormatCurrency;

    const showPartyBalance = ((salesSettings?.showPartyPendingBalance ?? salesSettings?.showPartyPreviousBalance) ?? true) &&
        watchCustomerName.trim() &&
        !["cash customer", "cash sale", "walk-in", "cash"].includes(watchCustomerName.trim().toLowerCase());

    return (
        <div className="flex flex-col md:flex-row justify-between gap-8 pt-4 pb-8 border-t border-slate-100">
            <div className="flex-1 max-w-sm space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Seller Notes & Terms
                </Label>

                <textarea
                    {...register("notes")}
                    placeholder="Add payment terms, bank details, or thank-you note for customer..."
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-sm border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none"
                />

                <p className="text-[10px] text-slate-400">
                    These notes will be printed on the invoice PDF.
                </p>
            </div>

            <div className="w-full md:w-[320px]">
                <div className="space-y-2.5">
                    {/* SUBTOTAL */}
                    <div className="flex justify-between items-center text-sm px-2">
                        <span className="text-slate-600">
                            Subtotal
                        </span>

                        <span className="font-medium text-slate-800">
                            {formatCurrency(subtotal)}
                        </span>
                    </div>

                    {/* DISCOUNT */}
                    <div className="flex justify-between items-center text-sm px-2">
                        <span className="text-slate-600">
                            Discount
                        </span>

                        <div className="relative w-24">
                            <Input
                                type="number"
                                className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                {...register("overall_discount")}
                                min="0"
                                max="100"
                            />

                            <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        </div>
                    </div>

                    {overallDiscountAmount > 0 && (
                        <div className="flex justify-between text-xs px-2 pb-2 border-b">
                            <span />
                            <span className="text-destructive font-medium">
                                -{formatCurrency(overallDiscountAmount)}
                            </span>
                        </div>
                    )}

                    {/* TAX */}
                    <div className="flex justify-between items-center text-sm px-2 pt-1 border-b border-slate-100 pb-3">
                        <span className="text-slate-600">
                            {isItemWiseTax
                                ? "Item-wise Tax"
                                : salesSettings?.gstMode === "igst"
                                    ? "IGST"
                                    : salesSettings?.gstMode === "cgst_sgst"
                                        ? "Tax (CGST+SGST)"
                                        : "Tax"}
                        </span>

                        {isItemWiseTax ? (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {taxAmount > 0
                                    ? `Avg ~${taxRate.toFixed(1)}%`
                                    : "0%"}
                            </span>
                        ) : (
                            <div className="relative w-24">
                                <Input
                                    type="number"
                                    className="h-8 rounded-sm text-right pr-6 border-slate-300"
                                    {...register("tax_rate")}
                                    min="0"
                                    max="100"
                                />

                                <Percent className="absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            </div>
                        )}
                    </div>

                    {taxAmount > 0 && (
                        <div className="flex justify-between items-center text-xs px-2 pb-2 border-b">
                            <span className="text-slate-400 text-[10px]">
                                {salesSettings?.gstMode === "cgst_sgst"
                                    ? `CGST ${formatCurrency(taxAmount / 2)} + SGST ${formatCurrency(taxAmount / 2)}`
                                    : salesSettings?.gstMode === "igst"
                                        ? `IGST @ ${taxRate}%`
                                        : ""}
                            </span>

                            <span className="text-emerald-600 font-medium">
                                +{formatCurrency(taxAmount)}
                            </span>
                        </div>
                    )}

                    {/* ROUND OFF */}
                    {salesSettings?.roundOffTotal && Math.abs(roundOffDiff) > 0.001 && (
                        <div className="flex justify-between items-center text-xs px-2 pb-2">
                            <span className="text-slate-500">
                                Round Off
                            </span>

                            <span
                                className={
                                    roundOffDiff > 0
                                        ? "text-emerald-600 font-medium"
                                        : "text-rose-500 font-medium"
                                }
                            >
                                {roundOffDiff > 0 ? "+" : ""}
                                {formatCurrency(roundOffDiff)}
                            </span>
                        </div>
                    )}
                </div>

                {/* TOTAL */}
                <div className="pt-4 border-t mt-4 bg-slate-100 p-4 rounded-b-sm border-x border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                            Total Amount
                        </span>

                        <span className="text-xl font-bold text-slate-900 tracking-tight">
                            {formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>

                {/* FinFlow CA-Grade Party Previous Due & Net Balance Box */}
                {showPartyBalance && (
                    <div className="mt-3 p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-800/60 shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                                Party Balance (Ledger Status)
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 lowercase truncate max-w-[140px]">
                                {selectedParty?.name || watchCustomerName}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Previous Pending:</span>
                            <span className={`font-semibold ${partyPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : partyPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700"}`}>
                                {partyPreviousBalance > 0 
                                    ? `${formatCurrency(partyPreviousBalance)} Dr (Pending)` 
                                    : partyPreviousBalance < 0 
                                        ? `${formatCurrency(Math.abs(partyPreviousBalance))} Cr (Advance)` 
                                        : formatCurrency(0)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Current Bill Due:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(currentInvoiceDue)}
                            </span>
                        </div>

                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight block">
                                    Pending Balance:
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    (Previous + Current Bill)
                                </span>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                    partyClosingDue > 0 
                                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                                        : partyClosingDue < 0 
                                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}>
                                    {partyClosingDue > 0 
                                        ? `${formatCurrency(partyClosingDue)} Dr` 
                                        : partyClosingDue < 0 
                                            ? `${formatCurrency(Math.abs(partyClosingDue))} Cr` 
                                            : "₹0.00 (Settled)"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceSummaryTotals;
