import { LayoutTemplate, FileText } from "lucide-react";
import { PageSize } from "@/utils/generateInvoicePDF";
import { cn } from "@/core/lib/utils";

interface PageLayoutCardProps {
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  fontSizeFactor: number;
  onFontSizeChange: (factor: number) => void;
}

export function PageLayoutCard({
  pageSize,
  onPageSizeChange,
  fontSizeFactor,
  onFontSizeChange,
}: PageLayoutCardProps) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3 shrink-0">
      <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
        <LayoutTemplate className="w-3.5 h-3.5 text-primary" />
        3. Page Layout Settings
      </h2>
      <div className="space-y-3">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 block">Print Page Size</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPageSizeChange("a4")}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs",
              pageSize === "a4"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-border hover:bg-muted text-slate-650 dark:text-slate-300"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>A4 Sheet</span>
          </button>

          <button
            onClick={() => onPageSizeChange("a5")}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs",
              pageSize === "a5"
                ? "border-primary bg-primary/5 text-primary font-bold"
                : "border-border hover:bg-muted text-slate-650 dark:text-slate-300"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>A5 Sheet</span>
          </button>
        </div>

        {/* Font Size Preferences */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 flex items-center justify-between">
            <span>Invoice Font Size</span>
            <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 bg-primary/10 rounded-full">
              {Math.round(fontSizeFactor * 100)}%
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400">A-</span>
            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.05"
              value={fontSizeFactor}
              onChange={(e) => onFontSizeChange(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[9px] text-slate-400">A+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
