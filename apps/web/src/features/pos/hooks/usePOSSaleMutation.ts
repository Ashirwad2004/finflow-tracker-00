import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/core/api/apiClient";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { playSuccessChime } from "../utils/posFeedback";
import {
  POSCartItem,
  POSProduct,
  POSPaymentMethodType,
  POSSplitPaymentBreakdown,
} from "../types";

interface UsePOSSaleMutationOptions {
  isOnline: boolean;
  storeId: string;
  activeShiftId: string | null;
  customerName: string;
  customerPhone: string;
  customerPartyId?: string;
  cartItems: POSCartItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  overallDiscountAmount: number;
  products: POSProduct[];
  onSuccess: (completedSale: any) => void;
  refetchShift?: () => void;
}

export function usePOSSaleMutation({
  isOnline,
  storeId,
  activeShiftId,
  customerName,
  customerPhone,
  customerPartyId,
  cartItems,
  subtotal,
  taxAmount,
  totalAmount,
  overallDiscountAmount,
  products,
  onSuccess,
  refetchShift,
}: UsePOSSaleMutationOptions) {
  const queryClient = useQueryClient();

  const handleCompleteSale = async ({
    paymentMethod,
    amountPaid,
    splitBreakdown,
    notes,
    idempotencyKey,
  }: {
    paymentMethod: POSPaymentMethodType;
    amountPaid: number;
    splitBreakdown?: POSSplitPaymentBreakdown;
    notes?: string;
    idempotencyKey: string;
  }) => {
    if (cartItems.length === 0) {
      toast.error("Cannot complete an empty sale");
      return;
    }

    const saleItemsPayload = cartItems.map((item) => ({
      product_id: item.product_id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      tax_rate: item.tax_rate,
      unit: item.unit,
      hsn_code: item.hsn_code,
    }));

    try {
      if (isOnline) {
        // Online Server-Authoritative Flow
        const res = await apiClient.post("/api/v1/pos/sales", {
          shift_id: activeShiftId || null,
          idempotency_key: idempotencyKey,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          party_id: customerPartyId || null,
          items: saleItemsPayload,
          discount_amount: overallDiscountAmount,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          notes: notes || null,
          is_offline_sync: false,
        });

        const createdSale = res.data.sale;
        playSuccessChime();
        toast.success(`Sale #${createdSale.invoice_number} completed!`);

        onSuccess(createdSale);
        queryClient.invalidateQueries({ queryKey: ["products", storeId] });
        if (refetchShift) refetchShift();
      } else {
        // Offline Resilience Flow
        const provisionalInvoiceNum = `OFF-${Date.now().toString(36).toUpperCase()}`;
        const recordId = uuidv4();

        const offlineSale = {
          id: recordId,
          user_id: storeId,
          invoice_number: provisionalInvoiceNum,
          customer_name: customerName,
          customer_phone: customerPhone,
          date: new Date().toISOString(),
          items: saleItemsPayload,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          discount_amount: overallDiscountAmount,
          amount_paid: amountPaid,
          balance_due: Math.max(0, totalAmount - amountPaid),
          payment_method: paymentMethod,
          status: amountPaid >= totalAmount ? "paid" : "partial",
          pos_shift_id: activeShiftId || null,
          idempotency_key: idempotencyKey,
          offline_invoice_number: provisionalInvoiceNum,
          document_type: "invoice",
        };

        // 1. Save to local SQLite/Dexie and queue for sync
        await offlineMutate({
          table: "sales",
          action: "insert",
          recordId,
          userId: storeId,
          payload: offlineSale,
        });

        // 2. Decrement local product stock
        for (const item of cartItems) {
          if (item.product_id) {
            const prod = products.find((p) => p.id === item.product_id);
            if (prod) {
              const updatedStock = Math.max(0, (prod.stock_quantity || 0) - item.quantity);
              await sqliteService.upsert("products", storeId, {
                ...prod,
                stock_quantity: updatedStock,
              });
            }
          }
        }

        playSuccessChime();
        toast.success(
          `[Offline] Sale #${provisionalInvoiceNum} saved locally! Will sync when reconnected.`
        );

        onSuccess(offlineSale);
        queryClient.invalidateQueries({ queryKey: ["products", storeId] });
      }
    } catch (err: any) {
      console.error("Failed to complete sale:", err);
      const detail =
        err.response?.data?.detail || err.message || "Failed to process sale.";
      toast.error(`Sale Failed: ${detail}`);
      throw err;
    }
  };

  return {
    handleCompleteSale,
  };
}
