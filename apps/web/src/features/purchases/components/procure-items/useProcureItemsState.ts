import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useProcureSaleOrderToPO } from "../../hooks/useOrders";
import { ProcureItemsDialogProps, ProcureRow } from "./types";

export function useProcureItemsState({
  open,
  onOpenChange,
  saleOrder,
  parties = [],
  products = [],
  userId,
}: ProcureItemsDialogProps) {
  const procureMutation = useProcureSaleOrderToPO(userId);

  const [vendorId, setVendorId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ProcureRow[]>([]);

  useEffect(() => {
    if (!saleOrder) return;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setPoNumber(
      `PO-PROC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`
    );
    setVendorId("");
    setVendorName("");
    setVendorPhone("");
    setVendorGstin("");
    setVendorAddress("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setExpectedDeliveryDate(saleOrder.expected_delivery_date || "");
    setNotes(
      `Procurement for Customer Order #${saleOrder.order_number} (${saleOrder.customer_name})`
    );

    // Build procurement rows from Sale Order items
    const initialRows: ProcureRow[] = (saleOrder.items || []).map((it) => {
      const ordered = Number(it.quantity) || 0;
      const already = Number(it.purchased_qty) || 0;
      const remaining = Math.max(0, ordered - already);

      // Estimate purchase rate from product catalog or fallback to 75% of sale price
      const matchedProd = products.find(
        (p) =>
          (it.product_id && p.id === it.product_id) ||
          p.name?.toLowerCase().trim() === it.name?.toLowerCase().trim()
      );
      const estRate =
        matchedProd?.cost_price ?? matchedProd?.purchase_price
          ? Number(matchedProd.cost_price ?? matchedProd.purchase_price)
          : Number(it.price) * 0.75;

      return {
        item_id: it.id,
        product_id: it.product_id,
        name: it.name,
        ordered_qty: ordered,
        already_procured: already,
        remaining_qty: remaining,
        procure_qty: remaining,
        price: Math.round(estRate * 100) / 100,
        tax_rate: Number(it.tax_rate) || 0,
        unit: it.unit || "pcs",
        hsn_code: it.hsn_code || "",
        selected: remaining > 0,
      };
    });

    setRows(initialRows);
  }, [saleOrder, open, products]);

  const handleVendorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setVendorId(pId);
    if (!pId) return;
    const selected = parties.find((p) => p.id === pId);
    if (selected) {
      setVendorName(selected.name || "");
      setVendorPhone(selected.phone || "");
      setVendorGstin(selected.gstin || "");
      setVendorAddress(selected.billing_address || selected.address || "");
    }
  };

  const updateRow = (index: number, field: keyof ProcureRow, value: any) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
  };

  const selectAllRemaining = () => {
    setRows(
      rows.map((r) => ({
        ...r,
        procure_qty: r.remaining_qty,
        selected: r.remaining_qty > 0,
      }))
    );
  };

  const selectedRows = rows.filter((r) => r.selected && r.procure_qty > 0);
  const estimatedTotal = selectedRows.reduce((acc, r) => {
    const sub = r.procure_qty * r.price;
    return acc + sub + (sub * r.tax_rate) / 100;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleOrder) return;

    if (!vendorName.trim()) {
      toast.error("Please enter or select a supplier/vendor");
      return;
    }

    if (selectedRows.length === 0) {
      toast.error(
        "Please select at least one item with a valid quantity to procure"
      );
      return;
    }

    try {
      await procureMutation.mutateAsync({
        saleOrder,
        vendor: {
          id: vendorId || undefined,
          name: vendorName,
          phone: vendorPhone,
          gstin: vendorGstin,
          address: vendorAddress,
        },
        procureItems: selectedRows.map((r) => ({
          item_id: r.item_id,
          product_id: r.product_id,
          name: r.name,
          quantity: Number(r.procure_qty),
          price: Number(r.price),
          tax_rate: Number(r.tax_rate),
          unit: r.unit,
          hsn_code: r.hsn_code,
        })),
        poNumber,
        orderDate,
        expectedDeliveryDate,
        notes,
      });

      toast.success(
        `Purchase Order #${poNumber} generated from Sale Order #${saleOrder.order_number}!`
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Procurement failed:", err);
      toast.error(err.message || "Failed to generate Purchase Order");
    }
  };

  return {
    vendorId,
    setVendorId,
    vendorName,
    setVendorName,
    vendorPhone,
    setVendorPhone,
    vendorGstin,
    setVendorGstin,
    vendorAddress,
    setVendorAddress,
    poNumber,
    setPoNumber,
    orderDate,
    setOrderDate,
    expectedDeliveryDate,
    setExpectedDeliveryDate,
    notes,
    setNotes,
    rows,
    handleVendorSelect,
    updateRow,
    selectAllRemaining,
    selectedRows,
    estimatedTotal,
    handleSubmit,
    procureMutation,
  };
}
