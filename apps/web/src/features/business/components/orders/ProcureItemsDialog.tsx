import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Truck, ArrowRight, CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { SaleOrder } from "../../types/orders";
import { useProcureSaleOrderToPO } from "../../hooks/useOrders";

interface ProcureItemsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrder: SaleOrder | null;
    parties?: any[];
    products?: any[];
    userId: string;
}

interface ProcureRow {
    item_id?: string;
    product_id?: string;
    name: string;
    ordered_qty: number;
    already_procured: number;
    remaining_qty: number;
    procure_qty: number;
    price: number;
    tax_rate: number;
    unit: string;
    hsn_code?: string;
    selected: boolean;
}

export const ProcureItemsDialog: React.FC<ProcureItemsDialogProps> = ({
    open,
    onOpenChange,
    saleOrder,
    parties = [],
    products = [],
    userId,
}) => {
    const procureMutation = useProcureSaleOrderToPO(userId);

    const [vendorId, setVendorId] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [vendorPhone, setVendorPhone] = useState("");
    const [vendorGstin, setVendorGstin] = useState("");
    const [vendorAddress, setVendorAddress] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ProcureRow[]>([]);

    useEffect(() => {
        if (!saleOrder) return;

        const randomCode = Math.floor(1000 + Math.random() * 9000);
        setPoNumber(`PO-PROC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`);
        setVendorId("");
        setVendorName("");
        setVendorPhone("");
        setVendorGstin("");
        setVendorAddress("");
        setOrderDate(new Date().toISOString().split("T")[0]);
        setExpectedDeliveryDate(saleOrder.expected_delivery_date || "");
        setNotes(`Procurement for Customer Order #${saleOrder.order_number} (${saleOrder.customer_name})`);

        // Build procurement rows from Sale Order items
        const initialRows: ProcureRow[] = (saleOrder.items || []).map((it) => {
            const ordered = Number(it.quantity) || 0;
            const already = Number(it.purchased_qty) || 0;
            const remaining = Math.max(0, ordered - already);

            // Estimate purchase rate from product catalog or fallback to 75% of sale price
            const matchedProd = products.find(
                (p) => (it.product_id && p.id === it.product_id) || p.name?.toLowerCase().trim() === it.name?.toLowerCase().trim()
            );
            const estRate = matchedProd?.cost_price ?? matchedProd?.purchase_price
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
            toast.error("Please select at least one item with a valid quantity to procure");
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

            toast.success(`Purchase Order #${poNumber} generated from Sale Order #${saleOrder.order_number}!`);
            onOpenChange(false);
        } catch (err: any) {
            console.error("Procurement failed:", err);
            toast.error(err.message || "Failed to generate Purchase Order");
        }
    };

    if (!saleOrder) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Procure Items for Order #{saleOrder.order_number}</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Customer: <strong className="text-slate-700 dark:text-slate-200">{saleOrder.customer_name}</strong> • Generate Purchase Order directly for suppliers.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New PO No.</span>
                                <Input
                                    value={poNumber}
                                    onChange={(e) => setPoNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-40 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* Informational Banner */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-[11px] text-blue-800 dark:text-blue-300">
                            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>
                                <strong>Smart Procurement Flow:</strong> You can allocate items to different suppliers across multiple Purchase Orders. FinFlow tracks cumulative procured quantities so you never double-order.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Supplier Selection Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                            <div className="space-y-1.5 md:col-span-1">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Supplier / Vendor <span className="text-rose-500">*</span>
                                </Label>
                                {parties.length > 0 && (
                                    <select
                                        onChange={handleVendorSelect}
                                        className="w-full text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-1"
                                        value={vendorId}
                                    >
                                        <option value="">-- Choose Existing Supplier --</option>
                                        {parties.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.phone ? `(${p.phone})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <Input
                                    placeholder="Enter or select supplier"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    className="h-9 text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supplier Phone & GSTIN</Label>
                                <Input
                                    placeholder="Supplier Phone"
                                    value={vendorPhone}
                                    onChange={(e) => setVendorPhone(e.target.value)}
                                    className="h-9 text-xs mb-1"
                                />
                                <Input
                                    placeholder="Supplier GSTIN"
                                    value={vendorGstin}
                                    onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Procurement Schedule</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="text-[10px] text-slate-400">PO Date</span>
                                        <Input
                                            type="date"
                                            value={orderDate}
                                            onChange={(e) => setOrderDate(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400">Expected Delivery</span>
                                        <Input
                                            type="date"
                                            value={expectedDeliveryDate}
                                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Allocation Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Items to Procure
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAllRemaining}
                                    className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                >
                                    Select All Remaining Quantities
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 w-10 text-center">Include</th>
                                            <th className="p-3">Product / Service</th>
                                            <th className="p-3 w-20 text-center">Ordered</th>
                                            <th className="p-3 w-20 text-center">Already Procured</th>
                                            <th className="p-3 w-20 text-center font-bold text-blue-600">Remaining</th>
                                            <th className="p-3 w-28 text-right">Qty to Procure</th>
                                            <th className="p-3 w-28 text-right">Unit Cost (₹)</th>
                                            <th className="p-3 w-28 text-right">Total Est. (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((row, idx) => {
                                            const lineTotal = row.procure_qty * row.price * (1 + (row.tax_rate || 0) / 100);
                                            const isComplete = row.remaining_qty <= 0;

                                            return (
                                                <tr
                                                    key={idx}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                                                        isComplete ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/30" : ""
                                                    }`}
                                                >
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={row.selected}
                                                            disabled={isComplete}
                                                            onChange={(e) => updateRow(idx, "selected", e.target.checked)}
                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {row.name}
                                                        {isComplete && (
                                                            <span className="ml-2 inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                                                                <CheckCircle className="w-3 h-3 mr-0.5" /> Fully Procured
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.ordered_qty} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.already_procured} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {row.remaining_qty} {row.unit}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={row.remaining_qty}
                                                            step="any"
                                                            value={row.procure_qty}
                                                            disabled={!row.selected || isComplete}
                                                            onChange={(e) =>
                                                                updateRow(idx, "procure_qty", parseFloat(e.target.value) || 0)
                                                            }
                                                            className="h-8 text-xs text-right font-semibold w-24 ml-auto"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={row.price}
                                                            disabled={!row.selected || isComplete}
                                                            onChange={(e) =>
                                                                updateRow(idx, "price", parseFloat(e.target.value) || 0)
                                                            }
                                                            className="h-8 text-xs text-right font-mono w-24 ml-auto"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                        {row.selected
                                                            ? `₹${lineTotal.toLocaleString("en-IN", {
                                                                  minimumFractionDigits: 2,
                                                                  maximumFractionDigits: 2,
                                                              })}`
                                                            : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes and Total */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supplier Instructions</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="h-20 text-xs mt-1"
                                />
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Items in this PO:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {selectedRows.length} item(s)
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Total Units Procured:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                            {selectedRows.reduce((acc, r) => acc + Number(r.procure_qty), 0)} units
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Estimated PO Total:</span>
                                    <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                                        ₹{estimatedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-slate-500 hover:text-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={procureMutation.isPending || selectedRows.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                        >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            {procureMutation.isPending ? "Generating PO..." : "Issue Purchase Order"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
