import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    Filter,
    ShoppingCart,
    PackageCheck,
    Clock,
    CheckCircle,
    Download,
    MoreHorizontal,
    Pencil,
    Trash2,
    Boxes,
    ReceiptIndianRupee,
    History,
    AlertCircle,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { PurchaseOrder, PurchaseOrderStatus } from "../../types/orders";
import { usePurchaseOrders, useDeletePurchaseOrder } from "../../hooks/useOrders";
import { generateOrderPDF, previewOrderPDF } from "@/utils/generateOrderPDF";
import { CreatePurchaseOrderDialog } from "./CreatePurchaseOrderDialog";
import { ConvertOrderToBillDialog } from "./ConvertOrderToBillDialog";
import { OrderTimelineDrawer } from "./OrderTimelineDrawer";

interface PurchaseOrderRegisterProps {
    userId: string;
    parties?: any[];
    products?: any[];
}

export const PurchaseOrderRegister: React.FC<PurchaseOrderRegisterProps> = ({
    userId,
    parties = [],
    products = [],
}) => {
    const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(userId);
    const deleteMutation = useDeletePurchaseOrder(userId);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
    const [timelineOrder, setTimelineOrder] = useState<PurchaseOrder | null>(null);

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return purchaseOrders.filter((order) => {
            const matchesSearch =
                order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.vendor_phone?.includes(searchTerm);

            if (!matchesSearch) return false;
            if (statusFilter === "all") return true;
            return order.status === statusFilter;
        });
    }, [purchaseOrders, searchTerm, statusFilter]);

    // Metrics summary
    const metrics = useMemo(() => {
        let totalValue = 0;
        let sentCount = 0;
        let sentValue = 0;
        let partialCount = 0;
        let receivedCount = 0;
        let totalExpectedUnits = 0;

        purchaseOrders.forEach((order) => {
            const val = Number(order.total_amount) || 0;
            totalValue += val;

            const items = order.items || [];
            const orderedQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
            const receivedQty = items.reduce((acc, i) => acc + (Number(i.received_qty) || 0), 0);
            totalExpectedUnits += Math.max(0, orderedQty - receivedQty);

            if (order.status === "sent") {
                sentCount++;
                sentValue += val;
            } else if (order.status === "partially_received") {
                partialCount++;
            } else if (order.status === "received") {
                receivedCount++;
            }
        });

        return {
            totalCount: purchaseOrders.length,
            totalValue,
            sentCount,
            sentValue,
            partialCount,
            receivedCount,
            totalExpectedUnits,
        };
    }, [purchaseOrders]);

    const handleDelete = async (poId: string, poNumber: string) => {
        if (window.confirm(`Are you sure you want to delete Purchase Order #${poNumber}?`)) {
            try {
                await deleteMutation.mutateAsync(poId);
                toast.success(`Purchase Order #${poNumber} deleted.`);
            } catch (err: any) {
                toast.error(err.message || "Failed to delete Purchase Order");
            }
        }
    };

    const { data: profile } = useQuery({
        queryKey: ["profile", userId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", userId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });

    const handleDownloadPDF = async (order: PurchaseOrder) => {
        try {
            await generateOrderPDF(order, "purchase_order", profile);
            toast.success(`PDF downloaded for PO #${order.po_number}`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF slip");
        }
    };

    const handlePreviewPDF = async (order: PurchaseOrder) => {
        try {
            const url = await previewOrderPDF(order, "purchase_order", profile);
            if (url) {
                window.open(String(url), "_blank");
            }
        } catch (err) {
            console.error("PDF preview failed:", err);
            toast.error("Failed to preview PDF slip");
        }
    };

    const getStatusBadge = (status: PurchaseOrderStatus) => {
        switch (status) {
            case "sent":
                return (
                    <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 text-[11px] font-semibold">
                        Sent to Supplier
                    </Badge>
                );
            case "partially_received":
                return (
                    <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px] font-semibold">
                        Partially Received
                    </Badge>
                );
            case "received":
                return (
                    <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
                        Received & Billed
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 text-[11px] font-semibold">
                        Cancelled
                    </Badge>
                );
            case "draft":
            default:
                return (
                    <Badge variant="outline" className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Draft
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Procurement</span>
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        ₹{metrics.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        {metrics.totalCount} orders issued
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            Awaiting Inbound
                        </span>
                        <Clock className="w-4 h-4 text-teal-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
                        {metrics.sentCount + metrics.partialCount}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        ₹{metrics.sentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} in transit
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Expected Influx
                        </span>
                        <Boxes className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {metrics.totalExpectedUnits} <span className="text-xs font-normal">units</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        Awaiting warehouse receipt
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Fully Billed
                        </span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {metrics.receivedCount}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Converted to Purchase Bills
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by PO# or vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                        {[
                            { id: "all", label: "All" },
                            { id: "sent", label: "Sent" },
                            { id: "partially_received", label: "Partial" },
                            { id: "received", label: "Received" },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setStatusFilter(t.id)}
                                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                    statusFilter === t.id
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                        onClick={() => {
                            setEditingOrder(null);
                            setIsCreateOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl shadow-md shadow-emerald-500/20 gap-1.5 w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Purchase Order</span>
                    </Button>
                </div>
            </div>

            {/* Orders Table */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                    Loading purchase orders...
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        No Purchase Orders Found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                        Place formal vendor purchase orders, track inbound shipments, and convert received goods directly into Purchase Bills with automatic inventory increments.
                    </p>
                    <Button
                        onClick={() => {
                            setEditingOrder(null);
                            setIsCreateOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 rounded-xl shadow-md shadow-emerald-500/20 gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Purchase Order
                    </Button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-3.5">PO No & Date</th>
                                    <th className="p-3.5">Supplier / Vendor</th>
                                    <th className="p-3.5">Items Ordered</th>
                                    <th className="p-3.5 w-48">Receipt Progress</th>
                                    <th className="p-3.5 text-right">PO Total</th>
                                    <th className="p-3.5 text-center">Status</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredOrders.map((order) => {
                                    const items = order.items || [];
                                    const orderedQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
                                    const receivedQty = items.reduce((acc, i) => acc + (Number(i.received_qty) || 0), 0);
                                    const receiptPct =
                                        orderedQty > 0
                                            ? Math.min(100, Math.round((receivedQty / orderedQty) * 100))
                                            : 0;

                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="p-3.5">
                                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    #{order.po_number}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {order.order_date}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {order.vendor_name}
                                                </div>
                                                {order.vendor_phone && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {order.vendor_phone}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {items.length} line item(s)
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    {orderedQty} total units
                                                </div>
                                            </td>

                                            {/* Receipt Progress Bar */}
                                            <td className="p-3.5">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-500 font-mono">
                                                            {receivedQty}/{orderedQty} units
                                                        </span>
                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {receiptPct}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${receiptPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-3.5 text-right font-mono">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    ₹{Number(order.total_amount).toLocaleString("en-IN", {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </div>
                                                {Number(order.advance_paid) > 0 && (
                                                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                                        Adv: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-center">
                                                {getStatusBadge(order.status)}
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {order.status !== "received" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setReceivingOrder(order)}
                                                            className="h-7 text-[11px] gap-1 px-2 border-teal-200 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/50"
                                                            title="Receive Goods & Convert to Purchase Bill"
                                                        >
                                                            <ReceiptIndianRupee className="w-3 h-3" />
                                                            <span>Receive & Bill</span>
                                                        </Button>
                                                    )}

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 text-xs">
                                                            <DropdownMenuItem
                                                                onClick={() => setTimelineOrder(order)}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <History className="w-3.5 h-3.5 text-teal-500" />
                                                                <span>View PO Timeline</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handlePreviewPDF(order)}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-teal-500" />
                                                                <span>Preview PDF Slip</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDownloadPDF(order)}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                                                <span>Download PDF Slip</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditingOrder(order);
                                                                    setIsCreateOpen(true);
                                                                }}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                                                <span>Edit PO</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(order.id, order.po_number)}
                                                                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Delete PO</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <CreatePurchaseOrderDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                purchaseOrderToEdit={editingOrder}
                parties={parties}
                products={products}
                userId={userId}
            />

            <ConvertOrderToBillDialog
                open={!!receivingOrder}
                onOpenChange={(open) => !open && setReceivingOrder(null)}
                purchaseOrder={receivingOrder}
                products={products}
                userId={userId}
            />

            <OrderTimelineDrawer
                open={!!timelineOrder}
                onOpenChange={(open) => !open && setTimelineOrder(null)}
                purchaseOrder={timelineOrder}
                userId={userId}
            />
        </div>
    );
};
