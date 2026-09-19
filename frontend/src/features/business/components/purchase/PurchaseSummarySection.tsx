import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Calculator, 
    Percent, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    UserCheck, 
    ArrowRight,
    Wallet 
} from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface PurchaseSummarySectionProps {
    subtotal: number;
    itemDiscounts: number;
    overallDiscount: number;
    taxAmount: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;
    paymentStatus: "paid" | "partial" | "pending";
    vendorName?: string;
    placeOfSupply?: string;
    vendorPreviousBalance?: number;
    totalNetPayable?: number;
    onOverallDiscountChange: (val: number) => void;
    onAmountPaidChange: (val: number) => void;
    onPaymentStatusChange: (status: "paid" | "partial" | "pending") => void;
}

export const PurchaseSummarySection = ({
    subtotal,
    itemDiscounts,
    overallDiscount,
    taxAmount,
    grandTotal,
    amountPaid,
    balanceDue,
    paymentStatus,
    vendorName = "Supplier",
    placeOfSupply = "",
    vendorPreviousBalance = 0,
    totalNetPayable,
    onOverallDiscountChange,
    onAmountPaidChange,
    onPaymentStatusChange,
}: PurchaseSummarySectionProps) => {
    const { formatCurrency, currency } = useCurrency();

    const totalDiscount = itemDiscounts + overallDiscount;
    const taxableValue = Math.max(0, subtotal - totalDiscount);

    const handlePayFull = () => {
        onAmountPaidChange(grandTotal);
        onPaymentStatusChange("paid");
    };

    const handleMarkUnpaid = () => {
        onAmountPaidChange(0);
        onPaymentStatusChange("pending");
    };

    return (
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Calculator className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Purchase Summary & Settlement
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                        Financial taxes, discounts, and party payable reconciliation
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Settlement / Amount Paid Card */}
                <div className="lg:col-span-6 bg-muted/40 rounded-xl p-4 border border-border/60 space-y-3.5">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Payment Settlement
                        </Label>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handlePayFull}
                                className="h-6 px-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            >
                                Pay Full
                            </Button>
                            <span className="text-muted-foreground text-xs">•</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkUnpaid}
                                className="h-6 px-2 text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            >
                                Mark Unpaid
                            </Button>
                        </div>
                    </div>

                    {/* Amount Paid Field */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-foreground">
                                Amount Paid ({currency.symbol})
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Enter partial or full payment
                            </span>
                        </div>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountPaid === 0 ? "" : amountPaid}
                            onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                onAmountPaidChange(val);
                                if (val >= grandTotal && grandTotal > 0) {
                                    onPaymentStatusChange("paid");
                                } else if (val > 0 && val < grandTotal) {
                                    onPaymentStatusChange("partial");
                                } else {
                                    onPaymentStatusChange("pending");
                                }
                            }}
                            placeholder="0.00"
                            className="h-10 text-base font-bold bg-background text-foreground"
                        />
                    </div>

                    {/* Ledger Payable Alert */}
                    <div
                        className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                            balanceDue > 0
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        }`}
                    >
                        <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                                {balanceDue > 0 ? (
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                                <span>
                                    {balanceDue > 0 ? "Balance Due / Payable:" : "Fully Settled:"}
                                </span>
                            </span>
                            <span className="font-mono text-sm">
                                {formatCurrency(balanceDue)}
                            </span>
                        </div>
                        <p className="text-[11px] opacity-80 leading-relaxed">
                            {balanceDue > 0
                                ? `${formatCurrency(balanceDue)} will be credited to ${vendorName}'s ledger balance as an outstanding payable.`
                                : `Payment of ${formatCurrency(amountPaid)} recorded. No outstanding payable balance will be created.`}
                        </p>
                    </div>

                    {/* Vyapar / Big Billing CA-Grade Vendor Previous Due & Net Balance Box */}
                    {vendorName && vendorName.trim() !== "" && vendorName !== "Supplier" && (
                        <div className="p-3.5 rounded-lg border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-background dark:from-indigo-950/20 dark:to-background dark:border-indigo-800/60 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                                    Vendor Ledger Balance
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground lowercase truncate max-w-[140px]">
                                    {vendorName}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Previous Payable:</span>
                                <span className={`font-semibold ${vendorPreviousBalance > 0 ? "text-rose-600 dark:text-rose-400" : vendorPreviousBalance < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                                    {vendorPreviousBalance > 0 
                                        ? `${formatCurrency(vendorPreviousBalance)} Cr (Payable)` 
                                        : vendorPreviousBalance < 0 
                                            ? `${formatCurrency(Math.abs(vendorPreviousBalance))} Dr (Advance)` 
                                            : formatCurrency(0)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Current Bill Due:</span>
                                <span className="font-semibold text-foreground">
                                    {formatCurrency(balanceDue)}
                                </span>
                            </div>

                            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-bold text-foreground uppercase tracking-tight block">
                                        Total Net Payable:
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        (Previous + Current Bill)
                                    </span>
                                </div>
                                <div className="text-right">
                                    {(() => {
                                        const netPayable = totalNetPayable ?? (vendorPreviousBalance + balanceDue);
                                        return (
                                            <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                                                netPayable > 0 
                                                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800" 
                                                    : netPayable < 0 
                                                        ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                                                        : "bg-muted text-muted-foreground border border-border"
                                            }`}>
                                                {netPayable > 0 
                                                    ? `${formatCurrency(netPayable)} Cr` 
                                                    : netPayable < 0 
                                                        ? `${formatCurrency(Math.abs(netPayable))} Dr` 
                                                        : "₹0.00 (Settled)"}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Financial Breakdown */}
                <div className="lg:col-span-6 space-y-2.5">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Items Subtotal:</span>
                        <span className="font-mono font-semibold text-foreground">
                            {formatCurrency(subtotal)}
                        </span>
                    </div>

                    {/* Item Discounts */}
                    {itemDiscounts > 0 && (
                        <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400">
                            <span>Item Discounts:</span>
                            <span className="font-mono font-semibold">
                                -{formatCurrency(itemDiscounts)}
                            </span>
                        </div>
                    )}

                    {/* Additional / Bill Discount */}
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Overall Discount:</span>
                        <div className="relative w-28">
                            <Input
                                type="number"
                                min="0"
                                step="1"
                                value={overallDiscount === 0 ? "" : overallDiscount}
                                onChange={(e) =>
                                    onOverallDiscountChange(Math.max(0, Number(e.target.value) || 0))
                                }
                                placeholder="0.00"
                                className="h-7 text-xs text-right font-mono pr-5 bg-background"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground pointer-events-none">
                                {currency.symbol}
                            </span>
                        </div>
                    </div>

                    {/* Taxable Value */}
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-dashed border-border/80">
                        <span className="text-muted-foreground">Taxable Value:</span>
                        <span className="font-mono font-medium text-foreground">
                            {formatCurrency(taxableValue)}
                        </span>
                    </div>

                    {/* Taxes Breakdown */}
                    {taxAmount > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs text-foreground">
                                <span className="text-muted-foreground">
                                    Total GST Tax:
                                </span>
                                <span className="font-mono font-semibold text-foreground">
                                    +{formatCurrency(taxAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground pl-2 font-mono">
                                <span>
                                    CGST ({formatCurrency(taxAmount / 2)}) + SGST ({formatCurrency(taxAmount / 2)})
                                </span>
                                {placeOfSupply && (
                                    <span className="bg-muted px-1.5 py-0.2 rounded text-[9px]">
                                        POS: {placeOfSupply}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                        <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                Grand Total
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                                Net payable bill value
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xl sm:text-2xl font-black text-primary font-mono tracking-tight">
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
