import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/core/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Package,
    Search,
    RefreshCw,
    LogOut,
    MapPin,
    Phone,
    ArrowRightLeft,
    Clock,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Truck,
    Shield,
    Loader2,
    ChevronDown,
    ChevronRight,
    Copy,
    Check
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useNavigate } from "react-router-dom";

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

const statusConfig: Record<string, { label: string; color: string }> = {
    pending:   { label: "Pending",   color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30" },
    accepted:  { label: "Accepted",  color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30" },
    completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30" },
    rejected:  { label: "Rejected",  color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30" },
};

export default function SalesmanDashboard() {
    const { user, signOut } = useAuth();
    const { currentStoreId, setSalesmanSession } = useBusiness();
    const { formatCurrency } = useCurrency();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [previewReturnImageUrl, setPreviewReturnImageUrl] = useState<string | null>(null);
    const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

    const localSession = useMemo(() => {
        try {
            const stored = localStorage.getItem("salesman_session");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }, []);

    const salesmanEmail = user?.email || localSession?.email;

    // 1. Fetch Salesman Profile & Store Details
    const { data: salesmanInfo, isLoading: isLoadingSalesman } = useQuery({
        queryKey: ["salesman_info", salesmanEmail],
        queryFn: async () => {
            if (!salesmanEmail) return null;
            const { data, error } = await (supabase as any)
                .from("store_salesmen")
                .select("*, profiles (business_name)")
                .eq("salesman_email", salesmanEmail.toLowerCase())
                .maybeSingle();
            
            if (error) {
                console.error("Error loading salesman info:", error);
                throw error;
            }
            return data;
        },
        enabled: !!salesmanEmail
    });

    const handleLogout = async () => {
        setSalesmanSession(null);
        await signOut();
        toast({ title: "Logged Out", description: "You have been signed out of your session." });
        navigate("/salesman-login");
    };

    // 2. Fetch Store Orders
    const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders, isFetching: isFetchingOrders } = useQuery({
        queryKey: ["salesman_online_orders", currentStoreId],
        queryFn: async () => {
            if (!currentStoreId) return [];
            const { data, error } = await supabase
                .from("online_orders")
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
        refetchInterval: autoRefresh ? 10000 : false,
    });

    // 3. Fetch Returns
    const { data: orderReturns = [], isLoading: isLoadingReturns, refetch: refetchReturns, isFetching: isFetchingReturns } = useQuery({
        queryKey: ["salesman_order_returns", currentStoreId],
        queryFn: async () => {
            if (!currentStoreId) return [];
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

            if (error) throw error;
            return data || [];
        },
        enabled: !!currentStoreId,
        refetchInterval: autoRefresh ? 10000 : false,
    });

    // 4. Update Order Status Mutation
    const updateOrderStatus = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
            const { error } = await (supabase as any)
                .from("online_orders")
                .update({ status })
                .eq("id", orderId);
            if (error) throw error;
            return { orderId, status };
        },
        onSuccess: (data) => {
            toast({ 
                title: "Order Updated 🎉", 
                description: `Status changed to ${data.status.toUpperCase()}.` 
            });
            queryClient.invalidateQueries({ queryKey: ["salesman_online_orders", currentStoreId] });
        },
        onError: (err: any) => {
            toast({ title: "Error Updating Order", description: err.message, variant: "destructive" });
        }
    });

    // 5. Update Return Status Mutation
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
            toast({ 
                title: "Return Updated 🔄", 
                description: `Return request set to ${data.status.toUpperCase()}.` 
            });
            queryClient.invalidateQueries({ queryKey: ["salesman_order_returns", currentStoreId] });
            queryClient.invalidateQueries({ queryKey: ["salesman_online_orders", currentStoreId] });
        },
        onError: (err: any) => {
            toast({ title: "Error Updating Return", description: err.message, variant: "destructive" });
        }
    });

    // 6. Setup Real-time Postgres subscriptions
    useEffect(() => {
        if (!currentStoreId) return;

        const playNotificationSound = () => {
            try {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                audio.volume = 0.5;
                audio.play().catch(() => {});
            } catch (e) {}
        };

        const channel = supabase
            .channel("salesman-dashboard-realtime")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "online_orders",
                    filter: `store_id=eq.${currentStoreId}`,
                },
                (payload) => {
                    playNotificationSound();
                    toast({
                        title: "🎉 New Order Received!",
                        description: `Incoming order from ${payload.new.customer_name}.`,
                    });
                    queryClient.invalidateQueries({ queryKey: ["salesman_online_orders", currentStoreId] });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "online_orders",
                    filter: `store_id=eq.${currentStoreId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["salesman_online_orders", currentStoreId] });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "order_returns",
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        playNotificationSound();
                        toast({
                            title: "🔄 New Return Request!",
                            description: "A customer has submitted a new return request."
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ["salesman_order_returns", currentStoreId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStoreId, queryClient, toast]);

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedOrderId(id);
        setTimeout(() => setCopiedOrderId(null), 2000);
        toast({ title: "Copied!", description: "Order ID copied to clipboard." });
    };

    const toggleExpandOrder = (id: string) => {
        setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleManualRefresh = () => {
        refetchOrders();
        refetchReturns();
        toast({ title: "Refreshing", description: "Fetching latest order logs..." });
    };

    // Filters and Search Logic
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = 
                o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customer_phone.includes(searchQuery) ||
                o.id.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = statusFilter === "all" || o.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchQuery, statusFilter]);

    const filteredReturns = useMemo(() => {
        return orderReturns.filter((r: any) => {
            const ord = r.online_orders || {};
            const matchesSearch = 
                (ord.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ord.customer_phone || "").includes(searchQuery) ||
                r.order_id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [orderReturns, searchQuery]);

    // Stat Counts
    const stats = useMemo(() => {
        const pending = orders.filter(o => o.status === "pending").length;
        const active = orders.filter(o => o.status === "accepted").length;
        const completed = orders.filter(o => o.status === "completed").length;
        const returns = orderReturns.filter((r: any) => r.status === "pending").length;
        return { pending, active, completed, returns };
    }, [orders, orderReturns]);

    if (isLoadingSalesman || !currentStoreId) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading salesman portal...</p>
            </div>
        );
    }

    const isSalesmanActive = salesmanInfo?.is_active !== false;
    const canManageOrders = salesmanInfo?.can_manage_orders !== false;
    const canManageReturns = salesmanInfo?.can_manage_returns !== false;

    // Account Suspended Screen
    if (!isSalesmanActive) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
                <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                                <Truck className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white">FinFlow Delivery</h1>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Access Suspended</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Your salesman account access has been suspended by the store owner. Please contact them to restore access.
                    </p>
                </main>
            </div>
        );
    }

    // All Permissions Revoked Screen
    if (!canManageOrders && !canManageReturns) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
                <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                                <Truck className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white">FinFlow Delivery</h1>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Permissions Revoked</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        The store owner has disabled all feature access permissions for your account. Please contact them to restore access.
                    </p>
                </main>
            </div>
        );
    }

    const businessName = salesmanInfo?.profiles?.business_name || "Assigned Store";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            {/* ── HEADER ── */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    {/* Left: Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-base tracking-tight leading-none text-slate-900 dark:text-white">FinFlow Delivery</h1>
                            <p className="text-[10px] text-muted-foreground mt-1">Fulfillment Portal</p>
                        </div>
                    </div>

                    {/* Middle: Profile Info */}
                    <div className="hidden md:flex items-center gap-3 bg-slate-100 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {salesmanInfo?.salesman_name?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{salesmanInfo?.salesman_name}</div>
                            <div className="text-[10px] text-muted-foreground">Salesman @ <span className="font-semibold text-indigo-600 dark:text-indigo-400">{businessName}</span></div>
                        </div>
                        <Badge variant="outline" className="ml-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[9px] uppercase tracking-wider font-bold">
                            Active Session
                        </Badge>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleLogout}
                            className="rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                            title="Log Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Mobile Sub-Header */}
                <div className="md:hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-slate-750 dark:text-slate-355 truncate max-w-[200px]">
                        {salesmanInfo?.salesman_name} @ {businessName}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[8px] px-1.5 font-black uppercase tracking-wider">
                        Active
                    </Badge>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
                {/* ── STATS CARDS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Pending Orders</p>
                                <h3 className="text-2xl font-black text-amber-500">{stats.pending}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Clock className="w-5 h-5 animate-pulse" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Active Deliveries</p>
                                <h3 className="text-2xl font-black text-blue-500">{stats.active}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Truck className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                                <h3 className="text-2xl font-black text-green-500">{stats.completed}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">Pending Returns</p>
                                <h3 className="text-2xl font-black text-rose-500">{stats.returns}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <ArrowRightLeft className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── CONTROLS PANEL ── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                    {/* Search bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders, phone, customer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/50"
                        />
                    </div>

                    {/* Auto-Refresh + Manual controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center gap-2">
                            <Switch 
                                id="auto-refresh" 
                                checked={autoRefresh} 
                                onCheckedChange={setAutoRefresh} 
                            />
                            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5 select-none">
                                {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                                Auto-refresh (10s)
                            </Label>
                        </div>

                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-850" />

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleManualRefresh}
                            className="h-10 rounded-xl border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-2 font-bold text-xs"
                            disabled={isFetchingOrders || isFetchingReturns}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingOrders || isFetchingReturns ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* ── TABS FOR ORDERS AND RETURNS ── */}
                <Tabs defaultValue={canManageOrders ? "orders" : "returns"} className="w-full">
                    {canManageOrders && canManageReturns && (
                        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full max-w-[400px] border border-slate-200/20 grid grid-cols-2 mb-4">
                            <TabsTrigger value="orders" className="rounded-lg py-2 font-bold text-xs transition-all">
                                Orders ({filteredOrders.length})
                            </TabsTrigger>
                            <TabsTrigger value="returns" className="rounded-lg py-2 font-bold text-xs transition-all">
                                Returns ({filteredReturns.length})
                            </TabsTrigger>
                        </TabsList>
                    )}

                    {/* ── ORDERS CONTENT ── */}
                    {canManageOrders && (
                        <TabsContent value="orders" className="outline-none space-y-4">
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
                                    onClick={() => setStatusFilter(btn.key)}
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

                        {isLoadingOrders ? (
                            <div className="py-20 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                <span className="text-sm font-medium">Fetching orders...</span>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6">
                                <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-slate-850 dark:text-slate-150">No delivery orders found</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                                    {searchQuery ? "Try refining your search query." : "New online orders from customers will appear here."}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredOrders.map((order) => {
                                    const isExpanded = !!expandedOrders[order.id];
                                    const formattedDate = new Date(order.created_at).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
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
                                                                onClick={() => handleCopyId(order.id)}
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
                                                            onClick={() => toggleExpandOrder(order.id)}
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
                                                                    onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "rejected" })}
                                                                    className="h-9 rounded-xl text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/40"
                                                                    disabled={updateOrderStatus.isPending}
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                                                    Reject
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "accepted" })}
                                                                    className="h-9 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                                    disabled={updateOrderStatus.isPending}
                                                                >
                                                                    <Check className="w-3.5 h-3.5 mr-1" />
                                                                    Accept Order
                                                                </Button>
                                                            </>
                                                        )}

                                                        {order.status === "accepted" && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: "completed" })}
                                                                className="h-9 rounded-xl text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                                                                disabled={updateOrderStatus.isPending}
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
                    </TabsContent>
                    )}

                    {/* ── RETURNS CONTENT ── */}
                    {canManageReturns && (
                        <TabsContent value="returns" className="outline-none space-y-4">
                        {isLoadingReturns ? (
                            <div className="py-20 text-center text-muted-foreground animate-pulse flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                                <span className="text-sm font-medium">Fetching returns...</span>
                            </div>
                        ) : filteredReturns.length === 0 ? (
                            <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6">
                                <ArrowRightLeft className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-slate-850 dark:text-slate-150">No returns submitted</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                                    Return requests uploaded by storefront customers will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-850">
                                            <TableRow>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Order Info</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Photo Proof</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredReturns.map((ret: any) => {
                                                const ord = ret.online_orders || {};
                                                const formattedRetDate = new Date(ret.created_at).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                });
                                                return (
                                                    <TableRow key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                                                        <TableCell>
                                                            <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{ord.customer_name || "N/A"}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">{ord.customer_phone || "N/A"}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-mono font-bold">Ord: {ret.order_id.slice(0, 8)}…</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">Amount: {formatCurrency(ord.total_amount || 0)}</div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate">
                                                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300" title={ret.reason}>{ret.reason}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">Filed: {formattedRetDate}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {ret.image_url ? (
                                                                <div 
                                                                    className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-muted cursor-pointer hover:opacity-85 transition-opacity"
                                                                    onClick={() => setPreviewReturnImageUrl(ret.image_url)}
                                                                    title="Click to zoom proof"
                                                                >
                                                                    <img src={ret.image_url} alt="Return proof" className="object-cover w-full h-full" />
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic font-medium">No photo</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                ret.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 text-[10px] font-black" :
                                                                ret.status === "rejected" ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 text-[10px] font-black" :
                                                                "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 text-[10px] font-black"
                                                            }>
                                                                {ret.status.toUpperCase()}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {ret.status === "pending" ? (
                                                                <div className="inline-flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 rounded-lg text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                                                                        disabled={updateReturnStatus.isPending}
                                                                        onClick={() => updateReturnStatus.mutate({ returnId: ret.id, status: "rejected" })}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                                        disabled={updateReturnStatus.isPending}
                                                                        onClick={() => updateReturnStatus.mutate({ returnId: ret.id, status: "approved" })}
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground font-medium italic">Processed</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                    )}
                </Tabs>
            </main>

            {/* ── RETURN PHOTO ZOOM DIALOG ── */}
            <Dialog open={!!previewReturnImageUrl} onOpenChange={() => setPreviewReturnImageUrl(null)}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center">
                    <DialogHeader className="w-full pb-3 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-600" />
                            Return Product Verification Proof
                        </DialogTitle>
                    </DialogHeader>
                    
                    {previewReturnImageUrl && (
                        <div className="relative max-h-[60vh] w-full overflow-hidden rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mt-4 flex items-center justify-center p-2">
                            <img 
                                src={previewReturnImageUrl} 
                                alt="Return verification proof" 
                                className="object-contain w-full h-auto max-h-[50vh] rounded-lg shadow-md" 
                            />
                        </div>
                    )}

                    <DialogFooter className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex justify-end">
                        <Button 
                            onClick={() => setPreviewReturnImageUrl(null)} 
                            className="rounded-xl h-10 px-6 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                        >
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
