import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, IndianRupee, Package } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export const BusinessDashboard = () => {
    const { formatCurrency } = useCurrency();

    // Placeholder data - will be replaced by real queries later
    const stats = [
        {
            title: "Total Sales",
            value: 0,
            icon: TrendingUp,
            description: "Total revenue generated",
            color: "text-green-500"
        },
        {
            title: "Total Purchases",
            value: 0,
            icon: ShoppingCart,
            description: "Total business spend",
            color: "text-blue-500"
        },
        {
            title: "Net Profit",
            value: 0,
            icon: IndianRupee,
            description: "Sales - Purchases",
            color: "text-purple-500"
        },
        {
            title: "Open Invoices",
            value: 0,
            icon: Package,
            description: "Pending payments",
            color: "text-orange-500"
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
                            <div className="text-2xl font-bold">
                                {stat.title.includes("Open")
                                    ? stat.value
                                    : formatCurrency(stat.value)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                            No sales recorded yet.
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Recent Purchases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                            No purchases recorded yet.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
