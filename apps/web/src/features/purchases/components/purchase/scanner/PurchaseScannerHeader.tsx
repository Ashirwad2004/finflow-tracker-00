import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PurchaseScannerHeaderProps {
    onClose?: () => void;
}

export const PurchaseScannerHeader = ({ onClose }: PurchaseScannerHeaderProps) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Zap className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                            AI Purchase Bill & PDF Scanner
                        </h3>
                        <Badge className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black tracking-wide uppercase px-2 py-0.5">
                            Auto-Fill Table
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Upload a PDF invoice or bill photo. AI extracts all items, rates, quantities & taxes directly into your table columns.
                    </p>
                </div>
            </div>

            {onClose && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};
