import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptIndianRupee,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Sparkles,
  Receipt,
  FileText,
  UserCheck,
  Search,
  Check,
  Layers,
  HelpCircle,
  MessageCircle,
  Printer,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useAuth } from "@/core/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { invoicesApi } from "@/core/api/invoices";
import {
  PaymentMethodType,
  BillPaymentVoucher,
  parsePaymentTranscript,
  encodePaymentTranscript,
  generateVoucherNumber,
  autoAllocateFIFO,
  getPaymentMethodDetails,
} from "../utils/paymentTranscript";
import { BillPaymentTarget } from "./RecordBillPaymentDialog";
import {
  PaymentReceiptModal,
} from "./PaymentReceiptModal";
import { PaymentReceiptDetails, SettledBillDetail } from "@/utils/generatePaymentReceiptPDF";

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
  const queryClient = useQueryClient();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billAllocations, setBillAllocations] = useState<Record<string, number>>({});

  // Receipt Modal on success
  const [completedReceiptData, setCompletedReceiptData] = useState<PaymentReceiptDetails | null>(null);

  // Business profile for receipts
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) return data;
      } catch (_) {}
      return (await sqliteService.getById<any>(user.id)) || null;
    },
    enabled: !!user && open,
  });

  // 1. Fetch Parties
  const { data: parties = [] } = useQuery({
    queryKey: ["parties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("parties")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Parties fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("parties", user.id)) || [];
    },
    enabled: !!user && open,
  });

  // Filter parties based on mode
  const eligibleParties = useMemo(() => {
    return parties.filter((p: any) => {
      if (isReceipt) {
        return p.type === "customer" || p.type === "both";
      }
      return p.type === "vendor" || p.type === "both";
    });
  }, [parties, isReceipt]);

  // 2. Fetch Bills (Sales for payment_in, Purchases for payment_out)
  const { data: salesBills = [] } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Sales fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("sales", user.id)) || [];
    },
    enabled: !!user && open && isReceipt,
  });

  const { data: purchaseBills = [] } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("purchases")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[PaymentDialog] Purchases fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("purchases", user.id)) || [];
    },
    enabled: !!user && open && !isReceipt,
  });

  // Current raw bills array
  const allBills = isReceipt ? salesBills : purchaseBills;

  // Selected party object
  const activeParty = useMemo(() => {
    return parties.find((p: any) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Pending/unpaid bills for active party
  const partyPendingBills = useMemo(() => {
    if (!activeParty) return [];
    const pName = (activeParty.name || "").trim().toLowerCase();

    return allBills
      .filter((b: any) => {
        if (b.status === "paid" || b.status === "cancelled" || b.status === "draft") return false;
        const billPartyName = ((isReceipt ? b.customer_name : b.vendor_name) || "").trim().toLowerCase();
        const matchesId = b.party_id && b.party_id === activeParty.id;
        const matchesName = billPartyName && billPartyName === pName;
        return matchesId || matchesName;
      })
      .map((b: any) => {
        const total = Number(b.total_amount || 0);
        const currentPaid = Number(b.amount_paid != null ? b.amount_paid : (b.status === "paid" ? total : 0));
        const balanceDue = b.balance_due != null ? Number(b.balance_due) : Math.max(0, total - currentPaid);
        const billNumber = isReceipt
          ? b.invoice_number || `INV-${b.id?.substring(0, 6)?.toUpperCase()}`
          : b.bill_number || `BILL-${b.id?.substring(0, 6)?.toUpperCase()}`;
        const partyName = isReceipt ? b.customer_name : b.vendor_name;

        return {
          id: b.id,
          billNumber,
          partyName,
          partyGstin: isReceipt ? b.customer_gstin : b.vendor_gstin,
          partyPhone: isReceipt ? b.customer_phone : b.vendor_phone,
          totalAmount: total,
          amountPaid: currentPaid,
          balanceDue,
          date: b.date || b.created_at?.split("T")[0],
          dueDate: b.due_date,
          notes: b.notes,
          paymentMethod: b.payment_method || "cash",
          type: (isReceipt ? "sale" : "purchase") as "sale" | "purchase",
          rawRecord: b,
        };
      })
      .filter((b: any) => b.balanceDue > 0.01)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()); // FIFO order: oldest first
  }, [allBills, activeParty, isReceipt]);

  // Outstanding party balance calculation
  const partyBalance = useMemo(() => {
    if (!activeParty) return 0;
    const openBal = Number(activeParty.opening_balance || 0);
    const isOpeningReceivable = activeParty.opening_balance_type
      ? activeParty.opening_balance_type === "to_receive"
      : activeParty.type !== "vendor";

    const openDues = partyPendingBills.reduce(
      (sum: number, b: any) => sum + Number(b.balanceDue || 0),
      0
    );

    if (isReceipt) {
      return openDues + (isOpeningReceivable ? openBal : -openBal);
    } else {
      return openDues + (!isOpeningReceivable ? openBal : -openBal);
    }
  }, [activeParty, partyPendingBills, isReceipt]);

  // Initialize dialog state
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
      // Find open dues for this party
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
      // Allocate either bill balance due or remaining entered amount
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

  // Submission handler
  const handleSubmitPayment = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to record transactions.",
        variant: "destructive",
      });
      return;
    }

    if (enteredAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a payment amount greater than ₹0.00",
        variant: "destructive",
      });
      return;
    }

    if (!activeParty) {
      toast({
        title: "Party Required",
        description: `Please select a ${isReceipt ? "customer" : "vendor"} for this transaction.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const voucherType = isReceipt ? "receipt" : "payment";
      const voucherNumber = generateVoucherNumber(voucherType);
      const currentTimeStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const tableName = isReceipt ? "sales" : "purchases";
      const settledBillsForReceipt: SettledBillDetail[] = [];

      // 1. UPDATE ALLOCATED BILLS
      const billsToUpdate = partyPendingBills.filter(
        (b) => Number(billAllocations[b.id] || 0) > 0
      );

      for (const bill of billsToUpdate) {
        const alloc = Math.round(Number(billAllocations[bill.id]) * 100) / 100;
        const currentPaid = Number(bill.amountPaid || 0);
        const newPaid = Math.round((currentPaid + alloc) * 100) / 100;
        const newDue = Math.max(0, Math.round((bill.totalAmount - newPaid) * 100) / 100);
        const newStatus = newDue <= 0.001 ? "paid" : "partial";

        const { cleanNotes, payments } = parsePaymentTranscript(bill.notes, {
          total_amount: bill.totalAmount,
          amount_paid: bill.amountPaid,
          balance_due: bill.balanceDue,
          status: bill.rawRecord?.status,
          payment_method: paymentMethod,
          date: bill.date,
          due_date: bill.dueDate,
          type: bill.type,
        });

        const newVoucher: BillPaymentVoucher = {
          id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          voucher_number: voucherNumber,
          type: voucherType,
          date: paymentDate || new Date().toISOString().split("T")[0],
          time: currentTimeStr,
          amount: alloc,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          notes: notes.trim() || (newDue <= 0 ? "Full bill settlement" : "Partial bill payment"),
          balance_before: bill.balanceDue,
          balance_after: newDue,
          created_at: new Date().toISOString(),
        };

        const updatedPayments = [...payments, newVoucher];
        const encodedNotes = encodePaymentTranscript(cleanNotes, updatedPayments);

        const updatePayload: any = {
          ...bill.rawRecord,
          amount_paid: newPaid,
          balance_due: newDue,
          status: newStatus,
          notes: encodedNotes,
        };

        if (isReceipt) {
          updatePayload.payment_method = paymentMethod;
        }

        let syncedViaApi = false;
        if (isReceipt && navigator.onLine) {
          try {
            await invoicesApi.updateInvoice(bill.id, {
              amount_paid: newPaid,
              status: newStatus,
              payment_method: paymentMethod,
              notes: encodedNotes,
            });
            syncedViaApi = true;
          } catch (apiErr) {
            console.warn("[PaymentDialog] Backend invoice update fallback to offlineMutate:", apiErr);
          }
        }

        if (!syncedViaApi) {
          const { error } = await offlineMutate({
            table: tableName,
            action: "update",
            recordId: bill.id,
            payload: updatePayload,
            userId: user.id,
          });
          if (error) throw error;
        }

        // Cache update
        queryClient.setQueryData([tableName, user.id], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((item: any) => (item.id === bill.id ? { ...item, ...updatePayload } : item));
        });

        settledBillsForReceipt.push({
          billNumber: bill.billNumber,
          date: bill.date,
          totalAmount: bill.totalAmount,
          allocatedAmount: alloc,
          remainingBalance: newDue,
        });
      }

      // 2. RECORD UNALLOCATED ADVANCE / ON-ACCOUNT (IF ANY)
      let advanceRecordId: string | null = null;
      if (advanceAmount > 0 || billsToUpdate.length === 0) {
        advanceRecordId = crypto.randomUUID();
        const advAmount = billsToUpdate.length === 0 ? enteredAmount : advanceAmount;
        const initialNotes = notes.trim() || `${isReceipt ? "Payment In" : "Payment Out"} (Advance / On Account)`;

        const advVoucher: BillPaymentVoucher = {
          id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          voucher_number: voucherNumber,
          type: voucherType,
          date: paymentDate || new Date().toISOString().split("T")[0],
          time: currentTimeStr,
          amount: advAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          notes: initialNotes,
          balance_before: partyBalance,
          balance_after: Math.max(0, partyBalance - advAmount),
          created_at: new Date().toISOString(),
        };

        const encodedNotes = encodePaymentTranscript(initialNotes, [advVoucher]);

        if (isReceipt) {
          const salesPayload = {
            id: advanceRecordId,
            user_id: user.id,
            party_id: activeParty.id,
            invoice_number: voucherNumber,
            customer_name: activeParty.name,
            customer_phone: activeParty.phone || null,
            customer_email: activeParty.email || null,
            customer_gstin: activeParty.gst_number || null,
            date: paymentDate || new Date().toISOString().split("T")[0],
            due_date: null,
            status: "paid",
            subtotal: advAmount,
            tax_amount: 0,
            tax_rate: 0,
            discount_amount: 0,
            total_amount: advAmount,
            amount_paid: advAmount,
            balance_due: 0,
            payment_method: paymentMethod,
            document_type: "receipt",
            items: [
              {
                description: "Payment In (On Account / Advance)",
                quantity: 1,
                unit_price: advAmount,
                total: advAmount,
              },
            ],
            notes: encodedNotes,
          };

          const { error } = await offlineMutate({
            table: "sales",
            action: "insert",
            recordId: advanceRecordId,
            payload: salesPayload,
            userId: user.id,
          });
          if (error) throw error;

          queryClient.setQueryData(["sales", user.id], (old: any) => {
            return [salesPayload, ...(Array.isArray(old) ? old : [])];
          });
        } else {
          const purchasePayload = {
            id: advanceRecordId,
            user_id: user.id,
            party_id: activeParty.id,
            bill_number: voucherNumber,
            vendor_name: activeParty.name,
            vendor_phone: activeParty.phone || null,
            vendor_email: activeParty.email || null,
            vendor_gstin: activeParty.gst_number || null,
            date: paymentDate || new Date().toISOString().split("T")[0],
            due_date: null,
            status: "paid",
            subtotal: advAmount,
            tax_amount: 0,
            tax_rate: 0,
            discount_amount: 0,
            total_amount: advAmount,
            amount_paid: advAmount,
            balance_due: 0,
            document_type: "payment",
            items: [
              {
                description: "Payment Out (On Account / Advance)",
                quantity: 1,
                unit_price: advAmount,
                total: advAmount,
              },
            ],
            notes: encodedNotes,
          };

          const { error } = await offlineMutate({
            table: "purchases",
            action: "insert",
            recordId: advanceRecordId,
            payload: purchasePayload,
            userId: user.id,
          });
          if (error) throw error;

          queryClient.setQueryData(["purchases", user.id], (old: any) => {
            return [purchasePayload, ...(Array.isArray(old) ? old : [])];
          });
        }
      }

      // 3. INVALIDATE QUERIES (Party balance updates cleanly via ledger without mutating opening_balance)
      queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
      queryClient.invalidateQueries({ queryKey: [tableName, user.id] });
      queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
      queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });

      toast({
        title: `${isReceipt ? "Payment In" : "Payment Out"} Recorded! 🧾`,
        description: `Voucher ${voucherNumber} for ${formatCurrency(enteredAmount)} successfully saved.`,
      });

      // Construct Receipt Details for immediate preview/print
      const receiptDetails: PaymentReceiptDetails = {
        voucherNumber,
        type: isReceipt ? "receipt" : "payment",
        date: paymentDate || new Date().toISOString().split("T")[0],
        time: currentTimeStr,
        amount: enteredAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        partyName: activeParty.name,
        partyPhone: activeParty.phone || null,
        partyEmail: activeParty.email || null,
        partyGstin: activeParty.gst_number || null,
        partyAddress: activeParty.address || null,
        linkedBills: settledBillsForReceipt,
        partyCurrentBalance: balanceAfterPayment,
        businessDetails: profile
          ? {
              name: profile.business_name,
              address: profile.business_address,
              phone: profile.business_phone,
              email: profile.email,
              gst: profile.gst_number,
              logo_url: profile.business_logo,
            }
          : undefined,
      };

      setCompletedReceiptData(receiptDetails);
      if (onSuccess) onSuccess(receiptDetails);
      onOpenChange(false);
    } catch (err: any) {
      console.error("[PaymentDialog] Submission Error:", err);
      toast({
        title: "Transaction Failed",
        description: err?.message || "Failed to record payment voucher.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Settle Outstanding Invoices / Bills ({partyPendingBills.length} unpaid)
                </label>
                {partyPendingBills.length > 0 && enteredAmount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAutoAllocate}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Allocate (FIFO)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllocations}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {partyPendingBills.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                  {selectedPartyId ? (
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        No unpaid bills found for this {isReceipt ? "customer" : "vendor"}.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        The full payment of {formatCurrency(enteredAmount)} will be recorded as an Advance / On-Account payment.
                      </p>
                    </div>
                  ) : (
                    "Select a party above to view their pending bills."
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 w-8 text-center">Settle</th>
                          <th className="px-3 py-2">Bill #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Balance Due</th>
                          <th className="px-3 py-2 text-right w-28">Amount to Apply</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {partyPendingBills.map((bill) => {
                          const allocVal = Number(billAllocations[bill.id] || 0);
                          const isAllocated = allocVal > 0;

                          return (
                            <tr
                              key={bill.id}
                              className={`transition-colors ${
                                isAllocated
                                  ? isReceipt
                                    ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                                    : "bg-indigo-50/40 dark:bg-indigo-950/20"
                                  : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                              }`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAllocated}
                                  onChange={() => handleToggleBill(bill)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                                {bill.billNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {bill.date}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400">
                                {formatCurrency(bill.balanceDue)}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={bill.balanceDue}
                                    value={allocVal > 0 ? allocVal : ""}
                                    onChange={(e) =>
                                      handleAllocationChange(bill.id, e.target.value)
                                    }
                                    placeholder="0.00"
                                    className="w-24 h-7 px-2 text-right text-xs font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-primary focus:outline-none"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Allocation Summary Strip */}
                  <div className="p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Allocated to Bills:{" "}
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {formatCurrency(totalAllocated)}
                      </strong>
                    </span>
                    <span className="text-slate-500">
                      Unallocated / Advance:{" "}
                      <strong
                        className={
                          advanceAmount > 0
                            ? "text-emerald-600 font-bold"
                            : "text-slate-900 dark:text-white"
                        }
                      >
                        {formatCurrency(advanceAmount)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

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
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Party Balance Before
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(partyBalance)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Payment
                </span>
                <span className="font-extrabold text-emerald-600">
                  - {formatCurrency(enteredAmount)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Remaining Outstanding
                </span>
                <span
                  className={`font-black ${
                    balanceAfterPayment > 0
                      ? "text-rose-600"
                      : balanceAfterPayment < 0
                      ? "text-emerald-600"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {balanceAfterPayment > 0
                    ? `${formatCurrency(balanceAfterPayment)} Dr`
                    : balanceAfterPayment < 0
                    ? `${formatCurrency(Math.abs(balanceAfterPayment))} Cr`
                    : "₹0.00 (Settled)"}
                </span>
              </div>
            </div>
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
