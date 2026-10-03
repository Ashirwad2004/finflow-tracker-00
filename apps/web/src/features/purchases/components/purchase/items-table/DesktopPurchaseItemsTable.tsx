import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { ProductCombobox, ProductItem } from "../ProductCombobox";
import { PurchaseItemRowData, COMMON_UNITS, calculatePurchaseLineTotal } from "./types";

interface DesktopPurchaseItemsTableProps {
    items: PurchaseItemRowData[];
    products: ProductItem[];
    defaultTaxRate?: number;
    productInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onItemChange: (index: number, field: keyof PurchaseItemRowData, value: any) => void;
    onProductSelect: (index: number, product: ProductItem) => void;
    onQuickAddProduct?: (product: ProductItem) => void;
    onRemoveItem: (index: number) => void;
    onKeyDownLastField: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, index: number) => void;
}

export const DesktopPurchaseItemsTable: React.FC<DesktopPurchaseItemsTableProps> = ({
    items,
    products,
    defaultTaxRate = 0,
    productInputRefs,
    onItemChange,
    onProductSelect,
    onQuickAddProduct,
    onRemoveItem,
    onKeyDownLastField,
}) => {
    const { formatCurrency } = useCurrency();

    return (
        <div className="hidden md:block border border-border/80 rounded-lg bg-background">
            {/* Table Header */}
            <div className="grid grid-cols-[36px_1fr_90px_80px_110px_80px_90px_110px_40px] items-center bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-2">
                <div className="text-center">#</div>
                <div className="px-2">Item / Product</div>
                <div className="px-1 text-center">Unit</div>
                <div className="px-1 text-center">Qty</div>
                <div className="px-1 text-right">Cost Rate (₹)</div>
                <div className="px-1 text-right">Disc %</div>
                <div className="px-1 text-center">GST %</div>
                <div className="px-2 text-right">Amount (₹)</div>
                <div className="text-center" />
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border/60">
                {items.map((item, index) => {
                    const lineTotal = calculatePurchaseLineTotal(item, defaultTaxRate);

                    return (
                        <div
                            key={index}
                            style={{ zIndex: items.length - index + 20 }}
                            className="relative grid grid-cols-[36px_1fr_90px_80px_110px_80px_90px_110px_40px] items-center px-2 py-1.5 hover:bg-muted/30 transition-colors"
                        >
                            {/* Row Index */}
                            <div className="text-center text-xs font-mono text-muted-foreground font-semibold">
                                {index + 1}
                            </div>

                            {/* Product Combobox */}
                            <div className="px-1">
                                <ProductCombobox
                                    value={item.description}
                                    products={products}
                                    onChange={(val) => onItemChange(index, "description", val)}
                                    onSelectProduct={(p) => onProductSelect(index, p)}
                                    onQuickAddProduct={onQuickAddProduct}
                                    inputRef={(el) => {
                                        productInputRefs.current[index] = el;
                                    }}
                                    placeholder={`Item ${index + 1} name or code...`}
                                    className="h-8"
                                />
                            </div>

                            {/* Unit */}
                            <div className="px-1">
                                <input
                                    list={`units-list-${index}`}
                                    value={item.unit || "pc"}
                                    onChange={(e) => onItemChange(index, "unit", e.target.value)}
                                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-center font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="unit"
                                />
                                <datalist id={`units-list-${index}`}>
                                    {COMMON_UNITS.map((u) => (
                                        <option key={u} value={u} />
                                    ))}
                                </datalist>
                            </div>

                            {/* Quantity */}
                            <div className="px-1">
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.quantity === 0 ? "" : item.quantity}
                                    onChange={(e) =>
                                        onItemChange(index, "quantity", Math.max(1, Number(e.target.value) || 1))
                                    }
                                    className="h-8 text-xs text-center font-semibold bg-background"
                                    placeholder="1"
                                />
                            </div>

                            {/* Purchase Cost / Rate */}
                            <div className="px-1">
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.price === 0 ? "" : item.price}
                                    onChange={(e) =>
                                        onItemChange(index, "price", Math.max(0, Number(e.target.value) || 0))
                                    }
                                    className="h-8 text-xs text-right font-semibold bg-background"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Discount % */}
                            <div className="px-1">
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={item.discount === 0 ? "" : item.discount}
                                    onChange={(e) =>
                                        onItemChange(index, "discount", Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                                    }
                                    className="h-8 text-xs text-right bg-background"
                                    placeholder="0%"
                                />
                            </div>

                            {/* GST % */}
                            <div className="px-1">
                                <select
                                    value={item.tax_rate ?? defaultTaxRate ?? 0}
                                    onChange={(e) => {
                                        onItemChange(index, "tax_rate", Number(e.target.value));
                                    }}
                                    onKeyDown={(e) => onKeyDownLastField(e, index)}
                                    className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-center"
                                >
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                    <option value={28}>28%</option>
                                </select>
                            </div>

                            {/* Total Amount */}
                            <div className="px-2 text-right font-bold text-xs text-foreground font-mono">
                                {formatCurrency(lineTotal)}
                            </div>

                            {/* Delete Row */}
                            <div className="text-center">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (items.length > 1) {
                                            onRemoveItem(index);
                                        } else {
                                            onItemChange(0, "description", "");
                                            onItemChange(0, "quantity", 1);
                                            onItemChange(0, "price", 0);
                                            onItemChange(0, "discount", 0);
                                        }
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
