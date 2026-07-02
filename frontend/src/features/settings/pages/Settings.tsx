import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency, CURRENCIES } from "@/core/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Globe, Download, Loader2, FileJson, FileSpreadsheet, Sliders, MessageSquare } from "lucide-react";
import { BusinessDetailsDialog } from "@/features/business/components/BusinessDetailsDialog";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useToast } from "@/core/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StoreSettings } from "../components/StoreSettings";
import { NotificationSettings } from "../components/NotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

    return (
        <AppLayout>
            <div className="container mx-auto p-4 max-w-2xl animate-fade-in">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <Tabs defaultValue="general" className="w-full space-y-4">
                    <TabsList className="grid grid-cols-3 w-full bg-slate-100/50 p-1 rounded-lg border">
                        <TabsTrigger value="general" className="flex items-center gap-2 text-xs font-semibold">
                            <Sliders className="w-3.5 h-3.5" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="store" className="flex items-center gap-2 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5" />
                            Store
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs font-semibold">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Notifications
                        </TabsTrigger>
                    </TabsList>

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
        </AppLayout>
    );
};

export default SettingsPage;
