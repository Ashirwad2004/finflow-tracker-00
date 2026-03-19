import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { format, subMonths, isSameMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { useState } from "react";
import { BusinessDetailsDialog } from "@/features/business/BusinessDetailsDialog";
import { RevenueAnalytics } from "@/features/business/RevenueAnalytics";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Landmark,
    ReceiptText,
    MoreVertical,
    PlusCircle,
    MinusCircle,
    Download,
    Settings
} from "lucide-react";

export default function BusinessDashboard() {
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

    // Fetch Sales
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

    // --- Data Aggregation ---
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const cashFlow = netProfit; // Simplified

    // Line Chart: P&L over last 6 months
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return d;
    });

    const chartData = last6Months.map(month => {
        const monthSales = sales.filter(s => isSameMonth(new Date(s.date), month));
        const monthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), month));
        const rev = monthSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const exp = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return {
            name: format(month, 'MMM'),
            revenue: rev,
            expenses: exp
        };
    });

    // Top Customers
    const customerMap = new Map<string, number>();
    sales.forEach(s => {
        if (s.customer_name) {
            customerMap.set(s.customer_name, (customerMap.get(s.customer_name) || 0) + Number(s.total_amount || 0));
        }
    });

    const topCustomers = Array.from(customerMap.entries())
        .map(([name, total]) => ({ name, revenue: total }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3); // Top 3

    // Doughnut Chart Data (Revenue by Top Customers)
    let pieData = [...topCustomers].map(c => ({ name: c.name, value: c.revenue }));
    const topRevenueSum = topCustomers.reduce((s, c) => s + c.revenue, 0);
    const otherRevenue = totalRevenue - topRevenueSum;
    if (otherRevenue > 0) {
        pieData.push({ name: 'Other', value: otherRevenue });
    }
    if (pieData.length === 0) {
        pieData = [{ name: 'No Data', value: 1 }];
    }

    const COLORS = ['#137fec', '#2dd4bf', '#64748b', '#cbd5e1'];

    // Recent Transactions (Merged)
    const combinedHistory = [
        ...sales.map(s => ({
            id: s.id,
            type: 'sale',
            title: `Invoice - ${s.customer_name}`,
            ref: s.invoice_number,
            amount: Number(s.total_amount),
            date: new Date(s.date)
        })),
        ...expenses.map(e => ({
            id: e.id,
            type: 'expense',
            title: e.description || 'Expense',
            ref: 'Receipt',
            amount: Number(e.amount),
            date: new Date(e.date)
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return (
        <main className="px-4 lg:px-8 py-8 space-y-8 max-w-7xl mx-auto animate-fade-in font-display">
            {/* Dashboard Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Financial Overview</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Real-time financial overview and performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center p-1 bg-white border rounded-lg dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <button className="px-4 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md" onClick={() => setIsEditProfileOpen(true)}>
                            <Settings className="inline-block w-4 h-4 mr-1" /> Profile
                        </button>
                        <button className="px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 rounded-md">All Time</button>
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {/* Card 1 */}
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg text-primary bg-primary/10">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">Total Revenue</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</h3>
                </div>

                {/* Card 2 */}
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 text-teal-600 bg-teal-100 rounded-lg dark:bg-teal-900/30">
                            <Landmark className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">Net Profit</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(netProfit)}</h3>
                </div>

                {/* Card 3 */}
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 text-rose-600 bg-rose-100 rounded-lg dark:bg-rose-900/30">
                            <ReceiptText className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">Operating Expenses</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalExpenses)}</h3>
                </div>

                {/* Card 4 */}
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 text-indigo-600 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">Cash Flow</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(cashFlow)}</h3>
                </div>
            </div>

            {/* Revenue Analytics Section */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <RevenueAnalytics sales={sales} expenses={expenses} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Large Line Chart */}
                <div className="p-6 bg-white border shadow-sm xl:col-span-2 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Profit & Loss Performance</h4>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="rounded-full size-3 bg-primary"></span>
                                <span className="text-xs text-slate-500">Revenue</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full size-3 bg-teal-400"></span>
                                <span className="text-xs text-slate-500">Expenses</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                                    dy={10}
                                />
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#137fec" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="expenses" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Doughnut Chart */}
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 flex flex-col items-center">
                    <h4 className="w-full mb-6 text-lg font-bold text-slate-900 dark:text-white text-left">Revenue by Customer</h4>
                    <div className="relative flex items-center justify-center w-full h-[200px] mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                {totalRevenue > 1000 ? `${(totalRevenue / 1000).toFixed(1)}k` : formatCurrency(totalRevenue)}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Total</span>
                        </div>
                    </div>
                    <div className="w-full space-y-3">
                        {pieData.map((entry, index) => {
                            const pct = totalRevenue > 0 ? ((entry.value / totalRevenue) * 100).toFixed(1) : 0;
                            return (
                                <div key={entry.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full size-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                        <span className="truncate max-w-[120px] text-slate-600 dark:text-slate-400">{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Data Section */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Top Customers Table */}
                <div className="overflow-hidden bg-white border shadow-sm xl:col-span-2 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Top Customers</h4>
                        <button className="text-sm font-semibold text-primary hover:underline" onClick={() => navigate('/parties')}>View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-xs font-semibold tracking-wider uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Total Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {topCustomers.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No customers yet</td></tr>
                                )}
                                {topCustomers.map(customer => (
                                    <tr key={customer.name}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center font-bold text-white bg-indigo-500 rounded-full size-8">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{customer.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">Active</span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-right text-slate-900 dark:text-slate-100">
                                            {formatCurrency(customer.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Transactions List */}
                <div className="flex flex-col overflow-hidden bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Recent Transactions</h4>
                        <MoreVertical className="w-5 h-5 cursor-pointer text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {combinedHistory.length === 0 && (
                                <div className="p-8 text-center text-slate-500">No transactions recorded yet.</div>
                            )}
                            {combinedHistory.map((tx) => (
                                <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between p-4 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        {tx.type === 'sale' ? (
                                            <div className="flex items-center justify-center rounded-lg size-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                                                <PlusCircle className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center rounded-lg size-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600">
                                                <MinusCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{tx.title}</p>
                                            <p className="text-[10px] text-slate-500">{format(tx.date, "MMM dd, yyyy")} • {tx.ref}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${tx.type === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {tx.type === 'sale' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <BusinessDetailsDialog
                open={isEditProfileOpen}
                onOpenChange={setIsEditProfileOpen}
            />
        </main>
    );
}
