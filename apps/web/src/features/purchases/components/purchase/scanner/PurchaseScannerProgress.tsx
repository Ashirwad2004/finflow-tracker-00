import { Sparkles, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScannedFileMeta } from "./types";

interface PurchaseScannerProgressProps {
    scanProgressStage: string;
    fileMeta: ScannedFileMeta | null;
    imagePreview: string | null;
}

export const PurchaseScannerProgress = ({
    scanProgressStage,
    fileMeta,
    imagePreview,
}: PurchaseScannerProgressProps) => {
    return (
        <div className="border border-violet-500/30 bg-violet-500/5 rounded-xl p-8 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                <Sparkles className="w-7 h-7 text-violet-500 animate-pulse" />
            </div>

            <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                    {scanProgressStage || "Scanning purchase bill with Gemini Vision..."}
                </p>
                <p className="text-xs text-muted-foreground">
                    Reading supplier name, items, rates, quantities, and GST rates automatically
                </p>
            </div>

            {/* PDF Document Preview Card during scan */}
            {fileMeta?.isPdf && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl max-w-sm mx-auto text-left">
                    <div className="p-2.5 bg-red-600 text-white rounded-lg shrink-0 shadow-sm">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate">{fileMeta.name}</span>
                            <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 h-4">PDF</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{fileMeta.sizeFormatted} • Reading all pages & line items</p>
                    </div>
                </div>
            )}

            {/* Image Thumbnail Preview during scan */}
            {!fileMeta?.isPdf && imagePreview && (
                <div className="max-w-[200px] mx-auto max-h-32 overflow-hidden rounded-lg border shadow-sm opacity-80">
                    <img src={imagePreview} alt="Bill Preview" className="w-full object-cover" />
                </div>
            )}
        </div>
    );
};
