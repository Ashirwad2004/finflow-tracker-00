import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import axios from "axios";
import { useToast } from "@/core/hooks/use-toast";
import { useSmartSearch, useAiProductSearch } from "@/core/hooks/useRecommendations";
import { useStorefrontInventoryRealtime } from "@/core/hooks/useStorefrontInventoryRealtime";
import {
    useStorefrontOrdersRealtime,
    loadCustomerOrderIds,
    isOrderDeclined,
} from "@/core/hooks/useStorefrontOrdersRealtime";
import { StoreProduct } from "../ProductCard";
import { StoreProfile, StoreBrandingData } from "../components/customer";

export function useStorefrontData() {
    const { storeSlug } = useParams<{ storeSlug: string }>();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

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

    // Payment integration states
    const [isPaymentPortalOpen, setIsPaymentPortalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);

    // Payment retry order ID
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
                    free_delivery_min_amount: 1000,
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

    // Fetch merchant details
    const { data: merchantProfile } = useQuery({
        queryKey: ["merchantProfile", storeId],
        queryFn: async () => {
            if (!storeId) return null;
            if (storeId === "demo-user-id") {
                return {
                    business_name: "Aroma Coffee Roasters Ltd.",
                    business_address: "123 Gourmet Coffee Blvd, Roast City, RC 560001",
                    business_phone: "+91 98765 43210",
                    gst_number: "29AAAAA1111A1Z1",
                    signature_url: null,
                    business_logo: null,
                };
            }
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("business_name, business_address, business_phone, gst_number, business_logo, signature_url, display_name")
                .eq("user_id", storeId)
                .single();
            if (error) {
                console.error("Error fetching merchant profile:", error);
                return null;
            }
            return data;
        },
        enabled: !!storeId,
    });

    // Auto-load payment retry if query parameter (?retryOrder=xxx) is set
    useEffect(() => {
        if (retryOrderId && storeId) {
            const initRetry = async () => {
                try {
                    const { data: order, error } = await (supabase as any)
                        .from("online_orders")
                        .select("*")
                        .eq("id", retryOrderId)
                        .single();

                    if (error || !order) throw new Error("Order not found");

                    setSelectedOrderForPayment({
                        id: order.id,
                        total_amount: order.total_amount,
                        customer_name: order.customer_name,
                        customer_phone: order.customer_phone,
                    });
                    setIsPaymentPortalOpen(true);
                } catch (err) {
                    console.error("Failed to load order for retry:", err);
                    toast({
                        title: "Retry failed",
                        description: "Could not load the requested order to retry payment.",
                        variant: "destructive",
                    });
                }
            };
            initRetry();
        }
    }, [retryOrderId, storeId, toast]);

    const { data: brandingData } = useQuery<StoreBrandingData | null>({
        queryKey: ["publicStoreBranding", storeId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("business_name, business_logo, delivery_charge, free_delivery_min_amount, upi_id, online_payment_enabled")
                .eq("user_id", storeId)
                .maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!storeId,
        staleTime: 30_000,
    });

    // Live inventory via realtime + polling fallback
    useStorefrontInventoryRealtime(storeId);

    const { data: products = [], isLoading: isLoadingProducts } = useQuery<StoreProduct[]>({
        queryKey: ["publicStoreProducts", storeId],
        queryFn: async () => {
            if (storeId === "demo-user-id") {
                return [
                    {
                        id: "coffee-beans-id",
                        user_id: "demo-user-id",
                        name: "Aroma Organic Coffee Beans (500g)",
                        price: 599,
                        unit: "pack",
                        image_url: "/coffee-beans.png",
                        online_description: "Rich organic roasted coffee beans.",
                        stock_quantity: 15,
                    },
                    {
                        id: "thermal-flask-id",
                        user_id: "demo-user-id",
                        name: "Premium Thermal Flask (750ml)",
                        price: 1299,
                        unit: "piece",
                        image_url: "/thermal-flask.png",
                        online_description: "Stainless steel thermal insulated flask.",
                        stock_quantity: 8,
                    },
                ];
            }
            const { data, error } = await (supabase as any).rpc("get_public_store_products", { p_store_id: storeId });
            if (error) {
                console.error("Failed to load online products:", error);
                throw new Error(`Could not load online products: ${error.message}`);
            }
            return (Array.isArray(data) ? data : []) as StoreProduct[];
        },
        enabled: !!storeId,
        staleTime: 5_000,
        refetchInterval: 15_000,
    });

    const getStock = (productId: string) => {
        const stock = products.find((p) => p.id === productId)?.stock_quantity;
        return typeof stock === "number" ? Math.max(0, stock) : 0;
    };

    const canAddOne = (id: string) => {
        const stock = getStock(id);
        if (stock <= 0) return false;
        return (cart[id] || 0) < stock;
    };

    // Keep cart in sync when stock drops
    useEffect(() => {
        if (!products.length) return;
        setCart((prev) => {
            let changed = false;
            const next = { ...prev };
            const removed: string[] = [];
            const reduced: string[] = [];

            for (const [id, qty] of Object.entries(prev)) {
                const stock = getStock(id);
                const p = products.find((prod) => prod.id === id);
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
    }, [products, toast]);

    // Cart actions
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
        setCart((p) => ({ ...p, [id]: current + 1 }));
    };

    const handleRemove = (id: string) =>
        setCart((p) => {
            if ((p[id] || 0) <= 1) {
                const { [id]: _, ...r } = p;
                return r;
            }
            return { ...p, [id]: p[id] - 1 };
        });

    const handleClear = (id: string) =>
        setCart((p) => {
            const { [id]: _, ...r } = p;
            return r;
        });

    const cartTotal = useMemo(
        () => Object.entries(cart).reduce((s, [id, qty]) => s + (products.find((x) => x.id === id)?.price ?? 0) * qty, 0),
        [cart, products]
    );
    const cartCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

    const deliveryChargeRaw = Number(brandingData?.delivery_charge ?? storeProfile?.delivery_charge) || 0;
    const freeDeliveryThreshold = Number(brandingData?.free_delivery_min_amount ?? storeProfile?.free_delivery_min_amount) || 0;
    const effectiveDeliveryCharge =
        deliveryChargeRaw > 0 && freeDeliveryThreshold > 0 && cartTotal >= freeDeliveryThreshold ? 0 : deliveryChargeRaw;

    // Submit order
    const submitOrder = async (name: string, phone: string, address: string, paymentMethod: "cod" | "online") => {
        const items = Object.entries(cart).map(([productId, qty]) => ({
            product_id: productId,
            quantity: qty,
            price_at_time: products.find((x) => x.id === productId)?.price ?? 0,
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
                        customer_phone: phone,
                    });
                    setIsCartOpen(false);
                    setIsPaymentPortalOpen(true);
                } else {
                    setOrderStatus("pending");
                    setOrderComplete(true);
                    setCart({});
                    setIsCartOpen(false);

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

            if (!storeId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId)) {
                throw new Error("This store is not configured correctly. Please contact the store owner.");
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
                    customer_phone: phone,
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

    // Live order tracking
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

    useEffect(() => {
        setCustomerOrderIds(loadCustomerOrderIds());
    }, [storeSlug, isOrdersOpen]);

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
        return () => {
            cancelled = true;
        };
    }, [trackedOrderId]);

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

    const { data: smartSearchResults = [] } = useSmartSearch(search, storeId);
    const { data: aiSearchResult, isFetching: isAiSearching } = useAiProductSearch(search, storeId, products);

    const filteredProducts = useMemo(() => {
        if (search.trim()) {
            if (aiSearchResult?.products?.length) {
                return aiSearchResult.products;
            }
            if (smartSearchResults.length) {
                return smartSearchResults.slice(0, 12);
            }
            const query = search.trim().toLowerCase();
            return products
                .filter(
                    (p) =>
                        p.name.toLowerCase().includes(query) ||
                        (p.category && p.category.toLowerCase().includes(query)) ||
                        (p.online_description && p.online_description.toLowerCase().includes(query))
                )
                .slice(0, 12);
        }
        return products;
    }, [search, aiSearchResult, smartSearchResults, products]);

    const businessName =
        storeProfile?.business_name || brandingData?.business_name || storeProfile?.display_name || "My Store";
    const businessLogo = storeProfile?.business_logo || brandingData?.business_logo || null;

    const handlePaymentClose = async () => {
        if (!selectedOrderForPayment) {
            setIsPaymentPortalOpen(false);
            return;
        }
        setIsPaymentPortalOpen(false);
        const orderId = selectedOrderForPayment.id;
        setSelectedOrderForPayment(null);

        try {
            await axios.post("/api/v1/payments/cancel-order", {
                orderId,
                customerPhone: selectedOrderForPayment.customer_phone,
            });
            toast({
                title: "Payment Cancelled / Aborted",
                description: "Your online payment was cancelled. Your items are still in your cart.",
                variant: "destructive",
            });
        } catch (err) {
            console.error("Failed to cancel order on payment close:", err);
        }

        setIsCartOpen(true);
    };

    const handlePaymentSuccess = (paymentId: string) => {
        const orderId = selectedOrderForPayment?.id;
        setIsPaymentPortalOpen(false);
        setSelectedOrderForPayment(null);
        setCart({});
        navigate(`/store/${storeSlug}/payment-success?paymentId=${paymentId}&orderId=${orderId}`);
    };

    return {
        storeSlug,
        storeProfile,
        isLoadingStore,
        isStoreFetched,
        storeError,
        storeId,
        merchantProfile,
        brandingData,
        businessName,
        businessLogo,
        products,
        isLoadingProducts,
        cart,
        setCart,
        handleAdd,
        handleRemove,
        handleClear,
        canAddOne,
        cartTotal,
        cartCount,
        deliveryChargeRaw,
        freeDeliveryThreshold,
        effectiveDeliveryCharge,
        submitOrder,
        isSubmitting,
        orderComplete,
        setOrderComplete,
        trackedOrderId,
        setTrackedOrderId,
        orderStatus,
        submittedName,
        customerOrderIds,
        isCartOpen,
        setIsCartOpen,
        isOrdersOpen,
        setIsOrdersOpen,
        isPaymentPortalOpen,
        setIsPaymentPortalOpen,
        selectedOrderForPayment,
        setSelectedOrderForPayment,
        handlePaymentClose,
        handlePaymentSuccess,
        search,
        setSearch,
        filteredProducts,
        isAiSearching,
        aiSearchResult,
    };
}
