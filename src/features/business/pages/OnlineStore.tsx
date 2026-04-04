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
import { Globe, ShoppingBag, ExternalLink, RefreshCw, Activity, Copy, CheckCircle2 } from "lucide-react";
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

interface OnlineOrder {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    status: string;
    total_amount: number;
    created_at: string;
}

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
        enabled: !!user
    });

    useEffect(() => {
        if (profile) {
            setStoreSlug((profile as any).store_slug || "");
            setIsStoreActive((profile as any).is_store_active || false);
        }
    }, [profile]);

    // Fetch Orders
    const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ["online_orders", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase.from as any)("online_orders")
                .select("*")
                .eq("store_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as unknown) as OnlineOrder[];
        },
        enabled: !!user
    });

    const updateStoreConfig = async () => {
        setIsSaving(true);
        const { error } = await (supabase.from as any)("profiles")
            .update({ 
                store_slug: storeSlug,
                is_store_active: isStoreActive 
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
        mutationFn: async ({ orderId, status }: { orderId: string, status: string }) => {
            const { error } = await (supabase.from as any)("online_orders")
                .update({ status })
                .eq("id", orderId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["online_orders"] });
            toast({ title: "Status Updated", description: "Order status has been updated." });
        }
    });
    
    // Derived public store URL based on current origin
    const publicUrl = `${window.location.origin}/store/${storeSlug}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Store link copied to clipboard." });
    };

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
                                    <Switch 
                                        checked={isStoreActive} 
                                        onCheckedChange={setIsStoreActive} 
                                    />
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
                                            onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="my-business"
                                            className="rounded-l-none"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">This is your unique link to share with customers.</p>
                                </div>

                                <Button 
                                    className="w-full" 
                                    onClick={updateStoreConfig} 
                                    disabled={isSaving}
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : "Save Settings"}
                                </Button>
                            </div>
                        </div>

                        {storeSlug && (
                            <div className={`rounded-xl p-5 shadow-sm border relative overflow-hidden ${isStoreActive ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-muted/40 border-dashed'}`}>
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
                                        <Badge variant="outline" className="mb-3 text-xs border-dashed">
                                            Store is Inactive
                                        </Badge>
                                    )}
                                    <p className="text-sm font-semibold mb-1">Your Storefront Link</p>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {isStoreActive ? 'Share this link with customers to accept orders.' : 'Enable the store above to let customers visit this link.'}
                                    </p>
                                    <div className="bg-white rounded-lg border px-3 py-2 text-xs font-mono text-muted-foreground break-all mb-3 select-all">
                                        {publicUrl}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" className="flex-1" onClick={handleCopyLink}>
                                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                            {copied ? 'Copied!' : 'Copy Link'}
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(publicUrl, '_blank')} disabled={!isStoreActive}>
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
                                <h2 className="text-xl font-semibold">Incoming Orders</h2>
                                <Badge variant="secondary">{orders.length} total</Badge>
                            </div>
                            
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
                                                <TableHead>Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="[&_tr:last-child]:border-0">
                                            {orders.map((order) => (
                                                <TableRow key={order.id} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="font-medium">{order.customer_name}</div>
                                                        <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {formatCurrency(order.total_amount)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={
                                                            order.status === 'completed' ? 'default' :
                                                            order.status === 'rejected' ? 'destructive' :
                                                            order.status === 'accepted' ? 'secondary' : 'outline'
                                                        } className="capitalize">
                                                            {order.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Select 
                                                            defaultValue={order.status} 
                                                            onValueChange={(val) => updateOrderStatus.mutate({ orderId: order.id, status: val })}
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
