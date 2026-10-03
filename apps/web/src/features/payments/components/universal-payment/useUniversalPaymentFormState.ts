import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useAuth } from "@/core/lib/auth";
import {
  PaymentMethodType,
  autoAllocateFIFO,
} from "../../utils/paymentTranscript";
import { PaymentReceiptDetails } from "@/utils/generatePaymentReceiptPDF";
import { useUniversalPaymentData } from "../../hooks/useUniversalPaymentData";
import { useUniversalPaymentMutation } from "../../hooks/useUniversalPaymentMutation";
import { UniversalPaymentDialogProps } from "./types";

export function useUniversalPaymentFormState({
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
          const pd = Number(
            found.amount_paid != null
              ? found.amount_paid
              : found.status === "paid"
              ? tot
              : 0
          );
          const due =
            found.balance_due != null
              ? Number(found.balance_due)
              : Math.max(0, tot - pd);
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
        const matchesName =
          ((isReceipt ? b.customer_name : b.vendor_name) || "")
            .trim()
            .toLowerCase() === (matched.name || "").trim().toLowerCase();
        return matchesId || matchesName;
      });
      const totalDue = bills.reduce((sum: number, b: any) => {
        const t = Number(b.total_amount || 0);
        const p = Number(
          b.amount_paid != null ? b.amount_paid : b.status === "paid" ? t : 0
        );
        return (
          sum +
          (b.balance_due != null ? Number(b.balance_due) : Math.max(0, t - p))
        );
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
      description: `Payment distributed across ${
        Object.values(allocations).filter((v) => v > 0).length
      } oldest pending bills.`,
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
      const toAllocate =
        remainingUnallocated > 0
          ? Math.min(bill.balanceDue, remainingUnallocated)
          : bill.balanceDue;
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

  const balanceAfterPayment =
    Math.round((partyBalance - enteredAmount) * 100) / 100;

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

  return {
    isReceipt,
    selectedPartyId,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    referenceNumber,
    setReferenceNumber,
    notes,
    setNotes,
    billAllocations,
    completedReceiptData,
    setCompletedReceiptData,
    profile,
    parties,
    eligibleParties,
    allBills,
    activeParty,
    partyPendingBills,
    partyBalance,
    handlePartySelect,
    handleAutoAllocate,
    handleClearAllocations,
    handleAllocationChange,
    handleToggleBill,
    enteredAmount,
    totalAllocated,
    advanceAmount,
    balanceAfterPayment,
    isSubmitting,
    handleSubmitPayment,
    formatCurrency,
  };
}
