import type { SalesSettings } from "@/core/hooks/use-sales-settings";
import { discountPercent, nonNegativeNumber, roundMoney } from "@/core/utils/money";
import { calculateInvoiceTotals, calculateLineItemTotal, type InvoiceTotalsResult } from "../../services/calc";
import type { InvoiceFormValues, InvoiceItem } from "./types";

export interface InvoiceCalculationsResult {
    calcTaxRate: number;
    processedItems: InvoiceItem[];
    calcSubtotal: number;
    calcOverallDiscountAmount: number;
    calcTaxAmount: number;
    calcTotalAmount: number;
    totals: InvoiceTotalsResult;
}

export function calculateInvoiceValues(
    values: Pick<InvoiceFormValues, "items" | "tax_rate" | "overall_discount" | "quick_total_amount" | "quick_item_name">,
    salesSettings?: SalesSettings,
    isQuickBilling?: boolean,
    isItemWiseTax?: boolean
): InvoiceCalculationsResult {
    const calcTaxRate = nonNegativeNumber(values.tax_rate);

    if (isQuickBilling) {
        // The quick amount is the final, tax-inclusive amount entered by the cashier.
        const totalVal = roundMoney(nonNegativeNumber(values.quick_total_amount));
        const priceVal = roundMoney(totalVal / (1 + calcTaxRate / 100));
        const taxAmount = roundMoney(totalVal - priceVal);
        const processedItems = [
            {
                description: values.quick_item_name?.trim() || "General Sale",
                quantity: 1,
                price: priceVal,
                discount: 0,
                tax_rate: calcTaxRate,
                total: priceVal,
                hsn_code: "",
            },
        ];

        const totals: InvoiceTotalsResult = {
            subtotal: priceVal,
            overallDiscountAmount: 0,
            taxableAmount: priceVal,
            taxAmount,
            effectiveTaxRate: calcTaxRate,
            rawTotal: totalVal,
            roundedTotal: totalVal,
            roundOffDiff: 0,
            totalAmount: totalVal,
        };
        return {
            calcTaxRate,
            processedItems,
            calcSubtotal: priceVal,
            calcOverallDiscountAmount: 0,
            calcTaxAmount: taxAmount,
            calcTotalAmount: totalVal,
            totals,
        };
    }

    const validItems = values.items.filter((item) => item.description?.trim());
    const itemsToProcess = validItems.length > 0 ? validItems : values.items;
    const processedItems = itemsToProcess.map((item) => ({
        ...item,
        quantity: nonNegativeNumber(item.quantity),
        price: nonNegativeNumber(item.price),
        discount: discountPercent(item.discount),
        tax_rate: nonNegativeNumber(item.tax_rate ?? salesSettings?.defaultTaxRate ?? calcTaxRate),
        total: calculateLineItemTotal(item.quantity, item.price, item.discount),
    }));
    const totals = calculateInvoiceTotals({
        items: processedItems,
        overallDiscountPercent: values.overall_discount,
        taxRate: calcTaxRate,
        isItemWiseTax,
        roundOffTotal: salesSettings?.roundOffTotal,
        defaultTaxRate: salesSettings?.defaultTaxRate ?? calcTaxRate,
    });

    return {
        calcTaxRate,
        processedItems,
        calcSubtotal: totals.subtotal,
        calcOverallDiscountAmount: totals.overallDiscountAmount,
        calcTaxAmount: totals.taxAmount,
        calcTotalAmount: totals.totalAmount,
        totals,
    };
}
