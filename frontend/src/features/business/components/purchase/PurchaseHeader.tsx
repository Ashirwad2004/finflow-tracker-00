import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    ShoppingBag, 
    Wand2, 
    X, 
    CheckCircle2, 
    Clock, 
    AlertCircle 
} from "lucide-react";

interface PurchaseHeaderProps {
    isEditing: boolean;
    paymentStatus: "paid" | "partial" | "pending";
    isAiFillOpen: boolean;
    isScannerOpen: boolean;
    isQuickBilling?: boolean;
    onToggleQuickBilling?: (val: boolean) => void;
    onToggleAiFill: () => void;
    onToggleScanner: () => void;
    onClose: () => void;
}

export const PurchaseHeader = ({
    isEditing,
    paymentStatus,
    isAiFillOpen,
    isScannerOpen,
    isQuickBilling = false,
    onToggleQuickBilling,
    onToggleAiFill,
    onToggleScanner,
    onClose,
}: PurchaseHeaderProps) => {
    return (
        <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border/80 bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Left: Icon, Title, Subtitle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 text-primary shadow-xs">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground">
                                {isEditing ? "Edit Purchase Bill" : "Record New Purchase"}
                            </DialogTitle>
                            <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                                    paymentStatus === "paid"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : paymentStatus === "partial"
                                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}
                            >
                                {paymentStatus === "paid" ? (
                                    <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                ) : paymentStatus === "partial" ? (
                                    <Clock className="w-3 h-3 mr-1 inline" />
                                ) : (
                                    <AlertCircle className="w-3 h-3 mr-1 inline" />
                                )}
                                {paymentStatus}
                            </Badge>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                            Record incoming supplier bills, track inventory stock & manage payables
                        </p>
                    </div>
                </div>

                {/* Right: Quick Billing Toggle + Upload Bill + AI Smart Fill Toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                    {!isEditing && onToggleQuickBilling && (
                        <div className="flex items-center space-x-0.5 border rounded-lg p-0.5 bg-background/80 border-border/80 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => onToggleQuickBilling(true)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                    isQuickBilling
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Quick Billing
                            </button>
                            <button
                                type="button"
                                onClick={() => onToggleQuickBilling(false)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                    !isQuickBilling
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Full Billing
                            </button>
                        </div>
                    )}

                    {!isEditing && (
                        <>
                            <Button
                                type="button"
                                variant={isScannerOpen ? "default" : "outline"}
                                size="sm"
                                onClick={onToggleScanner}
                                className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                                    isScannerOpen
                                        ? "bg-violet-600 text-white shadow-xs"
                                        : "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300"
                                }`}
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                                <span>{isScannerOpen ? "Hide Scanner" : "⚡ Scan Bill / PDF"}</span>
                            </Button>

                            <Button
                                type="button"
                                variant={isAiFillOpen ? "secondary" : "outline"}
                                size="sm"
                                onClick={onToggleAiFill}
                                className={`h-8 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground hidden sm:flex`}
                            >
                                <span>{isAiFillOpen ? "Close Text Fill" : "Text Fill"}</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </DialogHeader>
    );
};
