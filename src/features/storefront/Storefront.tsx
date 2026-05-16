import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/core/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ShoppingBag,
    PackageOpen,
    Minus,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Star,
    Zap,
    X,
    ArrowRight,
    Store,
    Truck,
    Shield,
    RotateCcw,
    Phone,
    MapPin,
    User,
    Trash2,
    ChevronRight,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface StoreProduct {
    id: string;
    user_id: string;
    name: string;
    price: number;
    unit: string;
    image_url: string | null;
    online_description: string | null;
    stock_quantity: number;
}

interface StoreProfile {
    user_id: string;
    display_name: string | null;
    store_slug: string | null;
    is_store_active: boolean;
    business_name: string | null;
    business_logo: string | null;
    delivery_charge: number;
    free_delivery_min_amount: number;
}

// ─── Fullscreen portal cart drawer (no shadcn wrapper = no double X) ──────────
function CartDrawer({
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
    onClearItem,
    onSubmit,
    isSubmitting,
}: {
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
    onClearItem: (id: string) => void;
    onSubmit: (name: string, phone: string, address: string) => Promise<void>;
    isSubmitting: boolean;
}) {
    const [step, setStep] = useState<"cart" | "form">("cart");
    const [name, setName] = useState(() => localStorage.getItem("storefront_name") || "");
    const [phone, setPhone] = useState(() => localStorage.getItem("storefront_phone") || "");
    const [address, setAddress] = useState(() => localStorage.getItem("storefront_address") || "");

    // Save details to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("storefront_name", name);
        localStorage.setItem("storefront_phone", phone);
        localStorage.setItem("storefront_address", address);
    }, [name, phone, address]);

    // reset to cart view whenever drawer opens
    useEffect(() => {
        if (open) setStep("cart");
    }, [open]);

    const handleSubmit = async () => {
        await onSubmit(name, phone, address);
        // We no longer clear name/phone/address here so they persist for the customer's next visit.
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
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors"
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
                                            className="pl-10 rounded-xl border-slate-200 focus:border-violet-400 bg-slate-50 resize-none"
                                        />
                                    </div>
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

// ─── Fullscreen Orders Drawer ──────────
function OrdersDrawer({
    open,
    onClose,
    formatCurrency,
    storeId,
}: {
    open: boolean;
    onClose: () => void;
    formatCurrency: (n: number) => string;
    storeId: string | null;
}) {
    // Get phone and order IDs from localStorage
    const savedPhone = useMemo(() => {
        try { 
            const phone = localStorage.getItem('storefront_phone') || '';
            return phone; 
        } catch { 
            return ''; 
        }
    }, [open]);

    const savedOrders = useMemo(() => {
        try { 
            const orders = JSON.parse(localStorage.getItem('storefront_orders') || '[]');
            console.log('Saved orders from localStorage:', orders);
            return orders; 
        } catch (e) { 
            console.error('Error parsing saved orders:', e);
            return []; 
        }
    }, [open]);

    // Primary: Fetch by phone (works across browsers/devices)
    // Fallback: Fetch by order IDs (legacy support)
    const { data: orders, isLoading, error: queryError } = useQuery({
        queryKey: ['orderHistory', savedPhone, JSON.stringify(savedOrders), storeId],
        queryFn: async () => {
            // Try phone-based lookup first (cross-device support)
            if (savedPhone && savedPhone.trim()) {
                console.log('Fetching orders for phone:', savedPhone);
                const { data, error } = await (supabase as any).rpc('get_orders_by_phone', { 
                    p_phone: savedPhone.trim(),
                    p_store_id: storeId || null
                });
                if (error) {
                    console.error('RPC error fetching orders by phone:', error);
                    // Fall through to order ID lookup below
                } else if (data && data.length > 0) {
                    console.log('Orders fetched by phone:', data);
                    return data;
                }
            }

            // Fallback: Fetch by order IDs (if no phone or phone lookup failed)
            if (!savedOrders || !savedOrders.length) {
                console.log('No saved orders or phone found');
                return [];
            }
            console.log('Fetching orders for IDs:', savedOrders);
            const { data, error } = await (supabase as any).rpc('get_customer_orders', { p_order_ids: savedOrders });
            if (error) {
                console.error('RPC error fetching orders by ID:', error);
                throw error;
            }
            console.log('Orders fetched by ID:', data);
            return data || [];
        },
        enabled: !!(open && (savedPhone.trim() || (savedOrders && savedOrders.length > 0))),
        retry: 2,
        retryDelay: 1000,
    });

    return (
        <DialogPrimitive.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-300 data-[state=open]:duration-500">
                    <DialogPrimitive.Title className="sr-only">My Orders</DialogPrimitive.Title>

                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <PackageOpen className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-lg font-black text-slate-900">My Orders</h2>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <X className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                        {!savedPhone && !savedOrders?.length ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                    <PackageOpen className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="font-semibold text-slate-400 text-sm">No orders yet</p>
                                <p className="text-xs text-slate-300 text-center">Place an order to get started. Your order history will appear here and be accessible from any device using the same phone number.</p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                <p className="text-xs text-slate-400">Loading your orders...</p>
                            </div>
                        ) : queryError ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
                                    <AlertCircle className="w-10 h-10 text-red-300" />
                                </div>
                                <p className="font-semibold text-red-600 text-sm">Could not load orders</p>
                                <p className="text-xs text-slate-400 text-center">{String(queryError) || 'Please try again later.'}</p>
                            </div>
                        ) : !orders || orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                    <PackageOpen className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="font-semibold text-slate-400 text-sm">No orders found</p>
                                <p className="text-xs text-slate-300 text-center">Your order history will show here. Orders are linked to your phone number, so you can see them from any device.</p>
                            </div>
                        ) : (
                            orders.map((order: any) => {
                                // Parse items if it's a string, otherwise use as-is
                                let orderItems = [];
                                try {
                                    if (typeof order.items === 'string') {
                                        orderItems = JSON.parse(order.items);
                                    } else if (Array.isArray(order.items)) {
                                        orderItems = order.items;
                                    }
                                } catch (e) {
                                    console.error('Error parsing items for order', order.id, e);
                                    orderItems = [];
                                }

                                return (
                                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 mb-1">
                                                    {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                                <p className="font-black text-slate-900">{formatCurrency(order.total_amount)}</p>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                order.status === 'accepted' ? 'bg-orange-100 text-orange-700' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {order.status}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {orderItems && orderItems.length > 0 ? (
                                                orderItems.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm">
                                                        <span className="text-slate-600 flex items-center gap-2">
                                                            <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold text-slate-500">{item.quantity}x</span>
                                                            {item.product_name || 'Unknown Product'}
                                                        </span>
                                                        <span className="font-bold text-slate-900">{formatCurrency((item.price_at_time || 0) * (item.quantity || 1))}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No items in this order</p>
                                            )}
                                        </div>
                                        {order.delivery_charge > 0 && (
                                            <div className="flex justify-between text-xs pt-2 border-t border-slate-50">
                                                <span className="text-slate-400">Delivery Fee</span>
                                                <span className="font-semibold text-slate-600">{formatCurrency(order.delivery_charge)}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

// ─── Main Storefront ───────────────────────────────────────────────────────────
export default function Storefront() {
    const { storeSlug } = useParams<{ storeSlug: string }>();
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();

    const [cart, setCart] = useState<Record<string, number>>({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
    const [orderStatus, setOrderStatus] = useState<string>("pending");
    const [submittedName, setSubmittedName] = useState("");
    const [search, setSearch] = useState("");

    // ── Fetch store profile ────────────────────────────────────────────────
    const {
        data: storeProfile,
        isLoading: isLoadingStore,
        isFetched: isStoreFetched,
        error: storeError,
    } = useQuery<StoreProfile | null>({
        queryKey: ["publicStoreProfile", storeSlug],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc("get_public_store", { p_slug: storeSlug });
            if (error) {
                console.error("Supabase RPC Error:", error);
                throw new Error(`Database Error: ${error.message}. (Did you forget to run the SQL migrations?)`);
            }
            let row: any = null;
            if (Array.isArray(data)) row = data[0] ?? null;
            else if (data && typeof data === "object") row = data;
            return row ? (row as StoreProfile) : null;
        },
        enabled: !!storeSlug,
        retry: false,
        staleTime: 30_000,
    });

    const storeId = storeProfile?.user_id ?? null;

    const { data: brandingData } = useQuery<{ business_name: string | null; business_logo: string | null; delivery_charge: number | null; free_delivery_min_amount: number | null } | null>({
        queryKey: ["publicStoreBranding", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles").select("business_name, business_logo, delivery_charge, free_delivery_min_amount")
                .eq("user_id", storeId).maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // ── Fetch products ─────────────────────────────────────────────────────
    const { data: products = [], isLoading: isLoadingProducts } = useQuery<StoreProduct[]>({
        queryKey: ["publicStoreProducts", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc("get_public_store_products", { p_store_id: storeId });
            if (error) return [];
            return (Array.isArray(data) ? data : []) as StoreProduct[];
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // ── Cart helpers ───────────────────────────────────────────────────────
    const handleAdd = (id: string) => setCart(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    const handleRemove = (id: string) => setCart(p => {
        if ((p[id] || 0) <= 1) { const { [id]: _, ...r } = p; return r; }
        return { ...p, [id]: p[id] - 1 };
    });
    const handleClear = (id: string) => setCart(p => { const { [id]: _, ...r } = p; return r; });

    const cartTotal = useMemo(
        () => Object.entries(cart).reduce((s, [id, qty]) => s + (products.find(x => x.id === id)?.price ?? 0) * qty, 0),
        [cart, products]
    );
    const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

    const deliveryChargeRaw = Number(brandingData?.delivery_charge ?? storeProfile?.delivery_charge) || 0;
    const freeDeliveryThreshold = Number(brandingData?.free_delivery_min_amount ?? storeProfile?.free_delivery_min_amount) || 0;
    const effectiveDeliveryCharge = (deliveryChargeRaw > 0 && freeDeliveryThreshold > 0 && cartTotal >= freeDeliveryThreshold) ? 0 : deliveryChargeRaw;

    // ── Submit order ───────────────────────────────────────────────────────
    const submitOrder = async (name: string, phone: string, address: string) => {
        const items = Object.entries(cart).map(([productId, qty]) => ({
            product_id: productId,
            quantity: qty,
            price_at_time: products.find(x => x.id === productId)?.price ?? 0,
        }));
        setIsSubmitting(true);
        try {
            const { data: orderId, error } = await (supabase as any).rpc("place_online_order", {
                p_store_id: storeId,
                p_customer_name: name,
                p_customer_phone: phone,
                p_customer_address: address,
                p_total_amount: cartTotal + effectiveDeliveryCharge,
                p_delivery_charge: effectiveDeliveryCharge,
                p_items: items,
            });
            if (error) throw error;
            
            setSubmittedName(name);
            setTrackedOrderId(orderId);
            setOrderStatus("pending");
            setOrderComplete(true);
            setCart({});
            setIsCartOpen(false);

            // Save order ID to localStorage for order history
            try {
                const currentOrders = JSON.parse(localStorage.getItem('storefront_orders') || '[]');
                if (!currentOrders.includes(orderId)) {
                    localStorage.setItem('storefront_orders', JSON.stringify([orderId, ...currentOrders]));
                }
            } catch (e) {
                console.error("Could not save order to history");
            }

        } catch (err: any) {
            toast({ title: "Couldn't place order", description: err?.message ?? "Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Live Order Tracking ────────────────────────────────────────────────
    useEffect(() => {
        if (!trackedOrderId) return;

        const channel = supabase
            .channel(`public-order-${trackedOrderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_status_events',
                    filter: `order_id=eq.${trackedOrderId}`,
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    setOrderStatus(newStatus);
                    
                    if (newStatus === "accepted") {
                        toast({ title: "Order Accepted! 🎉", description: "The store has accepted your order." });
                        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                    } else if (newStatus === "completed") {
                        toast({ title: "Order Completed! ✅", description: "Your order is ready." });
                        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                    } else if (newStatus === "cancelled") {
                        toast({ title: "Order Cancelled ❌", description: "Your order has been cancelled by the store.", variant: "destructive" });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [trackedOrderId, toast]);

    // ── Loading ────────────────────────────────────────────────────────────
    if (isLoadingStore) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center space-y-5">
                    <div className="relative mx-auto w-20 h-20">
                        <div
                            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl"
                            style={{ background: "linear-gradient(135deg, hsl(262 83% 58%) 0%, hsl(290 80% 60%) 100%)" }}
                        >
                            <Store className="w-10 h-10 text-white" />
                        </div>
                        <div
                            className="absolute -inset-3 rounded-[2rem] opacity-20 animate-ping"
                            style={{ background: "hsl(262 83% 58%)", animationDuration: "1.5s" }}
                        />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-xl">Opening Store</p>
                        <p className="text-slate-400 text-sm mt-1">Please wait…</p>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className="w-2 h-2 rounded-full block animate-bounce"
                                style={{ background: "hsl(262 83% 58%)", animationDelay: `${i * 0.12}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Store not found ────────────────────────────────────────────────────
    if (storeError || (isStoreFetched && !storeProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12 max-w-sm w-full text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Store Not Found</h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {storeError 
                            ? String(storeError) 
                            : "This store link is invalid, not active yet, or offline. Please verify the URL or ensure you have saved your Online Store settings."}
                    </p>
                </div>
            </div>
        );
    }

    // ── Order success ──────────────────────────────────────────────────────
    if (orderComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(160deg, hsl(262 30% 97%) 0%, white 60%)" }}>
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 max-w-sm w-full text-center">
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        {orderStatus === "pending" && (
                            <>
                                <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" style={{ animationDuration: "2s" }} />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                </div>
                            </>
                        )}
                        {orderStatus === "accepted" && (
                            <>
                                <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-40" style={{ animationDuration: "2s" }} />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                                    <PackageOpen className="w-12 h-12 text-white" />
                                </div>
                            </>
                        )}
                        {orderStatus === "completed" && (
                            <>
                                <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" style={{ animationDuration: "2s" }} />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                    <CheckCircle2 className="w-12 h-12 text-white" />
                                </div>
                            </>
                        )}
                        {orderStatus === "cancelled" && (
                            <div className="relative w-24 h-24 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                                <AlertCircle className="w-12 h-12 text-white" />
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 mb-2">
                        {orderStatus === "pending" && "Order Placed!"}
                        {orderStatus === "accepted" && "Order Accepted!"}
                        {orderStatus === "completed" && "Order Completed!"}
                        {orderStatus === "cancelled" && "Order Cancelled"}
                    </h1>
                    
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {orderStatus === "pending" && `Thank you, ${submittedName}! Waiting for the store to accept your order...`}
                        {orderStatus === "accepted" && "The store is now preparing your order. It will be on its way soon!"}
                        {orderStatus === "completed" && "Your order has been successfully completed. Enjoy!"}
                        {orderStatus === "cancelled" && "Unfortunately, your order could not be fulfilled at this time."}
                    </p>

                    {/* Live Tracker UI */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 text-left">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Live Status</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-sm font-semibold text-slate-900">Order Placed</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${orderStatus === "accepted" || orderStatus === "completed" ? "bg-orange-500" : "bg-slate-200"}`}>
                                    {(orderStatus === "accepted" || orderStatus === "completed") && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <span className={`text-sm font-semibold ${orderStatus === "accepted" || orderStatus === "completed" ? "text-slate-900" : "text-slate-400"}`}>Accepted</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${orderStatus === "completed" ? "bg-green-500" : "bg-slate-200"}`}>
                                    {orderStatus === "completed" && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <span className={`text-sm font-semibold ${orderStatus === "completed" ? "text-slate-900" : "text-slate-400"}`}>Completed</span>
                            </div>
                        </div>
                    </div>

                    <button
                        className="w-full h-13 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm flex items-center justify-center transition-all active:scale-[0.98]"
                        style={{ height: 52 }}
                        onClick={() => {
                            setOrderComplete(false);
                            setTrackedOrderId(null);
                        }}
                    >
                        Close Tracking
                    </button>
                </div>
            </div>
        );
    }

    // ── Branding ──────────────────────────────────────────────────────────
    const businessName = storeProfile?.business_name || brandingData?.business_name || storeProfile?.display_name || "My Store";
    const storeName = businessName.toLowerCase().includes("online store") ? businessName : `${businessName} Online Store`;
    const businessLogo = storeProfile?.business_logo || brandingData?.business_logo || null;
    const logoInitial = businessName.charAt(0).toUpperCase();

    const filteredProducts = search.trim()
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : products;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── HEADER ── */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40" style={{ boxShadow: "0 1px 16px rgba(0,0,0,0.05)" }}>
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
                                    onError={e => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                        (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                                    }}
                                />
                            ) : null}
                            <span
                                className={`text-xs font-black text-white w-full h-full flex items-center justify-center rounded-md ${businessLogo ? "hidden" : ""}`}
                                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                            >
                                {logoInitial}
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-[13px] text-slate-900 leading-tight">{businessName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                <p className="text-[10px] text-slate-400 font-medium">{products.length} products available</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* My Orders Button */}
                        <button
                            onClick={() => setIsOrdersOpen(true)}
                            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg font-medium text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <PackageOpen className="w-3.5 h-3.5" />
                            My Orders
                        </button>

                        {/* Cart button */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                        className="relative flex items-center gap-2 h-9 px-3.5 rounded-lg font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.97]"
                        style={{
                            background: cartCount > 0
                                ? "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))"
                                : "hsl(262 83% 58% / 0.08)",
                            color: cartCount > 0 ? "white" : "hsl(262 83% 58%)",
                            boxShadow: cartCount > 0 ? "0 3px 12px hsl(262 83% 58% / 0.3)" : "none",
                        }}
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="text-xs">{formatCurrency(cartTotal + effectiveDeliveryCharge)}</span>
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

            {/* ── SLIM BANNER / SEARCH BAR ── */}
            <div
                className="relative overflow-hidden border-b border-violet-900/30"
                style={{ background: "linear-gradient(135deg, hsl(258 90% 18%) 0%, hsl(272 85% 24%) 60%, hsl(290 75% 20%) 100%)" }}
            >
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                        backgroundSize: "32px 32px",
                    }}
                />
                {/* Subtle glow */}
                <div className="absolute right-0 top-0 w-80 h-32 opacity-20" style={{
                    background: "radial-gradient(circle, hsl(290 80% 60%) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }} />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Left: tagline */}
                        <div>
                            <p className="text-white font-bold text-sm">{businessName}</p>
                            <p className="text-white/50 text-xs mt-0.5">Browse and order directly from us</p>
                        </div>

                        {/* Right: search */}
                        <div className="relative w-full sm:w-72">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search products…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg text-xs text-white placeholder:text-white/35 focus:outline-none transition-all"
                                style={{
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    backdropFilter: "blur(8px)",
                                }}
                                onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")}
                                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PRODUCT GRID ── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                {/* Row of stat pills */}
                <div className="flex flex-wrap gap-3 mb-8">
                    {[
                        { icon: <Truck className="w-3.5 h-3.5 text-blue-500" />, label: "Fast Delivery" },
                        { icon: <Shield className="w-3.5 h-3.5 text-green-500" />, label: "Secure Checkout" },
                        { icon: <Star className="w-3.5 h-3.5 text-yellow-500" />, label: "Quality Guaranteed" },
                        { icon: <Zap className="w-3.5 h-3.5 text-violet-500" />, label: "Easy Ordering" },
                    ].map(pill => (
                        <div key={pill.label} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-600 shadow-sm">
                            {pill.icon} {pill.label}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            {search ? `Results for "${search}"` : "All Products"}
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}</p>
                    </div>
                    {cartCount > 0 && (
                        <button
                            onClick={() => setIsCartOpen(true)}
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

                {/* Loading */}
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
                                onAdd={() => handleAdd(product.id)}
                                onRemove={() => handleRemove(product.id)}
                                index={i}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Mobile floating buttons ── */}
            <div className="fixed bottom-4 inset-x-4 z-50 md:hidden flex items-center justify-between gap-3 pointer-events-none">
                <button
                    onClick={() => setIsOrdersOpen(true)}
                    className="pointer-events-auto h-14 w-14 rounded-2xl font-black text-slate-700 bg-white flex items-center justify-center transition-all shadow-xl border border-slate-100"
                >
                    <PackageOpen className="w-5 h-5 text-indigo-600" />
                </button>
                {cartCount > 0 && (
                    <button
                        onClick={() => setIsCartOpen(true)}
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

            {/* ── Cart Drawer ── */}
            <CartDrawer
                open={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                products={products}
                cartTotal={cartTotal}
                cartCount={cartCount}
                deliveryCharge={effectiveDeliveryCharge}
                baseDeliveryCharge={deliveryChargeRaw}
                freeDeliveryThreshold={freeDeliveryThreshold}
                formatCurrency={formatCurrency}
                onRemoveOne={handleRemove}
                onAddOne={handleAdd}
                onClearItem={handleClear}
                onSubmit={submitOrder}
                isSubmitting={isSubmitting}
            />

            {/* ── Orders Drawer ── */}
            <OrdersDrawer
                open={isOrdersOpen}
                onClose={() => setIsOrdersOpen(false)}
                formatCurrency={formatCurrency}
                storeId={storeId}
            />
        </div>
    );
}

// ─── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
    product,
    qty,
    formatCurrency,
    onAdd,
    onRemove,
    index,
}: {
    product: StoreProduct;
    qty: number;
    formatCurrency: (n: number) => string;
    onAdd: () => void;
    onRemove: () => void;
    index: number;
}) {
    const [imgErr, setImgErr] = useState(false);
    const inCart = qty > 0;

    return (
        <div
            className="group bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 cursor-default"
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

                {/* Low stock */}
                {typeof product.stock_quantity === "number" && product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-orange-500 text-[10px] font-bold text-white shadow-md">
                        Only {product.stock_quantity} left
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

                    {qty > 0 ? (
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
                                className="w-8 h-8 flex items-center justify-center text-white transition-opacity hover:opacity-85"
                                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onAdd}
                            className="h-8 px-3.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center gap-1.5"
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