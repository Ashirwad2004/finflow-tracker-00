import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Plus, Check, ChevronDown } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { QuickCreateProductDialog } from "./QuickCreateProductDialog";

export interface ProductItem {
    id: string;
    name: string;
    cost_price?: number;
    price?: number;
    stock_quantity?: number;
    unit?: string;
    hsn_code?: string;
}

interface ProductComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onSelectProduct: (product: ProductItem) => void;
    products: ProductItem[];
    placeholder?: string;
    className?: string;
    inputRef?: (el: HTMLInputElement | null) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
    onQuickAddProduct?: (product: ProductItem) => void;
}

export const ProductCombobox = ({
    value,
    onChange,
    onSelectProduct,
    products = [],
    placeholder = "Search or enter item name...",
    className = "",
    inputRef,
    onKeyDown,
    autoFocus = false,
    onQuickAddProduct,
}: ProductComboboxProps) => {
    const { formatCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const localInputRef = useRef<HTMLInputElement | null>(null);

    const query = value.trim().toLowerCase();

    const filteredProducts = query
        ? products.filter((p) =>
              p.name.toLowerCase().includes(query) ||
              (p.hsn_code && p.hsn_code.toLowerCase().includes(query))
          )
        : products.slice(0, 100);

    const exactMatch = products.find(
        (p) => p.name.toLowerCase() === query
    );

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset highlighted index when filtered list changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [value]);

    const handleSelect = (product: ProductItem) => {
        onChange(product.name);
        onSelectProduct(product);
        setIsOpen(false);
    };

    const handleQuickCreated = (newProd: ProductItem) => {
        if (onQuickAddProduct) {
            onQuickAddProduct(newProd);
        }
        handleSelect(newProd);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isOpen) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredProducts.length - 1 ? prev + 1 : prev
                );
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                return;
            }
            if (e.key === "Enter" && filteredProducts.length > 0 && isOpen) {
                if (filteredProducts[highlightedIndex]) {
                    e.preventDefault();
                    handleSelect(filteredProducts[highlightedIndex]);
                    return;
                }
            }
            if (e.key === "Escape") {
                setIsOpen(false);
                return;
            }
        }

        if (onKeyDown) {
            onKeyDown(e);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <Input
                    ref={(el) => {
                        localInputRef.current = el;
                        if (inputRef) inputRef(el);
                    }}
                    type="text"
                    value={value}
                    autoFocus={autoFocus}
                    placeholder={placeholder}
                    className={`h-9 text-xs transition-all pr-8 ${className}`}
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onClick={() => setIsOpen(true)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDownInternal}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen((prev) => !prev);
                        localInputRef.current?.focus();
                    }}
                    className="absolute right-1 p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                    title={isOpen ? "Close products" : "Browse product catalog"}
                >
                    <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isOpen ? "rotate-180 text-primary" : "opacity-60"
                        }`}
                    />
                </button>
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full min-w-[290px] max-w-[440px] bg-popover text-popover-foreground border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    {/* Header Bar */}
                    <div className="px-3 py-1.5 bg-muted/70 border-b border-border/60 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-foreground">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            <span>Products ({filteredProducts.length}{products.length > filteredProducts.length ? ` of ${products.length}` : ""})</span>
                        </span>
                        <span className="text-[9px] font-normal text-muted-foreground lowercase">
                            click to auto-fill
                        </span>
                    </div>

                    {/* Products List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((p, idx) => {
                                const isSelected = exactMatch?.id === p.id;
                                const isHighlighted = highlightedIndex === idx;
                                const cost = Number(p.cost_price ?? p.price ?? 0);
                                const stock = Number(p.stock_quantity ?? 0);

                                return (
                                    <div
                                        key={p.id}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelect(p);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                            isHighlighted
                                                ? "bg-accent text-accent-foreground font-medium"
                                                : "hover:bg-muted/60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                <Package className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="truncate">
                                                <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                                                    <span>{p.name}</span>
                                                    {isSelected && (
                                                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                    <span>Unit: <strong className="text-foreground/80">{p.unit || "pc"}</strong></span>
                                                    {p.hsn_code && <span>• HSN: {p.hsn_code}</span>}
                                                    {p.price && p.cost_price && p.price !== p.cost_price && (
                                                        <span>• Sell: {formatCurrency(Number(p.price))}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                                            <span className="font-extrabold text-foreground font-mono">
                                                {formatCurrency(cost)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1.5 py-0 h-4 border font-mono ${
                                                    stock > 0
                                                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                                                        : "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                                                }`}
                                            >
                                                {stock > 0 ? `Stock: ${stock}` : "Stock: 0"}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground">
                                    "{value}" is not in product catalog
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Click below to quickly add it with cost & inventory stock.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="bg-muted/40 p-1.5 border-t border-border/60 flex flex-col gap-1">
                        {value.trim() && !exactMatch && (
                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsOpen(false);
                                }}
                                className="px-2.5 py-1.5 rounded-md text-[11px] text-primary flex items-center gap-1.5 font-semibold cursor-pointer hover:bg-muted transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Keep custom item "{value.trim()}"</span>
                            </div>
                        )}

                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsQuickAddOpen(true);
                                setIsOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-md text-[11px] text-primary flex items-center gap-1.5 font-bold cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add "{value.trim() || "New Product"}" to Inventory Catalog</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Quick Add Product Dialog */}
            <QuickCreateProductDialog
                open={isQuickAddOpen}
                onOpenChange={setIsQuickAddOpen}
                initialName={value.trim()}
                onSaveProduct={handleQuickCreated}
            />
        </div>
    );
};
