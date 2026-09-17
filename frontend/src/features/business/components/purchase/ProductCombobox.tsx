import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Plus, Check } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";

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
}: ProductComboboxProps) => {
    const { formatCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const localInputRef = useRef<HTMLInputElement | null>(null);

    const filteredProducts = value.trim()
        ? products.filter((p) =>
              p.name.toLowerCase().includes(value.toLowerCase().trim())
          )
        : products.slice(0, 8);

    const exactMatch = products.find(
        (p) => p.name.toLowerCase() === value.trim().toLowerCase()
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
                // If user pressed Enter on a highlighted item in list
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

        // Pass event up to parent for row addition or Tab navigation
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
                    className={`h-9 text-xs transition-all pr-7 ${className}`}
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDownInternal}
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 text-muted-foreground pointer-events-none opacity-60" />
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 top-[calc(100%+4px)] w-full min-w-[280px] max-w-[420px] bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
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
                                        className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                            isHighlighted
                                                ? "bg-accent text-accent-foreground font-medium"
                                                : "hover:bg-muted/60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                            <Package className="w-3.5 h-3.5 text-primary shrink-0 opacity-70" />
                                            <div className="truncate">
                                                <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                                    <span>{p.name}</span>
                                                    {isSelected && (
                                                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                                    <span>Unit: {p.unit || "pc"}</span>
                                                    {p.hsn_code && <span>• HSN: {p.hsn_code}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                                            <span className="font-bold text-foreground">
                                                {formatCurrency(cost)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1.5 py-0 h-4 ${
                                                    stock > 0
                                                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                                        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                                                }`}
                                            >
                                                Stock: {stock}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-3 text-center text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">
                                    "{value}" is not in product catalog
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Saving this bill will automatically add it to your inventory.
                                </p>
                            </div>
                        )}
                    </div>

                    {value.trim() && !exactMatch && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsOpen(false);
                            }}
                            className="bg-muted/40 p-2 text-[11px] text-primary flex items-center gap-1 font-semibold border-t cursor-pointer hover:bg-muted"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Keep new item "{value.trim()}"</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
