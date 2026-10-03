import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/core/lib/utils";
import { SupplyType } from "./types";

interface GstClausesCardProps {
  supplyType: SupplyType;
  onSupplyTypeChange: (type: SupplyType) => void;
  cessRateStr: string;
  onCessRateChange: (val: string) => void;
  isRCM: boolean;
  onToggleRCM: (val: boolean) => void;
  enableTDS: boolean;
  onToggleTDS: (val: boolean) => void;
}

export const GstClausesCard: React.FC<GstClausesCardProps> = ({
  supplyType,
  onSupplyTypeChange,
  cessRateStr,
  onCessRateChange,
  isRCM,
  onToggleRCM,
  enableTDS,
  onToggleTDS,
}) => {
  return (
    <div className="p-3 bg-muted/20 border border-border/50 rounded-2xl space-y-3">
      {/* Supply Type Toggle: Intra vs Inter */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-bold text-foreground">Supply Jurisdiction</Label>
          <p className="text-[11px] text-muted-foreground">
            {supplyType === "intra"
              ? "Intra-State (Same State) -> CGST + SGST"
              : "Inter-State (Out of State / Export) -> IGST"}
          </p>
        </div>
        <div className="flex items-center bg-background p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => onSupplyTypeChange("intra")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-bold transition-all",
              supplyType === "intra" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Intra-State
          </button>
          <button
            type="button"
            onClick={() => onSupplyTypeChange("inter")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-bold transition-all",
              supplyType === "inter" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Inter-State
          </button>
        </div>
      </div>

      {/* Compensation Cess & Advanced Clauses */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
        <div>
          <Label className="text-[11px] font-bold text-muted-foreground">Compensation Cess %</Label>
          <div className="flex items-center gap-1.5 mt-1">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={cessRateStr}
              onChange={(e) => onCessRateChange(e.target.value)}
              placeholder="0"
              className="h-8 text-xs font-bold"
            />
            <span className="text-xs font-bold text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex flex-col justify-end space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rcm-toggle" className="text-[11px] font-bold cursor-pointer">
              RCM (Sec 9(3))
            </Label>
            <Switch id="rcm-toggle" checked={isRCM} onCheckedChange={onToggleRCM} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="tds-toggle" className="text-[11px] font-bold cursor-pointer">
              GST TDS (2%)
            </Label>
            <Switch id="tds-toggle" checked={enableTDS} onCheckedChange={onToggleTDS} />
          </div>
        </div>
      </div>
    </div>
  );
};
