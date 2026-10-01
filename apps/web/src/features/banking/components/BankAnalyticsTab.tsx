import React, { useMemo } from "react";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    Tooltip as ChartTooltip, 
    ResponsiveContainer, 
    CartesianGrid, 
    BarChart, 
    Bar, 
    Cell,
    PieChart,
    Pie
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { BankAccount, BankTransaction } from "./types";

interface BankAnalyticsTabProps {
    accounts: BankAccount[];
    transactions: BankTransaction[];
    balances: Record<string, number>;
}

export const BankAnalyticsTab: React.FC<BankAnalyticsTabProps> = ({
    accounts,
    transactions,
    balances
}) => {
    // 30-Day Cash Flow Trends
    const chartData = useMemo(() => {
        const data: Record<string, { date: string; Inbound: number; Outbound: number }> = {};
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
            const dateStr = format(subDays(today, i), "yyyy-MM-dd");
            const dayLabel = format(subDays(today, i), "dd MMM");
            data[dateStr] = { date: dayLabel, Inbound: 0, Outbound: 0 };
        }

        transactions.forEach(t => {
            if (data[t.date]) {
                if (t.type === "deposit") {
                    data[t.date].Inbound += t.amount;
                } else {
                    data[t.date].Outbound += t.amount;
                }
            }
        });

        return Object.values(data);
    }, [transactions]);

    // Liquidity Distribution across accounts
    const accountDistribution = useMemo(() => {
        return accounts.map(a => ({
            name: a.bankName,
            Balance: Math.max(0, balances[a.id] ?? a.initialBalance ?? 0)
        }));
    }, [accounts, balances]);

    // Category Expense Breakdown
    const categoryExpenses = useMemo(() => {
        const catMap: Record<string, number> = {};
        transactions.filter(t => t.type === "withdrawal").forEach(t => {
            catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });

        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [transactions]);

    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Area Chart: 30-Day Cash Flow Trends */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div>
                        <h3 className="font-bold text-sm text-foreground">30-Day Cash Flow Dynamics</h3>
                        <p className="text-[10px] text-muted-foreground">
                            Daily gross Inward credits vs Outward payments across all business bank accounts.
                        </p>
                    </div>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 9 }} />
                                <YAxis tickLine={false} tick={{ fontSize: 9 }} />
                                <ChartTooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "12px",
                                        fontSize: "11px"
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Inbound"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#inboundGrad)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Outbound"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#outboundGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart: Balance distribution across accounts */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4 shadow-xs">
                    <div>
                        <h3 className="font-bold text-sm text-foreground">Liquidity Distribution by Bank</h3>
                        <p className="text-[10px] text-muted-foreground">
                            Available funds apportioned across registered bank accounts and safe cash.
                        </p>
                    </div>
                    <div className="h-[260px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={accountDistribution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 9 }} />
                                <YAxis tickLine={false} tick={{ fontSize: 9 }} />
                                <ChartTooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "12px",
                                        fontSize: "11px"
                                    }}
                                />
                                <Bar dataKey="Balance" radius={[6, 6, 0, 0]}>
                                    {accountDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Outflows Category Distribution */}
            {categoryExpenses.length > 0 && (
                <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                    <h3 className="font-bold text-sm text-foreground mb-1">Top Outflow Expense Channels</h3>
                    <p className="text-[10px] text-muted-foreground mb-4">
                        Distribution of outward payments from bank accounts by business category.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {categoryExpenses.map((cat, idx) => (
                            <div key={idx} className="bg-muted/40 border border-border/60 p-3 rounded-xl">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block truncate">
                                    {cat.name}
                                </span>
                                <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 block mt-1">
                                    ₹{cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
