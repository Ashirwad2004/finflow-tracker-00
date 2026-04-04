import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
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
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
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

    const [storeSlug, setStoreSlug] = useState("");
    const [isStoreActive, setIsStoreActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch profile
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase.from as any)("profiles")
                .select("*")
                .eq("user_id", user?.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (profile) {
            setStoreSlug((profile as any).store_slug || "");
            setIsStoreActive((profile as any).is_store_active || false);
        }
    }, [profile]);

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

    const updateStoreConfig = async () => {
        setIsSaving(true);
        const { error } = await (supabase.from as any)("profiles")
            .update({
                store_slug: storeSlug,
                is_store_active: isStoreActive,
            } as any)
            .eq("user_id", user?.id);

        setIsSaving(false);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Saved", description: "Online store settings updated." });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
    };

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

    const publicUrl = `${window.location.origin}/store/${storeSlug}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Store link copied to clipboard." });
    };

    // Count by status for summary badges
    const pendingCount = orders.filter(o => o.status === "pending").length;

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <ShoppingBag className="w-8 h-8 text-primary" />
                            Online Store
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your public storefront and incoming online orders
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Settings Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b bg-muted/40">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Store Configuration
                                </h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Enable Store</Label>
                                        <p className="text-xs text-muted-foreground">Make your store visible to the public</p>
                                    </div>
                                    <Switch checked={isStoreActive} onCheckedChange={setIsStoreActive} />
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="storeSlug">Store URL Slug</Label>
                                    <div className="flex">
                                        <div className="bg-muted px-3 border border-r-0 rounded-l-md flex items-center text-sm text-muted-foreground whitespace-nowrap">
                                            {window.location.host}/store/
                                        </div>
                                        <Input
                                            id="storeSlug"
                                            value={storeSlug}
                                            onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                            placeholder="my-business"
                                            className="rounded-l-none"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">This is your unique link to share with customers.</p>
                                </div>

                                <Button className="w-full" onClick={updateStoreConfig} disabled={isSaving}>
                                    {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : "Save Settings"}
                                </Button>
                            </div>
                        </div>

                        {storeSlug && (
                            <div className={`rounded-xl p-5 shadow-sm border relative overflow-hidden ${isStoreActive ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" : "bg-muted/40 border-dashed"}`}>
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Globe className="w-20 h-20 text-primary" />
                                </div>
                                <div className="relative z-10">
                                    {isStoreActive ? (
                                        <Badge className="mb-3 bg-green-500/15 text-green-700 hover:bg-green-500/20 border-green-400/30 text-xs">
                                            <Activity className="w-3 h-3 mr-1" />
                                            Store is Live
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="mb-3 text-xs border-dashed">Store is Inactive</Badge>
                                    )}
                                    <p className="text-sm font-semibold mb-1">Your Storefront Link</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {isStoreActive ? "Share this link with customers to accept orders." : "Enable the store above to let customers visit this link."}
                                    </p>
                                    <div className="bg-white rounded-lg border px-3 py-2 text-xs font-mono text-muted-foreground break-all mb-3 select-all">
                                        {publicUrl}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" className="flex-1" onClick={handleCopyLink}>
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                            {copied ? "Copied!" : "Copy Link"}
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(publicUrl, "_blank")} disabled={!isStoreActive}>
                                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                            Preview
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Orders Panel */}
                    <div className="lg:col-span-2">
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
