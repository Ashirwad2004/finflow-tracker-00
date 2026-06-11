import { useState } from "react";
import { PackageOpen, ShoppingBag, Minus, Plus } from "lucide-react";

export interface StoreProduct {
    id: string;
    user_id: string;
    name: string;
    price: number;
    unit: string;
    image_url: string | null;
    online_description: string | null;
    stock_quantity: number;
    category?: string | null;
}

interface ProductCardProps {
    product: StoreProduct;
    qty: number;
    formatCurrency: (n: number) => string;
    onAdd: () => void;
    onRemove: () => void;
    canAddMore: boolean;
    index: number;
}

export function ProductCard({
    product,
    qty,
    formatCurrency,
    onAdd,
    onRemove,
    canAddMore,
    index,
}: ProductCardProps) {
    const [imgErr, setImgErr] = useState(false);
    const inCart = qty > 0;
    const stock = typeof product.stock_quantity === "number" ? Math.max(0, product.stock_quantity) : 0;
    const isOutOfStock = stock <= 0;

    return (
        <div
            className={`group bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 cursor-default ${isOutOfStock ? "opacity-85" : "hover:-translate-y-1"}`}
            style={{
                boxShadow: inCart
                    ? "0 0 0 2px hsl(262 83% 58%), 0 8px 30px hsl(262 83% 58% / 0.15)"
                    : "0 1px 12px rgba(0,0,0,0.06)",
                animationDelay: `${index * 40}ms`,
            }}
        >
            {/* Image */}
            <div className="relative w-full aspect-square bg-slate-100 overflow-hidden">
                {product.image_url && !imgErr ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100">
                        <PackageOpen className="w-10 h-10 text-slate-300" />
                    </div>
                )}

                {/* In-cart overlay badge */}
                {inCart && (
                    <div
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-black text-white flex items-center gap-1 shadow-md"
                        style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                    >
                        <ShoppingBag className="w-2.5 h-2.5" />
                        {qty}
                    </div>
                )}

                {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-[11px] font-black text-white uppercase tracking-wider shadow-lg">
                            Out of Stock
                        </span>
                    </div>
                )}

                {/* Low stock */}
                {!isOutOfStock && stock <= 5 && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-orange-500 text-[10px] font-bold text-white shadow-md">
                        Only {stock} left
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3.5 flex-1 flex flex-col">
                <h3 className="font-black text-sm text-slate-900 leading-snug line-clamp-2 mb-1">{product.name}</h3>
                {product.online_description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed flex-1 mb-2">
                        {product.online_description}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-2.5" style={{ borderTop: "1px solid hsl(0 0% 95%)" }}>
                    <div className="min-w-0">
                        <span className="font-black text-base" style={{ color: "hsl(262 83% 58%)" }}>
                            {formatCurrency(product.price)}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-0.5">/{product.unit}</span>
                    </div>

                    {isOutOfStock && qty === 0 ? (
                        <span className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wide text-slate-500 bg-slate-100 border border-slate-200 flex items-center">
                            Unavailable
                        </span>
                    ) : qty > 0 ? (
                        <div
                            className="flex items-center gap-0.5 rounded-xl overflow-hidden border"
                            style={{ borderColor: "hsl(262 83% 58% / 0.25)", background: "hsl(262 83% 58% / 0.04)" }}
                        >
                            <button
                                onClick={onRemove}
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-50 transition-colors"
                            >
                                <Minus className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                            <span className="w-6 text-center text-sm font-black" style={{ color: "hsl(262 83% 58%)" }}>{qty}</span>
                            <button
                                onClick={onAdd}
                                disabled={!canAddMore}
                                className="w-8 h-8 flex items-center justify-center text-white transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onAdd}
                            disabled={!canAddMore}
                            className="h-8 px-3.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400"
                            style={{
                                background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))",
                                boxShadow: "0 2px 10px hsl(262 83% 58% / 0.3)",
                            }}
                        >
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
