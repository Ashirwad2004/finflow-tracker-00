import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Calendar, 
    FileText, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    CreditCard, 
    Banknote, 
    Smartphone 
} from "lucide-react";

interface PurchaseDetailsSectionProps {
    billNumber: string;
    date: string;
    dueDate: string;
    paymentStatus: "paid" | "partial" | "pending";
    onBillNumberChange: (val: string) => void;
    onDateChange: (val: string) => void;
    onDueDateChange: (val: string) => void;
    onPaymentStatusChange: (status: "paid" | "partial" | "pending") => void;
}

export const PurchaseDetailsSection = ({
    billNumber,
    date,
    dueDate,
    paymentStatus,
    onBillNumberChange,
    onDateChange,
    onDueDateChange,
    onPaymentStatusChange,
}: PurchaseDetailsSectionProps) => {
    return (
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <FileText className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Purchase Bill Details
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Invoice numbers, billing dates, and payment settlement terms
                        </p>
                    </div>
                </div>

                {/* Status Indicator Chip */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => onPaymentStatusChange("paid")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            paymentStatus === "paid"
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onPaymentStatusChange("partial")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            paymentStatus === "partial"
                                ? "bg-sky-500 text-white shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Partial</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onPaymentStatusChange("pending")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            paymentStatus === "pending"
                                ? "bg-amber-500 text-white shadow-sm"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unpaid</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Bill Ref Number */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Bill / Invoice Ref #</span>
                    </Label>
                    <Input
                        type="text"
                        value={billNumber}
                        onChange={(e) => onBillNumberChange(e.target.value)}
                        placeholder="e.g. INV-9842 or BILL-01"
                        className="h-9 text-xs font-mono uppercase bg-background"
                    />
                </div>

                {/* Bill Date */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Bill Date *</span>
                    </Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="h-9 text-xs bg-background"
                    />
                </div>

                {/* Due Date */}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Payment Due Date</span>
                        </Label>
                        {dueDate && date && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {Math.max(
                                    0,
                                    Math.round(
                                        (new Date(dueDate).getTime() - new Date(date).getTime()) /
                                            (1000 * 60 * 60 * 24)
                                    )
                                )}{" "}
                                days credit
                            </span>
                        )}
                    </div>
                    <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => onDueDateChange(e.target.value)}
                        className="h-9 text-xs bg-background"
                    />
                </div>
            </div>
        </div>
    );
};
