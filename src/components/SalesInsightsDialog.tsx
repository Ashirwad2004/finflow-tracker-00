import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Loader2, TrendingUp, ShoppingBag, DollarSign, Package } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SalesInsightsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SalesInsightsDialog = ({ open, onOpenChange }: SalesInsightsDialogProps) => {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();

    const { data: sales = [], isLoading } = useQuery({
        queryKey: ["sales-insights", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales")
                .select("*")
                .eq("user_id", user?.id);

            if (error) throw error;
            return data;
        },
        enabled: open && !!user
    });

    // --- Aggregation Logic ---
    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    let totalRevenue = 0;
    let totalItemsSold = 0;

    sales.forEach((sale: any) => {
        totalRevenue += Number(sale.total_amount) || 0;

        const items = sale.items || [];
        items.forEach((item: any) => {
            const name = item.description || "Unknown";
            const qty = Number(item.quantity) || 0;
            const total = Number(item.total) || 0;

            if (!productStats[name]) {
                productStats[name] = { name, quantity: 0, revenue: 0 };
            }
            productStats[name].quantity += qty;
            productStats[name].revenue += total;

            totalItemsSold += qty;
        });
    });

    const data = Object.values(productStats);

    // Sort for Charts
    const topSelling = [...data].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const topRevenue = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const bestSellingItem = topSelling.length > 0 ? topSelling[0] : null;

    // Modern Colors with Gradients (simulated via solid hex for recharts)
    const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

    const SummaryCard = ({ title, value, icon: Icon, desc }: any) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
            </CardContent>
        </Card>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        Sales Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        Overview of your business performance and top products.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No sales data yet</h3>
                        <p className="text-muted-foreground">Create some invoices to see insights here.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                title="Total Revenue"
                                value={formatCurrency(totalRevenue)}
                                icon={DollarSign}
                                desc="Lifetime earnings"
                            />
                            <SummaryCard
                                title="Invoices Created"
                                value={sales.length}
                                icon={ShoppingBag}
                                desc="Total orders processed"
                            />
                            <SummaryCard
                                title="Best Seller"
                                value={bestSellingItem?.name || "N/A"}
                                icon={Package}
                                desc={`${bestSellingItem?.quantity || 0} units sold`}
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Top Selling (Quantity) */}
                            <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <CardTitle className="text-lg">Most Popular Products</CardTitle>
                                    <CardDescription>Top 5 items by quantity sold</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topSelling} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="quantity" radius={[0, 4, 4, 0]} barSize={24}>
                                                {topSelling.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Top Revenue */}
                            <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <CardTitle className="text-lg">Top Revenue Sources</CardTitle>
                                    <CardDescription>Top 5 items by total income generated</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topRevenue} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                                                {topRevenue.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
