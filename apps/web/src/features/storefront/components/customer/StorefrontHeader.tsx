import React from "react";
import { PackageOpen, ShoppingBag } from "lucide-react";
import { StoreProduct } from "../../ProductCard";

interface StorefrontHeaderProps {
    businessName: string;
    businessLogo: string | null;
    products: StoreProduct[];
    cartCount: number;
    cartTotal: number;
    effectiveDeliveryCharge: number;
    formatCurrency: (amount: number) => string;
    onOpenOrders: () => void;
    onOpenCart: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
    businessName,
    businessLogo,
    products,
    cartCount,
    cartTotal,
    effectiveDeliveryCharge,
    formatCurrency,
    onOpenOrders,
    onOpenCart,
}) => {
    const logoInitial = businessName.charAt(0).toUpperCase();

    return (
        <header
            className="bg-white border-b border-slate-100 sticky top-0 z-40"
            style={{ boxShadow: "0 1px 16px rgba(0,0,0,0.05)" }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                {/* Logo + Brand */}
                <div className="flex items-center gap-2.5">
                    {/* Logo container — always white bg so dark logos look clean */}
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
                        {businessLogo ? (
                            <img
                                src={businessLogo}
                                alt={businessName}
                                className="w-full h-full object-contain rounded-md"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                    (
                                        e.currentTarget.nextElementSibling as HTMLElement
                                    )?.classList.remove("hidden");
                                }}
                            />
                        ) : null}
                        <span
                            className={`text-xs font-black text-white w-full h-full flex items-center justify-center rounded-md ${
                                businessLogo ? "hidden" : ""
                            }`}
                            style={{
                                background:
                                    "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                            }}
                        >
                            {logoInitial}
                        </span>
                    </div>
                    <div>
                        <p className="font-bold text-[13px] text-slate-900 leading-tight">
                            {businessName}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <p className="text-[10px] text-slate-400 font-medium">
                                {products.filter((p) => (p.stock_quantity ?? 0) > 0).length} in stock
                                {products.some((p) => (p.stock_quantity ?? 0) <= 0) &&
                                    ` · ${products.filter((p) => (p.stock_quantity ?? 0) <= 0).length} out of stock`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* My Orders Button */}
                    <button
                        onClick={onOpenOrders}
                        className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <PackageOpen className="w-3.5 h-3.5" />
                        My Orders
                    </button>

                    {/* Cart button */}
                    <button
                        onClick={onOpenCart}
                        className="relative flex items-center gap-2 h-9 px-3.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.97]"
                        style={{
                            background:
                                cartCount > 0
                                    ? "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))"
                                    : "hsl(262 83% 58% / 0.08)",
                            color: cartCount > 0 ? "white" : "hsl(262 83% 58%)",
                            boxShadow:
                                cartCount > 0 ? "0 3px 12px hsl(262 83% 58% / 0.3)" : "none",
                        }}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="text-xs">
                            {formatCurrency(cartTotal + effectiveDeliveryCharge)}
                        </span>
                        {cartCount > 0 && (
                            <span
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow"
                                style={{ background: "hsl(0 84% 60%)" }}
                            >
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};
