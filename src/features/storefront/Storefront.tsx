import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ShoppingCart,
    PackageOpen,
    Minus,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader2,
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
}

export default function Storefront() {
    const { storeSlug } = useParams<{ storeSlug: string }>();
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();

    const [cart, setCart] = useState<Record<string, number>>({});
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [submittedName, setSubmittedName] = useState("");

    // Customer form
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    // ── 1. Fetch store profile via RPC (SECURITY DEFINER, bypasses RLS) ──
    const {
        data: storeProfile,
        isLoading: isLoadingStore,
        isFetched: isStoreFetched,
    } = useQuery<StoreProfile | null>({
        queryKey: ["publicStoreProfile", storeSlug],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc("get_public_store", {
                p_slug: storeSlug,
            });
            if (error) {
                console.error("[Storefront] Profile RPC error:", error);
                return null;
            }
            // Supabase RPC can return array or single row depending on client version
            let row: any = null;
            if (Array.isArray(data)) {
                row = data[0] ?? null;
            } else if (data && typeof data === "object") {
                row = data;
            }
            console.log("[Storefront] store profile row:", row);
            return row ? (row as StoreProfile) : null;
        },
        enabled: !!storeSlug,
        retry: false,
        staleTime: 30_000,
    });

    const storeId = storeProfile?.user_id ?? null;

    // ── 1b. Fetch business branding directly from profiles (fallback / supplement) ──
    // This ensures business_name + business_logo are available even if the RPC
    // hasn't been updated yet to return those fields.
    const { data: brandingData } = useQuery<{ business_name: string | null; business_logo: string | null } | null>({
        queryKey: ["publicStoreBranding", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("business_name, business_logo")
                .eq("user_id", storeId)
                .maybeSingle();
            if (error) {
                console.warn("[Storefront] Branding fallback error:", error);
                return null;
            }
            return data as { business_name: string | null; business_logo: string | null } | null;
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // ── 2. Fetch products via RPC (SECURITY DEFINER, bypasses RLS) ──────
    const { data: products = [], isLoading: isLoadingProducts } = useQuery<StoreProduct[]>({
        queryKey: ["publicStoreProducts", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any).rpc(
                "get_public_store_products",
                { p_store_id: storeId }
            );
            if (error) {
                console.error("[Storefront] Products RPC error:", error);
                return [];
            }
            return (Array.isArray(data) ? data : []) as StoreProduct[];
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // ── Cart helpers ──────────────────────────────────────────────────────
    const handleAdd = (productId: string) => {
        setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    };

    const handleRemove = (productId: string) => {
        setCart(prev => {
            const qty = prev[productId] || 0;
            if (qty <= 1) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: qty - 1 };
        });
    };

    const cartTotal = useMemo(
        () =>
            Object.entries(cart).reduce((sum, [id, qty]) => {
                const p = products.find(x => x.id === id);
                return sum + (p?.price ?? 0) * qty;
            }, 0),
        [cart, products]
    );

    const cartCount = useMemo(
        () => Object.values(cart).reduce((a, b) => a + b, 0),
        [cart]
    );

    // ── 3. Submit order via RPC (atomic, SECURITY DEFINER) ───────────────
    const submitOrder = async () => {
        if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
            toast({
                title: "Please fill all fields",
                variant: "destructive",
            });
            return;
        }

        const items = Object.entries(cart).map(([productId, qty]) => {
            const p = products.find(x => x.id === productId);
            return {
                product_id: productId,
                quantity: qty,
                price_at_time: p?.price ?? 0,
            };
        });

        setIsSubmitting(true);
        try {
            const { error } = await (supabase as any).rpc("place_online_order", {
                p_store_id: storeId,
                p_customer_name: customerName.trim(),
                p_customer_phone: customerPhone.trim(),
                p_customer_address: customerAddress.trim(),
                p_total_amount: cartTotal,
                p_items: items,
            });

            if (error) throw error;

            setSubmittedName(customerName.trim());
            setOrderComplete(true);
            setCart({});
            setIsCheckoutOpen(false);
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
        } catch (err: any) {
            console.error("[Storefront] Order error:", err);
            toast({
                title: "Couldn't place order",
                description: err?.message ?? "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────
    if (isLoadingStore) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading store…</p>
                </div>
            </div>
        );
    }

    // ── Store not found ───────────────────────────────────────────────────
    if (isStoreFetched && !storeProfile) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-center">
                <div className="bg-white rounded-2xl shadow-sm border p-12 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Store Not Found</h1>
                    <p className="text-muted-foreground text-sm">
                        This store link is invalid or the store is currently offline. Please verify the
                        URL and try again.
                    </p>
                </div>
            </div>
        );
    }

    // ── Order success ─────────────────────────────────────────────────────
    if (orderComplete) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-center">
                <div className="bg-white rounded-2xl shadow-sm border p-12 max-w-md w-full">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Order Placed! 🎉</h1>
                    <p className="text-muted-foreground text-sm mb-8">
                        Thanks <strong>{submittedName}</strong>! Your order has been received. The store
                        will contact you shortly to arrange delivery.
                    </p>
                    <Button
                        className="w-full"
                        onClick={() => setOrderComplete(false)}
                    >
                        Continue Shopping
                    </Button>
                </div>
            </div>
        );
    }

    // Merge: RPC data takes priority, direct branding query fills any gaps
    const businessName =
        storeProfile?.business_name ||
        brandingData?.business_name ||
        storeProfile?.display_name ||
        "My Store";
    const storeName = businessName.toLowerCase().includes("online store")
        ? businessName
        : `${businessName} Online Store`;
    const businessLogo = storeProfile?.business_logo || brandingData?.business_logo || null;
    const logoInitial = businessName.charAt(0).toUpperCase();

    // ── Main store UI ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-28">
            {/* ── Header ── */}
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-3">
                        {/* Business logo or fallback initial */}
                        {businessLogo ? (
                            <img
                                src={businessLogo}
                                alt={businessName}
                                className="w-9 h-9 rounded-xl object-contain border bg-white shadow-sm flex-shrink-0"
                                onError={e => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                    (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                                }}
                            />
                        ) : null}
                        <div
                            className={`w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0 ${businessLogo ? "hidden" : ""}`}
                        >
                            {logoInitial}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-sm leading-tight truncate">{storeName}</p>
                            <p className="text-xs text-muted-foreground">
                                {products.length} product{products.length !== 1 ? "s" : ""} available
                            </p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="rounded-full relative gap-2 pl-3 pr-4"
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={cartCount === 0}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="font-semibold">{formatCurrency(cartTotal)}</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold px-1 shadow">
                                {cartCount}
                            </span>
                        )}
                    </Button>
                </div>
            </header>

            {/* ── Product grid ── */}
            <main className="container mx-auto px-4 py-8 max-w-6xl">
                {isLoadingProducts ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div
                                key={i}
                                className="bg-white rounded-xl border shadow-sm overflow-hidden animate-pulse"
                            >
                                <div className="h-48 bg-slate-100" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-xl border shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PackageOpen className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No products yet</h3>
                        <p className="text-muted-foreground text-sm">
                            Check back soon — this store is stocking up!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                qty={cart[product.id] ?? 0}
                                formatCurrency={formatCurrency}
                                onAdd={() => handleAdd(product.id)}
                                onRemove={() => handleRemove(product.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Mobile sticky cart bar ── */}
            {cartCount > 0 && (
                <div className="fixed bottom-4 inset-x-4 z-40 md:hidden">
                    <Button
                        className="w-full h-14 rounded-2xl shadow-xl text-sm font-semibold flex items-center justify-between px-5"
                        onClick={() => setIsCheckoutOpen(true)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="bg-white/25 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
                                {cartCount}
                            </span>
                            <span>View Cart</span>
                        </div>
                        <span>{formatCurrency(cartTotal)}</span>
                    </Button>
                </div>
            )}

            {/* ── Checkout dialog ── */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-[460px] flex flex-col max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Your Order
                        </DialogTitle>
                        <DialogDescription>
                            Fill in your details and we'll arrange delivery.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 py-2">
                        {/* Order summary */}
                        <div className="bg-slate-50 rounded-xl border p-4 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Order Summary
                            </p>
                            {Object.entries(cart).map(([pid, qty]) => {
                                const p = products.find(x => x.id === pid);
                                if (!p) return null;
                                return (
                                    <div key={pid} className="flex justify-between text-sm">
                                        <span className="flex items-center gap-2 min-w-0">
                                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {qty}
                                            </span>
                                            <span className="truncate">{p.name}</span>
                                        </span>
                                        <span className="font-semibold ml-2 flex-shrink-0">
                                            {formatCurrency(p.price * qty)}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="border-t pt-3 mt-2 flex justify-between font-bold text-base">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(cartTotal)}</span>
                            </div>
                        </div>

                        {/* Customer details */}
                        <div className="space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Your Details
                            </p>
                            <div className="space-y-1.5">
                                <Label htmlFor="cx_name">
                                    Full Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="cx_name"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="e.g. Priya Sharma"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cx_phone">
                                    Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="cx_phone"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={e => setCustomerPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cx_addr">
                                    Delivery Address <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="cx_addr"
                                    value={customerAddress}
                                    onChange={e => setCustomerAddress(e.target.value)}
                                    placeholder="Flat/House no., Street, City, PIN"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4 flex-shrink-0 gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsCheckoutOpen(false)}
                            disabled={isSubmitting}
                        >
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={submitOrder}
                            disabled={
                                isSubmitting ||
                                !customerName.trim() ||
                                !customerPhone.trim() ||
                                !customerAddress.trim()
                            }
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Placing…
                                </span>
                            ) : (
                                `Place Order · ${formatCurrency(cartTotal)}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Extracted product card ────────────────────────────────────────────────
function ProductCard({
    product,
    qty,
    formatCurrency,
    onAdd,
    onRemove,
}: {
    product: StoreProduct;
    qty: number;
    formatCurrency: (n: number) => string;
    onAdd: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            {/* Image */}
            <div className="w-full h-48 bg-slate-100 relative overflow-hidden flex-shrink-0">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={e => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <PackageOpen className="w-12 h-12 text-slate-300" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2">
                    {product.name}
                </h3>
                {product.online_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 flex-1">
                        {product.online_description}
                    </p>
                )}

                <div className="mt-auto pt-3 border-t flex items-center justify-between">
                    <div>
                        <span className="font-bold text-base text-primary">
                            {formatCurrency(product.price)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">/{product.unit}</span>
                    </div>

                    {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-1.5 py-1">
                            <button
                                onClick={onRemove}
                                className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50 transition-colors"
                                aria-label="Remove from cart"
                            >
                                <Minus className="w-3 h-3 text-primary" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-primary">
                                {qty}
                            </span>
                            <button
                                onClick={onAdd}
                                className="w-6 h-6 rounded-full bg-primary shadow flex items-center justify-center hover:opacity-90 transition-opacity"
                                aria-label="Add to cart"
                            >
                                <Plus className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ) : (
                        <Button size="sm" onClick={onAdd} className="rounded-full px-4 text-xs h-8">
                            Add
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
