import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ShoppingBag,
    TrendingUp,
    Users,
    Package,
    Search,
    Download,
    FileText,
    FileSpreadsheet,
    ArrowUpDown,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface OnlineOrder {
    id: string;
    store_id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    status: string;
    total_amount: number;
    created_at: string;
}

interface OnlineOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
}

interface Product {
    id: string;
    name: string;
    unit: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
    accepted: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
};

function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────────

export const OnlineStoreReport = () => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortField, setSortField] = useState<"date" | "amount">("date");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

    // ── Fetch orders (owner only via RLS) ────────────────────────────────
    const { data: orders = [], isLoading: ordersLoading } = useQuery<OnlineOrder[]>({
        queryKey: ["onlineOrders", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("online_orders")
                .select("*")
                .eq("store_id", user?.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as OnlineOrder[];
        },
        enabled: !!user,
    });

    // ── Fetch order items ────────────────────────────────────────────────
    const { data: orderItems = [] } = useQuery<OnlineOrderItem[]>({
        queryKey: ["onlineOrderItems", user?.id],
        queryFn: async () => {
            if (!orders.length) return [];
            const orderIds = orders.map(o => o.id);
            const { data, error } = await (supabase as any)
                .from("online_order_items")
                .select("*")
                .in("order_id", orderIds);
            if (error) throw error;
            return data as OnlineOrderItem[];
        },
        enabled: !!user && orders.length > 0,
    });

    // ── Fetch products for name lookup ───────────────────────────────────
    const { data: products = [] } = useQuery<Product[]>({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("products")
                .select("id, name, unit")
                .eq("user_id", user?.id);
            if (error) throw error;
            return data as Product[];
        },
        enabled: !!user,
    });

    // ── Derived statistics ───────────────────────────────────────────────
    const stats = useMemo(() => {
        const completed = orders.filter(o => o.status === "completed");
        const pending   = orders.filter(o => o.status === "pending");
        const accepted  = orders.filter(o => o.status === "accepted");
        const rejected  = orders.filter(o => o.status === "rejected");

        const totalRevenue = completed.reduce((s, o) => s + Number(o.total_amount), 0);
        const pendingValue = [...pending, ...accepted].reduce((s, o) => s + Number(o.total_amount), 0);
        const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size;

        // Items sold per product
        const productSales: Record<string, { qty: number; revenue: number; name: string; unit: string }> = {};
        orderItems.forEach(item => {
            const p = products.find(x => x.id === item.product_id);
            const key = item.product_id;
            if (!productSales[key]) productSales[key] = { qty: 0, revenue: 0, name: p?.name ?? "Unknown", unit: p?.unit ?? "pc" };
            // Only count revenue from completed orders
            const parentOrder = orders.find(o => o.id === item.order_id);
            productSales[key].qty += item.quantity;
            if (parentOrder?.status === "completed") {
                productSales[key].revenue += item.quantity * item.price_at_time;
            }
        });

        const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

        return {
            totalOrders: orders.length,
            completedOrders: completed.length,
            pendingOrders: pending.length,
            acceptedOrders: accepted.length,
            rejectedOrders: rejected.length,
            totalRevenue,
            pendingValue,
            uniqueCustomers,
            topProducts,
            productSales,
        };
    }, [orders, orderItems, products]);

    // ── Filtered + sorted order list ─────────────────────────────────────
    const filteredOrders = useMemo(() => {
        let list = orders;
        if (statusFilter !== "all") list = list.filter(o => o.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(o =>
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_phone.includes(q) ||
                o.id.toLowerCase().includes(q)
            );
        }
        list = [...list].sort((a, b) => {
            if (sortField === "date") {
                return sortDir === "desc"
                    ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return sortDir === "desc"
                ? Number(b.total_amount) - Number(a.total_amount)
                : Number(a.total_amount) - Number(b.total_amount);
        });
        return list;
    }, [orders, statusFilter, search, sortField, sortDir]);

    const toggleSort = (field: "date" | "amount") => {
        if (sortField === field) setSortDir(d => (d === "desc" ? "asc" : "desc"));
        else { setSortField(field); setSortDir("desc"); }
    };

    // ── Export helpers ───────────────────────────────────────────────────
    const handleExportCSV = () => {
        const rows = filteredOrders.map(o => ({
            "Order ID": o.id,
            "Date": new Date(o.created_at).toLocaleString(),
            "Customer": o.customer_name,
            "Phone": o.customer_phone,
            "Address": o.customer_address,
            "Status": o.status,
            "Amount": o.total_amount,
        }));
        exportCSV(rows, `online-store-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleExportProductCSV = () => {
        const rows = Object.values(stats.productSales).map(p => ({
            "Product": p.name,
            "Units Sold": p.qty,
            "Revenue from Completed Orders": p.revenue,
        }));
        exportCSV(rows, `online-store-products-${new Date().toISOString().slice(0, 10)}.csv`);
    };

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stats.uniqueCustomers} unique customers</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardTitle className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Completed Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-bold text-green-800 dark:text-green-200">{formatCurrency(stats.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stats.completedOrders} fulfilled orders</p>
                    </CardContent>
                </Card>

                <Card className="bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardTitle className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Pending Value</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">{formatCurrency(stats.pendingValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{stats.pendingOrders} pending, {stats.acceptedOrders} accepted</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
                    <CardHeader className="pb-1 pt-4 px-4">
                        <CardTitle className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="text-3xl font-bold text-red-800 dark:text-red-200">{stats.rejectedOrders}</div>
                        <p className="text-xs text-muted-foreground mt-1">of {stats.totalOrders} total orders</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Top Products ── */}
            {stats.topProducts.length > 0 && (
                <Card>
                    <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" />
                                Top Selling Products
                            </CardTitle>
                            <CardDescription>Ranked by units ordered across all order statuses</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExportProductCSV}>
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                            Export CSV
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Units Ordered</TableHead>
                                    <TableHead className="text-right">Revenue (Completed)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.topProducts.map((p, i) => (
                                    <TableRow key={i} className="hover:bg-accent/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-primary/10 rounded-full text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium">{p.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{p.qty} {p.unit}</TableCell>
                                        <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                                            {p.revenue > 0 ? formatCurrency(p.revenue) : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ── All Orders Table ── */}
            <Card>
                <CardHeader className="pb-3 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                                All Orders
                            </CardTitle>
                            <CardDescription>
                                {filteredOrders.length} of {orders.length} orders
                                {statusFilter !== "all" ? ` · filtered by "${statusFilter}"` : ""}
                            </CardDescription>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                            {/* Search */}
                            <div className="relative w-full sm:w-52">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name / phone…"
                                    className="pl-9 h-9"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Status filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 w-full sm:w-36">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="accepted">Accepted</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Export */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 whitespace-nowrap">
                                        <Download className="w-4 h-4 mr-2" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={handleExportCSV}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                        Orders CSV (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportProductCSV}>
                                        <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                        Products CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {ordersLoading ? (
                        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading orders…</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No orders found</p>
                            <p className="text-sm">
                                {search || statusFilter !== "all"
                                    ? "Try changing your filters."
                                    : "Orders placed via your storefront will appear here."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>
                                            <button
                                                onClick={() => toggleSort("date")}
                                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                            >
                                                Date
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button
                                                onClick={() => toggleSort("amount")}
                                                className="flex items-center gap-1 hover:text-foreground transition-colors"
                                            >
                                                Amount
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map(order => (
                                        <TableRow key={order.id} className="hover:bg-accent/50 transition-colors">
                                            <TableCell>
                                                <div className="font-medium">{order.customer_name}</div>
                                                <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[180px]">
                                                <span className="line-clamp-2 text-muted-foreground">{order.customer_address}</span>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {new Date(order.created_at).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(order.created_at).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">
                                                {formatCurrency(Number(order.total_amount))}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                    {order.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
