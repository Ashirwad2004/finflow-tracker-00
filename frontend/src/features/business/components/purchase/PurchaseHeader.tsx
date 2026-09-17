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
    onToggleAiFill: () => void;
    onToggleScanner: () => void;
    onClose: () => void;
}

export const PurchaseHeader = ({
    isEditing,
    paymentStatus,
    isAiFillOpen,
    isScannerOpen,
    onToggleAiFill,
    onToggleScanner,
    onClose,
}: PurchaseHeaderProps) => {
    return (
        <DialogHeader className="px-6 py-4 border-b border-border/80 bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Left: Icon, Title, Subtitle */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/15 text-primary shadow-xs">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Record incoming supplier bills, track inventory stock & manage payables
                        </p>
                    </div>
                </div>

                {/* Right: Upload Bill + AI Smart Fill Toggle */}
                <div className="flex items-center gap-2">
                    {!isEditing && (
                        <>
                            <Button
                                type="button"
                                variant={isScannerOpen ? "default" : "outline"}
                                size="sm"
                                onClick={onToggleScanner}
                                className={`h-8 text-xs font-bold gap-1.5 transition-all ${
                                    isScannerOpen
                                        ? "bg-violet-600 text-white shadow-sm"
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
