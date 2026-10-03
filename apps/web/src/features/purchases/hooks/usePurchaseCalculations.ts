import { useMemo } from "react";
import { PurchaseItemRowData } from "../components/purchase/PurchaseItemsTable";

interface UsePurchaseCalculationsOptions {
    watchItems: any[];
    watchBillDiscount: number;
    watchDefaultTaxRate: number;
    watchQuickTotalAmount: number;
    watchAmountPaid: number;
    isQuickBilling: boolean;
    parties: any[];
    userPurchases: any[];
    watchVendorName: string;
    purchaseToEditId?: string;
    overdueThresholdDays: number;
}

export function usePurchaseCalculations({
    watchItems,
    watchBillDiscount,
    watchDefaultTaxRate,
    watchQuickTotalAmount,
    watchAmountPaid,
    isQuickBilling,
    parties,
    userPurchases,
    watchVendorName,
    purchaseToEditId,
    overdueThresholdDays,
}: UsePurchaseCalculationsOptions) {
    // 1. Subtotal
    const subtotal = useMemo(() => {
        return (watchItems || []).reduce(
            (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.price || 0),
            0
        );
    }, [watchItems]);

    // 2. Line discounts
    const itemDiscounts = useMemo(() => {
        return (watchItems || []).reduce((sum, item) => {
            const lineVal = Number(item?.quantity || 0) * Number(item?.price || 0);
            return sum + (lineVal * Number(item?.discount || 0)) / 100;
        }, 0);
    }, [watchItems]);

    // 3. Tax
    const totalTaxAmount = useMemo(() => {
        return (watchItems || []).reduce((sum, item) => {
            const lineVal = Number(item?.quantity || 0) * Number(item?.price || 0);
            const lineDiscount = (lineVal * Number(item?.discount || 0)) / 100;
            const lineTaxable = Math.max(0, lineVal - lineDiscount);
            const rate = Number(item?.tax_rate ?? watchDefaultTaxRate ?? 0);
            return sum + (lineTaxable * rate) / 100;
        }, 0);
    }, [watchItems, watchDefaultTaxRate]);

    // 4. Totals
    const finalTotalAmount = Math.max(
        0,
        subtotal - itemDiscounts - watchBillDiscount + totalTaxAmount
    );

    const effectiveBillTotal = isQuickBilling
        ? (Number(watchQuickTotalAmount) || 0)
        : finalTotalAmount;

    const balanceDue = Math.max(0, effectiveBillTotal - watchAmountPaid);

    // 5. Vendor matching
    const selectedParty = useMemo(() => {
        const trimmed = watchVendorName.trim().toLowerCase();
        if (!trimmed) return null;
        return (parties || []).find(
            (p: any) => p.name?.trim().toLowerCase() === trimmed
        ) || null;
    }, [watchVendorName, parties]);

    // 6. Vendor prior payable balance
    const vendorPreviousBalance = useMemo(() => {
        if (!selectedParty && !watchVendorName.trim()) return 0;
        const vName = watchVendorName.trim().toLowerCase();

        const openBal = Number(selectedParty?.opening_balance) || 0;
        const isOpeningPayable = selectedParty?.opening_balance_type
            ? selectedParty.opening_balance_type === "to_pay"
            : selectedParty?.type === "vendor";
        let balance = isOpeningPayable ? openBal : -openBal;

        (userPurchases || []).forEach((p: any) => {
            if (purchaseToEditId && p.id === purchaseToEditId) return;

            const isMatch =
                (selectedParty?.id && p.party_id === selectedParty.id) ||
                (p.vendor_name && p.vendor_name.trim().toLowerCase() === vName);

            if (!isMatch) return;

            const total = Number(p.total_amount) || 0;
            const paid = Number(p.amount_paid != null ? p.amount_paid : p.status === "paid" ? total : 0);
            const due = Number(p.balance_due != null ? p.balance_due : Math.max(0, total - paid));

            balance += due;
        });

        return balance;
    }, [selectedParty, watchVendorName, userPurchases, purchaseToEditId]);

    const vendorClosingPayable = vendorPreviousBalance + balanceDue;

    const getDefaultDueDate = (billDateStr?: string) => {
        const baseDate = billDateStr ? new Date(billDateStr) : new Date();
        baseDate.setDate(baseDate.getDate() + overdueThresholdDays);
        return baseDate.toISOString().split("T")[0];
    };

    const handlePaymentStatusChange = (
        status: "paid" | "partial" | "pending",
        setValue: any
    ) => {
        setValue("payment_status", status, { shouldValidate: true, shouldDirty: true });
        if (status === "paid") {
            setValue("amount_paid", effectiveBillTotal, { shouldValidate: true, shouldDirty: true });
        } else if (status === "pending") {
            setValue("amount_paid", 0, { shouldValidate: true, shouldDirty: true });
        }
    };

    const handleBillDateChange = (dateVal: string, setValue: any) => {
        setValue("date", dateVal, { shouldValidate: true, shouldDirty: true });
        if (dateVal) {
            setValue("due_date", getDefaultDueDate(dateVal), {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    };

    const handleItemChange = (
        index: number,
        field: keyof PurchaseItemRowData,
        value: any,
        setValue: any,
        currentItems: any[]
    ) => {
        setValue(`items.${index}.${field}` as any, value, {
            shouldValidate: true,
            shouldDirty: true,
        });

        const updatedRow = {
            ...currentItems[index],
            [field]: value,
        };
        const qty = Number(updatedRow.quantity || 0);
        const rate = Number(updatedRow.price || 0);
        const discPercent = Number(updatedRow.discount || 0);
        const taxRate = Number(updatedRow.tax_rate ?? watchDefaultTaxRate ?? 0);
        const lineTotal = Math.max(
            0,
            qty * rate * (1 - discPercent / 100) * (1 + taxRate / 100)
        );
        setValue(`items.${index}.total`, lineTotal);
    };

    return {
        subtotal,
        itemDiscounts,
        totalTaxAmount,
        finalTotalAmount,
        effectiveBillTotal,
        balanceDue,
        selectedParty,
        vendorPreviousBalance,
        vendorClosingPayable,
        getDefaultDueDate,
        handlePaymentStatusChange,
        handleBillDateChange,
        handleItemChange,
    };
}
