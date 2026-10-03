import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useToast } from "@/core/hooks/use-toast";
import { OnlineOrder, OrderReturn, SalesmanStats } from "./types";

export function useSalesmanDashboard() {
    const { user, signOut } = useAuth();
    const { currentStoreId, setSalesmanSession } = useBusiness();
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
        enabled: !!salesmanEmail,
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
            return (data || []) as OrderReturn[];
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
            } catch (_) {}
        };

        const channel = supabase
            .channel(`salesman-dashboard-realtime:${currentStoreId}`)
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
    const stats: SalesmanStats = useMemo(() => {
        const pending = orders.filter(o => o.status === "pending").length;
        const active = orders.filter(o => o.status === "accepted").length;
        const completed = orders.filter(o => o.status === "completed").length;
        const returns = orderReturns.filter((r: any) => r.status === "pending").length;
        return { pending, active, completed, returns };
    }, [orders, orderReturns]);

    const isSalesmanActive = salesmanInfo?.is_active !== false;
    const canManageOrders = salesmanInfo?.can_manage_orders !== false;
    const canManageReturns = salesmanInfo?.can_manage_returns !== false;
    const businessName = salesmanInfo?.profiles?.business_name || "Assigned Store";

    return {
        currentStoreId,
        salesmanInfo,
        isLoadingSalesman,
        isSalesmanActive,
        canManageOrders,
        canManageReturns,
        businessName,
        orders,
        orderReturns,
        filteredOrders,
        filteredReturns,
        stats,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        autoRefresh,
        setAutoRefresh,
        isFetchingOrders,
        isFetchingReturns,
        isLoadingOrders,
        isLoadingReturns,
        expandedOrders,
        copiedOrderId,
        previewReturnImageUrl,
        setPreviewReturnImageUrl,
        handleLogout,
        handleManualRefresh,
        handleCopyId,
        toggleExpandOrder,
        updateOrderStatus,
        updateReturnStatus,
    };
}
