import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptIndianRupee,
  Calendar,
  CreditCard,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useAuth } from "@/core/lib/auth";
import {
  PaymentMethodType,
  autoAllocateFIFO,
} from "../utils/paymentTranscript";
import { BillPaymentTarget } from "./RecordBillPaymentDialog";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { PaymentReceiptDetails } from "@/utils/generatePaymentReceiptPDF";

import { useUniversalPaymentData } from "../hooks/useUniversalPaymentData";
import { useUniversalPaymentMutation } from "../hooks/useUniversalPaymentMutation";
import { MultiBillSettlementTable } from "./MultiBillSettlementTable";
import { PaymentFinancialImpactBox } from "./PaymentFinancialImpactBox";

export interface UniversalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "payment_in" | "payment_out"; // 'payment_in' = Sales Receipt, 'payment_out' = Purchase Payment
  initialType?: "in" | "out"; // Convenience alias: 'in' => 'payment_in', 'out' => 'payment_out'
  initialBill?: BillPaymentTarget | null;
  initialBillId?: string | null;
  initialPartyId?: string | null;
  initialPartyName?: string | null;
  onSuccess?: (result?: any) => void;
}

export function UniversalPaymentDialog({
  open,
  onOpenChange,
  mode,
  initialType,
  initialBill,
  initialBillId,
  initialPartyId,
  initialPartyName,
  onSuccess,
}: UniversalPaymentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  const effectiveMode = mode || (initialType === "out" ? "payment_out" : "payment_in");
  const isReceipt = effectiveMode === "payment_in";

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [billAllocations, setBillAllocations] = useState<Record<string, number>>({});
  const [completedReceiptData, setCompletedReceiptData] = useState<PaymentReceiptDetails | null>(null);

  // Data fetching hook
  const {
    profile,
    parties,
    eligibleParties,
    allBills,
    activeParty,
    partyPendingBills,
    partyBalance,
  } = useUniversalPaymentData({
    open,
    isReceipt,
    selectedPartyId,
  });

  // Initialize dialog state on open or props change
  useEffect(() => {
    if (open) {
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("cash");
      setReferenceNumber("");
      setNotes("");
      setBillAllocations({});

      if (initialBill) {
        // Tagged specific bill
        const matchedParty = parties.find((p: any) => {
          if (initialBill.rawRecord?.party_id === p.id) return true;
          return (
            (p.name || "").trim().toLowerCase() ===
            (initialBill.partyName || "").trim().toLowerCase()
          );
        });
        if (matchedParty) {
          setSelectedPartyId(matchedParty.id);
        }
        const balDue = Number(initialBill.balanceDue || 0);
        setPaymentAmount(balDue > 0 ? String(balDue) : "");
        setBillAllocations({ [initialBill.id]: balDue });
      } else if (initialBillId) {
        const found = allBills.find((b: any) => b.id === initialBillId);
        if (found) {
          const tot = Number(found.total_amount || 0);
          const pd = Number(found.amount_paid != null ? found.amount_paid : (found.status === "paid" ? tot : 0));
          const due = found.balance_due != null ? Number(found.balance_due) : Math.max(0, tot - pd);
          setPaymentAmount(due > 0 ? String(due) : "");
          setBillAllocations({ [found.id]: due });
          if (found.party_id) {
            setSelectedPartyId(found.party_id);
          }
        }
      } else if (initialPartyId) {
        setSelectedPartyId(initialPartyId);
        setPaymentAmount("");
      } else if (initialPartyName) {
        const norm = initialPartyName.trim().toLowerCase();
        const matched = parties.find(
          (p: any) => (p.name || "").trim().toLowerCase() === norm
        );
        if (matched) {
          setSelectedPartyId(matched.id);
        }
        setPaymentAmount("");
      } else {
        setSelectedPartyId("");
        setPaymentAmount("");
      }
    }
  }, [open, initialBill, initialBillId, initialPartyId, initialPartyName, parties, allBills]);

  // When party changes, prefill allocations or clear
  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    setBillAllocations({});
    const matched = parties.find((p: any) => p.id === partyId);
    if (matched) {
      const bills = allBills.filter((b: any) => {
        if (b.status === "paid" || b.status === "cancelled") return false;
        const matchesId = b.party_id && b.party_id === matched.id;
        const matchesName = ((isReceipt ? b.customer_name : b.vendor_name) || "").trim().toLowerCase() === (matched.name || "").trim().toLowerCase();
        return matchesId || matchesName;
      });
      const totalDue = bills.reduce((sum: number, b: any) => {
        const t = Number(b.total_amount || 0);
        const p = Number(b.amount_paid != null ? b.amount_paid : (b.status === "paid" ? t : 0));
        return sum + (b.balance_due != null ? Number(b.balance_due) : Math.max(0, t - p));
      }, 0);
      if (totalDue > 0) {
        setPaymentAmount(String(totalDue));
      }
    }
  };

  const enteredAmount = Math.max(0, Number(paymentAmount) || 0);

  // Trigger FIFO auto-allocation
  const handleAutoAllocate = () => {
    if (partyPendingBills.length === 0 || enteredAmount <= 0) return;
    const { allocations } = autoAllocateFIFO(
      partyPendingBills.map((b) => ({ id: b.id, balanceDue: b.balanceDue })),
      enteredAmount
    );
    setBillAllocations(allocations);
    toast({
      title: "FIFO Auto-Allocated! ⚡",
      description: `Payment distributed across ${Object.values(allocations).filter((v) => v > 0).length} oldest pending bills.`,
    });
  };

  // Clear allocations
  const handleClearAllocations = () => {
    const cleared: Record<string, number> = {};
    partyPendingBills.forEach((b) => (cleared[b.id] = 0));
    setBillAllocations(cleared);
  };

  // Change individual bill allocation
  const handleAllocationChange = (billId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setBillAllocations((prev) => ({
      ...prev,
      [billId]: num,
    }));
  };

  // Toggle full allocation for a bill
  const handleToggleBill = (bill: any) => {
    const currentAlloc = Number(billAllocations[bill.id] || 0);
    if (currentAlloc > 0) {
      setBillAllocations((prev) => ({ ...prev, [bill.id]: 0 }));
    } else {
      const currentTotalAlloc = Object.entries(billAllocations).reduce(
        (sum, [k, v]) => (k === bill.id ? sum : sum + (Number(v) || 0)),
        0
      );
      const remainingUnallocated = Math.max(0, enteredAmount - currentTotalAlloc);
      const toAllocate = remainingUnallocated > 0 ? Math.min(bill.balanceDue, remainingUnallocated) : bill.balanceDue;
      setBillAllocations((prev) => ({ ...prev, [bill.id]: toAllocate }));
    }
  };

  // Summary calculations
  const totalAllocated = useMemo(() => {
    return Object.values(billAllocations).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
  }, [billAllocations]);

  const advanceAmount = Math.max(
    0,
    Math.round((enteredAmount - totalAllocated) * 100) / 100
  );

  const balanceAfterPayment = Math.round((partyBalance - enteredAmount) * 100) / 100;

  // Mutation handling hook
  const { isSubmitting, handleSubmitPayment } = useUniversalPaymentMutation({
    user,
    isReceipt,
    activeParty,
    enteredAmount,
    paymentDate,
    paymentMethod,
    referenceNumber,
    notes,
    partyPendingBills,
    billAllocations,
    advanceAmount,
    partyBalance,
    balanceAfterPayment,
    profile,
    formatCurrency,
    onSuccess,
    onOpenChange,
    setCompletedReceiptData,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[660px] max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          {/* Header Banner */}
          <div
            className={`px-6 py-4.5 border-b shrink-0 ${
              isReceipt
                ? "bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-100 dark:border-emerald-950/40"
                : "bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-100 dark:border-indigo-950/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    isReceipt
                      ? "bg-emerald-600 shadow-emerald-500/20"
                      : "bg-indigo-600 shadow-indigo-500/20"
                  }`}
                >
                  {isReceipt ? (
                    <ArrowDownLeft className="w-6 h-6" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                      {isReceipt ? "Record Payment In" : "Record Payment Out"}
                    </DialogTitle>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isReceipt
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                      }`}
                    >
                      {isReceipt ? "Receipt Voucher" : "Payment Voucher"}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isReceipt
                      ? "Receive customer payment against outstanding invoices or on account"
                      : "Make vendor disbursement against purchase bills or advance payment"}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* 1. Party Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Select {isReceipt ? "Customer" : "Vendor"}
                </label>
                {activeParty && (
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Current Outstanding:{" "}
                    <strong
                      className={
                        partyBalance > 0
                          ? isReceipt
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600"
                      }
                    >
                      {formatCurrency(partyBalance)} {partyBalance > 0 ? (isReceipt ? "Dr" : "Cr") : ""}
                    </strong>
                  </span>
                )}
              </div>

              <select
                value={selectedPartyId}
                onChange={(e) => handlePartySelect(e.target.value)}
                className="w-full h-10 px-3 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">
                  -- Choose {isReceipt ? "Customer" : "Vendor"} ({eligibleParties.length} available) --
                </option>
                {eligibleParties.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Amount & Date Input Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ReceiptIndianRupee className="w-3.5 h-3.5 text-primary" />
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 pl-7 pr-3 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Payment Mode & Reference Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  Payment Mode
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="cash">💵 Cash in Hand</option>
                  <option value="upi">📱 UPI / QR Code</option>
                  <option value="bank_transfer">🏦 Bank Transfer / NEFT / IMPS</option>
                  <option value="card">💳 Debit / Credit Card</option>
                  <option value="cheque">📄 Cheque / Demand Draft</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Reference / UTR / Cheque #
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. UTR-982348 or CHQ-00124"
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Smart Multi-Bill Settlement Section */}
            <MultiBillSettlementTable
              isReceipt={isReceipt}
              selectedPartyId={selectedPartyId}
              partyPendingBills={partyPendingBills}
              billAllocations={billAllocations}
              enteredAmount={enteredAmount}
              totalAllocated={totalAllocated}
              advanceAmount={advanceAmount}
              onAutoAllocate={handleAutoAllocate}
              onClearAllocations={handleClearAllocations}
              onToggleBill={handleToggleBill}
              onAllocationChange={handleAllocationChange}
            />

            {/* 5. Narration / Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Narration / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared via HDFC Bank NEFT"
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* 6. Live Impact Financial Box */}
            <PaymentFinancialImpactBox
              partyBalance={partyBalance}
              enteredAmount={enteredAmount}
              balanceAfterPayment={balanceAfterPayment}
            />
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSubmitPayment}
              disabled={isSubmitting || enteredAmount <= 0 || !activeParty}
              className={`text-xs font-bold text-white shadow-xs ${
                isReceipt
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
              }`}
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <span>
                  {isReceipt ? "Record Payment In" : "Record Payment Out"} (
                  {formatCurrency(enteredAmount)})
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Modal displayed on completion */}
      {completedReceiptData && (
        <PaymentReceiptModal
          open={!!completedReceiptData}
          onOpenChange={(isOpen) => !isOpen && setCompletedReceiptData(null)}
          receiptData={completedReceiptData}
        />
      )}
    </>
  );
}

export default UniversalPaymentDialog;
