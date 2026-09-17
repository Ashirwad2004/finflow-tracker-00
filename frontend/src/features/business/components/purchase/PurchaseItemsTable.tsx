import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Plus, 
    Trash2, 
    ShoppingBag, 
    Layers, 
    Percent, 
    ArrowDown 
} from "lucide-react";
import { ProductCombobox, ProductItem } from "./ProductCombobox";
import { useCurrency } from "@/core/contexts/CurrencyContext";

export interface PurchaseItemRowData {
    description: string;
    quantity: number;
    price: number;
    unit?: string;
    discount?: number;
    tax_rate?: number;
    total: number;
}

interface PurchaseItemsTableProps {
    items: PurchaseItemRowData[];
    products: ProductItem[];
    defaultTaxRate?: number;
    onItemChange: (index: number, field: keyof PurchaseItemRowData, value: any) => void;
    onProductSelect: (index: number, product: ProductItem) => void;
    onAddItem: () => void;
    onRemoveItem: (index: number) => void;
    onQuickAddProduct?: (product: ProductItem) => void;
}

const COMMON_UNITS = ["pc", "box", "kg", "g", "ltr", "ml", "bag", "bundle", "meter", "pair"];

export const PurchaseItemsTable = ({
    items,
    products,
    defaultTaxRate = 0,
    onItemChange,
    onProductSelect,
    onAddItem,
    onRemoveItem,
    onQuickAddProduct,
}: PurchaseItemsTableProps) => {
    const { formatCurrency } = useCurrency();
    const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleKeyDownOnLastField = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
        index: number
    ) => {
        if (e.key === "Enter" && index === items.length - 1) {
            e.preventDefault();
            onAddItem();
            // Focus new row's product input after brief delay for state render
            setTimeout(() => {
                const nextRef = productInputRefs.current[index + 1];
                if (nextRef) {
                    nextRef.focus();
                }
            }, 50);
        }
    };

    const calculateLineTotal = (item: PurchaseItemRowData) => {
        const qty = Number(item.quantity || 0);
        const rate = Number(item.price || 0);
        const discPercent = Number(item.discount || 0);
        const taxRate = Number(item.tax_rate ?? defaultTaxRate ?? 0);

        const discountedAmount = qty * rate * (1 - discPercent / 100);
        const taxAmount = (discountedAmount * taxRate) / 100;
        return Math.max(0, discountedAmount + taxAmount);
    };

    const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    return (
        <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-4 shadow-sm space-y-3">
            {/* Header: Title + Item Counters + Add Item Button */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                Purchase Items / Raw Materials
                            </h3>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold text-muted-foreground">
                                {items.length} {items.length === 1 ? "item" : "items"} • {totalQuantity} qty
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Fast item entry: Tab through fields, hit Enter on tax rate to add next row
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddItem}
                    className="h-7 text-xs font-semibold gap-1 border-dashed hover:border-primary hover:text-primary transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                </Button>
            </div>

            {/* ============================================================ */}
            {/* DESKTOP TABLE VIEW (>= 768px)                                */}
            {/* ============================================================ */}
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
                        const lineTotal = calculateLineTotal(item);

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
                                        onKeyDown={(e) => handleKeyDownOnLastField(e, index)}
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

            {/* ============================================================ */}
            {/* MOBILE CARD VIEW (< 768px)                                   */}
            {/* ============================================================ */}
            <div className="block md:hidden space-y-3">
                {items.map((item, index) => {
                    const lineTotal = calculateLineTotal(item);

                    return (
                        <div
                            key={index}
                            style={{ zIndex: items.length - index + 20 }}
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
                                        if (items.length > 1) {
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
                })}

                <Button
                    type="button"
                    variant="outline"
                    onClick={onAddItem}
                    className="w-full h-9 text-xs font-semibold gap-1.5 border-dashed hover:border-primary hover:text-primary"
                >
                    <Plus className="w-4 h-4" /> Add Another Item
                </Button>
            </div>
        </div>
    );
};
