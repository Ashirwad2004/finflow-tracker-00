import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, MinusCircle, Info, Loader2 } from "lucide-react";

interface LoyaltyAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomer: { id: string; name: string; currentPoints: number } | null;
  adjustType: "add" | "deduct";
  setAdjustType: (type: "add" | "deduct") => void;
  adjustAmount: number;
  setAdjustAmount: (amount: number) => void;
  adjustReason: string;
  setAdjustReason: (reason: string) => void;
  pointValue: number;
  formatCurrency: (amount: number) => string;
  isPending: boolean;
  onApply: () => void;
}

export function LoyaltyAdjustmentDialog({
  open,
  onOpenChange,
  selectedCustomer,
  adjustType,
  setAdjustType,
  adjustAmount,
  setAdjustAmount,
  adjustReason,
  setAdjustReason,
  pointValue,
  formatCurrency,
  isPending,
  onApply,
}: LoyaltyAdjustmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Adjust Reward Points</DialogTitle>
          <DialogDescription className="text-[11px]">
            Adjust points balance manually for <strong>{selectedCustomer?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex gap-3">
            <button
              onClick={() => setAdjustType("add")}
              className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 ${
                adjustType === "add"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                  : "border-slate-200 hover:border-slate-400 bg-card"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Points
            </button>
            <button
              onClick={() => setAdjustType("deduct")}
              className={`flex-1 p-2.5 rounded-lg border text-center font-semibold text-[11px] flex items-center justify-center gap-1.5 ${
                adjustType === "deduct"
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                  : "border-slate-200 hover:border-slate-400 bg-card"
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Deduct Points
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-medium">Current Wallet Balance</label>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-semibold font-mono">
              {selectedCustomer?.currentPoints || 0} pts
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-medium">Adjustment Value (points)</label>
            <Input
              type="number"
              min="1"
              placeholder="Enter points value..."
              value={adjustAmount || ""}
              onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value)))}
              className="h-8 text-[11px] rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-medium">Reason (kept in the audit log)</label>
            <Input
              placeholder="e.g. Birthday bonus, price adjustment..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="h-8 text-[11px] rounded-lg"
            />
          </div>

          {adjustType === "deduct" && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Redeeming {adjustAmount || 0} points will grant a checkout discount of{" "}
                <strong>{formatCurrency((adjustAmount || 0) * pointValue)}</strong> on their invoice billing.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-lg text-[11px] h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={isPending || adjustAmount <= 0}
            className="rounded-lg text-[11px] h-8"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
