import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { POSShift, POSShiftSummary } from "../types";
import { Banknote, ArrowDownLeft, ArrowUpRight, Lock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface POSShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeShift: POSShift | null;
  shiftSummary: POSShiftSummary | null;
  cashierName: string;
  onOpenShift: (openingCash: number, notes?: string) => Promise<void>;
  onCloseShift: (shiftId: string, actualCash: number, notes?: string) => Promise<void>;
  onRecordCashMovement: (shiftId: string, type: "cash_in" | "cash_out", amount: number, reason: string) => Promise<void>;
}

export const POSShiftModal: React.FC<POSShiftModalProps> = ({
  open,
  onOpenChange,
  activeShift,
  shiftSummary,
  cashierName,
  onOpenShift,
  onCloseShift,
  onRecordCashMovement,
}) => {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<"summary" | "cash_in" | "cash_out" | "close">("summary");

  // Open shift inputs
  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [openNotes, setOpenNotes] = useState("");

  // Cash movement inputs
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState("");

  // Close shift inputs
  const [actualCash, setActualCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived difference
  const expectedCash = shiftSummary?.expected_cash ?? activeShift?.opening_cash ?? 0;
  const cashDifference = actualCash - expectedCash;

  const handleOpen = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onOpenShift(openingFloat, openNotes);
      toast.success("Shift opened successfully");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to open shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovement = async (type: "cash_in" | "cash_out") => {
    if (!activeShift || isSubmitting) return;
    if (movementAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (!movementReason.trim()) {
      toast.error("Please enter a reason for this cash movement");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRecordCashMovement(activeShift.id, type, movementAmount, movementReason.trim());
      toast.success(`${type === "cash_in" ? "Cash In" : "Cash Out"} recorded`);
      setMovementAmount(0);
      setMovementReason("");
      setActiveTab("summary");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record movement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!activeShift || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCloseShift(activeShift.id, actualCash, closeNotes);
      toast.success("Shift closed and reconciled successfully");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to close shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Register Drawer & Shift</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Cashier: <span className="font-semibold text-foreground">{cashierName}</span>
                </DialogDescription>
              </div>
            </div>
            {activeShift && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ACTIVE SHIFT
              </span>
            )}
          </div>
        </DialogHeader>

        {/* IF NO SHIFT IS ACTIVE: SHOW OPEN SHIFT FORM */}
        {!activeShift ? (
          <div className="p-6 space-y-4 font-display">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-foreground">Start Cashier Register Session</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Count your drawer cash float before beginning billing transactions.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Opening Cash Float (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2000"
                  value={openingFloat || ""}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="text-base font-bold h-11 mt-1 bg-background border-border rounded-xl"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift Notes (Optional)</Label>
                <Textarea
                  placeholder="e.g. Morning Counter 1 Shift"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="text-xs h-20 mt-1 resize-none bg-background border-border rounded-xl"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleOpen}
              disabled={isSubmitting}
              className="w-full h-11 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Open Register Shift
            </Button>
          </div>
        ) : (
          /* IF SHIFT ACTIVE: SHOW TABS */
          <div className="flex flex-col font-display">
            {/* Sub-nav tabs */}
            <div className="flex border-b border-border/80 bg-muted/20 px-3 pt-2 gap-1.5">
              {[
                { id: "summary", label: "Overview" },
                { id: "cash_in", label: "+ Cash In" },
                { id: "cash_out", label: "- Cash Out" },
                { id: "close", label: "Close Shift" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-card border-t border-x border-border/80 text-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === "summary" && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Opening Float</span>
                    <span className="text-base font-bold text-foreground font-mono mt-0.5 block">{formatCurrency(shiftSummary?.opening_cash || 0)}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Cash Sales</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      +{formatCurrency(shiftSummary?.cash_sales || 0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Cash In</span>
                    <span className="text-base font-bold text-primary font-mono mt-0.5 block">
                      +{formatCurrency(shiftSummary?.cash_in || 0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Cash Out</span>
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
                      -{formatCurrency(shiftSummary?.cash_out || 0)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Expected Cash in Drawer</span>
                    <span className="text-[10px] text-muted-foreground">Computed from immutable transaction records</span>
                  </div>
                  <span className="text-2xl font-black text-primary tracking-tight font-mono">
                    {formatCurrency(expectedCash)}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground flex justify-between pt-1 border-t border-border/60">
                  <span>Total Invoices Completed: <strong className="text-foreground">{shiftSummary?.total_bills || 0}</strong></span>
                  <span>Shift Started: <strong className="text-foreground">{new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>
              </div>
            )}

            {/* CASH IN TAB */}
            {activeTab === "cash_in" && (
              <div className="p-5 space-y-3.5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Add Cash to Drawer</h4>
                  <p className="text-xs text-muted-foreground">Record cash float top-ups from owner or bank.</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount to Add (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={movementAmount || ""}
                    onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                    className="h-10 text-base font-bold mt-1 bg-background border-border rounded-xl font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason / Description</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Added change denominations"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="h-9.5 text-xs mt-1 bg-background border-border rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleMovement("cash_in")}
                  disabled={isSubmitting}
                  className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-xl shadow-xs"
                >
                  <ArrowDownLeft className="w-4 h-4" /> Record Cash In
                </Button>
              </div>
            )}

            {/* CASH OUT TAB */}
            {activeTab === "cash_out" && (
              <div className="p-5 space-y-3.5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Withdraw Cash from Drawer</h4>
                  <p className="text-xs text-muted-foreground">Record petty cash expenses, supplier spot payments, or cash drops to safe.</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount to Withdraw (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={movementAmount || ""}
                    onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                    className="h-10 text-base font-bold mt-1 bg-background border-border rounded-xl font-mono"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason / Expense Description</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Store packaging supplies / tea / cash drop"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    className="h-9.5 text-xs mt-1 bg-background border-border rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleMovement("cash_out")}
                  disabled={isSubmitting}
                  className="w-full h-10 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-xl shadow-xs"
                >
                  <ArrowUpRight className="w-4 h-4" /> Record Cash Out
                </Button>
              </div>
            )}

            {/* CLOSE SHIFT TAB */}
            {activeTab === "close" && (
              <div className="p-5 space-y-3.5">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Reconcile & Close Shift</h4>
                  <p className="text-xs text-muted-foreground">
                    Physically count the cash notes and coins in the register drawer.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Expected Cash:</span>
                    <span className="font-bold font-mono text-foreground">{formatCurrency(expectedCash)}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actual Counted Cash (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={actualCash || ""}
                    onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                    className="h-11 text-lg font-black mt-1 bg-background border-border rounded-xl font-mono"
                    autoFocus
                  />
                </div>

                {/* Discrepancy badge */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  cashDifference === 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : cashDifference > 0
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}>
                  <span className="flex items-center gap-1.5">
                    {cashDifference !== 0 && <AlertTriangle className="w-4 h-4" />}
                    Difference ({cashDifference === 0 ? "Exact Match" : cashDifference > 0 ? "Cash Over" : "Cash Short"})
                  </span>
                  <span className="text-base font-black font-mono">
                    {cashDifference > 0 ? `+${formatCurrency(cashDifference)}` : formatCurrency(cashDifference)}
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Closing Notes (Optional)</Label>
                  <Textarea
                    placeholder="e.g. Handover to Evening Shift"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    className="text-xs h-16 mt-1 resize-none bg-background border-border rounded-xl"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full h-11 font-bold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 rounded-xl shadow-xs"
                >
                  <Lock className="w-4 h-4" /> Close Register Session
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
