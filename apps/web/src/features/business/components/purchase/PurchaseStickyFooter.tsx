import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface PurchaseStickyFooterProps {
    grandTotal: number;
    balanceDue: number;
    itemsCount: number;
    isEditing: boolean;
    isSubmitting: boolean;
    onCancel: () => void;
}

export const PurchaseStickyFooter = ({
    grandTotal,
    balanceDue,
    itemsCount,
    isEditing,
    isSubmitting,
    onCancel,
}: PurchaseStickyFooterProps) => {
    const { formatCurrency } = useCurrency();

    return (
        <div className="sticky bottom-0 z-20 px-6 py-3.5 border-t border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between gap-4 mt-auto">
            {/* Left Preview: Grand Total & Balance Indicator */}
            <div className="flex items-center gap-4">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                        Total Amount ({itemsCount} items)
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-foreground font-mono">
                        {formatCurrency(grandTotal)}
                    </span>
                </div>

                {balanceDue > 0 ? (
                    <div className="hidden sm:block border-l border-border pl-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block leading-none">
                            Balance Due
                        </span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {formatCurrency(balanceDue)}
                        </span>
                    </div>
                ) : (
                    <div className="hidden sm:block border-l border-border pl-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block leading-none">
                            Payment Status
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Fully Settled
                        </span>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-9 px-4 text-xs font-semibold"
                >
                    Cancel
                </Button>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-5 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isEditing ? "Update Purchase" : "Save Purchase"}</span>
                </Button>
            </div>
        </div>
    );
};
