import React from "react";
import { ShoppingBag, PackageOpen, Minus, Plus, Trash2, Truck } from "lucide-react";
import { getThumbnailUrl } from "@/core/utils/image";
import { StoreProduct } from "../ProductCard";

interface CartItemsListProps {
  cart: Record<string, number>;
  products: StoreProduct[];
  cartTotal: number;
  cartCount: number;
  baseDeliveryCharge: number;
  freeDeliveryThreshold: number;
  formatCurrency: (n: number) => string;
  onRemoveOne: (id: string) => void;
  onAddOne: (id: string) => void;
  canAddOne: (id: string) => boolean;
  onClearItem: (id: string) => void;
}

export const CartItemsList: React.FC<CartItemsListProps> = ({
  cart,
  products,
  cartTotal,
  cartCount,
  baseDeliveryCharge,
  freeDeliveryThreshold,
  formatCurrency,
  onRemoveOne,
  onAddOne,
  canAddOne,
  onClearItem,
}) => {
  return (
    <div className="p-6 space-y-4">
      {freeDeliveryThreshold > 0 && baseDeliveryCharge > 0 && cartCount > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center gap-2 relative z-10">
            {cartTotal >= freeDeliveryThreshold ? (
              <>
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px]">🎉</span>
                </div>
                <p className="text-xs font-bold text-green-700">You've unlocked FREE delivery!</p>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Add{" "}
                  <span className="font-black text-blue-600">
                    {formatCurrency(freeDeliveryThreshold - cartTotal)}
                  </span>{" "}
                  more for FREE delivery
                </p>
              </>
            )}
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative z-10">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, (cartTotal / freeDeliveryThreshold) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {cartCount === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-400 text-sm">Your cart is empty</p>
        </div>
      ) : (
        Object.entries(cart).map(([pid, qty]) => {
          const p = products.find((x) => x.id === pid);
          if (!p) return null;
          return (
            <div key={pid} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                {p.image_url ? (
                  <img
                    src={getThumbnailUrl(p.image_url)}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PackageOpen className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatCurrency(p.price)} / {p.unit}
                </p>
                <div className="flex items-center justify-between mt-3">
                  {/* Qty control */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-1 py-0.5 shadow-sm">
                    <button
                      onClick={() => onRemoveOne(pid)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Minus className="w-3 h-3 text-slate-600" />
                    </button>
                    <span className="w-6 text-center text-sm font-black text-slate-900">{qty}</span>
                    <button
                      onClick={() => onAddOne(pid)}
                      disabled={!canAddOne(pid)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">
                      {formatCurrency(p.price * qty)}
                    </span>
                    <button
                      onClick={() => onClearItem(pid)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
