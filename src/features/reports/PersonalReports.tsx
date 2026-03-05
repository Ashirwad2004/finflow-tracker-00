import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/core/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { FileBarChart, HandCoins, Receipt, Users, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { format } from "date-fns";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";

export default function PersonalReports() {
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const [activeTab, setActiveTab] = useState("party-wise");

    // Fetch all lent money
    const { data: lentMoney = [], isLoading: loadingLent } = useQuery({
        queryKey: ["reports-lent-money", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lent_money")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as any[];
        },
        enabled: !!user
    });

    // Fetch all borrowed money
    const { data: borrowedMoney = [], isLoading: loadingBorrowed } = useQuery({
        queryKey: ["reports-borrowed-money", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("borrowed_money")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as any[];
        },
        enabled: !!user
    });

    // Fetch all expenses (Now realtime)
    const { data: expenses = [], isLoading: loadingExpenses } = useExpensesQuery(user?.id);

    const isLoading = loadingLent || loadingBorrowed || loadingExpenses;

    // Party-wise Aggregation
    const partyMap = new Map<string, { lent: number, borrowed: number, net: number, hasPending: boolean }>();

    // Process Lent
    lentMoney.forEach(item => {
        const name = item.person_name.trim();
        const current = partyMap.get(name) || { lent: 0, borrowed: 0, net: 0, hasPending: false };
        current.lent += Number(item.amount);
        if (item.status === 'pending') {
            current.net += Number(item.amount); // You are owed this
            current.hasPending = true;
        }
        partyMap.set(name, current);
    });

    // Process Borrowed
    borrowedMoney.forEach(item => {
        const name = item.person_name.trim();
        const current = partyMap.get(name) || { lent: 0, borrowed: 0, net: 0, hasPending: false };
        current.borrowed += Number(item.amount);
        if (item.status === 'pending') {
            current.net -= Number(item.amount); // You owe this
            current.hasPending = true;
        }
        partyMap.set(name, current);
    });

    const parties = Array.from(partyMap.entries())
        .filter(([_, totals]) => totals.hasPending)
        .map(([name, totals]) => ({ name, ...totals }))
        .sort((a, b) => b.net - a.net); // Sort by highest owed to you

    const totalLent = lentMoney.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalBorrowed = borrowedMoney.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4">

                <div className="flex flex-col mb-8 gap-2">
                    <h2 className="text-3xl font-extrabold tracking-tight">Personal Reports</h2>
                    <p className="text-muted-foreground text-sm">Comprehensive overview of your personal financial interactions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Money Lent</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold">{formatCurrency(totalLent)}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">To {new Set(lentMoney.map(i => i.person_name)).size} people</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Money Borrowed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold">{formatCurrency(totalBorrowed)}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">From {new Set(borrowedMoney.map(i => i.person_name)).size} people</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses Recorded</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-xl">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold">{formatCurrency(totalExpenses)}</p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1">Across {expenses.length} transactions</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full lg:w-fit grid-cols-2 lg:grid-cols-4 bg-muted/50 p-1 rounded-xl mb-8">
                        <TabsTrigger value="party-wise" className="rounded-lg gap-2 text-sm"><Users className="w-4 h-4" /> Party-wise Net</TabsTrigger>
                        <TabsTrigger value="lent" className="rounded-lg gap-2 text-sm"><HandCoins className="w-4 h-4" /> Lent Ledger</TabsTrigger>
                        <TabsTrigger value="borrowed" className="rounded-lg gap-2 text-sm"><RefreshCcw className="w-4 h-4" /> Borrowed Ledger</TabsTrigger>
                        <TabsTrigger value="expenses" className="rounded-lg gap-2 text-sm"><Receipt className="w-4 h-4" /> Expenses Recap</TabsTrigger>
                    </TabsList>

                    <TabsContent value="party-wise" className="m-0 mt-4 outline-none">
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Party Name</th>
                                            <th className="px-6 py-4 text-right">Total Lent (By You)</th>
                                            <th className="px-6 py-4 text-right">Total Borrowed (By You)</th>
                                            <th className="px-6 py-4 text-right">Net Balance</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Generating report...</td></tr>
                                        ) : parties.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No data available for parties.</td></tr>
                                        ) : parties.map(party => (
                                            <tr key={party.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold max-w-xs truncate">{party.name}</td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(party.lent)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-rose-600 dark:text-rose-400">{formatCurrency(party.borrowed)}</td>
                                                <td className={`px-6 py-4 text-right font-extrabold ${party.net > 0 ? "text-emerald-600" : party.net < 0 ? "text-rose-600" : "text-slate-500"}`}>
                                                    {party.net > 0 ? '+' : ''}{formatCurrency(party.net)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {party.net > 0 && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">You Owed</Badge>}
                                                    {party.net < 0 && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">You Owe</Badge>}
                                                    {party.net === 0 && <Badge variant="outline" className="text-slate-500">Settled</Badge>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="lent" className="m-0 mt-4 outline-none">
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Lent To</th>
                                            <th className="px-6 py-4">Purpose / Memo</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading lent items...</td></tr>
                                        ) : lentMoney.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No money lent found.</td></tr>
                                        ) : lentMoney.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(item.created_at), "MMM dd, yyyy")}</td>
                                                <td className="px-6 py-4 font-bold">{item.person_name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.purpose || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className={item.status === 'paid' ? 'bg-emerald-500' : ''}>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-emerald-600">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="borrowed" className="m-0 mt-4 outline-none">
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/50 text-[11px] font-extrabold text-rose-700 dark:text-rose-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Borrowed From</th>
                                            <th className="px-6 py-4">Purpose / Memo</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading borrowed items...</td></tr>
                                        ) : borrowedMoney.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No money borrowed found.</td></tr>
                                        ) : borrowedMoney.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(item.created_at), "MMM dd, yyyy")}</td>
                                                <td className="px-6 py-4 font-bold">{item.person_name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.purpose || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className={item.status === 'paid' ? 'bg-emerald-500' : ''}>
                                                        {item.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-extrabold text-rose-600">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="expenses" className="m-0 mt-4 outline-none">
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {isLoading ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">Loading expenses...</td></tr>
                                        ) : expenses.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No expenses found.</td></tr>
                                        ) : expenses.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(item.date), "MMM dd, yyyy")}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl" style={{ color: item.categories?.color }}>{item.categories?.icon}</span>
                                                        <span className="font-semibold text-sm">{item.categories?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{item.description}</td>
                                                <td className="px-6 py-4 text-right font-extrabold">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
