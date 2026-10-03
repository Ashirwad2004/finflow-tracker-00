import React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/core/lib/utils";
import { CalcType } from "./types";

interface GstModeAndAmountCardProps {
  calcType: CalcType;
  onCalcTypeChange: (type: CalcType) => void;
  amountStr: string;
  onAmountChange: (val: string) => void;
  onAddPreset: (val: number) => void;
  onClear: () => void;
}

export const GstModeAndAmountCard: React.FC<GstModeAndAmountCardProps> = ({
  calcType,
  onCalcTypeChange,
  amountStr,
  onAmountChange,
  onAddPreset,
  onClear,
}) => {
  return (
    <>
      {/* Mode Switch: Add GST vs Remove GST */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => onCalcTypeChange("exclusive")}
          className={cn(
            "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
            calcType === "exclusive"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add GST (Exclusive)</span>
        </button>
        <button
          type="button"
          onClick={() => onCalcTypeChange("inclusive")}
          className={cn(
            "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
            calcType === "inclusive"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Remove GST (Inclusive)</span>
        </button>
      </div>

      {/* Amount Input Card */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {calcType === "exclusive" ? "Taxable / Base Amount" : "Gross / MRP Amount (Tax Inclusive)"}
          </Label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            INR (₹)
          </span>
        </div>

        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-xl font-bold text-muted-foreground">₹</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={amountStr}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="pl-8 text-2xl font-bold h-13 rounded-xl border-primary/20 focus-visible:ring-primary"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[1000, 5000, 10000, 50000, 100000].map((val) => (
            <Button
              key={val}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddPreset(val)}
              className="h-7 text-[11px] px-2.5 rounded-lg hover:bg-primary/10 hover:text-primary border-border/60"
            >
              +{val >= 100000 ? `${val / 100000}L` : `${val / 1000}k`}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive ml-auto"
          >
            Clear
          </Button>
        </div>
      </div>
    </>
  );
};
