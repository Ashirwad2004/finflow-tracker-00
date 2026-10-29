import { useMemo } from "react";
import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { calculateInvoiceValues } from "./invoiceMutation/calculateInvoiceValues";
import { calculateInvoiceDue } from "../services/calc";
import { nonNegativeNumber, roundMoney } from "@/core/utils/money";

interface UseInvoiceCalculationsOptions {
    watchItems: any[];
    watchTaxRate: number | string;
    watchOverallDiscount: number | string;
    watchQuickTotalAmount: number | string;
    watchStatus: string;
    watchAmountPaid: number | string;
    isQuickBilling: boolean;
    salesSettings?: SalesSettings;
    userSales: any[];
    selectedParty: any | null;
    watchCustomerName: string;
    invoiceToEditId?: string;
}

export function useInvoiceCalculations({
    watchItems,
    watchTaxRate,
    watchOverallDiscount,
    watchQuickTotalAmount,
    watchStatus,
    watchAmountPaid,
    isQuickBilling,
    salesSettings,
    userSales,
    selectedParty,
    watchCustomerName,
    invoiceToEditId,
}: UseInvoiceCalculationsOptions) {
    // 1. Check if item-wise tax is enabled
    const isItemWiseTax = !!(salesSettings?.enableItemWiseTax || salesSettings?.showItemTaxRateOnBill);

    // Use the same calculations for live totals, preview, and persisted invoices.
    const { totals } = useMemo(() => calculateInvoiceValues({
        items: watchItems || [],
        tax_rate: Number(watchTaxRate),
        overall_discount: Number(watchOverallDiscount),
        quick_total_amount: Number(watchQuickTotalAmount),
    }, salesSettings, isQuickBilling, isItemWiseTax), [
        watchItems, watchTaxRate, watchOverallDiscount, watchQuickTotalAmount,
        salesSettings, isQuickBilling, isItemWiseTax,
    ]);
    const {
        subtotal, overallDiscountAmount, taxableAmount, taxAmount,
        rawTotal, roundedTotal, roundOffDiff, totalAmount,
        effectiveTaxRate: taxRate,
    } = totals;
    const overallDiscountPercent = Math.min(100, nonNegativeNumber(watchOverallDiscount));
    const effectiveInvoiceTotal = totalAmount;

    // 6. Current balance due on this document
    const currentInvoiceDue = useMemo(() => {
        return calculateInvoiceDue(
            effectiveInvoiceTotal,
            watchStatus === "paid" || watchStatus === "pending" ? watchStatus : "partial",
            Number(watchAmountPaid)
        );
    }, [watchStatus, watchAmountPaid, effectiveInvoiceTotal]);

    // 7. Party prior outstanding balance
    const partyPreviousBalance = useMemo(() => {
        if (!selectedParty && !watchCustomerName.trim()) return 0;
        const pName = watchCustomerName.trim().toLowerCase();

        const openBal = Number(selectedParty?.opening_balance) || 0;
        const isOpeningReceivable = selectedParty?.opening_balance_type
            ? selectedParty.opening_balance_type === "to_receive"
            : selectedParty?.type !== "vendor";
        let balance = isOpeningReceivable ? openBal : -openBal;

        (userSales || []).forEach((s: any) => {
            if (invoiceToEditId && s.id === invoiceToEditId) return;

            const isPartyMatch =
                (selectedParty?.id && s.party_id === selectedParty.id) ||
                (s.customer_name && s.customer_name.trim().toLowerCase() === pName);

            if (!isPartyMatch) return;

            const total = Number(s.total_amount) || 0;
            const paid = Number(s.amount_paid != null ? s.amount_paid : s.status === "paid" ? total : 0);
            const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, total - paid));
            const docType = (s.document_type || "invoice").toLowerCase();

            if (docType === "receipt") {
                balance = Math.max(0, balance - (total || paid));
            } else if (docType === "credit_note") {
                balance = balance - total;
            } else if (docType === "debit_note") {
                balance += total;
            } else {
                balance += due;
            }
        });

        return balance;
    }, [selectedParty, watchCustomerName, userSales, invoiceToEditId]);

    const partyClosingDue = partyPreviousBalance + currentInvoiceDue;

    // 8. Helper to construct draft invoice for preview
    const buildDraftInvoice = (
        values: any,
        lastInvoiceNumber: string | null | undefined,
        profile: any,
        invoiceToEdit: any
    ) => {
        const calculation = calculateInvoiceValues(values, salesSettings, isQuickBilling, isItemWiseTax);
        const draftDue = calculateInvoiceDue(calculation.calcTotalAmount, values.status, values.amount_paid);
        const draftPaid = values.status === "paid" ? calculation.calcTotalAmount
            : values.status === "pending" ? 0
            : roundMoney(Math.min(calculation.calcTotalAmount, nonNegativeNumber(values.amount_paid)));
        const closingDue = roundMoney(partyPreviousBalance + draftDue);

        return {
            id: invoiceToEdit?.id,
            invoice_number:
                values.invoice_number ||
                (lastInvoiceNumber
                    ? `INV-${Number(String(lastInvoiceNumber).replace(/\D/g, "")) + 1}`
                    : "INV-001"),
            customer_name: values.customer_name || "Cash Customer",
            customer_phone: values.customer_phone,
            customer_email: values.customer_email,
            customer_gstin: values.customer_gstin,
            place_of_supply: values.place_of_supply,
            billing_address: values.billing_address,
            shipping_address: values.shipping_address,
            date: values.date,
            due_date: values.due_date,
            status: values.status,
            amount_paid: draftPaid,
            balance_due: draftDue,
            items: calculation.processedItems,
            subtotal: calculation.calcSubtotal,
            discount_amount: calculation.calcOverallDiscountAmount,
            tax_rate: calculation.calcTaxRate,
            tax_amount: calculation.calcTaxAmount,
            total_amount: calculation.calcTotalAmount,
            previous_balance: partyPreviousBalance,
            total_due_balance: closingDue,
            party_pending_balance: closingDue,
            notes: values.notes,
            profile,
        };
    };

    return {
        isItemWiseTax,
        subtotal,
        overallDiscountPercent,
        overallDiscountAmount,
        taxableAmount,
        taxAmount,
        taxRate,
        rawTotal,
        roundedTotal,
        roundOffDiff,
        totalAmount,
        effectiveInvoiceTotal,
        currentInvoiceDue,
        partyPreviousBalance,
        partyClosingDue,
        buildDraftInvoice,
    };
}
