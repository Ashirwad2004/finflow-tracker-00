import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    Filter,
    ShoppingBag,
    Truck,
    PackageCheck,
    Clock,
    CheckCircle,
    Download,
    MoreHorizontal,
    Pencil,
    Trash2,
    Boxes,
    FileText,
    History,
    AlertCircle,
    ArrowUpRight,
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
import { SaleOrder, SaleOrderStatus } from "../../types/orders";
import { useSaleOrders, useDeleteSaleOrder, calculateOrderStockSummary } from "../../hooks/useOrders";
import { generateOrderPDF, previewOrderPDF } from "@/utils/generateOrderPDF";
import { CreateSaleOrderDialog } from "./CreateSaleOrderDialog";
import { ConvertOrderToInvoiceDialog } from "./ConvertOrderToInvoiceDialog";
import { ProcureItemsDialog } from "./ProcureItemsDialog";
import { OrderTimelineDrawer } from "./OrderTimelineDrawer";

interface SalesOrderRegisterProps {
    userId: string;
    parties?: any[];
    products?: any[];
    onOpenCreate?: () => void;
}

export const SalesOrderRegister: React.FC<SalesOrderRegisterProps> = ({
    userId,
    parties = [],
    products = [],
}) => {
    const { data: saleOrders = [], isLoading } = useSaleOrders(userId);
    const deleteMutation = useDeleteSaleOrder(userId);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<SaleOrder | null>(null);
    const [deliveringOrder, setDeliveringOrder] = useState<SaleOrder | null>(null);
    const [procuringOrder, setProcuringOrder] = useState<SaleOrder | null>(null);
    const [timelineOrder, setTimelineOrder] = useState<SaleOrder | null>(null);

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return saleOrders.filter((order) => {
            const matchesSearch =
                order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customer_phone?.includes(searchTerm);

            if (!matchesSearch) return false;
            if (statusFilter === "all") return true;
            return order.status === statusFilter;
        });
    }, [saleOrders, searchTerm, statusFilter]);

    // Metrics summary
    const metrics = useMemo(() => {
        let totalValue = 0;
        let confirmedCount = 0;
        let confirmedValue = 0;
        let partialCount = 0;
        let deliveredCount = 0;
        let totalReservedUnits = 0;

        saleOrders.forEach((order) => {
            const val = Number(order.total_amount) || 0;
            totalValue += val;

            const summary = calculateOrderStockSummary(order);
            totalReservedUnits += summary.reserved;

            if (order.status === "confirmed") {
                confirmedCount++;
                confirmedValue += val;
            } else if (order.status === "partially_delivered") {
                partialCount++;
            } else if (order.status === "delivered") {
                deliveredCount++;
            }
        });

        return {
            totalCount: saleOrders.length,
            totalValue,
            confirmedCount,
            confirmedValue,
            partialCount,
            deliveredCount,
            totalReservedUnits,
        };
    }, [saleOrders]);

    const handleDelete = async (orderId: string, orderNumber: string) => {
        if (window.confirm(`Are you sure you want to delete Sale Order #${orderNumber}?`)) {
            try {
                await deleteMutation.mutateAsync(orderId);
                toast.success(`Sale Order #${orderNumber} deleted.`);
            } catch (err: any) {
                toast.error(err.message || "Failed to delete order");
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

    const handleDownloadPDF = async (order: SaleOrder) => {
        try {
            await generateOrderPDF(order, "sale_order", profile);
            toast.success(`PDF downloaded for Order #${order.order_number}`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF slip");
        }
    };

    const handlePreviewPDF = async (order: SaleOrder) => {
        try {
            const url = await previewOrderPDF(order, "sale_order", profile);
            if (url) {
                window.open(String(url), "_blank");
            }
        } catch (err) {
            console.error("PDF preview failed:", err);
            toast.error("Failed to preview PDF slip");
        }
    };

    const getStatusBadge = (status: SaleOrderStatus) => {
        switch (status) {
            case "confirmed":
                return (
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[11px] font-semibold">
                        Confirmed
                    </Badge>
                );
            case "partially_delivered":
                return (
                    <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px] font-semibold">
                        Partially Delivered
                    </Badge>
                );
            case "delivered":
                return (
                    <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
                        Delivered & Invoiced
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
                        <span className="text-xs font-semibold uppercase tracking-wider">Total Booked</span>
                        <ShoppingBag className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                        ₹{metrics.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        {metrics.totalCount} orders booked
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Awaiting Delivery
                        </span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                        {metrics.confirmedCount + metrics.partialCount}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        ₹{metrics.confirmedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unfulfilled
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            Reserved Stock
                        </span>
                        <Boxes className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {metrics.totalReservedUnits} <span className="text-xs font-normal">units</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        Physical shelf stock intact
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Fully Invoiced
                        </span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {metrics.deliveredCount}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Converted to Sale Invoices
                    </div>
                </div>
            </div>

            {/* Action Bar: Search, Filters, Create Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by SO# or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
                        {[
                            { id: "all", label: "All" },
                            { id: "confirmed", label: "Confirmed" },
                            { id: "partially_delivered", label: "Partial" },
                            { id: "delivered", label: "Delivered" },
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl shadow-md shadow-indigo-500/20 gap-1.5 w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Sales Order</span>
                    </Button>
                </div>
            </div>

            {/* Orders Table */}
            {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                    Loading sales orders...
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        No Sales Orders Found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                        Book customer advance orders, track fulfillment stages, and convert confirmed orders to GST Tax Invoices in 1-click.
                    </p>
                    <Button
                        onClick={() => {
                            setEditingOrder(null);
                            setIsCreateOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-5 rounded-xl shadow-md shadow-indigo-500/20 gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Sales Order
                    </Button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-3.5">Order No & Date</th>
                                    <th className="p-3.5">Customer</th>
                                    <th className="p-3.5">Items Ordered</th>
                                    <th className="p-3.5 w-40">Delivery Progress</th>
                                    <th className="p-3.5 w-40">Procured via PO</th>
                                    <th className="p-3.5 text-right">Order Value</th>
                                    <th className="p-3.5 text-center">Status</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredOrders.map((order) => {
                                    const summary = calculateOrderStockSummary(order);
                                    const deliveryPct =
                                        summary.ordered > 0
                                            ? Math.min(100, Math.round((summary.delivered / summary.ordered) * 100))
                                            : 0;
                                    const procurePct =
                                        summary.ordered > 0
                                            ? Math.min(100, Math.round((summary.purchased / summary.ordered) * 100))
                                            : 0;

                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <td className="p-3.5">
                                                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                    #{order.order_number}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {order.order_date}
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {order.customer_name}
                                                </div>
                                                {order.customer_phone && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {order.customer_phone}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {order.items?.length || 0} line item(s)
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                    {summary.ordered} total units
                                                </div>
                                            </td>

                                            {/* Delivery Progress Bar */}
                                            <td className="p-3.5">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-500 font-mono">
                                                            {summary.delivered}/{summary.ordered} units
                                                        </span>
                                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                            {deliveryPct}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${deliveryPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Procurement Progress Bar */}
                                            <td className="p-3.5">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-500 font-mono">
                                                            {summary.purchased}/{summary.ordered} units
                                                        </span>
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {procurePct}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${procurePct}%` }}
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
                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                        Adv: ₹{Number(order.advance_paid).toLocaleString("en-IN")}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-center">
                                                {getStatusBadge(order.status)}
                                            </td>

                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {order.status !== "delivered" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setDeliveringOrder(order)}
                                                            className="h-7 text-[11px] gap-1 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                                            title="Deliver & Convert to Sale Invoice"
                                                        >
                                                            <PackageCheck className="w-3 h-3" />
                                                            <span>Deliver</span>
                                                        </Button>
                                                    )}

                                                    {summary.remainingProcurement > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setProcuringOrder(order)}
                                                            className="h-7 text-[11px] gap-1 px-2 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                                            title="Create Purchase Order from this Sale Order"
                                                        >
                                                            <Truck className="w-3 h-3" />
                                                            <span>Procure</span>
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
                                                                <History className="w-3.5 h-3.5 text-indigo-500" />
                                                                <span>View Order Timeline</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handlePreviewPDF(order)}
                                                                className="gap-2 cursor-pointer"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
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
                                                                <span>Edit Order</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(order.id, order.order_number)}
                                                                className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Delete Order</span>
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
            <CreateSaleOrderDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                saleOrderToEdit={editingOrder}
                parties={parties}
                products={products}
                userId={userId}
            />

            <ConvertOrderToInvoiceDialog
                open={!!deliveringOrder}
                onOpenChange={(open) => !open && setDeliveringOrder(null)}
                saleOrder={deliveringOrder}
                products={products}
                userId={userId}
            />

            <ProcureItemsDialog
                open={!!procuringOrder}
                onOpenChange={(open) => !open && setProcuringOrder(null)}
                saleOrder={procuringOrder}
                parties={parties}
                products={products}
                userId={userId}
            />

            <OrderTimelineDrawer
                open={!!timelineOrder}
                onOpenChange={(open) => !open && setTimelineOrder(null)}
                saleOrder={timelineOrder}
                userId={userId}
            />
        </div>
    );
};
