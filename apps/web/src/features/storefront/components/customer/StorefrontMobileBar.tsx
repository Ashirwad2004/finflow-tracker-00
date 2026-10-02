import React from "react";
import { PackageOpen, ArrowRight } from "lucide-react";

interface StorefrontMobileBarProps {
    cartCount: number;
    cartTotal: number;
    effectiveDeliveryCharge: number;
    formatCurrency: (amount: number) => string;
    onOpenOrders: () => void;
    onOpenCart: () => void;
}

export const StorefrontMobileBar: React.FC<StorefrontMobileBarProps> = ({
    cartCount,
    cartTotal,
    effectiveDeliveryCharge,
    formatCurrency,
    onOpenOrders,
    onOpenCart,
}) => {
    return (
        <div className="fixed bottom-4 inset-x-4 z-50 md:hidden flex items-center justify-between gap-3 pointer-events-none">
            <button
                onClick={onOpenOrders}
                className="pointer-events-auto h-14 w-14 rounded-2xl font-black text-slate-700 bg-white flex items-center justify-center transition-all shadow-xl border border-slate-100"
                aria-label="My Orders"
            >
                <PackageOpen className="w-5 h-5 text-indigo-600" />
            </button>
            {cartCount > 0 && (
                <button
                    onClick={onOpenCart}
                    className="pointer-events-auto flex-1 h-14 rounded-2xl font-black text-white text-sm flex items-center justify-between px-5 transition-all active:scale-[0.98]"
                    style={{
                        background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)",
                        boxShadow: "0 8px 32px hsl(262 83% 58% / 0.5)",
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                            {cartCount}
                        </div>
                        <span>View Cart</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>{formatCurrency(cartTotal + effectiveDeliveryCharge)}</span>
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
            )}
        </div>
    );
};
