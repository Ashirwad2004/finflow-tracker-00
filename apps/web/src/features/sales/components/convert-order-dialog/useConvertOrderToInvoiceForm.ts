import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { toast } from "sonner";
import { SaleOrder } from "../../types/orders";
import { useConvertSaleOrderToInvoice, useSaleOrderRelations } from "../../hooks/useOrders";
import { DeliveryRow } from "./types";

interface UseConvertOrderToInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleOrder: SaleOrder | null;
  productsProp?: any[];
  userId: string;
}

export function useConvertOrderToInvoiceForm({
  open,
  onOpenChange,
  saleOrder,
  productsProp = [],
  userId,
}: UseConvertOrderToInvoiceFormProps) {
  const convertMutation = useConvertSaleOrderToInvoice(userId);
  const { data: soRelations } = useSaleOrderRelations(saleOrder?.id, userId);

  const { data: dbProducts = [] } = useQuery({
    queryKey: ["products", userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("user_id", userId)
          .order("name", { ascending: true });
        if (!error && data) return data;
      } catch (e) {
        console.warn("[ConvertOrderToInvoiceDialog] Products fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("products", userId)) || [];
    },
    enabled: !!userId && open,
  });

  const products = productsProp && productsProp.length > 0 ? productsProp : dbProducts;

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial">("pending");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [deductStock, setDeductStock] = useState<boolean>(true);
  const [rows, setRows] = useState<DeliveryRow[]>([]);

  // Calculate advance already utilized on earlier invoices for this sale order
  const alreadyUtilizedAdvance = useMemo(() => {
    if (!soRelations?.invoices || !Array.isArray(soRelations.invoices)) return 0;
    return soRelations.invoices.reduce((sum: number, link: any) => {
      return sum + (Number(link.sale?.amount_paid) || 0);
    }, 0);
  }, [soRelations]);

  const totalAdvanceRecorded = Number(saleOrder?.advance_paid) || 0;
  const netAvailableAdvance = Math.max(0, totalAdvanceRecorded - alreadyUtilizedAdvance);

  useEffect(() => {
    if (!saleOrder) return;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`);
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setDeductStock(true);

    const initialRows: DeliveryRow[] = (saleOrder.items || []).map((it) => {
      const ordered = Number(it.quantity) || 0;
      const delivered = Number(it.delivered_qty) || 0;
      const remaining = Math.max(0, ordered - delivered);

      return {
        item_id: it.id,
        product_id: it.product_id,
        name: it.name,
        ordered_qty: ordered,
        already_delivered: delivered,
        remaining_qty: remaining,
        deliver_qty: remaining,
        price: Number(it.price) || 0,
        tax_rate: Number(it.tax_rate) || 0,
        unit: it.unit || "pcs",
        hsn_code: it.hsn_code || "",
        selected: remaining > 0,
      };
    });

    setRows(initialRows);

    // Pre-fill amount paid with available advance (capped later by totalAmount)
    const initialSubtotal = initialRows
      .filter((r) => r.selected)
      .reduce((acc, r) => acc + r.deliver_qty * r.price * (1 + (r.tax_rate || 0) / 100), 0);
    const suggestedAdvance = Math.min(netAvailableAdvance, initialSubtotal);
    setAmountPaid(suggestedAdvance);
  }, [saleOrder, open, netAvailableAdvance]);

  const updateRow = (index: number, field: keyof DeliveryRow, value: any) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
  };

  const deliverAllRemaining = () => {
    setRows(
      rows.map((r) => ({
        ...r,
        deliver_qty: r.remaining_qty,
        selected: r.remaining_qty > 0,
      }))
    );
  };

  const selectedRows = rows.filter((r) => r.selected && r.deliver_qty > 0);

  const subtotal = selectedRows.reduce((acc, r) => acc + r.deliver_qty * r.price, 0);
  const taxTotal = selectedRows.reduce(
    (acc, r) => acc + (r.deliver_qty * r.price * (r.tax_rate || 0)) / 100,
    0
  );
  const totalAmount = subtotal + taxTotal;

  // Auto-sync payment status based on amountPaid and totalAmount
  useEffect(() => {
    if (totalAmount > 0) {
      if (amountPaid >= totalAmount) {
        setPaymentStatus("paid");
      } else if (amountPaid > 0) {
        setPaymentStatus("partial");
      } else {
        setPaymentStatus("pending");
      }
    }
  }, [amountPaid, totalAmount]);

  const applyAdvanceCredit = () => {
    const credit = Math.min(netAvailableAdvance, totalAmount);
    setAmountPaid(credit);
    toast.info(`Applied ₹${credit.toLocaleString("en-IN")} advance credit from Order #${saleOrder?.order_number}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleOrder) return;

    if (!invoiceNumber.trim()) {
      toast.error("Please specify an invoice number");
      return;
    }

    if (selectedRows.length === 0) {
      toast.error("Please select at least one item with a valid delivery quantity");
      return;
    }

    // Validate quantities against remaining order limits
    for (const row of selectedRows) {
      if (row.deliver_qty <= 0) {
        toast.error(`Invalid delivery quantity for ${row.name}`);
        return;
      }
      if (row.deliver_qty > row.remaining_qty) {
        toast.error(
          `Delivery quantity (${row.deliver_qty}) cannot exceed remaining quantity (${row.remaining_qty}) for ${row.name}`
        );
        return;
      }
    }

    const sanitizedPaid = Math.min(Math.max(0, Number(amountPaid) || 0), totalAmount);

    try {
      await convertMutation.mutateAsync({
        saleOrder,
        deliveryItems: selectedRows.map((r) => ({
          item_id: r.item_id,
          product_id: r.product_id,
          name: r.name,
          quantity: Number(r.deliver_qty),
          price: Number(r.price),
          tax_rate: Number(r.tax_rate),
          unit: r.unit,
          hsn_code: r.hsn_code,
        })),
        invoiceNumber,
        invoiceDate,
        dueDate: dueDate || undefined,
        paymentStatus,
        paymentMethod,
        amountPaid: sanitizedPaid,
        deductStock,
        dbProducts: products,
      });

      toast.success(
        `Tax Invoice #${invoiceNumber} successfully created from Order #${saleOrder.order_number}!`
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Invoice conversion failed:", err);
      toast.error(err.message || "Failed to convert order to invoice");
    }
  };

  return {
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    dueDate,
    setDueDate,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    deductStock,
    setDeductStock,
    rows,
    updateRow,
    deliverAllRemaining,
    selectedRows,
    subtotal,
    taxTotal,
    totalAmount,
    totalAdvanceRecorded,
    alreadyUtilizedAdvance,
    netAvailableAdvance,
    applyAdvanceCredit,
    handleSubmit,
    isSubmitting: convertMutation.isPending,
  };
}
