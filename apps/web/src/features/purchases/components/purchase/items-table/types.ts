import { ProductItem } from "../ProductCombobox";

export interface PurchaseItemRowData {
    description: string;
    quantity: number;
    price: number;
    unit?: string;
    discount?: number;
    tax_rate?: number;
    total: number;
}

export interface PurchaseItemsTableProps {
    items: PurchaseItemRowData[];
    products: ProductItem[];
    defaultTaxRate?: number;
    onItemChange: (index: number, field: keyof PurchaseItemRowData, value: any) => void;
    onProductSelect: (index: number, product: ProductItem) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onQuickAddProduct?: (product: ProductItem) => void;
}

export const COMMON_UNITS = ["pc", "box", "kg", "g", "ltr", "ml", "bag", "bundle", "meter", "pair"];

export function calculatePurchaseLineTotal(item: PurchaseItemRowData, defaultTaxRate = 0): number {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.price || 0);
    const discPercent = Number(item.discount || 0);
    const taxRate = Number(item.tax_rate ?? defaultTaxRate ?? 0);

    const discountedAmount = qty * rate * (1 - discPercent / 100);
    const taxAmount = (discountedAmount * taxRate) / 100;
    return Math.max(0, discountedAmount + taxAmount);
}
