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
import { LedgerEntry } from "../types";

interface LoyaltyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyCustomer: { id: string; name: string } | null;
  ledgerUnavailable: boolean;
  historyEntries: LedgerEntry[];
}

export function LoyaltyHistoryDialog({
  open,
  onOpenChange,
  historyCustomer,
  ledgerUnavailable,
  historyEntries,
}: LoyaltyHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Points History</DialogTitle>
          <DialogDescription className="text-[11px]">
            Manual adjustments and redemptions for <strong>{historyCustomer?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 py-2">
          {ledgerUnavailable ? (
            <p className="text-[11px] text-slate-400 text-center py-6">
              Detailed history requires the loyalty_ledger migration — see Settings tab.
            </p>
          ) : historyEntries.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">No manual adjustments yet.</p>
          ) : (
            historyEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-lg border"
              >
                <div>
                  <p className="text-[11px] font-medium capitalize">{entry.type.replace("_", " ")}</p>
                  {entry.reason && <p className="text-[10px] text-slate-500">{entry.reason}</p>}
                  <p className="text-[9px] text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <span
                  className={`text-[11px] font-semibold font-mono ${
                    entry.points > 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {entry.points > 0 ? "+" : ""}
                  {entry.points} pts
                </span>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-lg text-[11px] h-8">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
