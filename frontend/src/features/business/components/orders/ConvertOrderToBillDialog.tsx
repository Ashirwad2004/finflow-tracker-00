import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ReceiptIndianRupee, CheckCircle, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { PurchaseOrder } from "../../types/orders";
import { useConvertPurchaseOrderToBill } from "../../hooks/useOrders";

interface ConvertOrderToBillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchaseOrder: PurchaseOrder | null;
    products?: any[];
    userId: string;
}

interface ReceiptRow {
    item_id?: string;
    product_id?: string;
    name: string;
    ordered_qty: number;
    already_received: number;
    remaining_qty: number;
    receive_qty: number;
    price: number;
    tax_rate: number;
    unit: string;
    hsn_code?: string;
    selected: boolean;
}

export const ConvertOrderToBillDialog: React.FC<ConvertOrderToBillDialogProps> = ({
    open,
    onOpenChange,
    purchaseOrder,
    products = [],
    userId,
}) => {
    const convertMutation = useConvertPurchaseOrderToBill(userId);

    const [billNumber, setBillNumber] = useState("");
    const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
    const [addStock, setAddStock] = useState<boolean>(true);
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ReceiptRow[]>([]);

    useEffect(() => {
        if (!purchaseOrder) return;

        const randomCode = Math.floor(1000 + Math.random() * 9000);
        setBillNumber(`BILL-IN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomCode}`);
        setBillDate(new Date().toISOString().split("T")[0]);
        setAddStock(true);
        setNotes(`Goods received against PO #${purchaseOrder.po_number}`);

        const initialRows: ReceiptRow[] = (purchaseOrder.items || []).map((it) => {
            const ordered = Number(it.quantity) || 0;
            const received = Number(it.received_qty) || 0;
            const remaining = Math.max(0, ordered - received);

            return {
                item_id: it.id,
                product_id: it.product_id,
                name: it.name,
                ordered_qty: ordered,
                already_received: received,
                remaining_qty: remaining,
                receive_qty: remaining,
                price: Number(it.price) || 0,
                tax_rate: Number(it.tax_rate) || 0,
                unit: it.unit || "pcs",
                hsn_code: it.hsn_code || "",
                selected: remaining > 0,
            };
        });

        setRows(initialRows);
    }, [purchaseOrder, open]);

    const updateRow = (index: number, field: keyof ReceiptRow, value: any) => {
        const next = [...rows];
        next[index] = { ...next[index], [field]: value };
        setRows(next);
    };

    const receiveAllRemaining = () => {
        setRows(
            rows.map((r) => ({
                ...r,
                receive_qty: r.remaining_qty,
                selected: r.remaining_qty > 0,
            }))
        );
    };

    const selectedRows = rows.filter((r) => r.selected && r.receive_qty > 0);

    const subtotal = selectedRows.reduce((acc, r) => acc + r.receive_qty * r.price, 0);
    const taxTotal = selectedRows.reduce((acc, r) => acc + (r.receive_qty * r.price * (r.tax_rate || 0)) / 100, 0);
    const totalAmount = subtotal + taxTotal;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!purchaseOrder) return;

        if (!billNumber.trim()) {
            toast.error("Please enter the supplier's bill / invoice number");
            return;
        }

        if (selectedRows.length === 0) {
            toast.error("Please select at least one item with a valid received quantity");
            return;
        }

        try {
            await convertMutation.mutateAsync({
                purchaseOrder,
                receivedItems: selectedRows.map((r) => ({
                    item_id: r.item_id,
                    product_id: r.product_id,
                    name: r.name,
                    quantity: Number(r.receive_qty),
                    price: Number(r.price),
                    tax_rate: Number(r.tax_rate),
                    unit: r.unit,
                    hsn_code: r.hsn_code,
                })),
                billNumber,
                billDate,
                notes,
                addStock,
                dbProducts: products,
            });

            toast.success(`Purchase Bill #${billNumber} created from PO #${purchaseOrder.po_number}! Stock updated.`);
            onOpenChange(false);
        } catch (err: any) {
            console.error("Bill conversion failed:", err);
            toast.error(err.message || "Failed to convert PO to Purchase Bill");
        }
    };

    if (!purchaseOrder) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-slate-900">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                                    <ReceiptIndianRupee className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Convert PO #{purchaseOrder.po_number} to Purchase Bill</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Supplier: <strong className="text-slate-700 dark:text-slate-200">{purchaseOrder.vendor_name}</strong> • Receive incoming shipments into warehouse stock.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor Bill No.</span>
                                <Input
                                    value={billNumber}
                                    placeholder="e.g. SUP-INV-9821"
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-40 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* CA Stock Accounting Notice */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-[11px] text-teal-800 dark:text-teal-300">
                            <CheckCircle className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                            <span>
                                <strong>Physical Stock Influx:</strong> Converting to a Purchase Bill records actual warehouse receipt. FinFlow adds incoming units to physical inventory and creates Accounts Payable.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Parameters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Goods Receipt / Bill Date</Label>
                                <Input
                                    type="date"
                                    value={billDate}
                                    onChange={(e) => setBillDate(e.target.value)}
                                    className="h-8 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Vendor / Supplier</Label>
                                <Input
                                    value={purchaseOrder.vendor_name}
                                    disabled
                                    className="h-8 text-xs mt-1 bg-slate-100 dark:bg-slate-800"
                                />
                            </div>
                        </div>

                        {/* Items Receipt Allocation Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Received Quantities
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={receiveAllRemaining}
                                    className="h-7 text-xs text-teal-600 border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                                >
                                    Receive All Remaining Items (1-Click)
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 w-10 text-center">Receive</th>
                                            <th className="p-3">Product / Service</th>
                                            <th className="p-3 w-20 text-center">PO Ordered</th>
                                            <th className="p-3 w-20 text-center">Received So Far</th>
                                            <th className="p-3 w-20 text-center font-bold text-teal-600">Remaining</th>
                                            <th className="p-3 w-28 text-right">Qty Received Now</th>
                                            <th className="p-3 w-24 text-right">Purchase Rate (₹)</th>
                                            <th className="p-3 w-20 text-center">GST %</th>
                                            <th className="p-3 w-28 text-right">Bill Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((row, idx) => {
                                            const lineSub = row.receive_qty * row.price;
                                            const lineTax = (lineSub * (row.tax_rate || 0)) / 100;
                                            const lineTotal = lineSub + lineTax;
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
                                                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {row.name}
                                                        {isComplete && (
                                                            <span className="ml-2 inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                                                                <CheckCircle className="w-3 h-3 mr-0.5" /> Fully Received
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.ordered_qty} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.already_received} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                                                        {row.remaining_qty} {row.unit}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={row.remaining_qty}
                                                            step="any"
                                                            value={row.receive_qty}
                                                            disabled={!row.selected || isComplete}
                                                            onChange={(e) =>
                                                                updateRow(idx, "receive_qty", parseFloat(e.target.value) || 0)
                                                            }
                                                            className="h-8 text-xs text-right font-semibold w-24 ml-auto"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                                        ₹{row.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.tax_rate}%
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

                        {/* Stock Checkbox & Bill Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                                    <Checkbox
                                        id="addStock"
                                        checked={addStock}
                                        onCheckedChange={(c) => setAddStock(!!c)}
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-0.5">
                                        <label
                                            htmlFor="addStock"
                                            className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                                        >
                                            Add to Physical Warehouse Stock
                                        </label>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                            Increments product inventory counts by the received quantities immediately upon bill creation.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal for this Bill:</span>
                                    <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Tax Amount (GST):</span>
                                    <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                                    <span>Total Purchase Bill Amount:</span>
                                    <span className="font-mono text-teal-600 dark:text-teal-400">
                                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                            disabled={convertMutation.isPending || selectedRows.length === 0}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-6 shadow-md shadow-teal-500/20 flex items-center gap-1.5"
                        >
                            <ReceiptIndianRupee className="w-3.5 h-3.5" />
                            {convertMutation.isPending ? "Creating Bill..." : "Record Purchase Bill & Add Stock"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
