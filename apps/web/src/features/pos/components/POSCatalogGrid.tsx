import React from "react";
import { Input } from "@/components/ui/input";
import { Package } from "lucide-react";
import { BarcodeScannerInput } from "./BarcodeScannerInput";
import { getProductColor } from "../utils/posFeedback";
import { POSProduct } from "../types";

interface POSCatalogGridProps {
  products: POSProduct[];
  isProductsLoading: boolean;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredProducts: POSProduct[];
  visibleProducts: POSProduct[];
  formatCurrency: (val: number) => string;
  onAddToCart: (p: POSProduct) => void;
  onBarcodeNotFound: (code: string) => void;
}

export const POSCatalogGrid: React.FC<POSCatalogGridProps> = ({
  products,
  isProductsLoading,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  filteredProducts,
  visibleProducts,
  formatCurrency,
  onAddToCart,
  onBarcodeNotFound,
}) => {
  return (
    <>
      {/* Top Barcode Input Area */}
      <div className="p-3 sm:p-4 border-b border-border/80 bg-card/40 shrink-0">
        <BarcodeScannerInput
          products={products}
          onProductFound={onAddToCart}
          onBarcodeNotFound={onBarcodeNotFound}
        />
      </div>

      {/* Category Filter Chips & Quick Search Filter */}
      <div className="p-2.5 sm:p-3 border-b border-border/80 bg-card/60 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => onSelectCategory("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          All ({products.length})
        </button>

        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}

        <div className="ml-auto min-w-[140px] sm:min-w-[170px] relative shrink-0">
          <Input
            placeholder="Filter items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7.5 text-xs bg-background border-border/80 rounded-lg pr-7"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
              title="Clear filter"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Product Quick-Touch Grid - Independently Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 overscroll-contain">
        {isProductsLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Loading catalog inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3 py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Package className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No products found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchQuery
                  ? "Try a different search term"
                  : "Add products in the Inventory page"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {visibleProducts.map((product) => {
                const isOutOfStock = (product.stock_quantity || 0) <= 0;
                const avatarStyle = getProductColor(product.name);

                return (
                  <div
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    className={`group relative p-3 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between select-none active:scale-[0.98] ${
                      isOutOfStock ? "opacity-75" : ""
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold uppercase shrink-0 ${avatarStyle}`}
                        >
                          {product.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                            {product.barcode
                              ? product.barcode
                              : product.sku || "No Barcode"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                      <div className="font-extrabold text-foreground text-sm font-mono">
                        {formatCurrency(product.price)}
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          (product.stock_quantity || 0) > 5
                            ? "bg-muted text-muted-foreground border-border/80"
                            : (product.stock_quantity || 0) > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40"
                        }`}
                      >
                        {product.stock_quantity} {product.unit || "pc"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length > 120 && (
              <div className="p-3 text-center bg-muted/30 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                Showing top 120 of {filteredProducts.length} items. Use barcode scanner or search to refine.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
