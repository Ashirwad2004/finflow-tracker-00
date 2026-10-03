import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { invoicesApi } from "@/core/api/invoices";
import {
  UnifiedPaymentTransaction,
  extractAllPaymentInTransactions,
  removePaymentVoucherFromBill,
} from "../../utils/paymentTranscript";
import { PaymentReceiptDetails, generatePaymentReceiptPDF } from "@/utils/generatePaymentReceiptPDF";
import { ActiveReceiptModalState, PaymentRegisterMetrics } from "./types";

export function usePaymentInRegister(sales: any[], parties: any[], profile?: any) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_month" | "this_year">("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeReceiptModalData, setActiveReceiptModalData] = useState<ActiveReceiptModalState | null>(null);

  // Extract transactions
  const allTransactions = useMemo(() => {
    return extractAllPaymentInTransactions(sales);
  }, [sales]);

  // Metrics
  const metrics: PaymentRegisterMetrics = useMemo(() => {
    const totalAmount = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const cashAmount = allTransactions
      .filter((tx) => tx.paymentMethod === "cash")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const onlineAmount = allTransactions
      .filter((tx) => tx.paymentMethod !== "cash")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return {
      totalAmount,
      cashAmount,
      onlineAmount,
      count: allTransactions.length,
    };
  }, [allTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonthStr = todayStr.substring(0, 7);
    const currentYearStr = todayStr.substring(0, 4);

    return allTransactions.filter((tx) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = tx.partyName.toLowerCase().includes(q);
        const matchesVoucher = tx.voucherNumber.toLowerCase().includes(q);
        const matchesRef = (tx.referenceNumber || "").toLowerCase().includes(q);
        const matchesNotes = (tx.notes || "").toLowerCase().includes(q);
        const matchesBill = (tx.linkedBillNumber || "").toLowerCase().includes(q);
        if (!matchesName && !matchesVoucher && !matchesRef && !matchesNotes && !matchesBill) {
          return false;
        }
      }

      if (dateFilter === "today") {
        if (!tx.date.startsWith(todayStr)) return false;
      } else if (dateFilter === "this_month") {
        if (!tx.date.startsWith(currentMonthStr)) return false;
      } else if (dateFilter === "this_year") {
        if (!tx.date.startsWith(currentYearStr)) return false;
      }

      if (modeFilter !== "all") {
        if (tx.paymentMethod !== modeFilter) return false;
      }

      if (selectedPartyFilter !== "all") {
        if (tx.partyId !== selectedPartyFilter && tx.partyName !== selectedPartyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, searchTerm, dateFilter, modeFilter, selectedPartyFilter]);

  const handleCopyVoucher = (voucherNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(voucherNo);
    setCopiedId(voucherNo);
    toast.success(`Voucher ${voucherNo} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenReceiptModal = (tx: UnifiedPaymentTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const party = parties.find(
      (p: any) =>
        (tx.partyId && p.id === tx.partyId) ||
        (p.name && p.name.trim().toLowerCase() === tx.partyName.trim().toLowerCase())
    );

    const linkedBillsList = tx.linkedBillNumber
      ? [
          {
            billNumber: tx.linkedBillNumber,
            date: tx.rawBillRecord?.date || tx.date,
            totalAmount: Number(tx.rawBillRecord?.total_amount || tx.amount),
            allocatedAmount: tx.amount,
            remainingBalance: Number(tx.rawBillRecord?.balance_due || 0),
          },
        ]
      : undefined;

    const receiptDetails: PaymentReceiptDetails = {
      voucherNumber: tx.voucherNumber,
      type: "receipt",
      date: tx.date,
      time: tx.time,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      referenceNumber: tx.referenceNumber,
      notes: tx.notes,
      partyName: tx.partyName,
      partyPhone: tx.partyPhone || party?.phone || null,
      partyEmail: party?.email || null,
      partyGstin: tx.partyGstin || party?.gst_number || null,
      partyAddress: party?.address || null,
      linkedBills: linkedBillsList,
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

    setActiveReceiptModalData({
      data: receiptDetails,
      voucherId: tx.id,
      linkedBillId: tx.linkedBillId,
    });
  };

  const handleQuickPrintReceipt = async (tx: UnifiedPaymentTransaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const party = parties.find(
      (p: any) =>
        (tx.partyId && p.id === tx.partyId) ||
        (p.name && p.name.trim().toLowerCase() === tx.partyName.trim().toLowerCase())
    );

    const receiptDetails: PaymentReceiptDetails = {
      voucherNumber: tx.voucherNumber,
      type: "receipt",
      date: tx.date,
      time: tx.time,
      amount: tx.amount,
      paymentMethod: tx.paymentMethod,
      referenceNumber: tx.referenceNumber,
      notes: tx.notes,
      partyName: tx.partyName,
      partyPhone: tx.partyPhone || party?.phone || null,
      partyEmail: party?.email || null,
      partyGstin: tx.partyGstin || party?.gst_number || null,
      partyAddress: party?.address || null,
      linkedBills: tx.linkedBillNumber
        ? [
            {
              billNumber: tx.linkedBillNumber,
              date: tx.rawBillRecord?.date || tx.date,
              totalAmount: Number(tx.rawBillRecord?.total_amount || tx.amount),
              allocatedAmount: tx.amount,
              remainingBalance: Number(tx.rawBillRecord?.balance_due || 0),
            },
          ]
        : undefined,
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

    try {
      toast.loading(`Printing receipt ${tx.voucherNumber}...`, { id: "quick-print" });
      await generatePaymentReceiptPDF(receiptDetails, { action: "print" });
      toast.success("Receipt sent to printer!", { id: "quick-print" });
    } catch (err: any) {
      toast.error("Print failed: " + err?.message, { id: "quick-print" });
    }
  };

  const handleDeleteVoucher = async (
    voucherNo: string,
    voucherId?: string,
    _linkedBillId?: string
  ) => {
    if (!user?.id) return;
    const targetTx = allTransactions.find(
      (tx) => tx.voucherNumber === voucherNo || tx.id === voucherId
    );
    if (!targetTx) return;

    const raw = targetTx.rawBillRecord;
    if (!raw) return;

    if (targetTx.linkedBillId && !targetTx.isWithoutBill) {
      const { updatedNotes, newAmountPaid, newBalanceDue, newStatus } =
        removePaymentVoucherFromBill(raw.notes, targetTx.id || voucherNo, {
          total_amount: Number(raw.total_amount || 0),
          amount_paid: Number(raw.amount_paid || 0),
          balance_due: Number(raw.balance_due || 0),
          status: raw.status,
          date: raw.date,
          due_date: raw.due_date,
          type: "sale",
        });

      const updatePayload = {
        ...raw,
        notes: updatedNotes,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
      };

      if (navigator.onLine) {
        try {
          await invoicesApi.updateInvoice(raw.id, {
            notes: updatedNotes,
            amount_paid: newAmountPaid,
            status: newStatus,
          });
        } catch (e) {
          console.warn("Backend update invoice fallback:", e);
        }
      }

      await offlineMutate({
        table: "sales",
        action: "update",
        recordId: raw.id,
        payload: updatePayload,
        userId: user.id,
      });

      queryClient.setQueryData(["sales", user.id], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((s: any) => (s.id === raw.id ? { ...s, ...updatePayload } : s));
      });
    } else {
      await offlineMutate({
        table: "sales",
        action: "delete",
        recordId: raw.id,
        userId: user.id,
      });

      queryClient.setQueryData(["sales", user.id], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((s: any) => s.id !== raw.id);
      });
    }

    queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
    queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
  };

  return {
    searchTerm,
    setSearchTerm,
    dateFilter,
    setDateFilter,
    modeFilter,
    setModeFilter,
    selectedPartyFilter,
    setSelectedPartyFilter,
    copiedId,
    activeReceiptModalData,
    setActiveReceiptModalData,
    allTransactions,
    metrics,
    filteredTransactions,
    handleCopyVoucher,
    handleOpenReceiptModal,
    handleQuickPrintReceipt,
    handleDeleteVoucher,
  };
}
