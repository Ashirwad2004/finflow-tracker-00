import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { POSHeldBill } from "../types";
import { Clock, Play, Trash2, ShoppingCart } from "lucide-react";

interface POSHoldResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heldBills: POSHeldBill[];
  onResumeBill: (bill: POSHeldBill) => void;
  onDeleteHeldBill: (id: string) => void;
}

export const POSHoldResumeModal: React.FC<POSHoldResumeModalProps> = ({
  open,
  onOpenChange,
  heldBills,
  onResumeBill,
  onDeleteHeldBill,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Parked & Held Bills</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Resume or manage temporarily held carts
                </DialogDescription>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/80">
              {heldBills.length} Held
            </span>
          </div>
        </DialogHeader>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2.5 font-display">
          {heldBills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground/60 mb-2">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">No bills currently on hold</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                You can park a cart anytime by clicking "Hold Bill" (F8) on the POS screen.
              </p>
            </div>
          ) : (
            heldBills.map((bill) => (
              <div
                key={bill.id}
                className="p-3.5 rounded-xl border border-border/80 bg-background hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{bill.customer_name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-mono border border-border/60">
                      {new Date(bill.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {bill.items.length} item{bill.items.length !== 1 ? "s" : ""} •{" "}
                    {bill.items.map((it) => it.name).join(", ").slice(0, 45)}...
                  </p>

                  {bill.notes && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 italic truncate">
                      Note: {bill.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-black text-foreground font-mono">
                    {formatCurrency(bill.total_amount)}
                  </span>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onResumeBill(bill);
                      onOpenChange(false);
                    }}
                    className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Resume
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteHeldBill(bill.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                    title="Discard held bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
