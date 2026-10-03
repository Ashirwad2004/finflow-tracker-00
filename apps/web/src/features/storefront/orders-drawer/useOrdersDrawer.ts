import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { generateInvoicePDF } from "@/core/utils/invoiceGenerator";
import { OrderRecord } from "./types";

export function useOrdersDrawer(
  open: boolean,
  storeId: string | null,
  savedOrderIds: string[],
  merchantProfile?: any
) {
  const queryClient = useQueryClient();
  const savedOrderIdsKey = savedOrderIds.join(",");

  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState<OrderRecord | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [returnPreview, setReturnPreview] = useState<string | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Re-read phone when drawer opens or when order list changes
  const savedPhone = useMemo(() => {
    try {
      return localStorage.getItem("storefront_phone") || "";
    } catch {
      return "";
    }
  }, [open, savedOrderIdsKey]);

  const isWithin24Hours = (dateStr: string): boolean => {
    if (!dateStr) return false;
    try {
      const orderTime = new Date(dateStr).getTime();
      const nowTime = new Date().getTime();
      const hoursDiff = (nowTime - orderTime) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    } catch {
      return false;
    }
  };

  // Primary: Fetch by phone (works across browsers/devices)
  // Fallback: Fetch by order IDs (legacy support)
  const { data: orders, isLoading, error: queryError } = useQuery<OrderRecord[]>({
    queryKey: ["orderHistory", savedPhone, savedOrderIdsKey, storeId],
    queryFn: async () => {
      let fetchedOrders: any[] = [];
      // Try phone-based lookup first (cross-device support)
      if (savedPhone && savedPhone.trim()) {
        const { data, error } = await (supabase as any).rpc("get_orders_by_phone", {
          p_phone: savedPhone.trim(),
          p_store_id: storeId || null,
        });
        if (error) {
          console.error("RPC error fetching orders by phone:", error);
        } else if (data && data.length > 0) {
          fetchedOrders = data;
        }
      }

      if (fetchedOrders.length === 0 && savedOrderIds.length > 0) {
        // Fallback: Fetch by order IDs
        const { data, error } = await (supabase as any).rpc("get_customer_orders", {
          p_order_ids: savedOrderIds,
        });
        if (error) {
          console.error("RPC error fetching orders by ID:", error);
          throw error;
        }
        fetchedOrders = data || [];
      }

      if (fetchedOrders.length === 0) return [];

      // Query payment records for these orders
      const orderIds = fetchedOrders.map((o: any) => o.id);
      const { data: payments } = await (supabase as any)
        .from("payments")
        .select("*, invoices(invoice_number)")
        .in("order_id", orderIds);

      const paymentsMap = new Map();
      if (payments) {
        payments.forEach((p: any) => {
          paymentsMap.set(p.order_id, p);
        });
      }

      // Query return records for these orders
      const returnsMap = new Map();
      try {
        const { data: returns, error: returnsError } = await (supabase as any)
          .from("order_returns")
          .select("*")
          .in("order_id", orderIds);
        if (returnsError) {
          console.error("Error fetching returns for drawer:", returnsError);
        } else if (returns) {
          returns.forEach((r: any) => {
            returnsMap.set(r.order_id, r);
          });
        }
      } catch (err) {
        console.error("Failed to query order returns", err);
      }

      return fetchedOrders.map((o: any) => ({
        ...o,
        payment: paymentsMap.get(o.id) || null,
        returnRequest: returnsMap.get(o.id) || null,
      }));
    },
    enabled: !!(open && (savedPhone.trim() || savedOrderIds.length > 0)),
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
    refetchInterval: open ? 10_000 : false,
  });

  const handleDownloadInvoice = (order: OrderRecord, orderItems: any[]) => {
    let invoiceDate = new Date().toISOString().split("T")[0];
    try {
      if (order.created_at) {
        invoiceDate = new Date(order.created_at).toISOString().split("T")[0];
      }
    } catch {
      // keep fallback
    }

    const paymentMode = (
      order.payment?.payment_method || "Online"
    ).toUpperCase();
    const paymentStatus = (
      order.payment?.status === "success" ? "paid" : "pending"
    ) as "paid" | "pending";

    generateInvoicePDF({
      invoiceNumber:
        order.payment?.invoices?.invoice_number ||
        `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      date: invoiceDate,
      storeName:
        merchantProfile?.business_name ||
        merchantProfile?.display_name ||
        "RupeeBill Storefront",
      storeAddress: merchantProfile?.business_address || "Storefront Pickup",
      storePhone: merchantProfile?.business_phone || "",
      storeGst: merchantProfile?.gst_number || "",
      storeLogo: merchantProfile?.business_logo || "",
      storeSignature: merchantProfile?.signature_url || "",
      customerName: order.customer_name || "Valued Customer",
      customerPhone: order.customer_phone || "",
      customerAddress: order.customer_address || "Storefront Pickup",
      items: orderItems.map((it: any) => ({
        name: it.product_name || "Product Item",
        quantity: it.quantity || 1,
        price: Number(it.price_at_time || 0),
      })),
      subtotal:
        Number(order.total_amount) - Number(order.delivery_charge || 0),
      deliveryCharge: Number(order.delivery_charge || 0),
      totalAmount: Number(order.total_amount),
      paymentMethod: paymentMode,
      status: paymentStatus,
      orderId: order.id,
    });
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder || !returnReason.trim() || !returnFile) return;

    setIsSubmittingReturn(true);
    try {
      const fileExt = returnFile.name.split(".").pop();
      const fileName = `${returnOrder.id}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("return-images")
        .upload(fileName, returnFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("return-images").getPublicUrl(fileName);

      const { error: insertError } = await (supabase as any)
        .from("order_returns")
        .insert({
          order_id: returnOrder.id,
          reason: returnReason.trim(),
          image_url: publicUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      setIsReturnDialogOpen(false);
      setReturnOrder(null);
      setReturnReason("");
      setReturnFile(null);
      setReturnPreview(null);

      queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
    } catch (err) {
      console.error("Failed to submit return request:", err);
      alert("Error submitting return. Please try again.");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const openReturnModal = (order: OrderRecord) => {
    setReturnOrder(order);
    setReturnReason("");
    setReturnFile(null);
    setReturnPreview(null);
    setIsReturnDialogOpen(true);
  };

  return {
    orders,
    isLoading,
    queryError,
    savedPhone,
    isReturnDialogOpen,
    setIsReturnDialogOpen,
    returnReason,
    setReturnReason,
    returnPreview,
    setReturnFile,
    setReturnPreview,
    isSubmittingReturn,
    isWithin24Hours,
    handleDownloadInvoice,
    handleReturnSubmit,
    openReturnModal,
  };
}
