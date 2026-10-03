import { SalesSettings } from "@/core/hooks/use-sales-settings";
import { InvoiceFormValues } from "./types";

export interface InvoiceCalculationsResult {
    calcTaxRate: number;
    processedItems: any[];
    calcSubtotal: number;
    calcOverallDiscountAmount: number;
    calcTaxAmount: number;
    calcTotalAmount: number;
}

export function calculateInvoiceValues(
    values: InvoiceFormValues,
    salesSettings?: SalesSettings,
    isQuickBilling?: boolean,
    isItemWiseTax?: boolean
): InvoiceCalculationsResult {
    const calcTaxRate = Number(values.tax_rate) || 0;

    let processedItems: any[] = [];
    let calcSubtotal = 0;
    let calcOverallDiscountAmount = 0;
    let calcTaxAmount = 0;
    let calcTotalAmount = 0;

    if (isQuickBilling) {
        const totalVal = Number(values.quick_total_amount) || 0;
        const priceVal = totalVal / (1 + calcTaxRate / 100);

        processedItems = [
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

        calcSubtotal = priceVal;
        calcOverallDiscountAmount = 0;
        calcTaxAmount = totalVal - priceVal;
        calcTotalAmount = totalVal;
    } else {
        const validItems = values.items.filter(
            (item) => item.description && item.description.trim() !== ""
        );

        const itemsToProcess = validItems.length > 0 ? validItems : values.items;

        processedItems = itemsToProcess.map((item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const disc = Number(item.discount) || 0;

            return {
                ...item,
                tax_rate:
                    item.tax_rate !== undefined
                        ? Number(item.tax_rate)
                        : (salesSettings?.defaultTaxRate ?? 0),
                total: qty * price * (1 - disc / 100),
            };
        });

        calcSubtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

        const calcOverallDiscountPercent = Number(values.overall_discount) || 0;
        calcOverallDiscountAmount = (calcSubtotal * calcOverallDiscountPercent) / 100;

        const calcTaxableAmount = Math.max(0, calcSubtotal - calcOverallDiscountAmount);

        let calcTaxAmountVal = 0;

        if (isItemWiseTax) {
            const discountFactor = calcSubtotal > 0 ? calcTaxableAmount / calcSubtotal : 1;

            calcTaxAmountVal = processedItems.reduce((sum, item) => {
                const lineTaxable = item.total * discountFactor;
                const itemTaxRate = Number(item.tax_rate ?? calcTaxRate);
                return sum + (lineTaxable * itemTaxRate) / 100;
            }, 0);
        } else {
            calcTaxAmountVal = (calcTaxableAmount * calcTaxRate) / 100;
        }

        const calcRawTotal = calcTaxableAmount + calcTaxAmountVal;

        calcTotalAmount = salesSettings?.roundOffTotal
            ? Math.round(calcRawTotal)
            : calcRawTotal;

        calcTaxAmount = calcTaxAmountVal;
    }

    return {
        calcTaxRate,
        processedItems,
        calcSubtotal,
        calcOverallDiscountAmount,
        calcTaxAmount,
        calcTotalAmount,
    };
}
