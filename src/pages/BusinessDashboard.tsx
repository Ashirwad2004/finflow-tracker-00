import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, IndianRupee, Package, ArrowRight, AlertCircle, DollarSign, Users } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format, startOfDay, startOfMonth, subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function BusinessDashboard() {
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch Sales Data
    const { data: sales = [] } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch Expenses
    const { data: expenses = [] } = useQuery({
        queryKey: ["expenses", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("expenses")
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch Products
    const { data: products = [] } = useQuery({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products" as any)
                .select("*")
                .eq("user_id", user?.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // Calculate Metrics
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const todaySales = sales.filter(sale => new Date(sale.date) >= today);
    const monthlySales = sales.filter(sale => new Date(sale.date) >= monthStart);

    const totalSalesToday = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalSalesMonth = monthlySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalPurchases = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const estimatedProfit = totalSalesMonth - totalPurchases;

    const openInvoices = sales.filter(sale => sale.status !== 'paid').length;
    const lowStockCount = products.filter((p: any) => p.stock_quantity < 10).length;

    // Recent Items
    const recentSales = sales.slice(0, 5);
    const recentPurchases = expenses.slice(0, 5);

    // Sales Trend Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const daySales = sales.filter(sale =>
            format(new Date(sale.date), 'yyyy-MM-dd') === dateStr
        );
        const total = daySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

        return {
            date: format(date, 'MMM dd'),
            sales: total
        };
    });

    const stats = [
        {
            title: "Today's Sales",
            value: totalSalesToday,
            icon: TrendingUp,
            description: "Revenue today",
            color: "from-green-500 to-emerald-600",
            bgColor: "bg-green-50 dark:bg-green-950/20",
            textColor: "text-green-600 dark:text-green-400"
        },
        {
            title: "Monthly Revenue",
            value: totalSalesMonth,
            icon: currency.code === 'INR' ? IndianRupee : DollarSign,
            description: "This month",
            color: "from-blue-500 to-cyan-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
            textColor: "text-blue-600 dark:text-blue-400"
        },
        {
            title: "Profit",
            value: estimatedProfit,
            icon: IndianRupee,
            description: "Sales - Expenses",
            color: estimatedProfit >= 0 ? "from-purple-500 to-violet-600" : "from-red-500 to-rose-600",
            bgColor: estimatedProfit >= 0 ? "bg-purple-50 dark:bg-purple-950/20" : "bg-red-50 dark:bg-red-950/20",
            textColor: estimatedProfit >= 0 ? "text-purple-600 dark:text-purple-400" : "text-red-600 dark:text-red-400"
        },
        {
            title: "Low Stock Alerts",
            value: lowStockCount,
            icon: AlertCircle,
            description: "Items below 10 units",
            color: "from-orange-500 to-amber-600",
            bgColor: "bg-orange-50 dark:bg-orange-950/20",
            textColor: "text-orange-600 dark:text-orange-400",
            isCurrency: false
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                    Business Dashboard
                </h1>
                <p className="text-muted-foreground">Track your business performance at a glance</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-none group">
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="relative">
                            <div className={`text-3xl font-bold ${stat.textColor}`}>
                                {stat.isCurrency === false ? stat.value : formatCurrency(stat.value)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Low Stock Alert */}
            {lowStockCount > 0 && (
                <Card className="mb-8 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-orange-500/20">
                                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-orange-900 dark:text-orange-100">
                                    ⚠️ Low Stock Warning
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-300">
                                    {lowStockCount} product{lowStockCount !== 1 ? 's are' : ' is'} running low. Restock soon to avoid stockouts.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate('/inventory')} className="border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/20">
                                View Inventory
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sales Trend Chart */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Sales Trend (Last 7 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={last7Days}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                className="text-xs"
                                tick={{ fontSize: 12 }}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fontSize: 12 }}
                                stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar
                                dataKey="sales"
                                fill="hsl(var(--primary))"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Sales */}
                <Card className="flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            Recent Sales
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')} className="text-xs">
                            View All <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentSales.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No sales recorded yet.</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/sales')}>
                                    Create Invoice
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentSales.map((sale: any) => (
                                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{sale.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(sale.date), "MMM d, yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-green-600 dark:text-green-400">
                                                +{formatCurrency(sale.total_amount)}
                                            </p>
                                            <p className="text-xs text-muted-foreground capitalize">{sale.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Expenses */}
                <Card className="flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Recent Expenses
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')} className="text-xs">
                            View All <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentPurchases.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No expenses recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentPurchases.map((expense: any) => (
                                    <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{expense.description}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-red-500">
                                                -{formatCurrency(expense.amount)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Expense</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
