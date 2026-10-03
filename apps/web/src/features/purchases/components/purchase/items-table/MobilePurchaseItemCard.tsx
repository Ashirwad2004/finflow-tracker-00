import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { ProductCombobox, ProductItem } from "../ProductCombobox";
import { PurchaseItemRowData, COMMON_UNITS, calculatePurchaseLineTotal } from "./types";

interface MobilePurchaseItemCardProps {
    item: PurchaseItemRowData;
    index: number;
    totalItems: number;
    products: ProductItem[];
    defaultTaxRate?: number;
    onItemChange: (index: number, field: keyof PurchaseItemRowData, value: any) => void;
    onProductSelect: (index: number, product: ProductItem) => void;
    onQuickAddProduct?: (product: ProductItem) => void;
    onRemoveItem: (index: number) => void;
}

export const MobilePurchaseItemCard: React.FC<MobilePurchaseItemCardProps> = ({
    item,
    index,
    totalItems,
    products,
    defaultTaxRate = 0,
    onItemChange,
    onProductSelect,
    onQuickAddProduct,
    onRemoveItem,
}) => {
    const { formatCurrency } = useCurrency();
    const lineTotal = calculatePurchaseLineTotal(item, defaultTaxRate);

    return (
        <div
            style={{ zIndex: totalItems - index + 20 }}
            className="relative bg-background border border-border rounded-lg p-3 space-y-3 shadow-xs"
        >
            {/* Card Top: Item # and Delete */}
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Item #{index + 1}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        if (totalItems > 1) {
                            onRemoveItem(index);
                        } else {
                            onItemChange(0, "description", "");
                            onItemChange(0, "quantity", 1);
                            onItemChange(0, "price", 0);
                        }
                    }}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
            </div>

            {/* Product Name */}
            <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                    Product Name / Code
                </Label>
                <ProductCombobox
                    value={item.description}
                    products={products}
                    onChange={(val) => onItemChange(index, "description", val)}
                    onSelectProduct={(p) => onProductSelect(index, p)}
                    onQuickAddProduct={onQuickAddProduct}
                    placeholder="Search or enter product..."
                    className="h-9"
                />
            </div>

            {/* Row 2: Qty, Unit, Rate */}
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                        Quantity
                    </Label>
                    <Input
                        type="number"
                        min="1"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) =>
                            onItemChange(index, "quantity", Math.max(1, Number(e.target.value) || 1))
                        }
                        className="h-8 text-xs text-center font-semibold bg-background"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                        Unit
                    </Label>
                    <input
                        list={`units-mob-${index}`}
                        value={item.unit || "pc"}
                        onChange={(e) => onItemChange(index, "unit", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-center font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <datalist id={`units-mob-${index}`}>
                        {COMMON_UNITS.map((u) => (
                            <option key={u} value={u} />
                        ))}
                    </datalist>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                        Cost Rate (₹)
                    </Label>
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
            </div>

            {/* Row 3: Disc % & GST Tax % */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                        Discount (%)
                    </Label>
                    <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount === 0 ? "" : item.discount}
                        onChange={(e) =>
                            onItemChange(index, "discount", Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                        }
                        className="h-8 text-xs text-right bg-background"
                        placeholder="0%"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                        GST Tax Rate
                    </Label>
                    <select
                        value={item.tax_rate ?? defaultTaxRate ?? 0}
                        onChange={(e) => onItemChange(index, "tax_rate", Number(e.target.value))}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                        <option value={28}>28% GST</option>
                    </select>
                </div>
            </div>

            {/* Card Bottom: Line Total */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/80">
                <span className="text-xs font-semibold text-muted-foreground">
                    Line Amount:
                </span>
                <span className="text-sm font-bold text-foreground font-mono">
                    {formatCurrency(lineTotal)}
                </span>
            </div>
        </div>
    );
};
