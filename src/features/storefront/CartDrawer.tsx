import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ShoppingBag,
    PackageOpen,
    Minus,
    Plus,
    X,
    ArrowRight,
    Truck,
    Shield,
    RotateCcw,
    User,
    Phone,
    MapPin,
    Trash2,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { StoreProduct } from "./ProductCard";

interface CartDrawerProps {
    open: boolean;
    onClose: () => void;
    cart: Record<string, number>;
    products: StoreProduct[];
    cartTotal: number;
    cartCount: number;
    deliveryCharge: number;
    baseDeliveryCharge: number;
    freeDeliveryThreshold: number;
    formatCurrency: (n: number) => string;
    onRemoveOne: (id: string) => void;
    onAddOne: (id: string) => void;
    canAddOne: (id: string) => boolean;
    onClearItem: (id: string) => void;
    onSubmit: (name: string, phone: string, address: string, paymentMethod: "cod" | "online") => Promise<void>;
    isSubmitting: boolean;
    onlinePaymentEnabled?: boolean;
}

export function CartDrawer({
    open,
    onClose,
    cart,
    products,
    cartTotal,
    cartCount,
    deliveryCharge,
    baseDeliveryCharge,
    freeDeliveryThreshold,
    formatCurrency,
    onRemoveOne,
    onAddOne,
    canAddOne,
    onClearItem,
    onSubmit,
    isSubmitting,
    onlinePaymentEnabled = false,
}: CartDrawerProps) {
    const [step, setStep] = useState<"cart" | "form">("cart");
    const [name, setName] = useState(() => localStorage.getItem("storefront_name") || "");
    const [phone, setPhone] = useState(() => localStorage.getItem("storefront_phone") || "");
    const [address, setAddress] = useState(() => localStorage.getItem("storefront_address") || "");
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");

    // Save details to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("storefront_name", name);
        localStorage.setItem("storefront_phone", phone);
        localStorage.setItem("storefront_address", address);
    }, [name, phone, address]);

    // reset to cart view whenever drawer opens
    useEffect(() => {
        if (open) {
            setStep("cart");
            setPaymentMethod(onlinePaymentEnabled ? "cod" : "cod");
        }
    }, [open, onlinePaymentEnabled]);

    const handleSubmit = async () => {
        await onSubmit(name, phone, address, paymentMethod);
        setStep("cart");
    };

    const formValid = name.trim() && phone.trim() && address.trim();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogPrimitive.Portal>
                {/* Overlay */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                />

                {/* Panel sliding from right */}
                <DialogPrimitive.Content
                    className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-300 data-[state=open]:duration-500"
                    aria-describedby={undefined}
                >
                    <DialogPrimitive.Title className="sr-only">Shopping Cart</DialogPrimitive.Title>

                    {/* ── Drawer Header ── */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5" style={{ color: "hsl(262 83% 58%)" }} />
                                <h2 className="text-lg font-black text-slate-900">
                                    {step === "cart" ? "Your Cart" : "Delivery Details"}
                                </h2>
                            </div>
                            {step === "cart" && cartCount > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5 ml-7">{cartCount} item{cartCount !== 1 ? "s" : ""}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            aria-label="Close cart"
                        >
                            <X className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-50 flex-shrink-0 bg-slate-50/50">
                        {["cart", "form"].map((s, i) => (
                            <div key={s} className="flex items-center gap-0">
                                <div
                                    className={`flex items-center gap-2 text-xs font-bold transition-all ${step === s ? "text-slate-900" : "text-slate-400"}`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step === s ? "text-white" : "bg-slate-200 text-slate-400"}`}
                                        style={step === s ? { background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" } : {}}
                                    >
                                        {i + 1}
                                    </div>
                                    {s === "cart" ? "Cart" : "Details"}
                                </div>
                                {i === 0 && (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-2" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Content ── */}
                    <div className="flex-1 overflow-y-auto">
                        {step === "cart" ? (
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
                                                        Add <span className="font-black text-blue-600">{formatCurrency(freeDeliveryThreshold - cartTotal)}</span> more for FREE delivery
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative z-10">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-500 ease-out" 
                                                style={{ width: `${Math.min(100, Math.max(0, (cartTotal / freeDeliveryThreshold) * 100))}%` }} 
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
                                        const p = products.find(x => x.id === pid);
                                        if (!p) return null;
                                        return (
                                            <div key={pid} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                {/* Thumbnail */}
                                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <PackageOpen className="w-6 h-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(p.price)} / {p.unit}</p>
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
                                                                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-sm text-slate-900">{formatCurrency(p.price * qty)}</span>
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
                        ) : (
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="sfx_name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Full Name <span className="text-red-400">*</span>
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="sfx_name"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="e.g. Priya Sharma"
                                            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sfx_phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Phone Number <span className="text-red-400">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            id="sfx_phone"
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className="pl-10 h-12 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sfx_addr" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Delivery Address <span className="text-red-400">*</span>
                                    </Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                        <Textarea
                                            id="sfx_addr"
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            placeholder="Flat/House no., Street, City, PIN"
                                            rows={3}
                                            className="pl-10 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50 resize-none animate-fade-in"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Payment Method
                                    </Label>
                                    {onlinePaymentEnabled ? (
                                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("cod")}
                                                className={`py-2 text-xs font-bold rounded-lg transition-all ${paymentMethod === "cod" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}
                                            >
                                                💵 Cash on Delivery
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod("online")}
                                                className={`py-2 text-xs font-bold rounded-lg transition-all ${paymentMethod === "online" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-700"}`}
                                            >
                                                💳 Pay Online
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
                                            💵 Cash on Delivery
                                            <span className="text-slate-400 font-normal">(Only payment method available)</span>
                                        </div>
                                    )}
                                </div>

                                {/* Order summary condensed */}
                                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 mt-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Summary</p>
                                    {Object.entries(cart).map(([pid, qty]) => {
                                        const p = products.find(x => x.id === pid);
                                        if (!p) return null;
                                        return (
                                            <div key={pid} className="flex justify-between text-sm">
                                                <span className="text-slate-600">{p.name} × {qty}</span>
                                                <span className="font-bold text-slate-900">{formatCurrency(p.price * qty)}</span>
                                            </div>
                                        );
                                    })}
                                    {baseDeliveryCharge > 0 && (
                                        <div className="flex justify-between text-sm pt-2">
                                            <span className="text-slate-600">Delivery Fee</span>
                                            {deliveryCharge === 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 line-through text-xs">{formatCurrency(baseDeliveryCharge)}</span>
                                                    <span className="font-bold text-green-600 uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-green-100 rounded">Free</span>
                                                </div>
                                            ) : (
                                                <span className="font-bold text-slate-900">{formatCurrency(deliveryCharge)}</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 mt-1">
                                        <span className="text-slate-900">Total</span>
                                        <span style={{ color: "hsl(262 83% 58%)" }}>{formatCurrency(cartTotal + deliveryCharge)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer CTA ── */}
                    {cartCount > 0 && (
                        <div className="p-5 border-t border-slate-100 space-y-3 flex-shrink-0 bg-white">
                            {/* Subtotal row */}
                            <div className="space-y-1.5 px-1 mb-2">
                                {baseDeliveryCharge > 0 && (
                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(cartTotal)}</span>
                                    </div>
                                )}
                                {baseDeliveryCharge > 0 && (
                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>Delivery Fee</span>
                                        {deliveryCharge === 0 ? (
                                            <span className="font-bold text-green-600">FREE</span>
                                        ) : (
                                            <span>{formatCurrency(deliveryCharge)}</span>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-bold text-slate-700 pt-1">
                                    <span>Total</span>
                                    <span className="font-black text-slate-900">{formatCurrency(cartTotal + deliveryCharge)}</span>
                                </div>
                            </div>

                            {step === "cart" ? (
                                <button
                                    onClick={() => setStep("form")}
                                    className="w-full h-14 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
                                    style={{
                                        background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)",
                                        boxShadow: "0 6px 24px hsl(262 83% 58% / 0.4)",
                                    }}
                                >
                                    Proceed to Checkout
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStep("cart")}
                                        className="h-14 px-5 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 text-sm transition-all hover:bg-slate-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !formValid}
                                        className="flex-1 h-14 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)",
                                            boxShadow: formValid ? "0 6px 24px hsl(262 83% 58% / 0.4)" : "none",
                                        }}
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Placing…</>
                                        ) : (
                                            <>Place Order · {formatCurrency(cartTotal + deliveryCharge)}</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Trust row */}
                            <div className="flex items-center justify-center gap-5 pt-1">
                                {[
                                    { icon: <Shield className="w-3 h-3 text-green-500" />, label: "Secure" },
                                    { icon: <Truck className="w-3 h-3 text-blue-500" />, label: "Fast Delivery" },
                                    { icon: <RotateCcw className="w-3 h-3 text-orange-500" />, label: "Easy Returns" },
                                ].map(b => (
                                    <div key={b.label} className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                                        {b.icon} {b.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
