import { CheckCircle2, FileText, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { ExtractedPurchaseBill } from "./types";

interface PurchaseScannerResultPreviewProps {
    extractedResult: ExtractedPurchaseBill;
    onScanAnother: () => void;
    onReviewInForm: () => void;
    onOneClickSave: () => void;
}

export const PurchaseScannerResultPreview = ({
    extractedResult,
    onScanAnother,
    onReviewInForm,
    onOneClickSave,
}: PurchaseScannerResultPreviewProps) => {
    const { formatCurrency } = useCurrency();

    return (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 space-y-4">
            {/* Header of Results */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        {extractedResult.is_pdf ? <FileText className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <span>{extractedResult.vendor_name}</span>
                            {extractedResult.is_pdf ? (
                                <Badge className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0 h-4">
                                    PDF
                                </Badge>
                            ) : null}
                            {extractedResult.vendor_gstin && (
                                <Badge variant="outline" className="text-[10px] font-mono text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80">
                                    GST: {extractedResult.vendor_gstin}
                                </Badge>
                            )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                            Ref: {extractedResult.bill_number} • Date: {extractedResult.date}
                            {extractedResult.file_name && ` • File: ${extractedResult.file_name}`}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Total Bill Value
                    </span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                        {formatCurrency(Number(extractedResult.total_amount || 0))}
                    </span>
                </div>
            </div>

            {/* Prominent Success / Auto-Fill Notification */}
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                    <strong>All {extractedResult.items.length} items have been added to the product columns below.</strong> You can review, edit quantities, adjust prices, or change units directly in the table.
                </span>
            </div>

            {/* Extracted Items Mini List */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Scanned Items ({extractedResult.items.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        Pre-filled into table below for editing
                    </span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-border/60 bg-background/80 rounded-lg border p-2 text-xs">
                    {extractedResult.items.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                            <div className="truncate pr-2">
                                <span className="font-semibold text-foreground">
                                    {item.description}
                                </span>
                                <span className="text-muted-foreground text-[10px] ml-1.5">
                                    {item.quantity} {item.unit || "pc"} @ {formatCurrency(item.price)}
                                    {item.discount ? ` (${item.discount}% off)` : ""}
                                    {item.tax_rate ? ` [${item.tax_rate}% GST]` : ""}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-foreground shrink-0">
                                {formatCurrency(item.total)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onScanAnother}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Scan Another Bill
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onReviewInForm}
                        className="h-9 px-3 text-xs font-semibold gap-1"
                    >
                        <span>✏️ Edit in Table Below</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={onOneClickSave}
                        className="h-9 px-4 text-xs font-extrabold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all animate-pulse"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>⚡ 1-Click Save to Inventory</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
