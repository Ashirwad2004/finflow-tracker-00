import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { PurchaseOrder } from "../../types/orders";
import { usePurchaseOrders, useDeletePurchaseOrder } from "../../hooks/useOrders";
import { generateOrderPDF, previewOrderPDF } from "@/utils/generateOrderPDF";
import { PurchaseOrderMetrics } from "./types";

export function usePurchaseOrderRegister(userId: string) {
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(userId);
  const deleteMutation = useDeletePurchaseOrder(userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<PurchaseOrder | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      const matchesSearch =
        order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_phone?.includes(searchTerm);

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      return order.status === statusFilter;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Metrics summary
  const metrics: PurchaseOrderMetrics = useMemo(() => {
    let totalValue = 0;
    let sentCount = 0;
    let sentValue = 0;
    let partialCount = 0;
    let receivedCount = 0;
    let totalExpectedUnits = 0;

    purchaseOrders.forEach((order) => {
      const val = Number(order.total_amount) || 0;
      totalValue += val;

      const items = order.items || [];
      const orderedQty = items.reduce(
        (acc, i) => acc + (Number(i.quantity) || 0),
        0
      );
      const receivedQty = items.reduce(
        (acc, i) => acc + (Number(i.received_qty) || 0),
        0
      );
      totalExpectedUnits += Math.max(0, orderedQty - receivedQty);

      if (order.status === "sent") {
        sentCount++;
        sentValue += val;
      } else if (order.status === "partially_received") {
        partialCount++;
      } else if (order.status === "received") {
        receivedCount++;
      }
    });

    return {
      totalCount: purchaseOrders.length,
      totalValue,
      sentCount,
      sentValue,
      partialCount,
      receivedCount,
      totalExpectedUnits,
    };
  }, [purchaseOrders]);

  const handleDelete = async (poId: string, poNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Purchase Order #${poNumber}?`)) {
      try {
        await deleteMutation.mutateAsync(poId);
        toast.success(`Purchase Order #${poNumber} deleted.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete Purchase Order");
      }
    }
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleDownloadPDF = async (order: PurchaseOrder) => {
    try {
      await generateOrderPDF(order, "purchase_order", profile);
      toast.success(`PDF downloaded for PO #${order.po_number}`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF slip");
    }
  };

  const handlePreviewPDF = async (order: PurchaseOrder) => {
    try {
      const url = await previewOrderPDF(order, "purchase_order", profile);
      if (url) {
        window.open(String(url), "_blank");
      }
    } catch (err) {
      console.error("PDF preview failed:", err);
      toast.error("Failed to preview PDF slip");
    }
  };

  return {
    purchaseOrders,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredOrders,
    metrics,
    handleDelete,
    handleDownloadPDF,
    handlePreviewPDF,
    isCreateOpen,
    setIsCreateOpen,
    editingOrder,
    setEditingOrder,
    receivingOrder,
    setReceivingOrder,
    timelineOrder,
    setTimelineOrder,
  };
}
