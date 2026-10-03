import React from "react";
import {
    Package,
    MapPin,
    Phone,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OnlineOrder, statusConfig } from "./types";

interface OrdersTabProps {
    orders: OnlineOrder[];
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    searchQuery: string;
    isLoading: boolean;
    expandedOrders: Record<string, boolean>;
    onToggleExpand: (id: string) => void;
    copiedOrderId: string | null;
    onCopyId: (id: string) => void;
    onUpdateStatus: (orderId: string, status: string) => void;
    isUpdatingStatus: boolean;
    formatCurrency: (amount: number) => string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
    orders,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    isLoading,
    expandedOrders,
    onToggleExpand,
    copiedOrderId,
    onCopyId,
    onUpdateStatus,
    isUpdatingStatus,
    formatCurrency,
}) => {
    return (
        <div className="outline-none space-y-4">
            {/* Status Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {[
                    { key: "all", label: "All Orders" },
                    { key: "pending", label: "Pending" },
                    { key: "accepted", label: "Accepted (Active)" },
                    { key: "completed", label: "Completed" },
                    { key: "rejected", label: "Rejected" },
                ].map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => onStatusFilterChange(btn.key)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-tight transition-all duration-200 ${
                            statusFilter === btn.key
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-650/15"
                                : "bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400"
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Fetching orders...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6">
                    <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-850 dark:text-slate-150">No delivery orders found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        {searchQuery ? "Try refining your search query." : "New online orders from customers will appear here."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {orders.map((order) => {
                        const isExpanded = !!expandedOrders[order.id];
                        const formattedDate = new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        return (
                            <Card key={order.id} className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4 md:p-6 space-y-4">
                                    {/* Header Row */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground font-medium">Order ID:</span>
                                                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-300">
                                                    {order.id.slice(0, 8)}…
                                                </span>
                                                <button 
                                                    onClick={() => onCopyId(order.id)}
                                                    className="text-muted-foreground hover:text-indigo-600 transition-colors"
                                                    title="Copy full order ID"
                                                >
                                                    {copiedOrderId === order.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={`h-6 rounded-full font-bold text-[10px] px-2.5 border tracking-wide uppercase ${statusConfig[order.status]?.color || ""}`}>
                                                {statusConfig[order.status]?.label || order.status}
                                            </Badge>
                                            
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => onToggleExpand(order.id)}
                                                className="w-8 h-8 rounded-full border border-slate-200/80 dark:border-slate-700/80"
                                            >
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Customer and Contact Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Customer Name</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{order.customer_name}</div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Customer Phone</div>
                                            <div className="flex items-center gap-2">
                                                <a 
                                                    href={`tel:${order.customer_phone}`} 
                                                    className="text-sm font-bold text-indigo-650 hover:underline flex items-center gap-1 dark:text-indigo-400"
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {order.customer_phone}
                                                </a>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Delivery Address</div>
                                            <div className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {order.customer_address}
                                                </div>
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:opacity-85 transition-opacity"
                                                    title="Open Address in Maps"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Items Drawer */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Items in Order</div>
                                            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-850/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                                {order.online_order_items?.map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {item.quantity}x {item.products?.name || "Deleted Product"}
                                                        </span>
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {formatCurrency(item.quantity * item.price_at_time)}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="border-t border-slate-200/50 dark:border-slate-700/30 my-2 pt-2 flex justify-between items-center text-xs font-semibold text-muted-foreground">
                                                    <span>Delivery Fee</span>
                                                    <span>{formatCurrency(order.delivery_charge || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-1">
                                                    <span>Grand Total</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(order.total_amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-xs font-black text-slate-900 dark:text-white">
                                            Total: <span className="text-sm text-indigo-600 dark:text-indigo-400 font-extrabold">{formatCurrency(order.total_amount)}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            {order.status === "pending" && (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => onUpdateStatus(order.id, "rejected")}
                                                        className="h-9 rounded-xl text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/40"
                                                        disabled={isUpdatingStatus}
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                                        Reject
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => onUpdateStatus(order.id, "accepted")}
                                                        className="h-9 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                        disabled={isUpdatingStatus}
                                                    >
                                                        <Check className="w-3.5 h-3.5 mr-1" />
                                                        Accept Order
                                                    </Button>
                                                </>
                                            )}

                                            {order.status === "accepted" && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => onUpdateStatus(order.id, "completed")}
                                                    className="h-9 rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                                                    disabled={isUpdatingStatus}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                    Mark Delivered
                                                </Button>
                                            )}

                                            {(order.status === "completed" || order.status === "rejected") && (
                                                <span className="text-xs text-muted-foreground italic flex items-center gap-1 font-medium">
                                                    <Check className="w-3.5 h-3.5 text-slate-455" />
                                                    Fulfilled & Settled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
