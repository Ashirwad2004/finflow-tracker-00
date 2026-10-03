import { ShoppingBag, PackageOpen } from "lucide-react";
import { StoreProduct, ProductCard } from "../../ProductCard";
import { StorefrontTrustPills } from "./StorefrontTrustPills";

interface StorefrontProductGridProps {
    filteredProducts: StoreProduct[];
    isLoadingProducts: boolean;
    search: string;
    isAiSearching?: boolean;
    aiSearchResult?: { explanation?: string; products?: StoreProduct[] } | null;
    cart: Record<string, number>;
    cartCount: number;
    cartTotal: number;
    effectiveDeliveryCharge: number;
    formatCurrency: (amount: number) => string;
    onOpenCart: () => void;
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
    canAddOne: (id: string) => boolean;
}

export const StorefrontProductGrid = ({
    filteredProducts,
    isLoadingProducts,
    search,
    isAiSearching,
    aiSearchResult,
    cart,
    cartCount,
    cartTotal,
    effectiveDeliveryCharge,
    formatCurrency,
    onOpenCart,
    onAdd,
    onRemove,
    canAddOne,
}: StorefrontProductGridProps) => {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <StorefrontTrustPills />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-900">
                        {search ? `Results for "${search}"` : "All Products"}
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
                    </p>
                    {search && (
                        <p className="text-xs text-violet-500 mt-1">
                            {isAiSearching
                                ? "Gemini is converting your request into product filters..."
                                : aiSearchResult?.explanation}
                        </p>
                    )}
                </div>
                {cartCount > 0 && (
                    <button
                        onClick={onOpenCart}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                        style={{
                            background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                            boxShadow: "0 4px 16px hsl(262 83% 58% / 0.3)",
                        }}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        View Cart ({cartCount}) · {formatCurrency(cartTotal + effectiveDeliveryCharge)}
                    </button>
                )}
            </div>

            {isLoadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                            <div className="h-52 bg-slate-100" />
                            <div className="p-4 space-y-2.5">
                                <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                                <div className="h-3 bg-slate-100 rounded-lg" />
                                <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-28 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <PackageOpen className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">
                        {search ? "No products found" : "No products yet"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                        {search ? "Try a different search term." : "Check back soon — this store is stocking up!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {filteredProducts.map((product, i) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            qty={cart[product.id] ?? 0}
                            formatCurrency={formatCurrency}
                            onAdd={() => onAdd(product.id)}
                            onRemove={() => onRemove(product.id)}
                            canAddMore={canAddOne(product.id)}
                            index={i}
                        />
                    ))}
                </div>
            )}
        </main>
    );
};
