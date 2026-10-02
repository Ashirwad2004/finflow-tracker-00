import { useState } from "react";
import { useToast } from "@/core/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { invoicesApi } from "@/core/api/invoices";
import {
  PaymentMethodType,
  BillPaymentVoucher,
  parsePaymentTranscript,
  encodePaymentTranscript,
  generateVoucherNumber,
} from "../utils/paymentTranscript";
import { PaymentReceiptDetails, SettledBillDetail } from "@/utils/generatePaymentReceiptPDF";

interface UseUniversalPaymentMutationOptions {
  user: any;
  isReceipt: boolean;
  activeParty: any;
  enteredAmount: number;
  paymentDate: string;
  paymentMethod: PaymentMethodType;
  referenceNumber: string;
  notes: string;
  partyPendingBills: any[];
  billAllocations: Record<string, number>;
  advanceAmount: number;
  partyBalance: number;
  balanceAfterPayment: number;
  profile: any;
  formatCurrency: (amount: number) => string;
  onSuccess?: (result?: any) => void;
  onOpenChange: (open: boolean) => void;
  setCompletedReceiptData: (data: PaymentReceiptDetails | null) => void;
}

export function useUniversalPaymentMutation({
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
}: UseUniversalPaymentMutationOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return {
    isSubmitting,
    handleSubmitPayment,
  };
}
