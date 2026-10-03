import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface POSShiftClosedBannerProps {
  onOpenShift: () => void;
}

export function POSShiftClosedBanner({ onOpenShift }: POSShiftClosedBannerProps) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
        <span>
          Cash register drawer is closed. Open your register drawer to track cash sales, floats, and discrepancies.
        </span>
      </div>
      <Button
        size="sm"
        onClick={onOpenShift}
        className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 rounded-lg shadow-xs cursor-pointer"
      >
        Open Register Float
      </Button>
    </div>
  );
}
