import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { useToast } from "@/core/hooks/use-toast";
import { parsePaymentNotes } from "@/features/sales/utils/paymentTranscript";
import { PaymentReceiptDetails } from "@/features/payments/components/PaymentReceiptModal";
import { Party, SettlementTarget, SettlementType } from "../types";

interface UsePartySettlementProps {
  user: any;
  profile: any;
  activeParty: Party | null;
  activePartyMetrics: any;
  formatCurrency: (amount: number) => string;
}

export function usePartySettlement({
  user,
  profile,
  activeParty,
  activePartyMetrics,
  formatCurrency,
}: UsePartySettlementProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Universal Payment Modal State
  const [isUniversalPaymentOpen, setIsUniversalPaymentOpen] = useState(false);
  const [universalPaymentType, setUniversalPaymentType] = useState<"in" | "out">("in");
  const [universalPaymentBillId, setUniversalPaymentBillId] = useState<string | undefined>(undefined);

  // Payment Voucher Modal State
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<PaymentReceiptDetails | null>(null);
  const [isViewVoucherOpen, setIsViewVoucherOpen] = useState(false);

  const handleOpenUniversalPayment = (type: "in" | "out", billId?: string) => {
    setUniversalPaymentType(type);
    setUniversalPaymentBillId(billId);
    setIsUniversalPaymentOpen(true);
  };

  // Open Payment Receipt / Voucher Modal
  const handleViewPartyVoucher = (txn: any) => {
    const raw = txn.raw;
    if (!raw) return;
    const isReceipt = txn.docType === "receipt";
    const notesParsed = parsePaymentNotes(raw.notes);
    const voucher: PaymentReceiptDetails = {
      voucherNumber: raw.invoice_number || raw.bill_number || (isReceipt ? "REC-001" : "PMT-001"),
      date: raw.date || raw.created_at,
      type: isReceipt ? "receipt" : "payment",
      partyName: activeParty?.name || raw.customer_name || raw.vendor_name || "Party",
      partyPhone: activeParty?.phone || raw.customer_phone || undefined,
      partyGstin: activeParty?.gst_number || undefined,
      amount: Number(raw.total_amount) || Number(raw.amount_paid) || 0,
      paymentMethod: raw.payment_method || "cash",
      referenceNumber: notesParsed.referenceNumber,
      notes: notesParsed.notes,
      partyCurrentBalance: activePartyMetrics
        ? isReceipt
          ? activePartyMetrics.receivable
          : activePartyMetrics.payable
        : undefined,
      businessDetails: profile
        ? {
            name: (profile as any).business_name,
            address: (profile as any).business_address,
            phone: (profile as any).business_phone,
            gst: (profile as any).gst_number,
            logo_url: (profile as any).business_logo,
          }
        : undefined,
    };
    setSelectedVoucherForView(voucher);
    setIsViewVoucherOpen(true);
  };

  // Unified Settlement recording
  const handleOpenSettlement = (item: any, type: SettlementType) => {
    const isSale = type === "sale";
    const currentPaid = Number(item.amount_paid || (item.status === "paid" ? item.total_amount : 0));
    const total = Number(item.total_amount) || 0;
    const balDue = Number(
      item.balance_due != null
        ? item.balance_due
        : item.status === "paid"
        ? 0
        : Math.max(0, total - currentPaid)
    );
    const docNumber = isSale ? item.invoice_number || "INV" : item.bill_number || "BILL";
    const partyName = isSale
      ? item.customer_name || activeParty?.name || "Customer"
      : item.vendor_name || activeParty?.name || "Vendor";

    setSettlementTarget({
      type,
      record: item,
      partyName,
      docNumber,
      totalAmount: total,
      amountPaid: currentPaid,
      balanceDue: balDue,
    });
    setPaymentAmount(balDue > 0 ? String(balDue) : String(total));
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const handleQuickPartyPayment = (type: "in" | "out") => {
    if (!activePartyMetrics) return;

    if (type === "in") {
      if (activePartyMetrics.receivable <= 0) return;
      const pendingSales = activePartyMetrics.partySales
        .filter((s: any) => {
          const paid = Number(s.amount_paid || (s.status === "paid" ? s.total_amount : 0));
          const due = Number(
            s.balance_due != null
              ? s.balance_due
              : s.status === "paid"
              ? 0
              : Math.max(0, (Number(s.total_amount) || 0) - paid)
          );
          return due > 0;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
        );

      if (pendingSales.length > 0) {
        handleOpenSettlement(pendingSales[0], "sale");
      } else {
        toast({
          title: "Opening Balance Receivable",
          description: `This party has an opening receivable balance of ${formatCurrency(
            activePartyMetrics.receivable
          )}. Record an invoice or ledger adjustment to settle.`,
        });
      }
    } else {
      if (activePartyMetrics.payable <= 0) return;
      const pendingPurchases = activePartyMetrics.partyPurchases
        .filter((p: any) => {
          const paid = Number(p.amount_paid || (p.status === "paid" ? p.total_amount : 0));
          const due = Number(
            p.balance_due != null
              ? p.balance_due
              : p.status === "paid"
              ? 0
              : Math.max(0, (Number(p.total_amount) || 0) - paid)
          );
          return due > 0;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
        );

      if (pendingPurchases.length > 0) {
        handleOpenSettlement(pendingPurchases[0], "purchase");
      } else {
        toast({
          title: "Opening Balance Payable",
          description: `This vendor has an opening payable balance of ${formatCurrency(
            activePartyMetrics.payable
          )}. Record a purchase bill to settle.`,
        });
      }
    }
  };

  const handleSaveSettlement = async () => {
    if (!settlementTarget || !user?.id) return;
    const addAmount = Number(paymentAmount) || 0;
    if (addAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const { type, record, docNumber, partyName, totalAmount } = settlementTarget;
    const isSale = type === "sale";
    const currentPaid = Number(record.amount_paid || 0);
    const newAmountPaid = Math.min(totalAmount, Math.round((currentPaid + addAmount) * 100) / 100);
    const newBalanceDue = Math.max(0, Math.round((totalAmount - newAmountPaid) * 100) / 100);
    const newStatus: "paid" | "partial" = newBalanceDue <= 0 ? "paid" : "partial";

    setIsSubmittingPayment(true);
    try {
      const actionVerb = isSale ? "Received" : "Paid";
      const auditNote = `${actionVerb} ${formatCurrency(addAmount)} via ${paymentMethod} on ${paymentDate}${
        paymentNotes ? `: ${paymentNotes}` : ""
      }`;
      const mergedNotes = record.notes ? `${record.notes} | ${auditNote}` : auditNote;

      const table = isSale ? "sales" : "purchases";
      const updatePayload: any = {
        ...record,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        notes: mergedNotes,
      };

      if (isSale) {
        updatePayload.payment_method = paymentMethod || "cash";
      }

      const { error } = await offlineMutate({
        table,
        action: "update",
        recordId: record.id,
        payload: updatePayload,
        userId: user.id,
      });

      if (error) throw error;

      const queryKey = isSale ? ["sales", user.id] : ["purchases", user.id];
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return [];
        return old.map((item: any) => (item.id === record.id ? { ...item, ...updatePayload } : item));
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ["parties"] });
        if (isSale) queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
        else queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
      }

      toast({
        title: isSale ? "Payment Received" : "Payment Recorded",
        description:
          newStatus === "paid"
            ? `${isSale ? "Invoice" : "Bill"} ${docNumber} is now fully settled.`
            : `Recorded ${formatCurrency(addAmount)} ${isSale ? "from" : "to"} ${partyName}. Remaining balance is ${formatCurrency(
                newBalanceDue
              )}.`,
      });

      setSettlementTarget(null);
    } catch (err: any) {
      console.error("Error saving settlement:", err);
      toast({
        title: "Settlement Error",
        description: err?.message || "Failed to record transaction.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return {
    settlementTarget,
    setSettlementTarget,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentNotes,
    setPaymentNotes,
    paymentDate,
    setPaymentDate,
    isSubmittingPayment,
    isUniversalPaymentOpen,
    setIsUniversalPaymentOpen,
    universalPaymentType,
    universalPaymentBillId,
    selectedVoucherForView,
    isViewVoucherOpen,
    setIsViewVoucherOpen,
    handleOpenUniversalPayment,
    handleViewPartyVoucher,
    handleOpenSettlement,
    handleQuickPartyPayment,
    handleSaveSettlement,
  };
}
