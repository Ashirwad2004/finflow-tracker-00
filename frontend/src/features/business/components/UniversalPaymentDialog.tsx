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
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useAuth } from "@/core/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { useWhatsAppStatus } from "@/features/whatsapp/hooks/useWhatsApp";
import {
  PaymentMethodType,
  BillPaymentVoucher,
  parsePaymentTranscript,
  encodePaymentTranscript,
  generateVoucherNumber,
  calculateBillSettlement,
} from "../utils/paymentTranscript";
import { BillPaymentTarget } from "./RecordBillPaymentDialog";

export interface UniversalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "payment_in" | "payment_out"; // 'payment_in' = Sales Receipt, 'payment_out' = Purchase Payment
  initialBill?: BillPaymentTarget | null;
  initialPartyId?: string | null;
  onSuccess?: (result: any) => void;
}

export function UniversalPaymentDialog({
  open,
  onOpenChange,
  mode,
  initialBill,
  initialPartyId,
  onSuccess,
}: UniversalPaymentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const isReceipt = mode === "payment_in";

  // Form states
  const [settlementMode, setSettlementMode] = useState<"with_bill" | "without_bill">("with_bill");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendWhatsAppOnSuccess, setSendWhatsAppOnSuccess] = useState(true);
  const [whatsappReceiptModal, setWhatsappReceiptModal] = useState<{
    open: boolean;
    customerName: string;
    customerPhone: string;
    receiptNumber: string;
    amountReceived: number;
    remainingBalance: number;
    invoiceNumber?: string;
    paymentMethod: string;
    paymentId?: string;
    customerId?: string;
  } | null>(null);
  const { data: connStatus } = useWhatsAppStatus();

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

  // Pending/unpaid bills for active party (or all pending bills if no party selected)
  const partyPendingBills = useMemo(() => {
    return allBills
      .filter((b: any) => {
        // Exclude fully paid or cancelled bills
        if (b.status === "paid" || b.status === "cancelled") return false;

        // If party is selected, match by party_id or party name
        if (activeParty) {
          const pName = (activeParty.name || "").trim().toLowerCase();
          const billPartyName = (
            (isReceipt ? b.customer_name : b.vendor_name) || ""
          )
            .trim()
            .toLowerCase();
          const matchesId = b.party_id && b.party_id === activeParty.id;
          const matchesName = billPartyName && billPartyName === pName;
          return matchesId || matchesName;
        }
        return true;
      })
      .map((b: any) => {
        const total = Number(b.total_amount || 0);
        const currentPaid = Number(b.amount_paid || 0);
        const balanceDue =
          b.balance_due != null
            ? Number(b.balance_due)
            : Math.max(0, total - currentPaid);
        const billNumber = isReceipt
          ? b.invoice_number
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
          date: b.date,
          dueDate: b.due_date,
          notes: b.notes,
          paymentMethod: b.payment_method || "cash",
          type: (isReceipt ? "sale" : "purchase") as "sale" | "purchase",
          rawRecord: b,
        };
      })
      .filter((b: any) => b.balanceDue > 0);
  }, [allBills, activeParty, isReceipt]);

  // Selected bill object
  const activeBill = useMemo(() => {
    if (initialBill && selectedBillId === initialBill.id) {
      return initialBill;
    }
    return partyPendingBills.find((b: any) => b.id === selectedBillId) || null;
  }, [initialBill, partyPendingBills, selectedBillId]);

  // Initialize dialog state when opened or when initialBill / initialPartyId changes
  useEffect(() => {
    if (open) {
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("cash");
      setReferenceNumber("");
      setNotes("");

      if (initialBill) {
        setSettlementMode("with_bill");
        setSelectedBillId(initialBill.id);

        const balDue =
          initialBill.balanceDue != null
            ? Number(initialBill.balanceDue)
            : Math.max(
                0,
                Number(initialBill.totalAmount || 0) -
                  Number(initialBill.amountPaid || 0)
              );
        setPaymentAmount(balDue > 0 ? String(balDue) : "");

        // Find party corresponding to initial bill
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
      } else if (initialPartyId) {
        setSelectedPartyId(initialPartyId);
        setSelectedBillId("");
        setPaymentAmount("");
      } else {
        setSelectedBillId("");
        setPaymentAmount("");
      }
    }
  }, [open, initialBill, initialPartyId, parties]);

  // When party changes, auto-select first bill if available in with_bill mode
  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedBillId("");
    setPaymentAmount("");
  };

  // When a bill is chosen in the selector
  const handleBillSelect = (bill: BillPaymentTarget) => {
    setSelectedBillId(bill.id);
    setPaymentAmount(String(bill.balanceDue));

    // Also lock the party if not already selected
    if (!selectedPartyId && parties.length > 0) {
      const match = parties.find(
        (p: any) =>
          p.id === bill.rawRecord?.party_id ||
          p.name.trim().toLowerCase() === (bill.partyName || "").trim().toLowerCase()
      );
      if (match) {
        setSelectedPartyId(match.id);
      }
    }
  };

  // Calculations
  const enteredAmount = Number(paymentAmount) || 0;

  // Real-time calculation for With Bill mode
  const billSettlement = useMemo(() => {
    if (!activeBill) return null;
    return calculateBillSettlement(
      activeBill.totalAmount,
      activeBill.amountPaid,
      enteredAmount,
      activeBill.dueDate
    );
  }, [activeBill, enteredAmount]);

  // Real-time party balance calculation
  const partyBalance = useMemo(() => {
    if (!activeParty) return 0;
    const openingBal = Number(activeParty.opening_balance || 0);
    const isOpeningReceivable = activeParty.opening_balance_type
      ? activeParty.opening_balance_type === "to_receive"
      : activeParty.type !== "vendor";

    // Sum of open balance dues from party's bills
    const openDues = partyPendingBills.reduce(
      (sum: number, b: any) => sum + Number(b.balanceDue || 0),
      0
    );

    if (isReceipt) {
      return openDues + (isOpeningReceivable ? openingBal : 0);
    } else {
      return openDues + (!isOpeningReceivable ? openingBal : 0);
    }
  }, [activeParty, partyPendingBills, isReceipt]);

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

    if (settlementMode === "with_bill" && !activeBill) {
      toast({
        title: "Bill Required",
        description:
          "Please select a bill to synchronize amount, or switch to 'Without Bill' mode.",
        variant: "destructive",
      });
      return;
    }

    if (!activeParty && !activeBill) {
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

      // ==========================================
      // CASE A: WITH BILL (Synchronize specific bill)
      // ==========================================
      if (settlementMode === "with_bill" && activeBill && billSettlement) {
        const { cleanNotes, payments } = parsePaymentTranscript(
          activeBill.notes,
          {
            total_amount: activeBill.totalAmount,
            amount_paid: activeBill.amountPaid,
            balance_due: activeBill.balanceDue,
            status: activeBill.rawRecord?.status,
            payment_method: activeBill.paymentMethod || "cash",
            date: activeBill.date,
            due_date: activeBill.dueDate,
            type: activeBill.type,
          }
        );

        const newVoucher: BillPaymentVoucher = {
          id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          voucher_number: voucherNumber,
          type: voucherType,
          date: paymentDate || new Date().toISOString().split("T")[0],
          time: currentTimeStr,
          amount: enteredAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          notes:
            notes.trim() ||
            (billSettlement.newBalanceDue <= 0
              ? "Full balance settlement"
              : "Installment payment"),
          balance_before: activeBill.balanceDue,
          balance_after: billSettlement.newBalanceDue,
          created_at: new Date().toISOString(),
        };

        const updatedPayments = [...payments, newVoucher];
        const encodedNotes = encodePaymentTranscript(cleanNotes, updatedPayments);

        const tableName = isReceipt ? "sales" : "purchases";
        const updatePayload: any = {
          ...activeBill.rawRecord,
          amount_paid: billSettlement.newAmountPaid,
          balance_due: billSettlement.newBalanceDue,
          status: billSettlement.newStatus,
          notes: encodedNotes,
        };

        if (isReceipt) {
          updatePayload.payment_method = paymentMethod;
        }

        const { error } = await offlineMutate({
          table: tableName,
          action: "update",
          recordId: activeBill.id,
          payload: updatePayload,
          userId: user.id,
        });

        if (error) throw error;

        // Optimistic query cache update
        const queryKey = [tableName, user.id];
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((item: any) =>
            item.id === activeBill.id ? { ...item, ...updatePayload } : item
          );
        });

        // Also invalidate parties so receivable/payable refreshes
        queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
        if (navigator.onLine) {
          queryClient.invalidateQueries({ queryKey });
        }

        toast({
          title: `${isReceipt ? "Payment In" : "Payment Out"} Synchronized! 🧾`,
          description: `Voucher ${voucherNumber} (${formatCurrency(enteredAmount)}) recorded on ${activeBill.billNumber}. ${
            billSettlement.newBalanceDue <= 0
              ? "Bill fully settled!"
              : `Balance due: ${formatCurrency(billSettlement.newBalanceDue)}`
          }`,
        });

        if (isReceipt && sendWhatsAppOnSuccess) {
          setWhatsappReceiptModal({
            open: true,
            customerName: activeParty?.name || activeBill.partyName || "Customer",
            customerPhone: activeParty?.phone || (activeBill.rawRecord as any)?.customer_phone || "",
            receiptNumber: voucherNumber,
            amountReceived: enteredAmount,
            invoiceNumber: activeBill.billNumber,
            remainingBalance: billSettlement.newBalanceDue,
            paymentMethod: paymentMethod,
            paymentId: activeBill.id,
            customerId: activeParty?.id,
          });
          if (onSuccess) onSuccess(updatePayload);
          return;
        }

        if (onSuccess) onSuccess(updatePayload);
        onOpenChange(false);
        return;
      }

      // ==========================================
      // CASE B: WITHOUT BILL (On Account / Advance)
      // "Each and every transaction should be recorded"
      // ==========================================
      const party = activeParty;
      const partyName = party?.name || (isReceipt ? "Customer" : "Vendor");
      const partyId = party?.id || null;

      // 1. Create permanent voucher record in sales or purchases table
      const voucherRecordId = crypto.randomUUID();
      const initialNotes = notes.trim() || `${isReceipt ? "Payment In" : "Payment Out"} (On Account / Advance)`;

      const newVoucher: BillPaymentVoucher = {
        id: `vch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        voucher_number: voucherNumber,
        type: voucherType,
        date: paymentDate || new Date().toISOString().split("T")[0],
        time: currentTimeStr,
        amount: enteredAmount,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: initialNotes,
        balance_before: partyBalance,
        balance_after: Math.max(0, partyBalance - enteredAmount),
        created_at: new Date().toISOString(),
      };

      const encodedNotes = encodePaymentTranscript(initialNotes, [newVoucher]);

      if (isReceipt) {
        // Standalone Payment In / Receipt in Sales table
        const salesPayload = {
          id: voucherRecordId,
          user_id: user.id,
          party_id: partyId,
          invoice_number: voucherNumber,
          customer_name: partyName,
          customer_phone: party?.phone || null,
          customer_email: party?.email || null,
          customer_gstin: party?.gst_number || null,
          date: paymentDate || new Date().toISOString().split("T")[0],
          due_date: null,
          status: "paid",
          subtotal: enteredAmount,
          tax_amount: 0,
          tax_rate: 0,
          discount_amount: 0,
          total_amount: enteredAmount,
          amount_paid: enteredAmount,
          balance_due: 0,
          payment_method: paymentMethod,
          document_type: "receipt",
          items: [
            {
              description: "Payment In (On Account / Advance)",
              quantity: 1,
              unit_price: enteredAmount,
              total: enteredAmount,
            },
          ],
          notes: encodedNotes,
        };

        const { error } = await offlineMutate({
          table: "sales",
          action: "insert",
          recordId: voucherRecordId,
          payload: salesPayload,
          userId: user.id,
        });

        if (error) throw error;

        // TanStack cache update
        queryClient.setQueryData(["sales", user.id], (old: any) => {
          return [salesPayload, ...(Array.isArray(old) ? old : [])];
        });
      } else {
        // Standalone Payment Out in Purchases table
        const purchasePayload = {
          id: voucherRecordId,
          user_id: user.id,
          party_id: partyId,
          bill_number: voucherNumber,
          vendor_name: partyName,
          vendor_phone: party?.phone || null,
          vendor_email: party?.email || null,
          vendor_gstin: party?.gst_number || null,
          date: paymentDate || new Date().toISOString().split("T")[0],
          due_date: null,
          status: "paid",
          subtotal: enteredAmount,
          tax_amount: 0,
          tax_rate: 0,
          discount_amount: 0,
          total_amount: enteredAmount,
          amount_paid: enteredAmount,
          balance_due: 0,
          items: [
            {
              description: "Payment Out (On Account / Advance)",
              quantity: 1,
              unit_price: enteredAmount,
              total: enteredAmount,
            },
          ],
          notes: encodedNotes,
        };

        const { error } = await offlineMutate({
          table: "purchases",
          action: "insert",
          recordId: voucherRecordId,
          payload: purchasePayload,
          userId: user.id,
        });

        if (error) throw error;

        // TanStack cache update
        queryClient.setQueryData(["purchases", user.id], (old: any) => {
          return [purchasePayload, ...(Array.isArray(old) ? old : [])];
        });
      }

      // 2. Adjust Party's balance in parties table
      if (party) {
        const currentOpeningBal = Number(party.opening_balance || 0);
        const isOpeningReceivable = party.opening_balance_type
          ? party.opening_balance_type === "to_receive"
          : party.type !== "vendor";

        let newOpeningBal = currentOpeningBal;
        let newOpeningType = party.opening_balance_type || (isReceipt ? "to_receive" : "to_pay");

        if (isReceipt) {
          // Payment received from customer: decreases receivable
          if (isOpeningReceivable) {
            if (currentOpeningBal >= enteredAmount) {
              newOpeningBal = currentOpeningBal - enteredAmount;
            } else {
              newOpeningBal = enteredAmount - currentOpeningBal;
              newOpeningType = "to_pay"; // Now customer has advance credit
            }
          } else {
            newOpeningBal = currentOpeningBal + enteredAmount;
          }
        } else {
          // Payment made to vendor: decreases payable
          if (!isOpeningReceivable) {
            if (currentOpeningBal >= enteredAmount) {
              newOpeningBal = currentOpeningBal - enteredAmount;
            } else {
              newOpeningBal = enteredAmount - currentOpeningBal;
              newOpeningType = "to_receive"; // Vendor owes us / advance paid
            }
          } else {
            newOpeningBal = currentOpeningBal + enteredAmount;
          }
        }

        const partyPayload = {
          ...party,
          opening_balance: Math.round(newOpeningBal * 100) / 100,
          opening_balance_type: newOpeningType,
        };

        await offlineMutate({
          table: "parties",
          action: "update",
          recordId: party.id,
          payload: partyPayload,
          userId: user.id,
        });

        queryClient.setQueryData(["parties", user.id], (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((p: any) => (p.id === party.id ? partyPayload : p));
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
      queryClient.invalidateQueries({
        queryKey: [isReceipt ? "sales" : "purchases", user.id],
      });

      toast({
        title: `${isReceipt ? "Payment In (Receipt)" : "Payment Out (Voucher)"} Recorded! 🧾`,
        description: `Voucher ${voucherNumber} for ${formatCurrency(enteredAmount)} successfully recorded and credited to ${partyName}'s account.`,
      });

      if (isReceipt && sendWhatsAppOnSuccess) {
        setWhatsappReceiptModal({
          open: true,
          customerName: partyName,
          customerPhone: party?.phone || "",
          receiptNumber: voucherNumber,
          amountReceived: enteredAmount,
          remainingBalance: Math.max(0, partyBalance - enteredAmount),
          paymentMethod: paymentMethod,
          paymentId: voucherRecordId,
          customerId: partyId || undefined,
        });
        if (onSuccess) onSuccess({ voucherNumber, amount: enteredAmount });
        return;
      }

      if (onSuccess) onSuccess({ voucherNumber, amount: enteredAmount });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error recording universal payment:", err);
      toast({
        title: "Transaction Error",
        description: err?.message || "Failed to record transaction.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        {/* Visual Header Banner */}
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
                className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                  isReceipt
                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                    : "bg-indigo-600 text-white shadow-indigo-500/20"
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
                    {isReceipt ? "Payment In" : "Payment Out"}
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
                    ? "Record money received from customer (Dr. Cash/Bank, Cr. Customer)"
                    : "Record money paid to vendor (Dr. Vendor, Cr. Cash/Bank)"}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4.5">
          {/* 1. Party Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                Select {isReceipt ? "Customer" : "Vendor"}
              </label>
              {activeParty && (
                <span className="text-[11px] font-medium text-slate-500">
                  Total Outstanding:{" "}
                  <strong
                    className={
                      partyBalance > 0
                        ? isReceipt
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600"
                    }
                  >
                    {formatCurrency(partyBalance)}
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

          {/* 2. Settlement Mode Toggle: With Bill vs Without Bill */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Settlement Type
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSettlementMode("with_bill")}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  settlementMode === "with_bill"
                    ? isReceipt
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500"
                      : "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    Against Specific Bill
                  </span>
                  {settlementMode === "with_bill" && (
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isReceipt ? "text-emerald-600" : "text-indigo-600"
                      }`}
                    />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Select an unpaid bill and synchronize paid amount & balance due directly.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettlementMode("without_bill")}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  settlementMode === "without_bill"
                    ? isReceipt
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500"
                      : "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    Without Bill (On Account)
                  </span>
                  {settlementMode === "without_bill" && (
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        isReceipt ? "text-emerald-600" : "text-indigo-600"
                      }`}
                    />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Record advance or general payment. Generates an auditable voucher in ledger.
                </p>
              </button>
            </div>
          </div>

          {/* 3. Conditional: Bill Selector (Only in with_bill mode) */}
          {settlementMode === "with_bill" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Pending Bill ({partyPendingBills.length} unpaid)
                </label>
                {activeBill && (
                  <span className="text-[10px] text-primary font-bold">
                    Tagged: {activeBill.billNumber}
                  </span>
                )}
              </div>

              {partyPendingBills.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                  {selectedPartyId
                    ? "No unpaid or partial bills found for this party. You can switch to 'Without Bill' to record an advance payment."
                    : "Select a party above to view their pending bills."}
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/30 dark:bg-slate-900/30">
                  {partyPendingBills.map((bill: any) => {
                    const isSelected = selectedBillId === bill.id;
                    return (
                      <div
                        key={bill.id}
                        onClick={() => handleBillSelect(bill)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? isReceipt
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700"
                              : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-700"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {bill.billNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {bill.date || "N/A"}
                            </span>
                            {!selectedPartyId && (
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                                • {bill.partyName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>Total: {formatCurrency(bill.totalAmount)}</span>
                            <span>•</span>
                            <span>Paid: {formatCurrency(bill.amountPaid)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">
                            {formatCurrency(bill.balanceDue)}
                          </span>
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
                            Due
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. Payment Amount Input & Quick Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Amount (₹)
              </label>
              {settlementMode === "with_bill" && activeBill && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(activeBill.balanceDue))}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Pay Full Balance ({formatCurrency(activeBill.balanceDue)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 pl-8 pr-4 text-base font-extrabold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Live Settlement Preview */}
            {settlementMode === "with_bill" && activeBill && billSettlement && (
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500">Bill Remaining Balance:</span>
                <span
                  className={`font-black ${
                    billSettlement.newBalanceDue <= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {formatCurrency(billSettlement.newBalanceDue)}{" "}
                  {billSettlement.newBalanceDue <= 0
                    ? "(Fully Paid 🎯)"
                    : `(Partial ${Math.round((billSettlement.newAmountPaid / activeBill.totalAmount) * 100)}%)`}
                </span>
              </div>
            )}

            {settlementMode === "without_bill" && (
              <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs border border-blue-200 dark:border-blue-900/50">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>
                  This payment will be recorded as an On-Account voucher, crediting{" "}
                  <strong>{activeParty?.name || "the party"}</strong>'s ledger balance.
                </span>
              </div>
            )}
          </div>

          {/* 5. Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="cash">Cash in Hand</option>
                <option value="upi">UPI / QR (GPay, PhonePe, Paytm)</option>
                <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* 6. Reference # and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reference / UTR / Cheque #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR-984214, Chq #4092"
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes / Narration
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared via HDFC Bank"
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
          {/* WhatsApp Receipt Dispatch Option (Only for Payment In) */}
          {isReceipt && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                    Send Receipt via WhatsApp
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    {connStatus?.status === "connected"
                      ? "Prompt to send payment receipt on save"
                      : "WhatsApp gateway disconnected (configure in Settings)"}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendWhatsAppOnSuccess}
                onChange={(e) => setSendWhatsAppOnSuccess(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs font-bold"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmitPayment}
            disabled={
              isSubmitting ||
              enteredAmount <= 0 ||
              (settlementMode === "with_bill" && !activeBill) ||
              (!activeParty && !activeBill)
            }
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

      {whatsappReceiptModal && (
        <SendWhatsAppDialog
          open={whatsappReceiptModal.open}
          onOpenChange={(isOpen) => {
            setWhatsappReceiptModal(null);
            if (!isOpen) {
              onOpenChange(false);
            }
          }}
          messageType="receipt"
          recipientName={whatsappReceiptModal.customerName}
          recipientPhone={whatsappReceiptModal.customerPhone}
          metadata={{
            payment_id: whatsappReceiptModal.paymentId,
            receipt_number: whatsappReceiptModal.receiptNumber,
            amount_received: whatsappReceiptModal.amountReceived,
            remaining_balance: whatsappReceiptModal.remainingBalance,
            invoice_number: whatsappReceiptModal.invoiceNumber,
            payment_method: whatsappReceiptModal.paymentMethod,
            currency_symbol: "₹",
          }}
          defaultMessage={`Hello ${whatsappReceiptModal.customerName},\n\nPayment Receipt: ${whatsappReceiptModal.receiptNumber}\nAmount Received: ₹${whatsappReceiptModal.amountReceived.toLocaleString("en-IN")}${whatsappReceiptModal.invoiceNumber ? `\nInvoice: ${whatsappReceiptModal.invoiceNumber}` : ""}\nRemaining Balance: ₹${whatsappReceiptModal.remainingBalance.toLocaleString("en-IN")}\nPayment Method: ${whatsappReceiptModal.paymentMethod}\n\nThank you for your business!`}
          onSuccess={() => {
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}
