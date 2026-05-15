import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useToast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, RefreshCw, Copy, CheckCircle2, Activity, ExternalLink } from "lucide-react";

export function StoreSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();

    const [storeSlug, setStoreSlug] = useState("");
    const [isStoreActive, setIsStoreActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [deliveryCharge, setDeliveryCharge] = useState<number | "">("");
    const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | "">("");

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase.from as any)("profiles")
                .select("*")
                .eq("user_id", user?.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (profile !== undefined && isInitialLoading) {
            if (profile) {
                setStoreSlug((profile as any).store_slug || "");
                setIsStoreActive((profile as any).is_store_active || false);
                setDeliveryCharge((profile as any).delivery_charge || "");
                setFreeDeliveryThreshold((profile as any).free_delivery_min_amount || "");
            }
            setIsInitialLoading(false);
        }
    }, [profile, isInitialLoading]);

    const updateStoreConfig = async () => {
        setIsSaving(true);
        
        const finalSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
        
        const { data: updatedProfile, error } = await (supabase.from as any)("profiles")
            .update({
                store_slug: finalSlug || null,
                is_store_active: isStoreActive,
                delivery_charge: deliveryCharge || 0,
                free_delivery_min_amount: freeDeliveryThreshold || 0,
            } as any)
            .eq("user_id", user?.id)
            .select();

        setIsSaving(false);

        if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate key')) {
                toast({ 
                    title: "URL Already Taken", 
                    description: "That Store URL Slug is already used by another business. Please choose a different one.", 
                    variant: "destructive" 
                });
            } else {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        } else if (!updatedProfile || updatedProfile.length === 0) {
            toast({ title: "Error", description: "Could not update profile. You might not have permission.", variant: "destructive" });
        } else {
            setStoreSlug(finalSlug);
            toast({ title: "Saved", description: "Online store settings updated." });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
    };

    const publicUrl = `${window.location.origin}/store/${storeSlug}`;

    const handleCopyLink = () => {
        const cleanUrl = window.location.hostname.includes("localhost") || window.location.hostname.includes("tauri") 
            ? `https://finflow.app/store/${storeSlug}` 
            : publicUrl;
        navigator.clipboard.writeText(cleanUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Store link copied to clipboard." });
    };

    return (
        <Card className="rounded-md">
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Online Store Configuration</CardTitle>
                </div>
                <CardDescription className="text-xs">
                    Manage your public storefront link and delivery fees.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                {/* Store Status Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Enable Store</Label>
                        <p className="text-[11px] text-muted-foreground">Make your store visible to the public</p>
                    </div>
                    <Switch checked={isStoreActive} onCheckedChange={setIsStoreActive} className="scale-90" />
                </div>

                {/* Slug Input */}
                <div className="space-y-2">
                    <Label htmlFor="storeSlug" className="text-xs">Store URL Slug</Label>
                    <div className="flex">
                        <div className="bg-muted px-2.5 border border-r-0 rounded-l-md flex items-center text-[11px] text-muted-foreground whitespace-nowrap">
                            {window.location.host}/store/
                        </div>
                        <Input
                            id="storeSlug"
                            value={storeSlug}
                            onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            placeholder="my-business"
                            className="rounded-l-none h-8 text-xs"
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">This is your unique link to share with customers.</p>
                </div>

                {/* Fees Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="deliveryCharge" className="text-xs">Delivery Charge ({formatCurrency(0).replace(/\d/g, '').trim()})</Label>
                        <Input
                            id="deliveryCharge"
                            type="number"
                            min="0"
                            step="0.01"
                            value={deliveryCharge}
                            onChange={(e) => setDeliveryCharge(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="e.g. 50"
                            className="h-8 text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="freeDeliveryThreshold" className="text-xs">Free Delivery Over ({formatCurrency(0).replace(/\d/g, '').trim()})</Label>
                        <Input
                            id="freeDeliveryThreshold"
                            type="number"
                            min="0"
                            step="0.01"
                            value={freeDeliveryThreshold}
                            onChange={(e) => setFreeDeliveryThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="e.g. 300"
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                <Button onClick={updateStoreConfig} disabled={isSaving} size="sm" className="w-full">
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : "Save Store Settings"}
                </Button>

                {/* Preview Box */}
                {storeSlug && (
                    <div className={`mt-6 rounded-xl p-5 shadow-sm border relative overflow-hidden ${isStoreActive ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" : "bg-muted/40 border-dashed"}`}>
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
                            <div className="bg-white rounded-lg border px-3 py-2 text-xs font-mono text-muted-foreground break-all mb-3 select-all max-w-fit">
                                {window.location.hostname.includes("localhost") || window.location.hostname.includes("tauri") 
                                    ? `https://finflow.app/store/${storeSlug}` 
                                    : publicUrl}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                    {copied ? "Copied!" : "Copy Link"}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => window.open(`/store/${storeSlug}`, '_blank')} 
                                    disabled={!isStoreActive}
                                >
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                    Preview Store
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
