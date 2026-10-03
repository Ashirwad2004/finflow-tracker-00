import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { isRecordOverdue } from "@/core/utils/overdue";
import { BillPaymentTarget } from "@/features/payments/components/RecordBillPaymentDialog";
import { Purchase, PurchasesMetrics } from "../types";

export const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string): string => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatTemplate);
};

export const getPurchasePaymentTarget = (purchase: Purchase): BillPaymentTarget => {
    const amtPaid = Number(purchase.amount_paid || 0);
    const balDue = Number(
        purchase.balance_due != null
            ? purchase.balance_due
            : Math.max(0, purchase.total_amount - amtPaid)
    );
    return {
        id: purchase.id,
        billNumber: purchase.bill_number || `#${purchase.id.substring(0, 6).toUpperCase()}`,
        partyName: purchase.vendor_name,
        partyGstin: purchase.vendor_gstin,
        partyPhone: purchase.vendor_phone,
        totalAmount: purchase.total_amount,
        amountPaid: amtPaid,
        balanceDue: balDue,
        date: purchase.date || (purchase as any).created_at,
        dueDate: purchase.due_date,
        notes: purchase.notes,
        paymentMethod: "cash",
        type: "purchase",
        rawRecord: purchase,
    };
};

export function usePurchasesPageCalculations(purchases: Purchase[]): PurchasesMetrics {
    return useMemo(() => {
        const today = new Date();
        let overdue = 0;
        let outstanding = 0;
        let spent = 0;

        for (let i = 0; i < purchases.length; i++) {
            const p = purchases[i];
            const total = Number(p.total_amount || 0);

            if (isRecordOverdue(p)) {
                overdue += total;
            } else if (p.status === 'pending') {
                outstanding += total;
            }

            if (p.status === 'paid' && p.date) {
                const d = new Date(p.date);
                if (!isNaN(d.getTime()) && isSameMonth(d, today)) {
                    spent += total;
                }
            }
        }

        return { overdueTotal: overdue, outstandingTotal: outstanding, spentThisMonth: spent };
    }, [purchases]);
}
