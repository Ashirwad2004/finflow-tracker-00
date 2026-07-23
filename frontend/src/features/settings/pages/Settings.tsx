import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency, CURRENCIES } from "@/core/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Globe, Download, Loader2, FileJson, FileSpreadsheet, Sliders, Bell, Clock, CreditCard, Sparkles, ShieldCheck } from "lucide-react";
import { getOverdueDaysThreshold, setOverdueDaysThreshold } from "@/core/utils/overdue";
import { BusinessDetailsDialog } from "@/features/business/components/BusinessDetailsDialog";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useToast } from "@/core/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StoreSettings } from "../components/StoreSettings";
import { NotificationSettings } from "../components/NotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealSubscriptionCheckout } from "@/features/landing/components/RealSubscriptionCheckout";

type BackupFormat = "json" | "csv";

const convertToCSV = (data: Record<string, unknown[]>): string => {
    const csvSections: string[] = [];

    for (const [tableName, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;

        // Add section header
        csvSections.push(`\n=== ${tableName.toUpperCase()} ===\n`);

        // Get headers from first row
        const headers = Object.keys(rows[0] as object);
        csvSections.push(headers.join(","));

        // Add data rows
        for (const row of rows) {
            const values = headers.map((header) => {
                const value = (row as Record<string, unknown>)[header];
                if (value === null || value === undefined) return "";
                if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            });
            csvSections.push(values.join(","));
        }
    }

    return csvSections.join("\n");
};

const SettingsPage = () => {
    const { isBusinessMode, toggleBusinessMode } = useBusiness();
    const { currency, setCurrency } = useCurrency();
    const { user } = useAuth();
    const { toast } = useToast();

    const [showBusinessDialog, setShowBusinessDialog] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [autoAddParties, setAutoAddParties] = useState(() => {
        return localStorage.getItem("finflow_auto_add_parties") === "true";
    });
    const [overdueDays, setOverdueDays] = useState<number>(() => getOverdueDaysThreshold());

    // Fetch user's subscription status
    const { data: subStatus, isLoading: subLoading } = useQuery({
        queryKey: ["subscription_status", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await (supabase as any)
                .from("subscription_status")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();
            if (error) console.warn("Fetch subscription status warning:", error.message);
            return data || { plan: "starter", status: "active" };
        },
        enabled: !!user?.id,
    });

    const handleOverdueDaysChange = (val: string) => {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
            setOverdueDays(num);
            setOverdueDaysThreshold(num);
            toast({
                title: "Overdue Setting Saved",
                description: `Unpaid bills older than ${num} days will now automatically flag as Overdue across the system.`,
            });
        }
    };

    const handleAutoAddPartiesToggle = (checked: boolean) => {
        setAutoAddParties(checked);
        localStorage.setItem("finflow_auto_add_parties", checked ? "true" : "false");
        toast({
            title: checked ? "Feature Enabled" : "Feature Disabled",
            description: checked 
                ? "New customers will be automatically saved to your Parties directory." 
                : "New customers will not be saved automatically.",
        });
    };

    const handleBusinessToggle = async (checked: boolean) => {
        if (checked) {
            // Check if business details exist
            const { data } = await supabase
                .from("profiles" as any)
                .select("business_name")
                .eq("user_id", user?.id || "")
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

    const handleBackup = async (format: BackupFormat) => {
        if (!user) {
            toast({
                title: "Error",
                description: "You must be logged in to backup data",
                variant: "destructive",
            });
            return;
        }

        setIsBackingUp(true);
        try {
            const { data, error } = await supabase.functions.invoke("backup-data");

            if (error) {
                throw new Error(error.message);
            }

            const dateStr = new Date().toISOString().split('T')[0];
            let blob: Blob;
            let filename: string;

            if (format === "csv") {
                // Convert to CSV format
                const csvData = {
                    expenses: data.expenses || [],
                    budgets: data.budgets || [],
                    lentMoney: data.lentMoney || [],
                    borrowedMoney: data.borrowedMoney || [],
                    sales: data.sales || [],
                    purchases: data.purchases || [],
                    products: data.products || [],
                };
                const csvContent = convertToCSV(csvData);
                blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                filename = `finflow-backup-${dateStr}.csv`;
            } else {
                blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                filename = `finflow-backup-${dateStr}.json`;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: "Backup Complete",
                description: `Your data has been downloaded as ${format.toUpperCase()}`,
            });
        } catch (error) {
            console.error("Backup error:", error);
            toast({
                title: "Backup Failed",
                description: error instanceof Error ? error.message : "Failed to backup data",
                variant: "destructive",
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    const activePlanName = subStatus?.plan ? subStatus.plan.toUpperCase() : "STARTER";

    return (
        <AppLayout>
            <div className="container mx-auto p-4 max-w-2xl animate-fade-in">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <Tabs defaultValue="general" className="w-full space-y-4">
                    <TabsList className="grid grid-cols-4 w-full bg-slate-100/50 p-1 rounded-lg border">
                        <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs font-semibold">
                            <Sliders className="w-3.5 h-3.5" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="billing" className="flex items-center gap-1.5 text-xs font-semibold">
                            <CreditCard className="w-3.5 h-3.5" />
                            Subscription
                        </TabsTrigger>
                        <TabsTrigger value="store" className="flex items-center gap-1.5 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5" />
                            Store
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs font-semibold">
                            <Bell className="w-3.5 h-3.5" />
                            Notifications
                        </TabsTrigger>
                    </TabsList>

                    {/* GENERAL TAB */}
                    <TabsContent value="general" className="space-y-4 outline-none">
                        {/* Business Mode Section */}
                        <Card className="rounded-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-base">Business Preferences</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Customize features for small business usage.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 pt-0">
                                <div className="flex items-center justify-between space-x-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="business-mode" className="text-sm font-semibold">Business Mode</Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Enable tax tracking, invoices, and reimbursable expenses.
                                        </p>
                                    </div>
                                    <Switch
                                        id="business-mode"
                                        checked={isBusinessMode}
                                        onCheckedChange={handleBusinessToggle}
                                        className="transition-all duration-300 scale-90"
                                        title="Toggle Business Mode"
                                        aria-label="Toggle Business Mode"
                                    />
                                </div>
                                {isBusinessMode && (
                                    <div className="flex items-center justify-between space-x-2 border-t pt-4 mt-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="auto-add-parties" className="text-sm font-semibold">Auto-Add Customers to Parties</Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Automatically save new customer details to the Parties directory when creating an invoice.
                                            </p>
                                        </div>
                                        <Switch
                                            id="auto-add-parties"
                                            checked={autoAddParties}
                                            onCheckedChange={handleAutoAddPartiesToggle}
                                            className="transition-all duration-300 scale-90"
                                            title="Toggle Auto-Add Customers"
                                            aria-label="Toggle Auto-Add Customers"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* System-wide Overdue Threshold Settings */}
                        <Card className="rounded-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-500" />
                                    <CardTitle className="text-base">Payment Terms & Overdue Threshold</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    System-wide rule for automatic overdue calculation on unpaid bills & invoices.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="overdue-threshold" className="text-xs font-semibold">Overdue Period (Days)</Label>
                                    <Select
                                        value={overdueDays.toString()}
                                        onValueChange={handleOverdueDaysChange}
                                    >
                                        <SelectTrigger id="overdue-threshold" className="h-8 text-xs">
                                            <SelectValue placeholder="Select Overdue Period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">7 Days (Weekly)</SelectItem>
                                            <SelectItem value="15">15 Days (Net 15)</SelectItem>
                                            <SelectItem value="30">30 Days (Net 30)</SelectItem>
                                            <SelectItem value="45">45 Days (Net 45)</SelectItem>
                                            <SelectItem value="60">60 Days (Net 60)</SelectItem>
                                            <SelectItem value="90">90 Days (Quarterly)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Unpaid bills and invoices older than <span className="font-bold text-slate-700 dark:text-slate-200">{overdueDays} days</span> are automatically classified as Overdue across Purchases, Sales, and Reports.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Currency Section */}
                        <Card className="rounded-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-base">Regional Settings</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Set your currency and locale preferences.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="currency" className="text-xs">Currency</Label>
                                    <Select
                                        value={currency.code}
                                        onValueChange={(val) => {
                                            const selected = CURRENCIES.find(c => c.code === val);
                                            if (selected) setCurrency(selected);
                                        }}
                                    >
                                        <SelectTrigger id="currency" className="h-8 text-xs">
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

                        {/* Backup Section */}
                        <Card className="rounded-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-base">Data Backup</CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Download a complete backup of all your data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[11px] text-muted-foreground">
                                            Export expenses, sales, purchases, lent/borrowed money, and more.
                                        </p>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button disabled={isBackingUp} className="ml-4" size="sm">
                                                {isBackingUp ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Backing up...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Export Data
                                                    </>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleBackup("json")}>
                                                <FileJson className="mr-2 h-4 w-4" />
                                                Export as JSON
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleBackup("csv")}>
                                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                                Export as CSV (Excel)
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SUBSCRIPTION & BILLING TAB */}
                    <TabsContent value="billing" className="space-y-4 outline-none">
                        <Card className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 shadow-md">
                            <CardHeader className="p-6 pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black">Subscription Status</CardTitle>
                                            <CardDescription className="text-xs">
                                                Manage your FinFlow tier and payment methods.
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge className={`px-3 py-1 font-bold text-xs ${
                                        activePlanName === "PRO" || activePlanName === "BUSINESS"
                                            ? "bg-emerald-500 text-white"
                                            : "bg-muted text-muted-foreground"
                                    }`}>
                                        {activePlanName} TIER
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-2 space-y-6">
                                <div className="p-4 rounded-xl bg-background border space-y-3 text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Current Active Plan:</span>
                                        <span className="font-black text-foreground text-sm">{activePlanName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Subscription Status:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Active & Verified
                                        </span>
                                    </div>
                                    {subStatus?.current_period_end && (
                                        <div className="flex justify-between items-center pt-2 border-t text-[11px]">
                                            <span className="text-muted-foreground">Renewal / Expiry Date:</span>
                                            <span className="font-semibold text-foreground">
                                                {new Date(subStatus.current_period_end).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {activePlanName === "PRO" || activePlanName === "BUSINESS" ? (
                                    <div className="space-y-3">
                                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                All Premium {activePlanName} Features Unlocked
                                            </span>
                                            <Badge className="bg-emerald-500 text-white font-bold text-[10px]">ACTIVE</Badge>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => setCheckoutOpen(true)}
                                            className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                                        >
                                            Manage Subscription / Billing Details
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => setCheckoutOpen(true)}
                                            className="w-full h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-violet-600 text-white shadow-lg hover:opacity-95 transition-all"
                                        >
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Upgrade Plan & Make Payment
                                        </Button>
                                        <p className="text-[11px] text-center text-muted-foreground">
                                            Upgrade to unlock AI OCR receipt scanning, Party ledgers, online storefront & priority sync.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="store" className="outline-none">
                        <StoreSettings />
                    </TabsContent>

                    <TabsContent value="notifications" className="outline-none">
                        <NotificationSettings customerId={user?.id || ""} />
                    </TabsContent>
                </Tabs>
            </div>

            <BusinessDetailsDialog
                open={showBusinessDialog}
                onOpenChange={setShowBusinessDialog}
                onSuccess={() => toggleBusinessMode(true)}
            />

            <RealSubscriptionCheckout
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                initialPlanId="pro"
                initialBillingCycle="annual"
            />
        </AppLayout>
    );
};

export default SettingsPage;