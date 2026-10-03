import React from "react";
import { Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/core/lib/utils";
import { GST_SLABS, SPECIAL_SLABS } from "../calculatorUtils";

interface GstSlabsSelectorProps {
  gstRate: number;
  onGstRateChange: (rate: number) => void;
  isCustomRate: boolean;
  onToggleCustomRate: () => void;
  customRateStr: string;
  onCustomRateChange: (val: string) => void;
}

export const GstSlabsSelector: React.FC<GstSlabsSelectorProps> = ({
  gstRate,
  onGstRateChange,
  isCustomRate,
  onToggleCustomRate,
  customRateStr,
  onCustomRateChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5 text-primary" />
          <span>Statutory GST Slabs</span>
        </Label>
        <button
          type="button"
          onClick={onToggleCustomRate}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {isCustomRate ? "Use Standard Slabs" : "Custom Rate %"}
        </button>
      </div>

      {isCustomRate ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={customRateStr}
            onChange={(e) => onCustomRateChange(e.target.value)}
            placeholder="Enter GST %"
            className="h-10 text-sm font-bold rounded-xl"
          />
          <span className="text-sm font-bold">%</span>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {GST_SLABS.map((slab) => {
            const isSelected = gstRate === slab.rate && !isCustomRate;
            return (
              <button
                key={slab.rate}
                type="button"
                onClick={() => onGstRateChange(slab.rate)}
                className={cn(
                  "py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary"
                    : "border-border/60 hover:bg-muted/50 text-foreground"
                )}
              >
                <span className="text-sm font-extrabold">{slab.rate}%</span>
                <span className="text-[9px] text-muted-foreground truncate w-full px-0.5">
                  {slab.rate === 0 ? "Exempt" : slab.rate === 18 ? "Standard" : "Slab"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Special Slabs (Jewellery 3%, Diamonds 0.25%) */}
      {!isCustomRate && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Special:</span>
          {SPECIAL_SLABS.map((special) => (
            <button
              key={special.rate}
              type="button"
              onClick={() => onGstRateChange(special.rate)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg border transition-all font-medium",
                gstRate === special.rate
                  ? "border-amber-500 bg-amber-500/10 text-amber-600 font-bold"
                  : "border-border/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {special.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
