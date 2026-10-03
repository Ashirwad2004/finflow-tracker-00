import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";
import { BillPaymentTarget } from "@/features/payments/components/RecordBillPaymentDialog";
import { Sale, SalesMetrics } from "../types";

export const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string): string => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatTemplate);
};

export const getSalePaymentTarget = (invoice: Sale): BillPaymentTarget => {
    const currentPaid = Number(invoice.amount_paid || 0);
    const balDue = Number(
        invoice.balance_due != null
            ? invoice.balance_due
            : Math.max(0, invoice.total_amount - currentPaid)
    );
    return {
        id: invoice.id,
        billNumber: invoice.invoice_number,
        partyName: invoice.customer_name,
        partyGstin: invoice.customer_gstin,
        partyPhone: invoice.customer_phone,
        totalAmount: invoice.total_amount,
        amountPaid: currentPaid,
        balanceDue: balDue,
        date: invoice.date,
        dueDate: invoice.due_date,
        notes: invoice.notes,
        paymentMethod: (invoice as any).payment_method || "cash",
        type: "sale",
        rawRecord: invoice,
    };
};

export const getPartyPreviousBalance = (
    invoice: Sale,
    parties: any[],
    invoices: Sale[]
): number => {
    const custName = (invoice.customer_name || "").trim().toLowerCase();
    if (!custName || ["cash customer", "cash sale", "walk-in", "cash"].includes(custName)) return 0;
    const party = parties.find((p: any) => 
        (invoice.party_id && p.id === invoice.party_id) || 
        (p.name && p.name.trim().toLowerCase() === custName)
    );

    const openBal = Number(party?.opening_balance) || 0;
    const isOpeningReceivable = party?.opening_balance_type ? party.opening_balance_type === "to_receive" : party?.type !== "vendor";
    let prevBal = isOpeningReceivable ? openBal : -openBal;

    // All OTHER sales/invoices for this customer/party excluding current invoice
    const otherInvoices = invoices.filter((inv: any) => {
        if (inv.id && invoice.id && inv.id === invoice.id) return false;
        const match = (party?.id && inv.party_id && inv.party_id === party.id) ||
                      (inv.customer_name && inv.customer_name.trim().toLowerCase() === custName);
        return match;
    });

    otherInvoices.forEach((inv: any) => {
        const statusStr = (inv.status || "").toLowerCase();
        if (statusStr === "draft" || statusStr === "cancelled") return;
        const tot = Number(inv.total_amount) || 0;
        const pd = Number(inv.amount_paid != null ? inv.amount_paid : (statusStr === "paid" ? tot : 0));
        const due = Number(inv.balance_due != null ? inv.balance_due : Math.max(0, tot - pd));
        const docType = (inv.document_type || "invoice").toLowerCase();
        if (docType === "receipt") {
            prevBal = Math.max(0, prevBal - (tot || pd));
        } else if (docType === "credit_note") {
            prevBal -= tot;
        } else if (docType === "debit_note") {
            prevBal += tot;
        } else {
            prevBal += due;
        }
    });

    return prevBal;
};

export function useSalesCalculations(invoices: Sale[]): SalesMetrics {
    return useMemo(() => {
        const today = new Date();
        let outstanding = 0;
        let overdue = 0;
        let paidMonth = 0;
        let revenue = 0;
        let billed = 0;

        for (let i = 0; i < invoices.length; i++) {
            const inv = invoices[i];
            const total = Number(inv.total_amount || 0);
            const paid = Number(inv.amount_paid || 0);
            const balDue = Number(inv.balance_due != null ? inv.balance_due : Math.max(0, total - paid));

            billed += total;

            if (inv.status === 'pending' || inv.status === 'partial') {
                outstanding += (inv.status === 'partial' ? balDue : total);
            }

            if (inv.status === 'overdue') {
                overdue += balDue;
            }

            if (inv.status === 'paid') {
                revenue += total;
            } else if (inv.status === 'partial') {
                revenue += paid;
            }

            if (inv.date) {
                const d = new Date(inv.date);
                if (!isNaN(d.getTime()) && isSameMonth(d, today)) {
                    if (inv.status === 'paid') paidMonth += total;
                    else if (inv.status === 'partial') paidMonth += paid;
                }
            }
        }

        const rate = billed > 0 ? Math.round((revenue / billed) * 100) : 0;
        const avg = invoices.length > 0 ? billed / invoices.length : 0;

        return {
            outstandingTotal: outstanding,
            overdueTotal: overdue,
            paidThisMonth: paidMonth,
            totalRevenue: revenue,
            totalBilled: billed,
            collectionRate: rate,
            avgInvoiceValue: avg
        };
    }, [invoices]);
}
