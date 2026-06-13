import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { generateBusinessInsight } from "@/core/integrations/ai/gemini";
import { 
    Sparkles, 
    Percent, 
    ShieldCheck, 
    AlertTriangle, 
    TrendingUp, 
    Bot, 
    Loader2, 
    Lightbulb, 
    CheckCircle2,
    DollarSign
} from "lucide-react";

export function BusinessAiInsights() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const [isAuditRequested, setIsAuditRequested] = useState(false);

    // Fetch related business caches
    const sales = queryClient.getQueryData<any[]>(["sales", user?.id]) || [];
    const purchases = queryClient.getQueryData<any[]>(["purchases", user?.id]) || [];
    const expenses = queryClient.getQueryData<any[]>(["expenses", user?.id]) || [];
    const lent = queryClient.getQueryData<any[]>(["lent-money", user?.id]) || [];
    const borrowed = queryClient.getQueryData<any[]>(["borrowed-money", user?.id]) || [];
    const products = queryClient.getQueryData<any[]>(["products", user?.id]) || queryClient.getQueryData<any[]>(["products"]) || [];

    const { data: insight, isFetching } = useQuery({
        queryKey: ["gemini-business-audit", sales.length, purchases.length, expenses.length, products.length, lent.length, borrowed.length],
        queryFn: () => generateBusinessInsight({
            sales,
            purchases,
            expenses,
            lent,
            borrowed,
            products
        }),
        enabled: isAuditRequested,
        staleTime: 1000 * 60 * 15, // 15 mins cache
        retry: 1
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    return (
        <div className="space-y-6">
            {/* Header Call-to-Action */}
            {!insight && !isFetching && (
                <Card className="border-l-4 border-l-violet-600 bg-violet-500/5 dark:bg-violet-950/5 shadow-md">
                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex gap-4">
                            <div className="p-3 bg-violet-600/10 rounded-2xl shrink-0 text-violet-600 dark:text-violet-400">
                                <Bot className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Gemini AI Business Audit</h3>
                                <p className="text-sm text-muted-foreground max-w-xl">
                                    Generate an intelligent review of your business ledger, GSTR-1 tax filings estimate, customer debt receivables risk, and inventory margin optimization suggestions.
                                </p>
                            </div>
                        </div>
                        <Button 
                            onClick={() => setIsAuditRequested(true)}
                            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-medium gap-2 shadow-lg hover:shadow-xl transition-all w-full md:w-auto px-6 py-5 h-auto text-sm rounded-xl shrink-0"
                        >
                            <Sparkles className="w-4 h-4" /> Run AI Audit
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Audit Running Loading State */}
            {isFetching && !insight && (
                <Card className="border-l-4 border-l-violet-600 animate-pulse">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4">
                        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                        <div>
                            <h3 className="font-bold text-lg text-violet-600">Generating AI Business Audit...</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                Gemini is analyzing {sales.length} sales records, {purchases.length} purchases, debts ledger, and inventory stock margins.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* AI Insights Display */}
            {insight && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Core Headline */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
                        <Bot className="w-10 h-10 shrink-0 bg-white/20 p-2 rounded-xl backdrop-blur-sm" />
                        <div>
                            <h3 className="text-xs uppercase tracking-widest text-violet-200 font-bold mb-1">Audit Headline</h3>
                            <h2 className="text-lg sm:text-xl font-extrabold leading-snug">{insight.headline}</h2>
                        </div>
                    </div>

                    {/* Detailed Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Cash Flow & Profit Margins */}
                        <Card className="shadow-sm border border-muted flex flex-col">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <TrendingUp className="w-4 h-4" /> Cash Flow & Margins
                                </CardTitle>
                                <CardDescription className="text-xs">Ledger Profitability Analysis</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {insight.summary}
                                </p>
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">Sales Revenue: <span>{formatCurrency(totalSales)}</span></div>
                                    <div className="flex justify-between text-muted-foreground">Purchases & Cost: <span>{formatCurrency(totalPurchases)}</span></div>
                                    <div className="flex justify-between text-muted-foreground">Other Expenses: <span>{formatCurrency(totalExpenses)}</span></div>
                                    <div className="border-t pt-1.5 flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                                        Estimated Net: <span>{formatCurrency(netProfit)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. GST Compliance & Taxes */}
                        <Card className="shadow-sm border border-muted flex flex-col">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                    <ShieldCheck className="w-4 h-4" /> GST Compliance
                                </CardTitle>
                                <CardDescription className="text-xs">Estimated Tax Liability Audit</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {insight.taxAnalysis}
                                </p>
                                <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">Estimated GST Due: <span className="font-semibold text-orange-600 dark:text-orange-400">₹{(totalSales * 0.18).toFixed(2)}</span></div>
                                    <p className="text-[10px] text-muted-foreground italic mt-1 leading-tight">Calculated at a general 18% GST estimate. Refer to detailed GSTR-1 for exact rates.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Debt collection Risk */}
                        <Card className="shadow-sm border border-muted flex flex-col">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                    <AlertTriangle className="w-4 h-4" /> Receivables Risk
                                </CardTitle>
                                <CardDescription className="text-xs">Outstanding Peer Debts & Payables</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {insight.debtAnalysis}
                                </p>
                                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">Outstanding (Lent): <span className="font-semibold text-amber-600 dark:text-amber-500">{formatCurrency(lent.filter(l => l.status !== "paid").reduce((sum, l) => sum + Number(l.amount || 0), 0))}</span></div>
                                    <div className="flex justify-between text-muted-foreground">Payables (Borrowed): <span className="font-semibold text-muted-foreground">{formatCurrency(borrowed.filter(b => b.status !== "paid").reduce((sum, b) => sum + Number(b.amount || 0), 0))}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Operational suggestions */}
                    <Card className="shadow-sm border border-muted">
                        <CardHeader className="bg-muted/10 border-b pb-3.5">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-violet-600" /> Operational Recommendations
                            </CardTitle>
                            <CardDescription className="text-xs">Actionable operations advice from Gemini AI</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5">
                            <ul className="space-y-3">
                                {insight.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                                        <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                                        <span>{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Refresh trigger */}
                    <div className="flex justify-end">
                        <Button 
                            variant="outline"
                            onClick={() => setIsAuditRequested(true)}
                            disabled={isFetching}
                            className="gap-2 border-violet-500/20 text-violet-600 hover:bg-violet-500/5 h-10 font-semibold"
                        >
                            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Recalculate AI Audit
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
