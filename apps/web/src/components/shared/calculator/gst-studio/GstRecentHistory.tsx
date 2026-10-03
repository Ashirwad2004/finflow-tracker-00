import React from "react";
import { Label } from "@/components/ui/label";
import { formatINR, GSTCalculationHistory } from "../calculatorUtils";
import { CalcType } from "./types";

interface GstRecentHistoryProps {
  gstHistory: GSTCalculationHistory[];
  onSelectHistoryItem: (amount: number, rate: number, type: CalcType) => void;
}

export const GstRecentHistory: React.FC<GstRecentHistoryProps> = ({
  gstHistory,
  onSelectHistoryItem,
}) => {
  if (gstHistory.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        Recent Computations
      </Label>
      <div className="space-y-1">
        {gstHistory.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              const amount = item.type === "exclusive" ? item.baseAmount : item.grossAmount;
              onSelectHistoryItem(amount, item.rate, item.type);
            }}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/80 text-xs cursor-pointer transition-all border border-border/40"
          >
            <span className="font-semibold text-muted-foreground">{item.timestamp}</span>
            <span className="font-bold">
              {formatINR(item.baseAmount)} + {item.rate}% GST
            </span>
            <span className="font-mono font-bold text-primary">{formatINR(item.grossAmount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
