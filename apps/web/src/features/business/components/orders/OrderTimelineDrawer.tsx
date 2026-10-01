import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Package,
    ReceiptIndianRupee,
    ShoppingCart,
    Truck,
    ArrowRight,
    ExternalLink,
    AlertCircle,
    ShieldAlert,
    Boxes,
} from "lucide-react";
import { SaleOrder, PurchaseOrder } from "../../types/orders";
import {
    useSaleOrderRelations,
    usePurchaseOrderRelations,
    calculateOrderStockSummary,
} from "../../hooks/useOrders";

interface OrderTimelineDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrder?: SaleOrder | null;
    purchaseOrder?: PurchaseOrder | null;
    userId: string;
}

export const OrderTimelineDrawer: React.FC<OrderTimelineDrawerProps> = ({
    open,
    onOpenChange,
    saleOrder,
    purchaseOrder,
    userId,
}) => {
    const isSaleOrder = !!saleOrder;
    const isPurchaseOrder = !!purchaseOrder;

    const { data: soRelations, isLoading: soLoading } = useSaleOrderRelations(
        saleOrder?.id,
        userId
    );
    const { data: poRelations, isLoading: poLoading } = usePurchaseOrderRelations(
        purchaseOrder?.id,
        userId
    );

    if (!open) return null;

    const renderSaleOrderTimeline = (order: SaleOrder) => {
        const stockSummary = calculateOrderStockSummary(order);
        const invoices = soRelations?.invoices || [];
        const linkedPOs = soRelations?.purchaseOrders || [];

        return (
            <div className="space-y-6">
                {/* Stock Accounting Callout Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                        <span className="text-[11px] text-slate-500 font-medium">Total Ordered</span>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
                            {stockSummary.ordered} <span className="text-xs font-normal">units</span>
                        </p>
                    </div>
                    <div>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                            <Boxes className="w-3 h-3" /> Reserved Stock
                        </span>
                        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            {stockSummary.reserved} <span className="text-xs font-normal">units</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">Physical stock intact</p>
                    </div>
                    <div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Delivered
                        </span>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {stockSummary.delivered} <span className="text-xs font-normal">units</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">Deducted from stock</p>
                    </div>
                    <div>
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Procured via PO
                        </span>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
                            {stockSummary.purchased} <span className="text-xs font-normal">units</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">
                            {stockSummary.remainingProcurement > 0
                                ? `${stockSummary.remainingProcurement} still to procure`
                                : "Procurement complete"}
                        </p>
                    </div>
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-8 my-4 ml-4">
                    {/* Node 1: Order Booking */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow">
                            <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Sale Order Booked</span>
                                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        #{order.order_number}
                                    </Badge>
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">
                                    {order.order_date}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Customer: <strong>{order.customer_name}</strong> {order.customer_phone ? `(${order.customer_phone})` : ""}
                            </p>
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between font-medium">
                                    <span>Order Value: ₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                                    {Number(order.advance_paid) > 0 && (
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                            Advance Token: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Items: {order.items?.map((it) => `${it.name} (${it.quantity} ${it.unit || "pcs"})`).join(", ")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Node 2: Procurement (Linked POs) */}
                    <div className="relative">
                        <div
                            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
                                linkedPOs.length > 0 ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            }`}
                        >
                            <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Procurement & Supplier POs</span>
                                    <span className="text-xs font-normal text-slate-400">({linkedPOs.length} linked)</span>
                                </h4>
                            </div>

                            {linkedPOs.length === 0 ? (
                                <p className="text-xs text-slate-400 italic mt-1">
                                    No purchase orders generated for this order yet.
                                </p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {linkedPOs.map((link) => (
                                        <div
                                            key={link.id}
                                            className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 text-xs"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                    <span>PO #{link.purchase_order?.po_number || "PO"}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-700">
                                                    {link.purchase_order?.status || "Sent"}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                                Supplier: <strong>{link.purchase_order?.vendor_name || "Vendor"}</strong> • PO Value: ₹{Number(link.purchase_order?.total_amount || 0).toLocaleString("en-IN")}
                                            </p>
                                            {link.procured_items && (
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    Procured: {link.procured_items.map((pi) => `${pi.name} (${pi.quantity})`).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Node 3: Fulfillment & Sale Invoices */}
                    <div className="relative">
                        <div
                            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
                                invoices.length > 0 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Deliveries & Tax Invoices</span>
                                    <span className="text-xs font-normal text-slate-400">({invoices.length} created)</span>
                                </h4>
                            </div>

                            {invoices.length === 0 ? (
                                <p className="text-xs text-slate-400 italic mt-1">
                                    Order pending physical delivery. No Sale Invoices issued yet.
                                </p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {invoices.map((link) => (
                                        <div
                                            key={link.id}
                                            className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>Invoice #{link.sale?.invoice_number || "Invoice"}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500">
                                                    {link.sale?.date}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                                <span>Amount: ₹{Number(link.sale?.total_amount || 0).toLocaleString("en-IN")}</span>
                                                <span className="capitalize font-semibold text-emerald-700 dark:text-emerald-400">
                                                    Status: {link.sale?.status || "Pending"}
                                                </span>
                                            </div>
                                            {link.delivered_items && (
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    Delivered: {link.delivered_items.map((di) => `${di.name} (${di.quantity})`).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPurchaseOrderTimeline = (order: PurchaseOrder) => {
        const bills = poRelations?.bills || [];
        const sourceSOs = poRelations?.sourceSaleOrders || [];

        const totalOrdered = (order.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
        const totalReceived = (order.items || []).reduce((acc, i) => acc + (Number(i.received_qty) || 0), 0);
        const remaining = Math.max(0, totalOrdered - totalReceived);

        return (
            <div className="space-y-6">
                {/* Stock Accounting Callout Banner */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                        <span className="text-[11px] text-slate-500 font-medium">Total Ordered</span>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
                            {totalOrdered} <span className="text-xs font-normal">units</span>
                        </p>
                    </div>
                    <div>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Expected Inbound
                        </span>
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">
                            {remaining} <span className="text-xs font-normal">units</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">Pending delivery</p>
                    </div>
                    <div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Received into Stock
                        </span>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {totalReceived} <span className="text-xs font-normal">units</span>
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight">Added to shelf</p>
                    </div>
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-6 border-l-2 border-teal-200 dark:border-teal-900 space-y-8 my-4 ml-4">
                    {/* Node 1: PO Placed */}
                    <div className="relative">
                        <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs shadow">
                            <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Purchase Order Issued</span>
                                    <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                                        #{order.po_number}
                                    </Badge>
                                </h4>
                                <span className="text-xs text-slate-400 font-mono">
                                    {order.order_date}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Vendor: <strong>{order.vendor_name}</strong> {order.vendor_phone ? `(${order.vendor_phone})` : ""}
                            </p>
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between font-medium">
                                    <span>PO Amount: ₹{Number(order.total_amount).toLocaleString("en-IN")}</span>
                                    {Number(order.advance_paid) > 0 && (
                                        <span className="text-teal-600 dark:text-teal-400">
                                            Advance Paid: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Items: {order.items?.map((it) => `${it.name} (${it.quantity} ${it.unit || "pcs"})`).join(", ")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Node 2: Source Customer Sale Order (if any) */}
                    {sourceSOs.length > 0 && (
                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow">
                                <ShoppingCart className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Procured for Customer Sale Order
                                </h4>
                                <div className="mt-2 space-y-2">
                                    {sourceSOs.map((link: any) => (
                                        <div
                                            key={link.id}
                                            className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs"
                                        >
                                            <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                                                Order #{link.sale_order?.order_number}
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                                Customer: {link.sale_order?.customer_name} • Total: ₹{Number(link.sale_order?.total_amount || 0).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Node 3: Goods Receipts & Purchase Bills */}
                    <div className="relative">
                        <div
                            className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow ${
                                bills.length > 0 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            }`}
                        >
                            <ReceiptIndianRupee className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Receipts & Purchase Bills</span>
                                    <span className="text-xs font-normal text-slate-400">({bills.length} received)</span>
                                </h4>
                            </div>

                            {bills.length === 0 ? (
                                <p className="text-xs text-slate-400 italic mt-1">
                                    Awaiting vendor delivery. No Purchase Bills recorded yet.
                                </p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {bills.map((link) => (
                                        <div
                                            key={link.id}
                                            className="p-3 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 text-xs"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                                                    <ReceiptIndianRupee className="w-3.5 h-3.5" />
                                                    <span>Bill #{link.purchase?.bill_number || "Bill"}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500">
                                                    {link.purchase?.date}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                                <span>Amount: ₹{Number(link.purchase?.total_amount || 0).toLocaleString("en-IN")}</span>
                                                <span className="capitalize font-semibold text-emerald-700 dark:text-emerald-400">
                                                    Status: {link.purchase?.status || "Received"}
                                                </span>
                                            </div>
                                            {link.received_items && (
                                                <p className="text-[11px] text-slate-500 mt-1">
                                                    Received into Stock: {link.received_items.map((ri) => `${ri.name} (${ri.quantity})`).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Document Lifecycle & Order Timeline</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Audit-ready lineage showing linked procurement POs, delivery invoices, and stock reservations.
                    </DialogDescription>
                </div>

                <div className="p-6">
                    {isSaleOrder && saleOrder && renderSaleOrderTimeline(saleOrder)}
                    {isPurchaseOrder && purchaseOrder && renderPurchaseOrderTimeline(purchaseOrder)}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
