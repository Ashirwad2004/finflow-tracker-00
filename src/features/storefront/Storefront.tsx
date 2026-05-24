import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import {
    ShoppingBag,
    PackageOpen,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Star,
    Zap,
    ArrowRight,
    Store,
    Truck,
    Shield,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useTrendingProducts, useSmartSearch, usePersonalizedRecommendations } from "@/core/hooks/useRecommendations";
import { useStorefrontInventoryRealtime } from "@/core/hooks/useStorefrontInventoryRealtime";
import {
    useStorefrontOrdersRealtime,
    loadCustomerOrderIds,
    isOrderDeclined,
} from "@/core/hooks/useStorefrontOrdersRealtime";
import { ProductCard, StoreProduct } from "./ProductCard";
import { CartDrawer } from "./CartDrawer";
import { OrdersDrawer } from "./OrdersDrawer";
import { PaymentPortal } from "./components/PaymentPortal";

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



// ─── Main Storefront ───────────────────────────────────────────────────────────
export default function Storefront() {
    const { storeSlug } = useParams<{ storeSlug: string }>();
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();

    const [cart, setCart] = useState<Record<string, number>>({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
    const [orderStatus, setOrderStatus] = useState<string>("pending");
    const [submittedName, setSubmittedName] = useState("");
    const [search, setSearch] = useState("");
    const [customerOrderIds, setCustomerOrderIds] = useState<string[]>(loadCustomerOrderIds);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Payment integration states
    const [isPaymentPortalOpen, setIsPaymentPortalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);

    // Payment retry order ID (read from query params, used in useEffect below after storeId is declared)
    const retryOrderId = searchParams.get("retryOrder");

    const notifyOrderStatus = (status: string) => {
        if (status === "accepted") {
            toast({ title: "Order Accepted! 🎉", description: "The store has accepted your order." });
        } else if (status === "completed") {
            toast({ title: "Order Completed! ✅", description: "Your order is ready." });
        } else if (isOrderDeclined(status)) {
            toast({
                title: "Order Rejected",
                description: "Your order could not be fulfilled. Stock has been restored.",
                variant: "destructive",
            });
        }
    };

    // ── Fetch store profile ────────────────────────────────────────────────
    const {
        data: storeProfile,
        isLoading: isLoadingStore,
        isFetched: isStoreFetched,
        error: storeError,
    } = useQuery<StoreProfile | null>({
        queryKey: ["publicStoreProfile", storeSlug],
        queryFn: async () => {
            if (storeSlug === "aroma-coffee") {
                return {
                    user_id: "demo-user-id",
                    display_name: "Aroma Coffee Roasters",
                    store_slug: "aroma-coffee",
                    is_store_active: true,
                    business_name: "Aroma Coffee Roasters",
                    business_logo: null,
                    delivery_charge: 49,
                    free_delivery_min_amount: 1000
                };
            }
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

    // Auto-load payment retry if query parameter (?retryOrder=xxx) is set
    useEffect(() => {
        if (retryOrderId && storeId) {
            const initRetry = async () => {
                try {
                    const { data: order, error } = await supabase
                        .from("online_orders")
                        .select("*")
                        .eq("id", retryOrderId)
                        .single();

                    if (error || !order) throw new Error("Order not found");

                    setSelectedOrderForPayment({
                        id: order.id,
                        total_amount: order.total_amount,
                        customer_name: order.customer_name,
                        customer_phone: order.customer_phone
                    });
                    setIsPaymentPortalOpen(true);
                } catch (err) {
                    console.error("Failed to load order for retry:", err);
                    toast({
                        title: "Retry failed",
                        description: "Could not load the requested order to retry payment.",
                        variant: "destructive"
                    });
                }
            };
            initRetry();
        }
    }, [retryOrderId, storeId]);

    const { data: brandingData } = useQuery<{ business_name: string | null; business_logo: string | null; delivery_charge: number | null; free_delivery_min_amount: number | null; upi_id: string | null; online_payment_enabled: boolean | null } | null>({
        queryKey: ["publicStoreBranding", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles").select("business_name, business_logo, delivery_charge, free_delivery_min_amount, upi_id, online_payment_enabled")
                .eq("user_id", storeId).maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // ── Fetch products (live inventory via realtime + polling fallback) ───
    useStorefrontInventoryRealtime(storeId);

    const { data: products = [], isLoading: isLoadingProducts } = useQuery<StoreProduct[]>({
        queryKey: ["publicStoreProducts", storeId],
        queryFn: async () => {
            if (storeId === "demo-user-id") {
                return [
                    {
                        id: "coffee-beans-id",
                        name: "Aroma Organic Coffee Beans (500g)",
                        price: 599,
                        stock_quantity: 15,
                        image_url: null,
                        category: "Coffee"
                    },
                    {
                        id: "thermal-flask-id",
                        name: "Premium Thermal Flask (750ml)",
                        price: 1299,
                        stock_quantity: 8,
                        image_url: null,
                        category: "Flasks"
                    }
                ];
            }
            const { data, error } = await (supabase as any).rpc("get_public_store_products", { p_store_id: storeId });
            if (error) return [];
            return (Array.isArray(data) ? data : []) as StoreProduct[];
        },
        enabled: !!storeId,
        staleTime: 5_000,
        refetchInterval: 15_000,
    });

    const getStock = (productId: string) => {
        const stock = products.find(p => p.id === productId)?.stock_quantity;
        return typeof stock === "number" ? Math.max(0, stock) : 0;
    };

    const canAddOne = (id: string) => {
        const stock = getStock(id);
        if (stock <= 0) return false;
        return (cart[id] || 0) < stock;
    };

    // Keep cart in sync when stock drops (another customer, invoice, or admin edit)
    useEffect(() => {
        if (!products.length) return;
        setCart(prev => {
            let changed = false;
            const next = { ...prev };
            const removed: string[] = [];
            const reduced: string[] = [];

            for (const [id, qty] of Object.entries(prev)) {
                const stock = getStock(id);
                const p = products.find(prod => prod.id === id);
                const name = p?.name ?? "An item";

                if (stock <= 0) {
                    delete next[id];
                    removed.push(name);
                    changed = true;
                } else if (qty > stock) {
                    next[id] = stock;
                    reduced.push(`${name} (max ${stock} available)`);
                    changed = true;
                }
            }

            if (changed) {
                if (removed.length > 0) {
                    toast({
                        title: "Item Sold Out",
                        description: `${removed.join(", ")} ${removed.length === 1 ? "was" : "were"} removed from your cart because they sold out.`,
                        variant: "destructive",
                    });
                }
                if (reduced.length > 0) {
                    toast({
                        title: "Stock Level Adjusted",
                        description: `The quantity of ${reduced.join(", ")} was adjusted to match current stock limits.`,
                    });
                }
            }

            return changed ? next : prev;
        });
    }, [products]);

    // ── Cart helpers ───────────────────────────────────────────────────────
    const handleAdd = (id: string) => {
        const stock = getStock(id);
        const current = cart[id] || 0;
        if (stock <= 0) {
            toast({
                title: "Out of stock",
                description: "This item is currently unavailable.",
                variant: "destructive",
            });
            return;
        }
        if (current >= stock) {
            toast({
                title: "Maximum quantity reached",
                description: stock === 1 ? "Only 1 left in stock." : `Only ${stock} available.`,
            });
            return;
        }
        setCart(p => ({ ...p, [id]: current + 1 }));
    };
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
    const submitOrder = async (name: string, phone: string, address: string, paymentMethod: "cod" | "online") => {
        const items = Object.entries(cart).map(([productId, qty]) => ({
            product_id: productId,
            quantity: qty,
            price_at_time: products.find(x => x.id === productId)?.price ?? 0,
        }));
        setIsSubmitting(true);
        try {
            if (storeId === "demo-user-id") {
                const orderId = `DEMO-ORD-${Math.floor(1000 + Math.random() * 9000)}`;
                setSubmittedName(name);
                setTrackedOrderId(orderId);
                
                if (paymentMethod === "online") {
                    setSelectedOrderForPayment({
                        id: orderId,
                        total_amount: cartTotal + effectiveDeliveryCharge,
                        customer_name: name,
                        customer_phone: phone
                    });
                    setIsCartOpen(false);
                    setIsPaymentPortalOpen(true);
                } else {
                    setOrderStatus("pending");
                    setOrderComplete(true);
                    setCart({});
                    setIsCartOpen(false);
                    
                    // Auto simulation transitions
                    setTimeout(() => {
                        setOrderStatus("accepted");
                        notifyOrderStatus("accepted");
                    }, 3000);

                    setTimeout(() => {
                        setOrderStatus("completed");
                        notifyOrderStatus("completed");
                    }, 8000);
                }
                setIsSubmitting(false);
                return;
            }

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
            
            // Save order ID to localStorage for order history + live tracking
            try {
                const currentOrders = loadCustomerOrderIds();
                if (!currentOrders.includes(orderId)) {
                    const next = [orderId, ...currentOrders];
                    localStorage.setItem("storefront_orders", JSON.stringify(next));
                    setCustomerOrderIds(next);
                }
            } catch (e) {
                console.error("Could not save order to history");
            }

            if (paymentMethod === "online") {
                setSelectedOrderForPayment({
                    id: orderId,
                    total_amount: cartTotal + effectiveDeliveryCharge,
                    customer_name: name,
                    customer_phone: phone
                });
                setIsCartOpen(false);
                setIsPaymentPortalOpen(true);
            } else {
                setSubmittedName(name);
                setTrackedOrderId(orderId);
                setOrderStatus("pending");
                setOrderComplete(true);
                setCart({});
                setIsCartOpen(false);
            }

        } catch (err: any) {
            const msg = err?.message ?? "Please try again.";
            toast({
                title: msg.toLowerCase().includes("stock") ? "Stock unavailable" : "Couldn't place order",
                description: msg,
                variant: "destructive",
            });
            if (storeId) {
                queryClient.invalidateQueries({ queryKey: ["publicStoreProducts", storeId] });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Live order tracking (all saved orders + active checkout order) ───────
    const watchedOrderIds = useMemo(() => {
        const ids = new Set(customerOrderIds);
        if (trackedOrderId) ids.add(trackedOrderId);
        return [...ids];
    }, [customerOrderIds, trackedOrderId]);

    useStorefrontOrdersRealtime(watchedOrderIds, {
        onOrderStatusChange: (orderId, status) => {
            if (orderId === trackedOrderId) {
                setOrderStatus(status);
                notifyOrderStatus(status);
            }
            if (isOrderDeclined(status) && storeId) {
                queryClient.invalidateQueries({ queryKey: ["publicStoreProducts", storeId] });
            }
        },
    });

    // Sync saved order IDs when returning to the store or opening order history
    useEffect(() => {
        setCustomerOrderIds(loadCustomerOrderIds());
    }, [storeSlug, isOrdersOpen]);

    // Fetch current status immediately (covers missed events before subscription connects)
    useEffect(() => {
        if (!trackedOrderId || trackedOrderId.startsWith("DEMO-ORD-")) return;
        let cancelled = false;
        (async () => {
            const { data } = await (supabase as any).rpc("get_customer_orders", {
                p_order_ids: [trackedOrderId],
            });
            if (!cancelled && data?.[0]?.status) {
                setOrderStatus(data[0].status);
            }
        })();
        return () => { cancelled = true; };
    }, [trackedOrderId]);

    // Polling fallback while the live tracking screen is open
    useEffect(() => {
        if (!orderComplete || !trackedOrderId || trackedOrderId.startsWith("DEMO-ORD-")) return;
        const poll = async () => {
            const { data } = await (supabase as any).rpc("get_customer_orders", {
                p_order_ids: [trackedOrderId],
            });
            const latest = data?.[0]?.status;
            if (latest) {
                setOrderStatus((prev) => (prev !== latest ? latest : prev));
            }
        };
        const interval = setInterval(poll, 8_000);
        return () => clearInterval(interval);
    }, [orderComplete, trackedOrderId]);

    const savedPhone = useMemo(() => {
        try { return localStorage.getItem('storefront_phone') || ''; } catch { return ''; }
    }, []);

    const { data: smartSearchResults = [] } = useSmartSearch(search, storeId);
    const { data: trendingProducts = [], isLoading: isTrendingLoading } = useTrendingProducts(storeId);
    const { data: personalizedRecs = [] } = usePersonalizedRecommendations(savedPhone, storeId);

    const filteredProducts = useMemo(() => {
        if (search.trim()) {
            return smartSearchResults.slice(0, 12);
        }
        return products;
    }, [search, smartSearchResults, products]);

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
                        {isOrderDeclined(orderStatus) && (
                            <div className="relative w-24 h-24 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                                <AlertCircle className="w-12 h-12 text-white" />
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 mb-2">
                        {orderStatus === "pending" && "Order Placed!"}
                        {orderStatus === "accepted" && "Order Accepted!"}
                        {orderStatus === "completed" && "Order Completed!"}
                        {isOrderDeclined(orderStatus) && "Order Rejected"}
                    </h1>
                    
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                        {orderStatus === "pending" && `Thank you, ${submittedName}! Waiting for the store to accept your order...`}
                        {orderStatus === "accepted" && "The store is now preparing your order. It will be on its way soon!"}
                        {orderStatus === "completed" && "Your order has been successfully completed. Enjoy!"}
                        {isOrderDeclined(orderStatus) && "Unfortunately, your order could not be fulfilled at this time."}
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

    // ── Smart Search & Recommendations ─────────────────────────────────────
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
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {products.filter(p => (p.stock_quantity ?? 0) > 0).length} in stock
                                    {products.some(p => (p.stock_quantity ?? 0) <= 0) && ` · ${products.filter(p => (p.stock_quantity ?? 0) <= 0).length} out of stock`}
                                </p>
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
                                canAddMore={canAddOne(product.id)}
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
                canAddOne={canAddOne}
                onClearItem={handleClear}
                onSubmit={submitOrder}
                isSubmitting={isSubmitting}
                onlinePaymentEnabled={brandingData?.online_payment_enabled === true}
            />

            {/* ── Orders Drawer ── */}
            <OrdersDrawer
                open={isOrdersOpen}
                onClose={() => setIsOrdersOpen(false)}
                formatCurrency={formatCurrency}
                storeId={storeId}
                savedOrderIds={customerOrderIds}
                onPayOrder={(order) => {
                    setSelectedOrderForPayment({
                        id: order.id,
                        total_amount: order.total_amount,
                        customer_name: order.customer_name,
                        customer_phone: order.customer_phone
                    });
                    setIsOrdersOpen(false);
                    setIsPaymentPortalOpen(true);
                }}
            />

            {/* ── Payment Portal Modal ── */}
            {selectedOrderForPayment && (
                <PaymentPortal
                    isOpen={isPaymentPortalOpen}
                    onClose={() => {
                        setIsPaymentPortalOpen(false);
                        setSelectedOrderForPayment(null);
                        setCart({});
                        setSubmittedName(selectedOrderForPayment.customer_name);
                        setTrackedOrderId(selectedOrderForPayment.id);
                        setOrderStatus("pending");
                        setOrderComplete(true);
                    }}
                    orderId={selectedOrderForPayment.id}
                    amount={selectedOrderForPayment.total_amount}
                    currency="INR"
                    storeName={businessName}
                    customerName={selectedOrderForPayment.customer_name}
                    customerPhone={selectedOrderForPayment.customer_phone}
                    storeUpiId={brandingData?.upi_id || undefined}
                    onPaymentSuccess={(paymentId, invoiceNumber) => {
                        setIsPaymentPortalOpen(false);
                        setSelectedOrderForPayment(null);
                        setCart({});
                        navigate(`/store/${storeSlug}/payment-success?paymentId=${paymentId}&orderId=${selectedOrderForPayment.id}`);
                    }}
                />
            )}
        </div>
    );
}

