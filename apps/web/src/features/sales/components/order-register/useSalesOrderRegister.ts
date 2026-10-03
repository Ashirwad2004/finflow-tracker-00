import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { SaleOrder } from "../../types/orders";
import {
  useSaleOrders,
  useDeleteSaleOrder,
  calculateOrderStockSummary,
} from "../../hooks/useOrders";
import { generateOrderPDF, previewOrderPDF } from "@/utils/generateOrderPDF";
import { SalesOrderMetrics } from "./types";

export function useSalesOrderRegister(userId: string) {
  const { data: saleOrders = [], isLoading } = useSaleOrders(userId);
  const deleteMutation = useDeleteSaleOrder(userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SaleOrder | null>(null);
  const [deliveringOrder, setDeliveringOrder] = useState<SaleOrder | null>(null);
  const [procuringOrder, setProcuringOrder] = useState<SaleOrder | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<SaleOrder | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return saleOrders.filter((order) => {
      const matchesSearch =
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_phone?.includes(searchTerm);

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      return order.status === statusFilter;
    });
  }, [saleOrders, searchTerm, statusFilter]);

  // Metrics summary
  const metrics: SalesOrderMetrics = useMemo(() => {
    let totalValue = 0;
    let confirmedCount = 0;
    let confirmedValue = 0;
    let partialCount = 0;
    let deliveredCount = 0;
    let totalReservedUnits = 0;

    saleOrders.forEach((order) => {
      const val = Number(order.total_amount) || 0;
      totalValue += val;

      const summary = calculateOrderStockSummary(order);
      totalReservedUnits += summary.reserved;

      if (order.status === "confirmed") {
        confirmedCount++;
        confirmedValue += val;
      } else if (order.status === "partially_delivered") {
        partialCount++;
      } else if (order.status === "delivered") {
        deliveredCount++;
      }
    });

    return {
      totalCount: saleOrders.length,
      totalValue,
      confirmedCount,
      confirmedValue,
      partialCount,
      deliveredCount,
      totalReservedUnits,
    };
  }, [saleOrders]);

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Sale Order #${orderNumber}?`)) {
      try {
        await deleteMutation.mutateAsync(orderId);
        toast.success(`Sale Order #${orderNumber} deleted.`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete order");
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

  const handleDownloadPDF = async (order: SaleOrder) => {
    try {
      await generateOrderPDF(order, "sale_order", profile);
      toast.success(`PDF downloaded for Order #${order.order_number}`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF slip");
    }
  };

  const handlePreviewPDF = async (order: SaleOrder) => {
    try {
      const url = await previewOrderPDF(order, "sale_order", profile);
      if (url) {
        window.open(String(url), "_blank");
      }
    } catch (err) {
      console.error("PDF preview failed:", err);
      toast.error("Failed to preview PDF slip");
    }
  };

  return {
    saleOrders,
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
    deliveringOrder,
    setDeliveringOrder,
    procuringOrder,
    setProcuringOrder,
    timelineOrder,
    setTimelineOrder,
  };
}
