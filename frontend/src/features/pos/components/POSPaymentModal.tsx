import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { QRCodeSVG } from "qrcode.react";
import { v4 as uuidv4 } from "uuid";
import { Banknote, QrCode, CreditCard, Landmark, HandCoins, Split, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { POSPaymentMethodType, POSSplitPaymentBreakdown } from "../types";
import { toast } from "sonner";

interface POSPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  customerName: string;
  upiId?: string;
  businessName?: string;
  onCompleteSale: (params: {
    paymentMethod: POSPaymentMethodType;
    amountPaid: number;
    splitBreakdown?: POSSplitPaymentBreakdown;
    notes?: string;
    idempotencyKey: string;
  }) => Promise<void>;
}

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
  open,
  onOpenChange,
  totalAmount,
  customerName,
  upiId = "",
  businessName = "FinFlow Store",
  onCompleteSale,
}) => {
  const { formatCurrency } = useCurrency();
  const [selectedMethod, setSelectedMethod] = useState<POSPaymentMethodType>("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cash state
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);

  // UPI state
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [upiReference, setUpiReference] = useState("");

  // Card & Bank state
  const [cardReference, setCardReference] = useState("");
  const [bankReference, setBankReference] = useState("");

  // Credit / Partial state
  const [creditAmountPaid, setCreditAmountPaid] = useState<number>(0);

  // Split state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitCredit, setSplitCredit] = useState<number>(0);

  // Sync totalAmount on open
  useEffect(() => {
    if (open) {
      setCashReceived(totalAmount);
      setCreditAmountPaid(0);
      setSplitCash(totalAmount);
      setSplitUpi(0);
      setSplitCard(0);
      setSplitCredit(0);
      setUpiConfirmed(false);
      setUpiReference("");
      setCardReference("");
      setBankReference("");
      setIsSubmitting(false);
    }
  }, [open, totalAmount]);

  // Cash change calculation
  const cashChange = useMemo(() => {
    return Math.max(0, Math.round((cashReceived - totalAmount) * 100) / 100);
  }, [cashReceived, totalAmount]);

  // Dynamic UPI URI
  const effectiveUpi = upiId || localStorage.getItem("rupeebill_upi_id") || "";
  const upiUri = useMemo(() => {
    if (!effectiveUpi) return "";
    return `upi://pay?pa=${encodeURIComponent(effectiveUpi)}&pn=${encodeURIComponent(businessName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`POS Bill ${customerName}`)}`;
  }, [effectiveUpi, businessName, totalAmount, customerName]);

  // Split sum & remaining
  const splitTotalPaid = splitCash + splitUpi + splitCard;
  const splitRemaining = Math.max(0, Math.round((totalAmount - splitTotalPaid - splitCredit) * 100) / 100);

  const handleQuickCash = (amountToAdd: number) => {
    setCashReceived((prev) => prev + amountToAdd);
  };

  const handleExactCash = () => {
    setCashReceived(totalAmount);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate methods
    if (selectedMethod === "cash" && cashReceived < totalAmount) {
      toast.error(`Cash received (${formatCurrency(cashReceived)}) cannot be less than total (${formatCurrency(totalAmount)})`);
      return;
    }

    if (selectedMethod === "upi" && !upiConfirmed) {
      toast.error("Please verify that UPI payment was received before completing the sale.");
      return;
    }

    if (selectedMethod === "split") {
      const totalSettled = splitCash + splitUpi + splitCard + splitCredit;
      if (Math.abs(totalSettled - totalAmount) > 0.05) {
        toast.error(`Split allocation (${formatCurrency(totalSettled)}) must equal total (${formatCurrency(totalAmount)})`);
        return;
      }
    }

    setIsSubmitting(true);
    const idempotencyKey = uuidv4();

    try {
      let amountPaid = totalAmount;
      let notes = "";
      let splitBreakdown: POSSplitPaymentBreakdown | undefined = undefined;

      if (selectedMethod === "cash") {
        amountPaid = totalAmount;
        notes = `Cash Received: ${formatCurrency(cashReceived)}, Change Returned: ${formatCurrency(cashChange)}`;
      } else if (selectedMethod === "upi") {
        amountPaid = totalAmount;
        notes = `UPI Payment confirmed. Ref/UTR: ${upiReference || "Verified by Cashier"}`;
      } else if (selectedMethod === "card") {
        amountPaid = totalAmount;
        notes = `Card Transaction Ref: ${cardReference || "N/A"}`;
      } else if (selectedMethod === "bank_transfer") {
        amountPaid = totalAmount;
        notes = `Bank Transfer Ref: ${bankReference || "N/A"}`;
      } else if (selectedMethod === "credit") {
        amountPaid = creditAmountPaid;
        notes = `Credit Sale for ${customerName}. Initial payment: ${formatCurrency(creditAmountPaid)}, Balance due: ${formatCurrency(totalAmount - creditAmountPaid)}`;
      } else if (selectedMethod === "split") {
        amountPaid = splitTotalPaid;
        splitBreakdown = {
          cash: splitCash,
          upi: splitUpi,
          card: splitCard,
          bank_transfer: 0,
          credit: splitCredit,
          upi_reference: upiReference,
        };
        notes = `Split Payment: Cash ${formatCurrency(splitCash)}, UPI ${formatCurrency(splitUpi)}, Card ${formatCurrency(splitCard)}, Credit ${formatCurrency(splitCredit)}`;
      }

      await onCompleteSale({
        paymentMethod: selectedMethod,
        amountPaid,
        splitBreakdown,
        notes,
        idempotencyKey,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("[POSPayment] Sale completion failed:", err);
      toast.error(err?.message || "Failed to complete sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-card border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Sale Settlement</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Customer: <span className="font-semibold text-foreground">{customerName}</span>
              </DialogDescription>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Payable Total</span>
              <span className="text-xl font-black text-primary tracking-tight font-mono">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[340px] font-display">
          {/* Payment Method Selector */}
          <div className="p-3 border-r border-border/80 space-y-1 bg-muted/20">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 block mb-1.5">
              Payment Method
            </span>

            {[
              { id: "cash", label: "Cash", icon: Banknote },
              { id: "upi", label: "UPI / QR Code", icon: QrCode },
              { id: "card", label: "Debit / Credit Card", icon: CreditCard },
              { id: "bank_transfer", label: "Bank Transfer", icon: Landmark },
              { id: "credit", label: "Store Credit (Udhaar)", icon: HandCoins },
              { id: "split", label: "Split Payment", icon: Split },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id as POSPaymentMethodType)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Method Details */}
          <div className="p-5 md:col-span-2 flex flex-col justify-between space-y-4">
            {/* CASH VIEW */}
            {selectedMethod === "cash" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cash Received (₹)</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="any"
                      value={cashReceived || ""}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="text-xl font-black h-12 pl-4 bg-background border-border rounded-xl font-mono text-foreground"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={handleExactCash} className="h-7.5 text-xs font-bold border-border rounded-lg">
                    Exact ({formatCurrency(totalAmount)})
                  </Button>
                  {[50, 100, 200, 500].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickCash(val)}
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
            )}

            {/* UPI VIEW */}
            {selectedMethod === "upi" && (
              <div className="space-y-3 flex flex-col items-center text-center">
                {upiUri ? (
                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-md inline-block">
                    <QRCodeSVG value={upiUri} size={130} level="M" />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                    No store UPI ID configured. Go to Settings &gt; Bank Details to setup UPI.
                  </div>
                )}

                <div className="w-full space-y-2 text-left">
                  <div>
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bank Reference / UTR Number (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 12-digit UTR from phone or soundbox"
                      value={upiReference}
                      onChange={(e) => setUpiReference(e.target.value)}
                      className="h-9 text-xs mt-1 bg-background border-border rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="upi-confirm-check"
                      checked={upiConfirmed}
                      onChange={(e) => setUpiConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <label htmlFor="upi-confirm-check" className="text-xs font-medium text-foreground cursor-pointer select-none">
                      Payment received in store account (Soundbox verified)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* CARD VIEW */}
            {selectedMethod === "card" && (
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Card Transaction Reference / Approval Code</Label>
                <Input
                  type="text"
                  placeholder="e.g. Card slip approval code / RRN"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                  className="h-9.5 text-xs bg-background border-border rounded-xl font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Swipe or tap card on POS terminal machine. Record the approval code for accounting reconciliation.
                </p>
              </div>
            )}

            {/* BANK TRANSFER VIEW */}
            {selectedMethod === "bank_transfer" && (
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">NEFT / RTGS / IMPS Reference Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. Bank UTR / Transaction ID"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="h-9.5 text-xs bg-background border-border rounded-xl font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Direct wire transfer to store bank account.
                </p>
              </div>
            )}

            {/* CREDIT VIEW */}
            {selectedMethod === "credit" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Initial Payment Received (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={creditAmountPaid || ""}
                    placeholder="0"
                    onChange={(e) => setCreditAmountPaid(parseFloat(e.target.value) || 0)}
                    className="h-9.5 text-xs mt-1 bg-background border-border rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="p-3.5 rounded-2xl border bg-amber-500/10 border-amber-500/20 flex items-center justify-between shadow-2xs">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Remaining Balance Due
                  </span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatCurrency(Math.max(0, totalAmount - creditAmountPaid))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Added to debtor balance ledger for <strong>{customerName}</strong>.
                </p>
              </div>
            )}

            {/* SPLIT VIEW */}
            {selectedMethod === "split" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Cash Amount</Label>
                    <Input
                      type="number"
                      value={splitCash || ""}
                      onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">UPI Amount</Label>
                    <Input
                      type="number"
                      value={splitUpi || ""}
                      onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Card Amount</Label>
                    <Input
                      type="number"
                      value={splitCard || ""}
                      onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">Credit / Udhaar</Label>
                    <Input
                      type="number"
                      value={splitCredit || ""}
                      onChange={(e) => setSplitCredit(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold bg-background border-border rounded-lg"
                    />
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border text-xs flex justify-between font-bold ${
                  splitRemaining === 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}>
                  <span>Unallocated Balance</span>
                  <span className="font-mono">{formatCurrency(splitRemaining)}</span>
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs h-10 px-4 border-border text-foreground hover:bg-muted font-medium"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-10 px-6 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Sale...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Sale ({formatCurrency(totalAmount)})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
