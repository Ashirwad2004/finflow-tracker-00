import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag } from "lucide-react";
import { PurchaseItemsTableProps } from "./types";
import { DesktopPurchaseItemsTable } from "./DesktopPurchaseItemsTable";
import { MobilePurchaseItemCard } from "./MobilePurchaseItemCard";

export * from "./types";

export const PurchaseItemsTable: React.FC<PurchaseItemsTableProps> = ({
    items,
    products,
    defaultTaxRate = 0,
    onItemChange,
    onProductSelect,
    onAddItem,
    onRemoveItem,
    onQuickAddProduct,
}) => {
    const productInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleKeyDownOnLastField = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
        index: number
    ) => {
        if (e.key === "Enter" && index === items.length - 1) {
            e.preventDefault();
            onAddItem();
            setTimeout(() => {
                const nextRef = productInputRefs.current[index + 1];
                if (nextRef) {
                    nextRef.focus();
                }
            }, 50);
        }
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

            {/* Desktop Table View */}
            <DesktopPurchaseItemsTable
                items={items}
                products={products}
                defaultTaxRate={defaultTaxRate}
                productInputRefs={productInputRefs}
                onItemChange={onItemChange}
                onProductSelect={onProductSelect}
                onQuickAddProduct={onQuickAddProduct}
                onRemoveItem={onRemoveItem}
                onKeyDownLastField={handleKeyDownOnLastField}
            />

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
                {items.map((item, index) => (
                    <MobilePurchaseItemCard
                        key={index}
                        item={item}
                        index={index}
                        totalItems={items.length}
                        products={products}
                        defaultTaxRate={defaultTaxRate}
                        onItemChange={onItemChange}
                        onProductSelect={onProductSelect}
                        onQuickAddProduct={onQuickAddProduct}
                        onRemoveItem={onRemoveItem}
                    />
                ))}

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
