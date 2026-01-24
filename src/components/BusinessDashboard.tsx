import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, IndianRupee, Package, ArrowRight } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export const BusinessDashboard = () => {
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Define types for data
    interface Sale {
        id: string;
        user_id: string;
        customer_name: string;
        invoice_number: string;
        status: 'paid' | 'pending' | 'overdue';
        total_amount: number;
        date: string;
        items: any[];
    }

    interface Expense {
        id: string;
        user_id: string;
        description: string;
        amount: number;
        date: string;
        category_id: string;
    }

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
            return data as any as Sale[];
        },
        enabled: !!user
    });

    // Fetch Expenses Data (for Purchases)
    const { data: expenses = [] } = useQuery({
        queryKey: ["expenses", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("expenses")
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as any as Expense[];
        },
        enabled: !!user
    });

    // Calculate Metrics
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalPurchases = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const netProfit = totalSales - totalPurchases;
    const openInvoices = sales.filter(sale => sale.status !== 'paid').length;

    // Recent Items (Top 5)
    const recentSales = sales.slice(0, 5);
    const recentPurchases = expenses.slice(0, 5);

    const stats = [
        {
            title: "Total Sales",
            value: totalSales,
            icon: TrendingUp,
            description: "Total revenue generated",
            color: "text-green-500",
            isCurrency: true
        },
        {
            title: "Total Purchases",
            value: totalPurchases,
            icon: ShoppingCart,
            description: "Total business spend",
            color: "text-blue-500",
            isCurrency: true
        },
        {
            title: "Net Profit",
            value: netProfit,
            icon: IndianRupee,
            description: "Sales - Purchases",
            color: netProfit >= 0 ? "text-purple-500" : "text-red-500",
            isCurrency: true
        },
        {
            title: "Open Invoices",
            value: openInvoices,
            icon: Package,
            description: "Pending payments",
            color: "text-orange-500",
            isCurrency: false
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Business Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <Card key={index} className="shadow-card hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${stat.title === "Net Profit" && stat.value < 0 ? "text-red-500" : ""}`}>
                                {stat.isCurrency
                                    ? formatCurrency(stat.value)
                                    : stat.value}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Recent Sales */}
                <Card className="shadow-card flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Sales</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/sales')} className="text-xs">
                            View All <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentSales.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No sales recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm">{sale.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(sale.date), "MMM d, yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-green-600">+{formatCurrency(sale.total_amount)}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{sale.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Purchases */}
                <Card className="shadow-card flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Purchases</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')} className="text-xs">
                            View All <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentPurchases.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No purchases recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentPurchases.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm">{expense.description}</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-red-500">-{formatCurrency(expense.amount)}</p>
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
};
