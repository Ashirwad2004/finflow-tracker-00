import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import axios from "axios";
import { useToast } from "@/core/hooks/use-toast";
import { useStorefrontInventoryRealtime } from "@/core/hooks/useStorefrontInventoryRealtime";
import { loadCustomerOrderIds } from "@/core/hooks/useStorefrontOrdersRealtime";
import { StoreProduct } from "../ProductCard";
import { useStorefrontProfiles } from "./useStorefrontProfiles";
import { useStorefrontCart } from "./useStorefrontCart";
import { useStorefrontOrderTracking } from "./useStorefrontOrderTracking";
import { useStorefrontSearch } from "./useStorefrontSearch";

export * from "./useStorefrontProfiles";
export * from "./useStorefrontCart";
export * from "./useStorefrontOrderTracking";
export * from "./useStorefrontSearch";

export function useStorefrontData() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment integration states
  const [isPaymentPortalOpen, setIsPaymentPortalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);

  // Payment retry order ID
  const retryOrderId = searchParams.get("retryOrder");

  // 1. Profiles & Branding
  const {
    storeProfile,
    isLoadingStore,
    isStoreFetched,
    storeError,
    storeId,
    merchantProfile,
    brandingData,
    businessName,
    businessLogo,
  } = useStorefrontProfiles(storeSlug);

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

  // 2. Realtime Inventory & Products Query
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

  // 3. Cart State
  const {
    cart,
    setCart,
    isCartOpen,
    setIsCartOpen,
    handleAdd,
    handleRemove,
    handleClear,
    canAddOne,
    cartTotal,
    cartCount,
    deliveryChargeRaw,
    freeDeliveryThreshold,
    effectiveDeliveryCharge,
  } = useStorefrontCart(products, storeProfile, brandingData);

  // 4. Order Tracking
  const {
    trackedOrderId,
    setTrackedOrderId,
    orderStatus,
    orderComplete,
    setOrderComplete,
    submittedName,
    setSubmittedName,
    customerOrderIds,
    notifyOrderStatus,
  } = useStorefrontOrderTracking(storeId, storeSlug, isOrdersOpen);

  // 5. Search & Recommendations
  const { search, setSearch, filteredProducts, isAiSearching, aiSearchResult } = useStorefrontSearch(
    storeId,
    products
  );

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
          setOrderComplete(true);
          setCart({});
          setIsCartOpen(false);

          setTimeout(() => {
            notifyOrderStatus("accepted");
          }, 3000);

          setTimeout(() => {
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
