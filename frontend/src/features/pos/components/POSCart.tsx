import React from "react";
import { POSCartItem } from "../types";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, User, UserPlus, ShoppingCart, Percent, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface POSCartProps {
  items: POSCartItem[];
  customerName: string;
  customerPhone?: string;
  onOpenCustomerSelect: () => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onUpdateDiscount: (id: string, newDisc: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  overallDiscountAmount: number;
  onUpdateOverallDiscount: (discount: number) => void;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export const POSCart: React.FC<POSCartProps> = ({
  items,
  customerName,
  customerPhone,
  onOpenCustomerSelect,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateDiscount,
  onRemoveItem,
  onClearCart,
  overallDiscountAmount,
  onUpdateOverallDiscount,
  subtotal,
  taxAmount,
  totalAmount,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="flex flex-col h-full bg-card border-l border-border/80 shadow-xs overflow-hidden font-display">
      {/* Customer Header */}
      <div className="p-3 border-b border-border/80 bg-muted/30 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenCustomerSelect}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-left transition-colors flex-1 min-w-0 shadow-2xs group"
          title="Change Customer (F2)"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">{customerName || "Walk-in Customer"}</span>
              <kbd className="hidden sm:inline text-[9px] text-muted-foreground bg-muted px-1 rounded border border-border">F2</kbd>
            </div>
            {customerPhone && <p className="text-[10px] text-muted-foreground font-mono truncate">{customerPhone}</p>}
          </div>
        </button>

        {items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            className="h-8 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 px-2 font-medium"
            title="Clear Cart"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[220px]">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-2.5 text-muted-foreground/60">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Cart is Empty</p>
            <p className="text-xs max-w-xs mt-1 text-muted-foreground">
              Scan a barcode or click items from the catalog to begin billing.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-border/80 bg-background hover:border-primary/30 transition-all flex flex-col gap-2 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate leading-tight">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono">{formatCurrency(item.price)} / {item.unit || "pc"}</span>
                    {item.tax_rate > 0 && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded font-medium border border-border/60">
                        GST {item.tax_rate}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-foreground font-mono">{formatCurrency(item.total)}</p>
                  {item.discount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      -{item.discount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/70">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                    className="h-6.5 w-6.5 rounded-lg border-border hover:bg-muted"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                    className="h-6.5 w-14 text-center text-xs font-bold p-0 rounded-lg border-border font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-6.5 w-6.5 rounded-lg border-border hover:bg-muted"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase ml-1">
                    {item.unit || "pc"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1" title="Line Discount %">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount || ""}
                      placeholder="0"
                      onChange={(e) => onUpdateDiscount(item.id, parseFloat(e.target.value) || 0)}
                      className="h-6.5 w-11 text-center text-[11px] p-0 rounded-lg border-border font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground">%</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-6.5 w-6.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Calculation Footer */}
      <div className="p-3.5 border-t border-border/80 bg-muted/30 space-y-2">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal ({items.length} items)</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span className="flex items-center gap-1">
              Bill Discount
              <Percent className="w-3 h-3" />
            </span>
            <div className="flex items-center gap-1">
              <span>-</span>
              <Input
                type="number"
                min="0"
                value={overallDiscountAmount || ""}
                placeholder="0"
                onChange={(e) => onUpdateOverallDiscount(parseFloat(e.target.value) || 0)}
                className="h-6 w-16 text-right text-xs p-1 font-semibold rounded-lg border-border bg-background font-mono"
              />
            </div>
          </div>

          {taxAmount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Total GST</span>
              <span className="font-mono">+{formatCurrency(taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-border/80 font-bold">
            <span className="text-xs uppercase tracking-wider text-foreground">TOTAL PAYABLE</span>
            <span className="text-xl font-black text-primary tracking-tight font-mono">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
