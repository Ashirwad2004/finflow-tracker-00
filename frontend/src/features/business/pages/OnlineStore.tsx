import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
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
    Search,
    Shield,
    FileText,
    ArrowRightLeft,
    FileMinus,
    Loader2,
    CreditCard,
    Save,
    Download
} from "lucide-react";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateInvoicePDF } from "@/core/utils/invoiceGenerator";
import axios from "axios";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
    const { currentStoreId, isSalesman } = useBusiness();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const navigate = useNavigate();
    const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year" | "all">("month");

    // Payment search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    
    // Refund dialog states
    const [isRefundOpen, setIsRefundOpen] = useState(false);
    const [refundTargetId, setRefundTargetId] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState("");
    const [refundAmount, setRefundAmount] = useState("");

    // Payment settings states
    const [payUpiId, setPayUpiId] = useState("");
    const [payGateway, setPayGateway] = useState("mock");
    const [payRazorpayKeyId, setPayRazorpayKeyId] = useState("");
    const [payStripeKey, setPayStripeKey] = useState("");
    const [payOnlineEnabled, setPayOnlineEnabled] = useState(false);

    // Return image preview state
    const [previewReturnImageUrl, setPreviewReturnImageUrl] = useState<string | null>(null);

    // Salesman creation default permissions
    const [newSalesmanOrders, setNewSalesmanOrders] = useState(true);
    const [newSalesmanReturns, setNewSalesmanReturns] = useState(true);

    // Authorized request helper to include current Supabase JWT token
    const fetchWithAuth = async (url: string, options: any = {}) => {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            ...options.headers,
            Authorization: `Bearer ${session?.access_token}`,
        };
        return axios({
            url,
            ...options,
            headers,
        });
    };

    // React Query: Payments history list (with backend verification tracking)
    const { data: paymentsHistory = { payments: [], total: 0 }, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
        queryKey: ["paymentsHistory", currentStoreId, searchQuery, statusFilter],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/payments/admin/history?storeId=${currentStoreId}&search=${searchQuery}&status=${statusFilter}`);
            return res.data;
        },
        enabled: !!currentStoreId && !isSalesman,
    });

    // React Query: Gateway payment aggregated analytics
    const { data: analyticsData = { stats: null }, isLoading: isLoadingStats } = useQuery({
        queryKey: ["paymentStats", currentStoreId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/payments/admin/stats?storeId=${currentStoreId}`);
            return res.data;
        },
        enabled: !!currentStoreId && !isSalesman,
    });

    // React Query: Payment security Audit logs
    const { data: auditLogs = { logs: [] }, isLoading: isLoadingLogs } = useQuery({
        queryKey: ["paymentLogs", currentStoreId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/payments/admin/logs?storeId=${currentStoreId}`);
            return res.data;
        },
        enabled: !!currentStoreId && !isSalesman,
    });

    // React Mutation: Initiate payment refund
    const refundPayment = useMutation({
        mutationFn: async ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason: string }) => {
            const res = await fetchWithAuth("/api/payments/refund", {
                method: "POST",
                data: { paymentId, amount, reason }
            });
            return res.data;
        },
        onSuccess: () => {
            toast({
                title: "Refund Successful 🎉",
                description: "The payment has been refunded in full and updated.",
            });
            refetchHistory();
            queryClient.invalidateQueries({ queryKey: ["paymentStats", currentStoreId] });
            queryClient.invalidateQueries({ queryKey: ["paymentLogs", currentStoreId] });
        },
        onError: (err: any) => {
            console.error("Refund processing error:", err);
            toast({
                title: "Refund Denied",
                description: err.response?.data?.error ?? "Failed to issue refund. Check gateway connection.",
                variant: "destructive"
            });
        }
    });

    const triggerRefundSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!refundTargetId) return;

        refundPayment.mutate({
            paymentId: refundTargetId,
            amount: refundAmount ? Number(refundAmount) : undefined,
            reason: refundReason
        });
        
        setIsRefundOpen(false);
        setRefundTargetId(null);
        setRefundReason("");
        setRefundAmount("");
    };

    // Payment Settings Query & Mutation
    const { isLoading: isLoadingPaySettings } = useQuery({
        queryKey: ["paymentSettings", currentStoreId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("upi_id, payment_gateway, razorpay_key_id, stripe_publishable_key, online_payment_enabled")
                .eq("user_id", currentStoreId || "")
                .maybeSingle();
            if (error) throw error;
            if (data) {
                setPayUpiId((data as any).upi_id || "");
                setPayGateway((data as any).payment_gateway || "mock");
                setPayRazorpayKeyId((data as any).razorpay_key_id || "");
                setPayStripeKey((data as any).stripe_publishable_key || "");
                setPayOnlineEnabled((data as any).online_payment_enabled || false);
            }
            return data;
        },
        enabled: !!currentStoreId && !isSalesman,
    });

    const savePaymentSettings = useMutation({
        mutationFn: async () => {
            const { error } = await (supabase as any)
                .from("profiles")
                .update({
                    upi_id: payUpiId || null,
                    payment_gateway: payGateway,
                    razorpay_key_id: payRazorpayKeyId || null,
                    stripe_publishable_key: payStripeKey || null,
                    online_payment_enabled: payOnlineEnabled,
                })
                .eq("user_id", currentStoreId || "");
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Payment settings saved", description: "Your payment configuration has been updated." });
            queryClient.invalidateQueries({ queryKey: ["paymentSettings", currentStoreId] });
        },
        onError: (err: any) => {
            toast({ title: "Failed to save", description: err.message, variant: "destructive" });
        },
    });

    // Fetch store profile for invoice branding name
    const { data: storeProfile } = useQuery({
        queryKey: ["storeProfile", currentStoreId],
        queryFn: async () => {
            if (!currentStoreId) return null;
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", currentStoreId || "")
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!currentStoreId,
    });

    const chartData = useMemo(() => {
        const payments = paymentsHistory?.payments || [];
        const dailyMap = new Map<string, number>();
        for (let i = 29; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), "MMM dd");
            dailyMap.set(dateStr, 0);
        }
        
        payments.forEach((p: any) => {
            if (p.status === 'success') {
                const dateStr = format(new Date(p.created_at), "MMM dd");
                if (dailyMap.has(dateStr)) {
                    dailyMap.set(dateStr, dailyMap.get(dateStr)! + Number(p.amount || 0));
                }
            }
        });

        return Array.from(dailyMap.entries()).map(([name, value]) => ({
            name,
            revenue: value
        }));
    }, [paymentsHistory?.payments]);

    // Fetch Orders — include nested order items + product name in a single query
    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["online_orders", currentStoreId],
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
                .eq("store_id", currentStoreId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as unknown) as OnlineOrder[];
        },
        enabled: !!currentStoreId,
    });


    const updateOrderStatus = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
            if (!currentStoreId) throw new Error("Store not identified");
            const { error } = await offlineMutate({
                table: "online_orders",
                action: "update",
                recordId: orderId,
                payload: { status },
                userId: currentStoreId
            });
            if (error) throw error;
            return { orderId, status };
        },
        onSuccess: (data) => {
            const { orderId, status } = data;

            // Optimistic update for online_orders
            queryClient.setQueryData(["online_orders", currentStoreId], (old: any) => {
                return old ? old.map((o: any) => o.id === orderId ? { ...o, status } : o) : [];
            });

            // Optimistic update for pending count
            queryClient.setQueryData(["online_orders_pending_count", currentStoreId], (old: any) => {
                const orders: any[] = queryClient.getQueryData(["online_orders", currentStoreId]) || [];
                return orders.filter((o: any) => o.status === "pending").length;
            });

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
                queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
                if (status === "rejected") {
                    queryClient.invalidateQueries({ queryKey: ["products"] });
                }
            }
            toast({ title: "Status Updated", description: "Order status has been updated." });
        },
    });

    // React Query: Returns list states (using 30s as a slow fallback since we have real-time postgres changes subscription)
    const [returnsRefreshInterval, setReturnsRefreshInterval] = useState<number | false>(30000);
    const [lastUpdatedReturns, setLastUpdatedReturns] = useState<Date>(new Date());

    const { data: orderReturns = [], isLoading: isLoadingReturns, isFetching: isFetchingReturns, refetch: refetchReturns } = useQuery({
        queryKey: ["orderReturns", currentStoreId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("order_returns")
                .select(`
                    *,
                    online_orders (
                        id,
                        customer_name,
                        customer_phone,
                        customer_address,
                        total_amount,
                        created_at
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching returns:", error);
                throw error;
            }
            setLastUpdatedReturns(new Date());
            return data || [];
        },
        enabled: !!currentStoreId,
        refetchInterval: returnsRefreshInterval,
    });

    const updateReturnStatus = useMutation({
        mutationFn: async ({ returnId, status }: { returnId: string; status: string }) => {
            const { error } = await (supabase as any)
                .from("order_returns")
                .update({ status })
                .eq("id", returnId);
            if (error) throw error;
            return { returnId, status };
        },
        onSuccess: (data) => {
            toast({ title: "Return Updated", description: `Return status has been set to ${data.status}.` });
            refetchReturns();
            queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // React Query: Salesmen list
    const { data: salesmen = [], isLoading: isLoadingSalesmen, refetch: refetchSalesmen } = useQuery({
        queryKey: ["storeSalesmen", currentStoreId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("store_salesmen")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching salesmen:", error);
                throw error;
            }
            return data || [];
        },
        enabled: !!currentStoreId && !isSalesman,
    });

    const addSalesman = useMutation({
        mutationFn: async (newSalesman: { 
            name: string; 
            email: string; 
            phone?: string; 
            password?: string;
            can_manage_orders?: boolean;
            can_manage_returns?: boolean;
        }) => {
            const { error } = await (supabase as any)
                .from("store_salesmen")
                .insert({
                    store_id: currentStoreId,
                    salesman_email: newSalesman.email.trim().toLowerCase(),
                    salesman_name: newSalesman.name.trim(),
                    salesman_phone: newSalesman.phone?.trim() || null,
                    salesman_password: newSalesman.password?.trim(),
                    can_manage_orders: newSalesman.can_manage_orders ?? true,
                    can_manage_returns: newSalesman.can_manage_returns ?? true,
                    is_active: true
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Salesman Added", description: "Salesman has been granted access to order fulfillment." });
            refetchSalesmen();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const updateSalesmanSettings = useMutation({
        mutationFn: async ({ 
            id, 
            is_active, 
            can_manage_orders, 
            can_manage_returns 
        }: { 
            id: string; 
            is_active?: boolean; 
            can_manage_orders?: boolean; 
            can_manage_returns?: boolean; 
        }) => {
            const updatePayload: any = {};
            if (is_active !== undefined) updatePayload.is_active = is_active;
            if (can_manage_orders !== undefined) updatePayload.can_manage_orders = can_manage_orders;
            if (can_manage_returns !== undefined) updatePayload.can_manage_returns = can_manage_returns;

            const { error } = await (supabase as any)
                .from("store_salesmen")
                .update(updatePayload)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Permissions Updated", description: "Salesman access permissions updated successfully." });
            refetchSalesmen();
        },
        onError: (err: any) => {
            toast({ title: "Error Updating Permissions", description: err.message, variant: "destructive" });
        }
    });

    const removeSalesman = useMutation({
        mutationFn: async (salesmanId: string) => {
            const { error } = await supabase
                .from("store_salesmen")
                .delete()
                .eq("id", salesmanId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Salesman Removed", description: "The salesman has been removed." });
            refetchSalesmen();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    useEffect(() => {
        if (!currentStoreId) return;

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
                    filter: `store_id=eq.${currentStoreId}`,
                },
                (payload) => {
                    playNotificationSound();
                    
                    toast({
                        title: "🎉 New Order Received!",
                        description: `Incoming order from ${payload.new.customer_name}.`,
                    });
                    
                    // Invalidate to fetch fresh data including nested items
                    queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
                    queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'online_orders',
                    filter: `store_id=eq.${currentStoreId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["online_orders", currentStoreId] });
                    queryClient.invalidateQueries({ queryKey: ["online_orders_pending_count", currentStoreId] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_returns',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        playNotificationSound();
                        toast({
                            title: "🔄 New Return Request!",
                            description: "A customer has submitted a new return request."
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ["orderReturns", currentStoreId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStoreId, queryClient, toast]);


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
                    {!isSalesman && (
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
                    )}
                </div>

                {/* SaaS Metrics Dashboard */}
                {!isSalesman && (
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
                )}

                <div className="flex-1">
                    <Tabs defaultValue="orders" className="w-full space-y-6">
                        <TabsList className={`grid h-12 w-full bg-muted/65 p-1 rounded-xl border ${
                            isSalesman ? "grid-cols-2 max-w-xs" : "grid-cols-8 max-w-6xl"
                        }`}>
                            <TabsTrigger value="orders" className="rounded-lg text-xs font-semibold">
                                Orders
                            </TabsTrigger>
                            {!isSalesman && (
                                <>
                                    <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold">
                                        Payments
                                    </TabsTrigger>
                                    <TabsTrigger value="refunds" className="rounded-lg text-xs font-semibold font-semibold">
                                        Refunds
                                    </TabsTrigger>
                                </>
                            )}
                            <TabsTrigger value="returns" className="rounded-lg text-xs font-semibold">
                                Returns
                            </TabsTrigger>
                            {!isSalesman && (
                                <>
                                    <TabsTrigger value="salesmen" className="rounded-lg text-xs font-semibold">
                                        Salesmen
                                    </TabsTrigger>
                                    <TabsTrigger value="analytics" className="rounded-lg text-xs font-semibold">
                                        Analytics
                                    </TabsTrigger>
                                    <TabsTrigger value="audit" className="rounded-lg text-xs font-semibold">
                                        Audit
                                    </TabsTrigger>
                                    <TabsTrigger value="pay-settings" className="rounded-lg text-xs font-semibold">
                                        <CreditCard className="w-3 h-3 mr-1" /> Pay Setup
                                    </TabsTrigger>
                                </>
                            )}
                        </TabsList>

                        {/* ── 1. INCOMING ORDERS TAB ── */}
                        <TabsContent value="orders">
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
                                                Once customers start placing orders on your storefront, they will appear here.
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
                        </TabsContent>

                        {/* ── 2. PAYMENTS LEDGER TAB ── */}
                        <TabsContent value="payments" className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 border p-4 rounded-xl">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by customer, invoice..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-10 bg-background"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[140px] bg-background">
                                            <SelectValue placeholder="All Payments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=" ">All Payments</SelectItem>
                                            <SelectItem value="success">Success</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="failed">Failed</SelectItem>
                                            <SelectItem value="refunded">Refunded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="bg-card border rounded-xl shadow-sm">
                                {isLoadingHistory ? (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : !paymentsHistory.payments || paymentsHistory.payments.length === 0 ? (
                                    <div className="text-center py-20 px-4">
                                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FileText className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-base font-semibold mb-1">No payment transactions</h3>
                                        <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms.</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Invoice & Gateway ID</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentsHistory.payments.map((p: any) => {
                                                const invNum = p.invoices?.[0]?.invoice_number || "Pending";
                                                return (
                                                    <TableRow key={p.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-sm">
                                                                {p.online_orders?.customer_name ?? "Walk-in Guest"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {p.online_orders?.customer_phone ?? "N/A"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-mono text-xs">{invNum}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[150px]">
                                                                {p.gateway_payment_id || p.gateway_order_id}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {new Date(p.created_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-sm">
                                                            {formatCurrency(p.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-xs uppercase font-medium text-muted-foreground">
                                                            {p.payment_method || "online"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                p.status === 'success' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-[10px]' :
                                                                p.status === 'refunded' ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 text-[10px]' :
                                                                p.status === 'failed' ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100 text-[10px]' :
                                                                'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-[10px]'
                                                            }>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-2" onClick={e => e.stopPropagation()}>
                                                            {p.status === 'success' && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 rounded-lg text-xs"
                                                                        onClick={() => {
                                                                            generateInvoicePDF({
                                                                                invoiceNumber: invNum,
                                                                                date: new Date(p.created_at).toLocaleDateString(),
                                                                                storeName: storeProfile?.business_name || "FinFlow Shop Store",
                                                                                customerName: p.online_orders?.customer_name || "Customer",
                                                                                customerPhone: p.online_orders?.customer_phone || "",
                                                                                customerAddress: p.online_orders?.customer_address || "",
                                                                                items: p.online_orders?.online_order_items?.map((it: any) => ({
                                                                                    name: it.products?.name ?? "Product Item",
                                                                                    quantity: it.quantity || 1,
                                                                                    price: Number(it.price_at_time || 0)
                                                                                })) || [],
                                                                                subtotal: Number(p.amount) - Number(p.online_orders?.delivery_charge || 0),
                                                                                deliveryCharge: Number(p.online_orders?.delivery_charge || 0),
                                                                                totalAmount: Number(p.amount),
                                                                                paymentMethod: p.payment_method || "online",
                                                                                status: p.status
                                                                            });
                                                                        }}
                                                                    >
                                                                        <Download className="w-3.5 h-3.5 mr-1" />
                                                                        Invoice
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-8 rounded-lg text-xs"
                                                                        onClick={() => {
                                                                            setRefundTargetId(p.id);
                                                                            setRefundAmount(p.amount.toString());
                                                                            setIsRefundOpen(true);
                                                                        }}
                                                                    >
                                                                        <FileMinus className="w-3.5 h-3.5 mr-1" />
                                                                        Refund
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </TabsContent>

                        {/* ── 3. REFUNDS HISTORY TAB ── */}
                        <TabsContent value="refunds">
                            <div className="bg-card border rounded-xl shadow-sm">
                                <div className="p-6 border-b">
                                    <h2 className="text-xl font-semibold">Refunded Transactions Ledger</h2>
                                </div>
                                <div className="p-0">
                                    {isLoadingHistory ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                                                    ) : !paymentsHistory?.payments?.some((p: any) => p.status === 'refunded') ? (
                                        <div className="text-center py-20 px-4">
                                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                <RefreshCw className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-base font-semibold mb-1">No refunds processed</h3>
                                            <p className="text-xs text-muted-foreground">Successful refunds requested by users will appear here.</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Payment & Refund ID</TableHead>
                                                    <TableHead>Refund Date</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(paymentsHistory?.payments || [])
                                                    .filter((p: any) => p.status === 'refunded')
                                                    .map((p: any) => {
                                                        const refund = p.refunds?.[0] || {};
                                                        return (
                                                            <TableRow key={p.id}>
                                                                <TableCell>
                                                                    <div className="font-semibold text-sm">{p.online_orders?.customer_name}</div>
                                                                    <div className="text-xs text-muted-foreground">{p.online_orders?.customer_phone}</div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="font-mono text-xs truncate max-w-[150px]">{p.gateway_payment_id}</div>
                                                                    <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{refund.gateway_refund_id || "N/A"}</div>
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    {refund.created_at ? new Date(refund.created_at).toLocaleDateString() : new Date(p.updated_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="font-bold text-sm text-purple-700">
                                                                    {formatCurrency(p.amount)}
                                                                </TableCell>
                                                                <TableCell className="text-xs italic text-muted-foreground">
                                                                    {refund.reason || "Merchant Refund"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 text-[10px]">
                                                                        REFUNDED
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                             </div>
                        </TabsContent>

                        {/* ── RETURNS MANAGEMENT TAB ── */}
                        <TabsContent value="returns" className="space-y-4">
                            <div className="bg-card border rounded-xl shadow-sm">
                                <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold">Order Return Requests</h2>
                                        <Badge variant="secondary">{orderReturns.length} total</Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Status Indicator */}
                                        {returnsRefreshInterval ? (
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-450 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="font-semibold">Live Monitoring ({returnsRefreshInterval / 1000}s)</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border">
                                                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                                                <span className="font-semibold">Monitoring Paused</span>
                                            </div>
                                        )}

                                        {/* Last Updated Timestamp */}
                                        <span className="text-xs text-muted-foreground hidden md:inline">
                                            Last updated: {lastUpdatedReturns.toLocaleTimeString()}
                                        </span>

                                        {/* Interval Selector */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">Interval:</span>
                                            <Select
                                                value={returnsRefreshInterval === false ? "off" : returnsRefreshInterval.toString()}
                                                onValueChange={(val) => {
                                                    if (val === "off") {
                                                        setReturnsRefreshInterval(false);
                                                    } else {
                                                        setReturnsRefreshInterval(Number(val));
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[80px] text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="off">Off</SelectItem>
                                                    <SelectItem value="5000">5s</SelectItem>
                                                    <SelectItem value="10000">10s</SelectItem>
                                                    <SelectItem value="30000">30s</SelectItem>
                                                    <SelectItem value="60000">1m</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Manual Refresh Button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2.5 gap-1.5 text-xs"
                                            onClick={() => refetchReturns()}
                                            disabled={isFetchingReturns}
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingReturns ? 'animate-spin' : ''}`} />
                                            <span className="hidden sm:inline">Refresh</span>
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-0">
                                    {isLoadingReturns ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        </div>
                                    ) : !orderReturns || orderReturns.length === 0 ? (
                                        <div className="text-center py-20 px-4">
                                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                <ArrowRightLeft className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-base font-semibold mb-1">No return requests</h3>
                                            <p className="text-xs text-muted-foreground">Return requests submitted by storefront customers will appear here.</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Order Info</TableHead>
                                                    <TableHead>Return Date</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Product Photo</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {orderReturns.map((ret: any) => {
                                                    const ord = ret.online_orders || {};
                                                    const formattedRetDate = new Date(ret.created_at).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    });
                                                    return (
                                                        <TableRow key={ret.id}>
                                                            <TableCell>
                                                                <div className="font-semibold text-sm">{ord.customer_name || "N/A"}</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">{ord.customer_phone || "N/A"}</div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-xs font-semibold">Order ID: {ret.order_id.slice(0, 8)}…</div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">Amount: {formatCurrency(ord.total_amount || 0)}</div>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {formattedRetDate}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-slate-700 max-w-[200px] truncate" title={ret.reason}>
                                                                {ret.reason}
                                                            </TableCell>
                                                            <TableCell>
                                                                {ret.image_url ? (
                                                                    <div 
                                                                        className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                                                                        onClick={() => setPreviewReturnImageUrl(ret.image_url)}
                                                                    >
                                                                        <img src={ret.image_url} alt="Return product proof" className="object-cover w-full h-full" />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">No image</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={
                                                                    ret.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-[10px]' :
                                                                    ret.status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100 text-[10px]' :
                                                                    'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-[10px]'
                                                                }>
                                                                    {ret.status.toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-2">
                                                                {ret.status === 'pending' ? (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 rounded-lg text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                                                            disabled={updateReturnStatus.isPending}
                                                                            onClick={() => updateReturnStatus.mutate({ returnId: ret.id, status: 'approved' })}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 rounded-lg text-xs bg-rose-50 text-rose-750 hover:bg-rose-100 border-rose-200"
                                                                            disabled={updateReturnStatus.isPending}
                                                                            onClick={() => updateReturnStatus.mutate({ returnId: ret.id, status: 'rejected' })}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">Processed</span>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                         </TabsContent>

                        {/* ── SALESMEN MANAGEMENT TAB ── */}
                        {!isSalesman && (
                            <TabsContent value="salesmen" className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left: Add Salesman Form */}
                                    <div className="bg-card border rounded-xl shadow-sm p-6 h-fit space-y-4">
                                        <div>
                                            <h3 className="text-lg font-bold">Add New Salesman</h3>
                                            <p className="text-xs text-muted-foreground">Assign a salesman by their email to grant order completion access</p>
                                        </div>
                                        <form onSubmit={(e) => {
                                             e.preventDefault();
                                             const formData = new FormData(e.target as HTMLFormElement);
                                             const name = formData.get("name") as string;
                                             const email = formData.get("email") as string;
                                             const phone = formData.get("phone") as string;
                                             const password = formData.get("password") as string;
                                             addSalesman.mutate({ 
                                                 name, 
                                                 email, 
                                                 phone, 
                                                 password,
                                                 can_manage_orders: newSalesmanOrders,
                                                 can_manage_returns: newSalesmanReturns
                                             }, {
                                                 onSuccess: () => {
                                                     (e.target as HTMLFormElement).reset();
                                                     setNewSalesmanOrders(true);
                                                     setNewSalesmanReturns(true);
                                                 }
                                             });
                                         }} className="space-y-3.5">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="salesman-name">Full Name <span className="text-red-400">*</span></Label>
                                                <Input id="salesman-name" name="name" placeholder="John Doe" required className="h-10 rounded-xl" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="salesman-email">Email Address <span className="text-red-400">*</span></Label>
                                                <Input id="salesman-email" name="email" type="email" placeholder="john@example.com" required className="h-10 rounded-xl" />
                                                <p className="text-[10px] text-muted-foreground">The salesman will use this email address to log in.</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="salesman-password">Password <span className="text-red-400">*</span></Label>
                                                <Input id="salesman-password" name="password" type="text" placeholder="Create a password" required className="h-10 rounded-xl" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="salesman-phone">Phone Number</Label>
                                                <Input id="salesman-phone" name="phone" placeholder="+91 98765 43210" className="h-10 rounded-xl" />
                                            </div>
                                            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Permissions</Label>
                                                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40">
                                                    <div className="space-y-0.5">
                                                        <Label htmlFor="new-can-orders" className="text-xs font-bold cursor-pointer">Manage Orders</Label>
                                                        <p className="text-[10px] text-muted-foreground">Allow processing delivery orders</p>
                                                    </div>
                                                    <Switch 
                                                        id="new-can-orders"
                                                        checked={newSalesmanOrders}
                                                        onCheckedChange={setNewSalesmanOrders}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40">
                                                    <div className="space-y-0.5">
                                                        <Label htmlFor="new-can-returns" className="text-xs font-bold cursor-pointer">Manage Returns</Label>
                                                        <p className="text-[10px] text-muted-foreground">Allow processing return requests</p>
                                                    </div>
                                                    <Switch 
                                                        id="new-can-returns"
                                                        checked={newSalesmanReturns}
                                                        onCheckedChange={setNewSalesmanReturns}
                                                    />
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-10 rounded-xl font-semibold mt-2" disabled={addSalesman.isPending}>
                                                {addSalesman.isPending ? (
                                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
                                                ) : (
                                                    "Grant Access"
                                                )}
                                            </Button>
                                        </form>
                                    </div>

                                    {/* Right: Active Salesmen List */}
                                    <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-6 border-b flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold">Active Salesmen</h3>
                                                <p className="text-xs text-muted-foreground">List of authorized salesmen who can process and complete delivery orders</p>
                                            </div>
                                            <Badge variant="secondary" className="px-2.5 py-0.5 rounded-full">{salesmen.length} active</Badge>
                                        </div>

                                        {isLoadingSalesmen ? (
                                            <div className="flex items-center justify-center py-20 flex-1">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            </div>
                                        ) : salesmen.length === 0 ? (
                                            <div className="text-center py-24 px-4 flex-1">
                                                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <User className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <h4 className="text-sm font-bold mb-1">No salesmen assigned yet</h4>
                                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                                    Use the form on the left to add a salesman and give them access to order fulfillment.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border flex-1">
                                                {salesmen.map((slm: any) => (
                                                    <div key={slm.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/10 gap-4 transition-colors">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-foreground">{slm.salesman_name}</span>
                                                                {slm.is_active === false ? (
                                                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Suspended</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">Active</Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-mono">{slm.salesman_email}</span>
                                                                {slm.salesman_phone && (
                                                                    <>
                                                                        <span className="text-border">·</span>
                                                                        <span>{slm.salesman_phone}</span>
                                                                    </>
                                                                )}
                                                                <span className="text-border">·</span>
                                                                <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">Pwd: {slm.salesman_password}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 md:gap-6 bg-slate-50/50 dark:bg-slate-900/30 p-2 px-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    id={`active-toggle-${slm.id}`}
                                                                    checked={slm.is_active !== false}
                                                                    disabled={updateSalesmanSettings.isPending}
                                                                    onCheckedChange={(checked) => {
                                                                        updateSalesmanSettings.mutate({ id: slm.id, is_active: checked });
                                                                    }}
                                                                />
                                                                <Label htmlFor={`active-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                                                                    Status
                                                                </Label>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    id={`orders-toggle-${slm.id}`}
                                                                    checked={slm.can_manage_orders !== false}
                                                                    disabled={updateSalesmanSettings.isPending || slm.is_active === false}
                                                                    onCheckedChange={(checked) => {
                                                                        updateSalesmanSettings.mutate({ id: slm.id, can_manage_orders: checked });
                                                                    }}
                                                                />
                                                                <Label htmlFor={`orders-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                                                                    Orders
                                                                </Label>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    id={`returns-toggle-${slm.id}`}
                                                                    checked={slm.can_manage_returns !== false}
                                                                    disabled={updateSalesmanSettings.isPending || slm.is_active === false}
                                                                    onCheckedChange={(checked) => {
                                                                        updateSalesmanSettings.mutate({ id: slm.id, can_manage_returns: checked });
                                                                    }}
                                                                />
                                                                <Label htmlFor={`returns-toggle-${slm.id}`} className="text-xs font-semibold cursor-pointer">
                                                                    Returns
                                                                </Label>
                                                            </div>

                                                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-850 hidden sm:block" />

                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-8 border-rose-200 text-rose-650 hover:bg-rose-55 hover:text-rose-700 bg-rose-50/10 rounded-lg text-xs"
                                                                onClick={() => removeSalesman.mutate(slm.id)}
                                                                disabled={removeSalesman.isPending}
                                                            >
                                                                Revoke Access
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        {/* ── 4. REVENUE ANALYTICS TAB ── */}
                        <TabsContent value="analytics" className="space-y-6">
                            {isLoadingStats ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            ) : !analyticsData.stats ? (
                                <div className="text-center py-20 border rounded-xl bg-card">
                                    <p className="text-muted-foreground text-sm">No analytics statistics compiled yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left 2 cols: Monthly distribution line chart */}
                                    <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm p-6">
                                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            Daily Sales Activity (Gateway Volume)
                                        </h3>
                                        <div className="h-[280px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip formatter={(value) => [`INR ${value}`, 'Revenue']} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="revenue"
                                                        stroke="hsl(262, 83%, 58%)"
                                                        strokeWidth={3}
                                                        dot={{ r: 4, strokeWidth: 1 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Right 1 col: payment methods distribution */}
                                    <div className="bg-card border rounded-xl shadow-sm p-6 flex flex-col">
                                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                            <ArrowRightLeft className="w-4 h-4 text-primary" />
                                            Methods Distribution
                                        </h3>
                                        <div className="h-[180px] flex-1 relative flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analyticsData.stats.paymentMethodsBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={70}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {analyticsData.stats.paymentMethodsBreakdown.map((entry: any, index: number) => {
                                                            const colors = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];
                                                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] text-muted-foreground border-t pt-4">
                                            {analyticsData.stats.paymentMethodsBreakdown.map((entry: any, i: number) => {
                                                const colors = ["bg-indigo-600", "bg-emerald-500", "bg-amber-500", "bg-red-500"];
                                                return (
                                                    <div key={entry.name} className="flex items-center gap-1.5">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                                                        <span className="font-semibold text-foreground">{entry.name} ({entry.value})</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* ── 5. PAYMENT AUDIT LOGS TAB ── */}
                        <TabsContent value="audit">
                            <div className="bg-card border rounded-xl shadow-sm">
                                <div className="p-6 border-b flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <h2 className="text-xl font-semibold">Payment Security & Audit Ledger</h2>
                                </div>
                                <div className="p-0">
                                    {isLoadingLogs ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : !auditLogs.logs || auditLogs.logs.length === 0 ? (
                                        <div className="text-center py-20 px-4">
                                            <p className="text-muted-foreground text-sm">No transaction audit logs recorded yet.</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Audit Date</TableHead>
                                                    <TableHead>Action</TableHead>
                                                    <TableHead>IP Address</TableHead>
                                                    <TableHead>Transaction / Order ID</TableHead>
                                                    <TableHead>Audit Parameters & Metadata</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {auditLogs.logs.map((log: any) => (
                                                    <TableRow key={log.id} className="hover:bg-muted/10 font-medium">
                                                        <TableCell className="text-xs">
                                                            {new Date(log.created_at).toLocaleString("en-IN")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={
                                                                log.action === 'payment_success' ? 'border-green-300 text-green-700 bg-green-50/50' :
                                                                log.action === 'refund_success' ? 'border-purple-300 text-purple-700 bg-purple-50/50' :
                                                                log.action === 'payment_failed' ? 'border-red-300 text-red-700 bg-red-50/50' :
                                                                'border-slate-350 text-slate-700 bg-slate-50/50'
                                                            }>
                                                                {log.action}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                                            {log.ip_address || "System Event"}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[130px]">
                                                            {log.payments?.gateway_order_id || "N/A"}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                                                            {JSON.stringify(log.details)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── 6. PAYMENT SETTINGS TAB ── */}
                        <TabsContent value="pay-settings" className="space-y-6">
                            <div className="bg-card border rounded-2xl p-6 space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Payment Gateway Settings</h3>
                                        <p className="text-xs text-muted-foreground">Configure how you receive online payments from customers</p>
                                    </div>
                                </div>

                                {isLoadingPaySettings ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Enable/Disable Online Payments */}
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold">Enable Online Payments</p>
                                                <p className="text-xs text-muted-foreground">Allow customers to pay online via UPI, Cards, Netbanking, and Wallets</p>
                                            </div>
                                            <Switch
                                                checked={payOnlineEnabled}
                                                onCheckedChange={setPayOnlineEnabled}
                                            />
                                        </div>

                                        {/* UPI VPA Address */}
                                        <div className="space-y-2">
                                            <Label htmlFor="upi-id" className="text-sm font-bold">Your UPI ID (VPA)</Label>
                                            <Input
                                                id="upi-id"
                                                placeholder="yourshop@upi or yourshop@okhdfcbank"
                                                value={payUpiId}
                                                onChange={(e) => setPayUpiId(e.target.value)}
                                                className="h-11 rounded-xl"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                This UPI ID will be embedded in QR codes shown to your customers during checkout.
                                                Payments will be sent directly to this address.
                                            </p>
                                        </div>

                                        {/* Payment Gateway Selection */}
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold">Payment Gateway</Label>
                                            <Select value={payGateway} onValueChange={setPayGateway}>
                                                <SelectTrigger className="h-11 rounded-xl">
                                                    <SelectValue placeholder="Select gateway" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="mock">Mock Gateway (Testing)</SelectItem>
                                                    <SelectItem value="razorpay">Razorpay (India)</SelectItem>
                                                    <SelectItem value="stripe">Stripe (International)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">
                                                Use Mock Gateway for testing. Switch to Razorpay or Stripe for live payments.
                                            </p>
                                        </div>

                                        {/* Conditional Gateway Keys */}
                                        {payGateway === "razorpay" && (
                                            <div className="space-y-2 p-4 rounded-xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                                                <Label htmlFor="rzp-key" className="text-sm font-bold">Razorpay Key ID</Label>
                                                <Input
                                                    id="rzp-key"
                                                    placeholder="rzp_live_xxxxxxxxxxxxxxx"
                                                    value={payRazorpayKeyId}
                                                    onChange={(e) => setPayRazorpayKeyId(e.target.value)}
                                                    className="h-11 rounded-xl"
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Find this in your Razorpay Dashboard &rarr; Settings &rarr; API Keys
                                                </p>
                                            </div>
                                        )}

                                        {payGateway === "stripe" && (
                                            <div className="space-y-2 p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                                                <Label htmlFor="stripe-key" className="text-sm font-bold">Stripe Publishable Key</Label>
                                                <Input
                                                    id="stripe-key"
                                                    placeholder="pk_live_xxxxxxxxxxxxxxx"
                                                    value={payStripeKey}
                                                    onChange={(e) => setPayStripeKey(e.target.value)}
                                                    className="h-11 rounded-xl"
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Find this in your Stripe Dashboard &rarr; Developers &rarr; API Keys
                                                </p>
                                            </div>
                                        )}

                                        {/* Status Summary */}
                                        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Configuration</p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${payOnlineEnabled ? 'bg-green-500' : 'bg-red-400'}`} />
                                                    <span className="text-muted-foreground">Online Payments:</span>
                                                    <span className="font-bold">{payOnlineEnabled ? 'Enabled' : 'Disabled'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Gateway:</span>
                                                    <span className="font-bold capitalize">{payGateway}</span>
                                                </div>
                                                <div className="flex items-center gap-2 col-span-2">
                                                    <CreditCard className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-muted-foreground">UPI ID:</span>
                                                    <span className="font-bold">{payUpiId || 'Not configured'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Save Button */}
                                        <Button
                                            onClick={() => savePaymentSettings.mutate()}
                                            disabled={savePaymentSettings.isPending}
                                            className="w-full h-12 rounded-xl font-bold text-sm"
                                        >
                                            {savePaymentSettings.isPending ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                            ) : (
                                                <><Save className="w-4 h-4 mr-2" /> Save Payment Settings</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* ── Refund Validation Dialog ── */}
            <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-destructive" />
                            Trigger Customer Refund
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Specify refund request values. Action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={triggerRefundSubmit} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="refund-amt">Refund Amount (INR)</Label>
                            <Input
                                id="refund-amt"
                                type="number"
                                placeholder="Leave blank to refund full amount"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="refund-res">Reason for Refund <span className="text-red-400">*</span></Label>
                            <Input
                                id="refund-res"
                                placeholder="Customer cancellation / Stock shortage"
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                required
                            />
                        </div>
                        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRefundOpen(false)}
                                className="rounded-xl h-10"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                className="rounded-xl h-10 font-bold"
                                disabled={refundPayment.isPending}
                            >
                                {refundPayment.isPending ? "Refunding..." : "Confirm Refund"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Return Photo Fullscreen Dialog ── */}
            <Dialog open={!!previewReturnImageUrl} onOpenChange={() => setPreviewReturnImageUrl(null)}>
                <DialogContent className="max-w-2xl bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
                    <DialogHeader className="w-full pb-3 border-b">
                        <DialogTitle className="text-base font-bold">Return Product Verification Photo</DialogTitle>
                    </DialogHeader>
                    {previewReturnImageUrl && (
                        <div className="relative max-h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-muted mt-4">
                            <img 
                                src={previewReturnImageUrl} 
                                alt="Return product proof fullscreen" 
                                className="object-contain w-full h-auto max-h-[60vh] mx-auto" 
                            />
                        </div>
                    )}
                    <DialogFooter className="w-full pt-4 border-t mt-4 flex justify-end">
                        <Button onClick={() => setPreviewReturnImageUrl(null)} className="rounded-xl h-10 px-6 font-bold">
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
