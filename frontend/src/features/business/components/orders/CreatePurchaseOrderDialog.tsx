import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ShoppingCart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrder, PurchaseOrderItem } from "../../types/orders";
import { useUpsertPurchaseOrder } from "../../hooks/useOrders";

interface CreatePurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrderToEdit?: PurchaseOrder | null;
    parties?: any[];
    products?: any[];
    userId: string;
}

export const CreatePurchaseOrderDialog: React.FC<CreatePurchaseOrderDialogProps> = ({
    open,
    onOpenChange,
    purchaseOrderToEdit,
    parties = [],
    products = [],
    userId,
}) => {
    const upsertMutation = useUpsertPurchaseOrder(userId);

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
            setTermsConditions("Supply as per specified specifications. Defective goods subject to immediate supplier return.");
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
        const matched = products.find((p) => p.name?.toLowerCase() === productName.toLowerCase());
        if (matched) {
            const newItems = [...items];
            newItems[index] = {
                ...newItems[index],
                product_id: matched.id,
                name: matched.name,
                price: Number(matched.purchase_price) || Number(matched.sale_price) || 0,
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
        setItems([...items, { name: "", quantity: 1, price: 0, tax_rate: 0, unit: "pcs", received_qty: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            toast.error("Purchase order must contain at least 1 item");
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
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
                    quantity: Number(it.quantity),
                    price: Number(it.price),
                    tax_rate: Number(it.tax_rate || 0),
                    tax_amount: ((Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100),
                    total: (Number(it.quantity) * Number(it.price)) + ((Number(it.quantity) * Number(it.price) * (Number(it.tax_rate) || 0)) / 100),
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

            toast.success(purchaseOrderToEdit ? "Purchase Order updated successfully!" : "Purchase Order issued successfully!");
            onOpenChange(false);
        } catch (err: any) {
            console.error("Failed to save Purchase Order:", err);
            toast.error(err.message || "Failed to save Purchase Order");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                        {purchaseOrderToEdit ? "Edit Purchase Order" : "New Supplier Purchase Order"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Issue formal procurement order to vendor with tracking of inbound delivery and receipt.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PO No.</span>
                                <Input
                                    value={poNumber}
                                    onChange={(e) => setPoNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-36 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* CA Stock Accounting Notice */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-[11px] text-teal-800 dark:text-teal-300">
                            <AlertCircle className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                            <span>
                                <strong>Inventory Invariant:</strong> Placing a Purchase Order tracks <em>expected incoming stock</em>. Physical stock on hand is unaffected until goods arrive and are converted to a Purchase Bill.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Vendor Details Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                            <div className="space-y-1.5 md:col-span-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Supplier / Vendor <span className="text-rose-500">*</span>
                                    </Label>
                                    {parties.length > 0 && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                            or quick-select:
                                        </span>
                                    )}
                                </div>
                                {parties.length > 0 && (
                                    <select
                                        onChange={handleVendorSelect}
                                        className="w-full text-xs h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mb-1"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Select Existing Supplier --</option>
                                        {parties.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.phone ? `(${p.phone})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <Input
                                    placeholder="Enter or select vendor name"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    className="h-9 text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact & GSTIN</Label>
                                <Input
                                    placeholder="Phone number"
                                    value={vendorPhone}
                                    onChange={(e) => setVendorPhone(e.target.value)}
                                    className="h-9 text-xs mb-1"
                                />
                                <Input
                                    placeholder="Vendor GSTIN (Optional)"
                                    value={vendorGstin}
                                    onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Timeline</Label>
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

                        {/* Items Section */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>Procurement Items</span>
                                    <span className="text-xs font-normal text-slate-400">({items.length} items)</span>
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="h-8 text-xs gap-1 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Line Item
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 w-6 text-center">#</th>
                                            <th className="p-3">Item / Product Name</th>
                                            <th className="p-3 w-24 text-right">Qty</th>
                                            <th className="p-3 w-20 text-center">Unit</th>
                                            <th className="p-3 w-28 text-right">Purchase Rate (₹)</th>
                                            <th className="p-3 w-24 text-center">GST %</th>
                                            <th className="p-3 w-28 text-right">Total (₹)</th>
                                            <th className="p-3 w-10 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.map((item, idx) => {
                                            const lineSub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
                                            const lineTax = (lineSub * (Number(item.tax_rate) || 0)) / 100;
                                            const lineTot = lineSub + lineTax;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                    <td className="p-2">
                                                        <div className="space-y-1">
                                                            <Input
                                                                list={`po-products-list-${idx}`}
                                                                placeholder="Type or select product..."
                                                                value={item.name}
                                                                onChange={(e) => handleProductSelect(idx, e.target.value)}
                                                                className="h-8 text-xs font-medium"
                                                                required
                                                            />
                                                            <datalist id={`po-products-list-${idx}`}>
                                                                {products.map((prod) => (
                                                                    <option key={prod.id} value={prod.name}>
                                                                        Purchase: ₹{prod.purchase_price || prod.sale_price} • Current Stock: {prod.stock_quantity}
                                                                    </option>
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-xs text-right font-medium"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={item.unit || "pcs"}
                                                            onChange={(e) => updateItem(idx, "unit", e.target.value)}
                                                            className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                                        >
                                                            <option value="pcs">pcs</option>
                                                            <option value="box">box</option>
                                                            <option value="kg">kg</option>
                                                            <option value="mtr">mtr</option>
                                                            <option value="lit">lit</option>
                                                            <option value="set">set</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-xs text-right font-mono"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={item.tax_rate ?? 0}
                                                            onChange={(e) => updateItem(idx, "tax_rate", parseFloat(e.target.value) || 0)}
                                                            className="w-full h-8 px-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-center"
                                                        >
                                                            <option value={0}>0%</option>
                                                            <option value={5}>5%</option>
                                                            <option value={12}>12%</option>
                                                            <option value={18}>18%</option>
                                                            <option value={28}>28%</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                        ₹{lineTot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary and Advance Disbursed */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Supplier Instructions</Label>
                                    <Textarea
                                        placeholder="Delivery instructions, quality remarks..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="h-16 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Terms of Purchase</Label>
                                    <Textarea
                                        value={termsConditions}
                                        onChange={(e) => setTermsConditions(e.target.value)}
                                        className="h-16 text-xs mt-1"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal (Excl. Tax):</span>
                                    <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Total Estimated Tax:</span>
                                    <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
                                    <span>Supplier Discount (₹):</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-28 text-right text-xs font-mono"
                                    />
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                                    <span>Total Purchase Commitment:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                        ₹{netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span>Advance Paid to Supplier (₹):</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={advancePaid}
                                        onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                    <span>Balance Payable on Receipt:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        ₹{Math.max(0, netTotal - advancePaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                            disabled={upsertMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 shadow-md shadow-emerald-500/20"
                        >
                            {upsertMutation.isPending ? "Issuing PO..." : purchaseOrderToEdit ? "Update Purchase Order" : "Issue Purchase Order"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
