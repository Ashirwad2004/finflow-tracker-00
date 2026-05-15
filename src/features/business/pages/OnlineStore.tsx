import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
    Globe,
    ShoppingBag,
    ExternalLink,
    RefreshCw,
    Activity,
    Copy,
    CheckCircle2,
    MapPin,
    Phone,
    User,
    Package,
    ChevronDown,
    ChevronRight,
    Clock,
    Calendar,
    BarChart3,
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
    products: {
        name: string;
    } | null;
}

interface OnlineOrder {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    status: string;
    total_amount: number;
    delivery_charge: number;
    created_at: string;
    online_order_items: OrderItem[];
}

// ── Status helpers ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
    pending:   { label: "Pending",   variant: "outline",     color: "text-amber-600 bg-amber-50 border-amber-200" },
    accepted:  { label: "Accepted",  variant: "secondary",   color: "text-blue-600 bg-blue-50 border-blue-200" },
    completed: { label: "Completed", variant: "default",     color: "text-green-600 bg-green-50 border-green-200" },
    rejected:  { label: "Rejected",  variant: "destructive", color: "text-red-600 bg-red-50 border-red-200" },
};

// ── Expandable Order Row ───────────────────────────────────────────────────────
function OrderRow({
    order,
    formatCurrency,
    onStatusChange,
    isUpdating,
}: {
    order: OnlineOrder;
    formatCurrency: (n: number) => string;
    onStatusChange: (orderId: string, status: string) => void;
    isUpdating: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const cfg = statusConfig[order.status] ?? statusConfig.pending;

    const formattedDate = new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const formattedTime = new Date(order.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <>
            {/* ── Main Row ── */}
            <TableRow
                className="cursor-pointer hover:bg-muted/40 transition-colors select-none"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Expand chevron + Customer */}
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground flex-shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                        <div>
                            <div className="font-semibold text-sm">{order.customer_name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {order.customer_phone}
                            </div>
                        </div>
                    </div>
                </TableCell>

                {/* Date */}
                <TableCell className="text-sm">
                    <div className="font-medium">{formattedDate}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formattedTime}
                    </div>
                </TableCell>

                {/* Items count */}
                <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="w-3.5 h-3.5" />
                        <span>{order.online_order_items?.length ?? 0} item{(order.online_order_items?.length ?? 0) !== 1 ? "s" : ""}</span>
                    </div>
                </TableCell>

                {/* Amount */}
                <TableCell className="font-semibold text-sm">
                    {formatCurrency(order.total_amount)}
                </TableCell>

                {/* Status badge */}
                <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        {cfg.label}
                    </span>
                </TableCell>

                {/* Status update — stop propagation so clicking the select doesn't toggle the row */}
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Select
                        defaultValue={order.status}
                        onValueChange={(val) => onStatusChange(order.id, val)}
                        disabled={isUpdating}
                    >
                        <SelectTrigger className="w-[130px] ml-auto h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
            </TableRow>

            {/* ── Expandable Detail Panel ── */}
            {expanded && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={6} className="p-0">
                        <div className="px-6 py-5 border-t border-dashed border-border space-y-4 animate-fade-in">

                            {/* ── Delivery Address ── */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-background border border-border">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        Delivery Address
                                    </p>
                                    {order.customer_address ? (
                                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                            {order.customer_address}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No address provided</p>
                                    )}
                                </div>
                            </div>

                            {/* ── Order Items ── */}
                            {order.online_order_items && order.online_order_items.length > 0 && (
                                <div className="rounded-xl border border-border overflow-hidden bg-background">
                                    <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Ordered Items
                                        </span>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {order.online_order_items.map((item, idx) => (
                                            <div key={item.id ?? idx} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                                                        style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(290 80% 60%))" }}
                                                    >
                                                        {item.quantity}
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground truncate">
                                                        {item.products?.name ?? `Product (${item.product_id.slice(0, 8)}…)`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatCurrency(item.price_at_time)} × {item.quantity}
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                                                        {formatCurrency(item.price_at_time * item.quantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Total row */}
                                    {order.delivery_charge > 0 && (
                                        <div className="flex items-center justify-between px-4 pt-3 pb-1 border-t border-border bg-muted/30">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                Delivery Fee
                                            </span>
                                            <span className="text-sm font-semibold text-muted-foreground">
                                                {formatCurrency(order.delivery_charge)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex items-center justify-between px-4 pb-3 ${order.delivery_charge > 0 ? "pt-1" : "pt-3 border-t border-border"} bg-muted/30`}>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Order Total
                                        </span>
                                        <span className="text-sm font-black text-primary">
                                            {formatCurrency(order.total_amount)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ── Customer info row ── */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                                <User className="w-3 h-3" />
                                <span>{order.customer_name}</span>
                                <span className="text-border">·</span>
                                <Phone className="w-3 h-3" />
                                <span>{order.customer_phone}</span>
                                <span className="text-border">·</span>
                                <Clock className="w-3 h-3" />
                                <span>Placed on {formattedDate} at {formattedTime}</span>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OnlineStore() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();

    const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year" | "all">("month");

    // Fetch Orders — include nested order items + product name in a single query
    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["online_orders", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase.from as any)("online_orders")
                .select(`
                    *,
                    online_order_items (
                        id,
                        product_id,
                        quantity,
                        price_at_time,
                        products ( name )
                    )
                `)
                .eq("store_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as unknown) as OnlineOrder[];
        },
        enabled: !!user,
    });


    const updateOrderStatus = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
            const { error } = await (supabase.from as any)("online_orders")
                .update({ status })
                .eq("id", orderId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["online_orders"] });
            toast({ title: "Status Updated", description: "Order status has been updated." });
        },
    });

    // ── Real-time Order Subscription ──────────────────────────────────────────
    useEffect(() => {
        if (!user?.id) return;

        // Play a subtle notification sound (optional, browsers may block if no interaction)
        const playNotificationSound = () => {
            try {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (e) {}
        };

        const channel = supabase
            .channel('realtime-online-orders')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'online_orders',
                    filter: `store_id=eq.${user.id}`,
                },
                (payload) => {
                    playNotificationSound();
                    
                    toast({
                        title: "🎉 New Order Received!",
                        description: `Incoming order from ${payload.new.customer_name}.`,
                    });
                    
                    // Invalidate to fetch fresh data including nested items
                    queryClient.invalidateQueries({ queryKey: ["online_orders"] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'online_orders',
                    filter: `store_id=eq.${user.id}`,
                },
                () => {
                    // Silently update if an order is modified (e.g., status changed from customer side or another device)
                    queryClient.invalidateQueries({ queryKey: ["online_orders"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient, toast]);


    // Count by status for summary badges
    const pendingCount = orders.filter(o => o.status === "pending").length;

    // Calculate Dynamic SaaS Metrics
    const now = new Date();
    let startTime = 0;
    
    if (dateFilter === "today") {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (dateFilter === "week") {
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Mon, 6 for Sun
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    } else if (dateFilter === "month") {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (dateFilter === "year") {
        startTime = new Date(now.getFullYear(), 0, 1).getTime();
    } // "all" -> 0

    let filteredSales = 0;
    let filteredOrdersCount = 0;
    let filteredDeliveryFee = 0;

    orders.forEach(order => {
        // Only count accepted or completed orders for revenue metrics
        if (order.status !== "completed" && order.status !== "accepted") return;
        
        const orderTime = new Date(order.created_at).getTime();
        if (orderTime >= startTime) {
            filteredSales += (order.total_amount || 0);
            filteredDeliveryFee += (order.delivery_charge || 0);
            filteredOrdersCount++;
        }
    });

    const avgOrderValue = filteredOrdersCount > 0 ? filteredSales / filteredOrdersCount : 0;

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ShoppingBag className="w-8 h-8 text-primary" />
                            Online Store
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your public storefront and incoming online orders
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Showing:</span>
                        <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                            <SelectTrigger className="w-[160px] bg-background">
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* SaaS Metrics Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</span>
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-foreground">{formatCurrency(filteredSales)}</span>
                    </div>
                    <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Orders</span>
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-foreground">{filteredOrdersCount}</span>
                    </div>
                    <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Order Value</span>
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-violet-600" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-foreground">{formatCurrency(avgOrderValue)}</span>
                    </div>
                    <div className="bg-card rounded-xl border shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Fees</span>
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        <span className="text-2xl font-black text-foreground">{formatCurrency(filteredDeliveryFee)}</span>
                    </div>
                </div>

                <div className="flex-1">
                    {/* Orders Panel */}
                    <div>
                        <div className="bg-card border rounded-xl shadow-sm h-full flex flex-col">
                            <div className="p-6 border-b flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-semibold">Incoming Orders</h2>
                                    {pendingCount > 0 && (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-xs">
                                            {pendingCount} pending
                                        </Badge>
                                    )}
                                </div>
                                <Badge variant="secondary">{orders.length} total</Badge>
                            </div>

                            {/* Helper hint */}
                            {orders.length > 0 && (
                                <div className="px-6 py-2.5 border-b border-dashed border-border bg-muted/20">
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <ChevronDown className="w-3 h-3" />
                                        Click any row to view delivery address and order items
                                    </p>
                                </div>
                            )}

                            <div className="p-0 flex-1 relative">
                                {isLoadingOrders ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div className="text-center py-24 px-4">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Once customers start placing orders on your public storefront, they will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Date & Time</TableHead>
                                                <TableHead>Items</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Update</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="[&_tr:last-child]:border-0">
                                            {orders.map((order) => (
                                                <OrderRow
                                                    key={order.id}
                                                    order={order}
                                                    formatCurrency={formatCurrency}
                                                    onStatusChange={(id, status) => updateOrderStatus.mutate({ orderId: id, status })}
                                                    isUpdating={updateOrderStatus.isPending}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
