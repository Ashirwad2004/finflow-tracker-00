import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/core/integrations/supabase/client";
import { useBusiness } from "@/core/contexts/BusinessContext";
import apiClient from "@/core/api/apiClient";
import { POSReturnModalProps, SaleItemLine, SaleRecord } from "./types";

export function usePOSReturn(
  onClose: () => void,
  activeShiftId?: string | null,
  onReturnSuccess?: (result: any) => void
) {
  const { currentStoreId } = useBusiness();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [returnLines, setReturnLines] = useState<SaleItemLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<string>("cash");
  const [reasonCategory, setReasonCategory] = useState<string>("Defective / Damaged");
  const [reasonNotes, setReasonNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Search original sales
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter an invoice number, customer name, or phone number");
      return;
    }

    const storeId = currentStoreId || "";
    if (!storeId) {
      toast.error("Store context is missing");
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from("sales")
        .select("*")
        .eq("user_id", storeId)
        .eq("document_type", "invoice")
        .order("created_at", { ascending: false })
        .limit(10);

      // Check if search query looks like invoice number
      if (searchQuery.toUpperCase().startsWith("INV-") || searchQuery.toUpperCase().startsWith("OFF-")) {
        query = query.ilike("invoice_number", `%${searchQuery.trim()}%`);
      } else {
        query = query.or(
          `invoice_number.ilike.%${searchQuery.trim()}%,customer_name.ilike.%${searchQuery.trim()}%,customer_phone.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted: SaleRecord[] = (data || []).map((d: any) => ({
        id: d.id,
        invoice_number: d.invoice_number,
        date: d.date || d.created_at,
        customer_name: d.customer_name || "Walk-in Customer",
        customer_phone: d.customer_phone || undefined,
        party_id: d.party_id || undefined,
        total_amount: Number(d.total_amount || 0),
        amount_paid: Number(d.amount_paid ?? d.total_amount ?? 0),
        payment_method: d.payment_method || "cash",
        items: Array.isArray(d.items) ? d.items : [],
      }));

      setSearchResults(formatted);
      if (!data || data.length === 0) {
        toast.info("No matching invoices found");
      }
    } catch (err: any) {
      console.error("Failed to search invoices:", err);
      toast.error("Error searching invoices: " + (err.message || "Unknown error"));
    } finally {
      setIsSearching(false);
    }
  };

  // Select a sale for return
  const handleSelectSale = (sale: SaleRecord) => {
    setSelectedSale(sale);
    const parsedItems: SaleItemLine[] = (sale.items || []).map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      product_id: item.product_id || item.id,
      name: item.name || "Item",
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      tax_amount: Number(item.tax_amount) || 0,
      total: Number(item.total || item.amount) || Number(item.quantity) * Number(item.price),
      unit: item.unit || "pc",
      hsn_code: item.hsn_code,
      return_quantity: 0,
      restock_inventory: true,
      is_selected: false,
    }));
    setReturnLines(parsedItems);
    setRefundMethod(sale.payment_method === "credit" ? "credit" : "cash");
  };

  const handleToggleItem = (index: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      const target = next[index];
      const newSelected = !target.is_selected;
      target.is_selected = newSelected;
      target.return_quantity = newSelected ? target.quantity : 0;
      return next;
    });
  };

  const handleQtyChange = (index: number, qty: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      const target = next[index];
      const clamped = Math.min(Math.max(0, qty), target.quantity);
      target.return_quantity = clamped;
      target.is_selected = clamped > 0;
      return next;
    });
  };

  const handleToggleRestock = (index: number) => {
    setReturnLines((prev) => {
      const next = [...prev];
      next[index].restock_inventory = !next[index].restock_inventory;
      return next;
    });
  };

  // Calculate return totals
  const selectedReturnItems = returnLines.filter((l) => l.is_selected && l.return_quantity > 0);
  const totalRefundAmount = selectedReturnItems.reduce((acc, item) => {
    const lineSubtotal = item.return_quantity * item.price;
    const lineTax = (lineSubtotal * (item.tax_rate || 0)) / 100;
    return acc + (lineSubtotal + lineTax);
  }, 0);

  // Submit return to backend
  const handleSubmitReturn = async () => {
    if (!selectedSale) return;
    if (selectedReturnItems.length === 0) {
      toast.error("Please select at least one item and quantity to return");
      return;
    }

    if (refundMethod === "cash" && !activeShiftId) {
      toast.warning(
        "No active register shift is open for cash refund recording. Please open a shift first or choose another refund method."
      );
    }

    setIsSubmitting(true);
    try {
      const finalReason = reasonNotes.trim()
        ? `${reasonCategory}: ${reasonNotes.trim()}`
        : reasonCategory;

      const payload = {
        sale_id: selectedSale.id,
        shift_id: activeShiftId || null,
        refund_method: refundMethod,
        reason: finalReason,
        return_items: selectedReturnItems.map((item) => ({
          original_sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.return_quantity,
          unit_price: item.price,
          tax_rate: item.tax_rate || 0,
          restock_inventory: item.restock_inventory,
        })),
      };

      const res = await apiClient.post(`/api/v1/pos/sales/${selectedSale.id}/return`, payload);
      const resultData = res.data;

      toast.success(
        `Return processed! Credit Note #${
          resultData.credit_note?.invoice_number || resultData.return?.return_number
        } issued.`
      );

      setCompletedReturn({
        ...resultData,
        originalSale: selectedSale,
        returnItems: selectedReturnItems,
        totalRefund: totalRefundAmount,
      });

      if (onReturnSuccess) {
        onReturnSuccess(resultData);
      }
    } catch (err: any) {
      console.error("Return processing failed:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to process return. Check stock and permissions.";
      toast.error("Return Failed: " + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedSale(null);
    setReturnLines([]);
    setSearchResults([]);
    setSearchQuery("");
    setCompletedReturn(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    selectedSale,
    setSelectedSale,
    returnLines,
    refundMethod,
    setRefundMethod,
    reasonCategory,
    setReasonCategory,
    reasonNotes,
    setReasonNotes,
    isSubmitting,
    completedReturn,
    showReceipt,
    setShowReceipt,
    selectedReturnItems,
    totalRefundAmount,
    handleSearch,
    handleSelectSale,
    handleToggleItem,
    handleQtyChange,
    handleToggleRestock,
    handleSubmitReturn,
    handleReset,
    handleClose,
  };
}
