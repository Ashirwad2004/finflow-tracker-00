
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency, CURRENCIES } from "@/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Globe } from "lucide-react";
import { BusinessDetailsDialog } from "@/components/BusinessDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const SettingsPage = () => {
    const { isBusinessMode, toggleBusinessMode } = useBusiness();
    const { currency, setCurrency } = useCurrency();
    const { user } = useAuth();

    const [showBusinessDialog, setShowBusinessDialog] = useState(false);

    const handleBusinessToggle = async (checked: boolean) => {
        if (checked) {
            // Check if business details exist
            const { data } = await supabase
                .from("profiles")
                .select("business_name")
                .eq("user_id", user?.id)
                .single();

            const hasDetails = (data as any)?.business_name;

            if (!hasDetails) {
                setShowBusinessDialog(true);
            } else {
                toggleBusinessMode(true);
            }
        } else {
            toggleBusinessMode(false);
        }
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-4 max-w-2xl animate-fade-in">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <div className="space-y-6">
                    {/* Business Mode Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                <CardTitle>Business Preferences</CardTitle>
                            </div>
                            <CardDescription>
                                Customize features for small business usage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-1">
                                    <Label htmlFor="business-mode" className="text-base">Business Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Enable tax tracking, invoices, and reimbursable expenses.
                                    </p>
                                </div>
                                <Switch
                                    id="business-mode"
                                    checked={isBusinessMode}
                                    onCheckedChange={handleBusinessToggle}
                                    className="transition-all duration-300"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Currency Section */}

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" />
                                <CardTitle>Regional Settings</CardTitle>
                            </div>
                            <CardDescription>
                                Set your currency and locale preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select
                                    value={currency.code}
                                    onValueChange={(val) => {
                                        const selected = CURRENCIES.find(c => c.code === val);
                                        if (selected) setCurrency(selected);
                                    }}
                                >
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.name} ({c.symbol})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <BusinessDetailsDialog
                open={showBusinessDialog}
                onOpenChange={setShowBusinessDialog}
                onSuccess={() => toggleBusinessMode(true)}
            />
        </AppLayout>
    );
};

export default SettingsPage;
