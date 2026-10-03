import { Package, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface POSMobileNavProps {
  mobileTab: "catalog" | "cart";
  onTabChange: (tab: "catalog" | "cart") => void;
  filteredProductsCount: number;
  cartItemsCount: number;
  totalAmount: number;
  formatCurrency: (amount: number) => string;
}

export function POSMobileNav({
  mobileTab,
  onTabChange,
  filteredProductsCount,
  cartItemsCount,
  totalAmount,
  formatCurrency,
}: POSMobileNavProps) {
  return (
    <div className="lg:hidden px-3 sm:px-4 py-2 bg-card border-b border-border/80 flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onTabChange("catalog")}
        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
          mobileTab === "catalog"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "bg-muted/60 text-muted-foreground hover:bg-muted"
        }`}
      >
        <Package className="w-3.5 h-3.5" />
        <span>Catalog ({filteredProductsCount})</span>
      </button>
      <button
        type="button"
        onClick={() => onTabChange("cart")}
        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
          mobileTab === "cart"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "bg-muted/60 text-muted-foreground hover:bg-muted"
        }`}
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        <span>Cart ({cartItemsCount})</span>
        {cartItemsCount > 0 && (
          <span className="font-mono text-[11px] font-extrabold ml-0.5">
            • {formatCurrency(totalAmount)}
          </span>
        )}
      </button>
    </div>
  );
}

interface POSMobileFloatingBarProps {
  cartItemsCount: number;
  totalAmount: number;
  formatCurrency: (amount: number) => string;
  onOpenCart: () => void;
}

export function POSMobileFloatingBar({
  cartItemsCount,
  totalAmount,
  formatCurrency,
  onOpenCart,
}: POSMobileFloatingBarProps) {
  if (cartItemsCount === 0) return null;

  return (
    <div className="lg:hidden p-3 bg-background/95 backdrop-blur-md border-t border-border/80 shrink-0 shadow-lg">
      <Button
        onClick={onOpenCart}
        className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-between px-4 rounded-xl shadow-md cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          <span>
            {cartItemsCount} {cartItemsCount === 1 ? "Item" : "Items"} in Cart
          </span>
        </div>
        <span className="font-mono font-black text-sm sm:text-base">
          View Cart • {formatCurrency(totalAmount)} →
        </span>
      </Button>
    </div>
  );
}
