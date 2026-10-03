import { useMemo } from "react";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

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

    // 2. Subtotal from line items
    const subtotal = useMemo(() => {
        return (watchItems || []).reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const discPercent = Number(item.discount) || 0;
            const itemTotal = qty * price * (1 - discPercent / 100);
            return sum + itemTotal;
        }, 0);
    }, [watchItems]);

    // 3. Overall discount
    const overallDiscountPercent = Number(watchOverallDiscount) || 0;
    const overallDiscountAmount = (subtotal * overallDiscountPercent) / 100;
    const taxableAmount = Math.max(0, subtotal - overallDiscountAmount);

    // 4. Tax amount and effective tax rate
    const { taxAmount, taxRate } = useMemo(() => {
        let calculatedTaxAmount = 0;
        let calculatedTaxRate = Number(watchTaxRate) || 0;

        if (isItemWiseTax) {
            const discountFactor = subtotal > 0 ? taxableAmount / subtotal : 1;
            calculatedTaxAmount = (watchItems || []).reduce((sum, item) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const discPercent = Number(item.discount) || 0;
                const lineTaxable = qty * price * (1 - discPercent / 100) * discountFactor;
                const itemTaxRate = Number(item.tax_rate ?? salesSettings?.defaultTaxRate ?? 0);
                return sum + (lineTaxable * itemTaxRate) / 100;
            }, 0);

            calculatedTaxRate = taxableAmount > 0 ? (calculatedTaxAmount / taxableAmount) * 100 : 0;
        } else {
            calculatedTaxAmount = (taxableAmount * calculatedTaxRate) / 100;
        }

        return { taxAmount: calculatedTaxAmount, taxRate: calculatedTaxRate };
    }, [isItemWiseTax, subtotal, taxableAmount, watchItems, watchTaxRate, salesSettings?.defaultTaxRate]);

    // 5. Total amount with roundoff
    const rawTotal = taxableAmount + taxAmount;
    const roundedTotal = salesSettings?.roundOffTotal ? Math.round(rawTotal) : rawTotal;
    const roundOffDiff = salesSettings?.roundOffTotal ? roundedTotal - rawTotal : 0;
    const totalAmount = roundedTotal;

    const effectiveInvoiceTotal = isQuickBilling ? (Number(watchQuickTotalAmount) || 0) : roundedTotal;

    // 6. Current balance due on this document
    const currentInvoiceDue = useMemo(() => {
        const paidVal = Number(watchAmountPaid) || 0;
        if (watchStatus === "paid") return 0;
        if (watchStatus === "pending") return effectiveInvoiceTotal;
        return Math.max(0, effectiveInvoiceTotal - paidVal);
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
        const calculatedOverallDiscount = (subtotal * (Number(values.overall_discount) || 0)) / 100;

        let processedDraftItems: any[] = [];
        if (isQuickBilling) {
            const totalVal = Number(values.quick_total_amount) || 0;
            const taxR = Number(values.tax_rate) || 0;
            const priceVal = totalVal / (1 + taxR / 100);
            processedDraftItems = [
                {
                    description: values.quick_item_name?.trim() || "General Sale",
                    quantity: 1,
                    price: priceVal,
                    discount: 0,
                    tax_rate: taxR,
                    total: priceVal,
                    hsn_code: "",
                },
            ];
        } else {
            const valid = (values.items || []).filter(
                (it: any) => it.description && it.description.trim() !== ""
            );
            const list = valid.length > 0 ? valid : values.items || [];
            processedDraftItems = list.map((item: any) => {
                const q = Number(item.quantity) || 1;
                const p = Number(item.price) || 0;
                const d = Number(item.discount) || 0;
                return {
                    ...item,
                    description: item.description || "Item",
                    quantity: q,
                    price: p,
                    discount: d,
                    tax_rate:
                        item.tax_rate !== undefined
                            ? Number(item.tax_rate)
                            : (salesSettings?.defaultTaxRate ?? 0),
                    total: q * p * (1 - d / 100),
                };
            });
        }

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
            amount_paid: Number(values.amount_paid) || 0,
            balance_due: currentInvoiceDue,
            items: processedDraftItems,
            subtotal,
            discount_amount: calculatedOverallDiscount,
            tax_rate: Number(values.tax_rate) || 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            previous_balance: partyPreviousBalance,
            total_due_balance: partyClosingDue,
            party_pending_balance: partyClosingDue,
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
