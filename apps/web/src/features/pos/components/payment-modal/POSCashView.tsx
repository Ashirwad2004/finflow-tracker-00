import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface POSCashViewProps {
  cashReceived: number;
  onCashReceivedChange: (val: number) => void;
  totalAmount: number;
  cashChange: number;
  formatCurrency: (amount: number) => string;
  onExactCash: () => void;
  onQuickCash: (amount: number) => void;
}

export const POSCashView: React.FC<POSCashViewProps> = ({
  cashReceived,
  onCashReceivedChange,
  totalAmount,
  cashChange,
  formatCurrency,
  onExactCash,
  onQuickCash,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Cash Received (₹)
        </Label>
        <div className="relative mt-1">
          <Input
            type="number"
            step="any"
            value={cashReceived || ""}
            onChange={(e) => onCashReceivedChange(parseFloat(e.target.value) || 0)}
            className="text-xl font-black h-12 pl-4 bg-background border-border rounded-xl font-mono text-foreground"
            autoFocus
          />
        </div>
      </div>

      {/* Quick denomination chips */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExactCash}
          className="h-7.5 text-xs font-bold border-border rounded-lg"
        >
          Exact ({formatCurrency(totalAmount)})
        </Button>
        {[50, 100, 200, 500].map((val) => (
          <Button
            key={val}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onQuickCash(val)}
            className="h-7.5 text-xs border-border rounded-lg text-foreground hover:bg-muted font-medium"
          >
            +₹{val}
          </Button>
        ))}
      </div>

      {/* Change display */}
      <div className="p-3.5 rounded-2xl border bg-emerald-500/10 border-emerald-500/20 flex items-center justify-between shadow-2xs">
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          Change to Return
        </span>
        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
          {formatCurrency(cashChange)}
        </span>
      </div>
    </div>
  );
};
