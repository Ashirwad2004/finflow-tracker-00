import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, CheckCircle, AlertCircle, ArrowRight, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { SaleOrder } from "../../types/orders";
import { useConvertSaleOrderToInvoice } from "../../hooks/useOrders";

interface ConvertOrderToInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrder: SaleOrder | null;
    products?: any[];
    userId: string;
}

interface DeliveryRow {
    item_id?: string;
    name: string;
    ordered_qty: number;
    already_delivered: number;
    remaining_qty: number;
    deliver_qty: number;
    price: number;
    tax_rate: number;
    unit: string;
    hsn_code?: string;
    selected: boolean;
}

export const ConvertOrderToInvoiceDialog: React.FC<ConvertOrderToInvoiceDialogProps> = ({
    open,
    onOpenChange,
    saleOrder,
    products = [],
    userId,
}) => {
    const convertMutation = useConvertSaleOrderToInvoice(userId);

    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
    const [dueDate, setDueDate] = useState("");
    const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial">("pending");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [deductStock, setDeductStock] = useState<boolean>(true);
    const [rows, setRows] = useState<DeliveryRow[]>([]);

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

        // Pre-fill advance payment if available on the order
        if (saleOrder.advance_paid && Number(saleOrder.advance_paid) > 0) {
            setAmountPaid(Number(saleOrder.advance_paid));
        } else {
            setAmountPaid(0);
        }
    }, [saleOrder, open]);

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
    const taxTotal = selectedRows.reduce((acc, r) => acc + (r.deliver_qty * r.price * (r.tax_rate || 0)) / 100, 0);
    const totalAmount = subtotal + taxTotal;

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

        try {
            await convertMutation.mutateAsync({
                saleOrder,
                deliveryItems: selectedRows.map((r) => ({
                    item_id: r.item_id,
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
                amountPaid: Number(amountPaid) || 0,
                deductStock,
                dbProducts: products,
            });

            toast.success(`Tax Invoice #${invoiceNumber} successfully created from Order #${saleOrder.order_number}!`);
            onOpenChange(false);
        } catch (err: any) {
            console.error("Invoice conversion failed:", err);
            toast.error(err.message || "Failed to convert order to invoice");
        }
    };

    if (!saleOrder) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                                    <PackageCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>Convert Sale Order #{saleOrder.order_number} to Invoice</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Customer: <strong className="text-slate-700 dark:text-slate-200">{saleOrder.customer_name}</strong> • Record physical delivery & generate GST Tax Invoice.
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice No.</span>
                                <Input
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="h-8 font-mono text-xs font-bold w-40 text-right bg-white dark:bg-slate-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* CA Stock Accounting Notice */}
                        <div className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>
                                <strong>Enterprise Accounting Standard:</strong> This conversion is the official point of supply. FinFlow will recognize revenue, adjust warehouse inventory, and update customer receivables.
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Invoice Parameters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Invoice Date</Label>
                                <Input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="h-8 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Due Date</Label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="h-8 text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Mode</Label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-1"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI / QR Code</option>
                                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Status</Label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-1"
                                >
                                    <option value="pending">Pending (Credit)</option>
                                    <option value="paid">Fully Paid</option>
                                    <option value="partial">Partially Paid</option>
                                </select>
                            </div>
                        </div>

                        {/* Items Delivery Allocation Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Fulfillment & Delivery Quantities
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={deliverAllRemaining}
                                    className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                >
                                    Deliver All Remaining Items (1-Click)
                                </Button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 w-10 text-center">Deliver</th>
                                            <th className="p-3">Product / Service</th>
                                            <th className="p-3 w-20 text-center">Ordered</th>
                                            <th className="p-3 w-20 text-center">Delivered So Far</th>
                                            <th className="p-3 w-20 text-center font-bold text-indigo-600">Remaining</th>
                                            <th className="p-3 w-28 text-right">Qty to Deliver Now</th>
                                            <th className="p-3 w-24 text-right">Unit Rate (₹)</th>
                                            <th className="p-3 w-20 text-center">GST %</th>
                                            <th className="p-3 w-28 text-right">Invoice Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((row, idx) => {
                                            const lineSub = row.deliver_qty * row.price;
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
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {row.name}
                                                        {isComplete && (
                                                            <span className="ml-2 inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                                                                <CheckCircle className="w-3 h-3 mr-0.5" /> Fully Delivered
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.ordered_qty} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                        {row.already_delivered} {row.unit}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                        {row.remaining_qty} {row.unit}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={row.remaining_qty}
                                                            step="any"
                                                            value={row.deliver_qty}
                                                            disabled={!row.selected || isComplete}
                                                            onChange={(e) =>
                                                                updateRow(idx, "deliver_qty", parseFloat(e.target.value) || 0)
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

                        {/* Financial Allocation & Stock Checkbox */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                                    <Checkbox
                                        id="deductStock"
                                        checked={deductStock}
                                        onCheckedChange={(c) => setDeductStock(!!c)}
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-0.5">
                                        <label
                                            htmlFor="deductStock"
                                            className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                                        >
                                            Deduct Physical Inventory Stock
                                        </label>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                            Reduces catalog quantities for delivered items and releases reserved order stock.
                                        </p>
                                    </div>
                                </div>

                                {saleOrder.advance_paid > 0 && (
                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                                        <p className="font-semibold">Advance Payment Credit Available:</p>
                                        <p className="text-[11px] mt-0.5">
                                            ₹{saleOrder.advance_paid} token advance was recorded on Order #{saleOrder.order_number}.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Subtotal for this Invoice:</span>
                                    <span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Tax Amount (GST):</span>
                                    <span className="font-mono">₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                                    <span>Total Invoice Value:</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span>Amount Paid Now / Advance Applied (₹):</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                        className="h-7 w-28 text-right text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                                    <span>Remaining Customer Receivable:</span>
                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                        ₹{Math.max(0, totalAmount - amountPaid).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {convertMutation.isPending ? "Generating Invoice..." : "Generate Sale Invoice"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
