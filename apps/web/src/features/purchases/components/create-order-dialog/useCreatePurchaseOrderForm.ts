import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { sqliteService } from "@/core/offline/sqliteService";
import { toast } from "sonner";
import { PurchaseOrder, PurchaseOrderItem } from "../../types/orders";
import { useUpsertPurchaseOrder } from "../../hooks/useOrders";

interface UseCreatePurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderToEdit?: PurchaseOrder | null;
  parties?: any[];
  productsProp?: any[];
  userId: string;
}

export function useCreatePurchaseOrderForm({
  open,
  onOpenChange,
  purchaseOrderToEdit,
  parties = [],
  productsProp = [],
  userId,
}: UseCreatePurchaseOrderFormProps) {
  const upsertMutation = useUpsertPurchaseOrder(userId);

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
        console.warn("[CreatePurchaseOrderDialog] Products fetch fallback:", e);
      }
      return (await sqliteService.getAll<any>("products", userId)) || [];
    },
    enabled: !!userId && open,
  });

  const products = productsProp && productsProp.length > 0 ? productsProp : dbProducts;

  const [poNumber, setPoNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      name: "",
      quantity: 1,
      price: 0,
      tax_rate: 0,
      unit: "pcs",
      received_qty: 0,
    },
  ]);

  useEffect(() => {
    if (purchaseOrderToEdit) {
      setPoNumber(purchaseOrderToEdit.po_number);
      setVendorName(purchaseOrderToEdit.vendor_name);
      setVendorPhone(purchaseOrderToEdit.vendor_phone || "");
      setVendorEmail(purchaseOrderToEdit.vendor_email || "");
      setVendorGstin(purchaseOrderToEdit.vendor_gstin || "");
      setBillingAddress(purchaseOrderToEdit.billing_address || "");
      setOrderDate(purchaseOrderToEdit.order_date || new Date().toISOString().split("T")[0]);
      setExpectedDeliveryDate(purchaseOrderToEdit.expected_delivery_date || "");
      setDiscountAmount(Number(purchaseOrderToEdit.discount_amount) || 0);
      setAdvancePaid(Number(purchaseOrderToEdit.advance_paid) || 0);
      setNotes(purchaseOrderToEdit.notes || "");
      setTermsConditions(purchaseOrderToEdit.terms_conditions || "");
      setItems(
        purchaseOrderToEdit.items && purchaseOrderToEdit.items.length > 0
          ? purchaseOrderToEdit.items
          : [{ name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs" }]
      );
    } else {
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      setPoNumber(`PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`);
      setVendorName("");
      setVendorPhone("");
      setVendorEmail("");
      setVendorGstin("");
      setBillingAddress("");
      setOrderDate(new Date().toISOString().split("T")[0]);
      setExpectedDeliveryDate("");
      setDiscountAmount(0);
      setAdvancePaid(0);
      setNotes("");
      setTermsConditions(
        "Supply as per specified specifications. Defective goods subject to immediate supplier return."
      );
      setItems([{ name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs", received_qty: 0 }]);
    }
  }, [purchaseOrderToEdit, open]);

  const handleVendorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const partyId = e.target.value;
    if (!partyId) return;
    const selected = parties.find((p) => p.id === partyId);
    if (selected) {
      setVendorName(selected.name || "");
      setVendorPhone(selected.phone || "");
      setVendorEmail(selected.email || "");
      setVendorGstin(selected.gstin || "");
      setBillingAddress(selected.billing_address || selected.address || "");
    }
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleProductSelect = (index: number, productName: string) => {
    const matched = products.find(
      (p) => p.name?.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    if (matched) {
      const newItems = [...items];
      const purchasePrice = Number(
        matched.cost_price ?? matched.purchase_price ?? matched.price ?? matched.sale_price ?? 0
      );
      newItems[index] = {
        ...newItems[index],
        product_id: matched.id,
        name: matched.name,
        price: purchasePrice,
        unit: matched.unit || "pcs",
        hsn_code: matched.hsn_code || "",
        tax_rate: Number(matched.tax_rate) || 0,
      };
      setItems(newItems);
    } else {
      updateItem(index, "name", productName);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs", received_qty: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Purchase order must contain at least 1 item");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0),
    0
  );
  const taxTotal = items.reduce((acc, it) => {
    const itemSub = (Number(it.quantity) || 0) * (Number(it.price) || 0);
    return acc + (itemSub * (Number(it.tax_rate) || 0)) / 100;
  }, 0);
  const netTotal = Math.max(0, subtotal + taxTotal - Number(discountAmount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorName.trim()) {
      toast.error("Please specify a supplier / vendor name");
      return;
    }

    const validItems = items.filter((it) => it.name.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one item with valid name and quantity");
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        id: purchaseOrderToEdit?.id,
        po_number: poNumber,
        vendor_name: vendorName,
        vendor_phone: vendorPhone,
        vendor_email: vendorEmail,
        vendor_gstin: vendorGstin,
        billing_address: billingAddress,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || null,
        items: validItems.map((it) => ({
          ...it,
          id: it.id || crypto.randomUUID(),
          product_id: it.product_id || undefined,
          quantity: Number(it.quantity),
          price: Number(it.price),
          tax_rate: Number(it.tax_rate || 0),
          tax_amount: (Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100,
          total:
            Number(it.quantity) * Number(it.price) +
            (Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100,
        })),
        subtotal,
        tax_amount: taxTotal,
        discount_amount: Number(discountAmount || 0),
        total_amount: netTotal,
        advance_paid: Number(advancePaid || 0),
        notes,
        terms_conditions: termsConditions,
        status: purchaseOrderToEdit?.status || "sent",
      });

      toast.success(
        purchaseOrderToEdit
          ? "Purchase Order updated successfully!"
          : "Purchase Order issued successfully!"
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to save Purchase Order:", err);
      toast.error(err.message || "Failed to save Purchase Order");
    }
  };

  return {
    poNumber,
    setPoNumber,
    vendorName,
    setVendorName,
    vendorPhone,
    setVendorPhone,
    vendorGstin,
    setVendorGstin,
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    discountAmount,
    setDiscountAmount,
    advancePaid,
    setAdvancePaid,
    notes,
    setNotes,
    termsConditions,
    setTermsConditions,
    items,
    products,
    subtotal,
    taxTotal,
    netTotal,
    handleVendorSelect,
    updateItem,
    handleProductSelect,
    addItem,
    removeItem,
    handleSubmit,
    isSubmitting: upsertMutation.isPending,
  };
}
