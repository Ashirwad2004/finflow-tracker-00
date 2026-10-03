import React from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export interface WeeklySpendingDataPoint {
    name: string;
    amount: number;
}

export interface WeeklyMetrics {
    total: number;
    average: number;
    peakDay: string;
    peakAmount: number;
}

interface WeeklySpendingChartProps {
    weeklyBarData: WeeklySpendingDataPoint[];
    weeklyMetrics: WeeklyMetrics;
    formatCurrency: (value: number) => string;
    getFullDayName: (shortName: string) => string;
}

export function WeeklySpendingChart({
    weeklyBarData,
    weeklyMetrics,
    formatCurrency,
    getFullDayName,
}: WeeklySpendingChartProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="font-semibold flex items-center gap-2 text-foreground">
                        <BarChart3 className="w-4 h-4 text-indigo-500 animate-pulse" />
                        Weekly Spending Trend
                    </h3>
                    <p className="text-xs text-muted-foreground">Detailed daily breakdown for the last 7 days</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground border border-border/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live Feed
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4 mb-6 bg-muted/20 p-4 rounded-xl border border-border/30">
                <div className="space-y-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Weekly Total</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {formatCurrency(weeklyMetrics.total)}
                    </span>
                </div>
                <div className="space-y-1 border-x border-border/50 px-4">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Daily Avg</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-foreground">
                        {formatCurrency(weeklyMetrics.average)}
                    </span>
                </div>
                <div className="space-y-1 pl-2">
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Peak Day</span>
                    <span className="text-sm sm:text-base md:text-lg font-bold text-indigo-500 truncate block">
                        {getFullDayName(weeklyMetrics.peakDay)} {weeklyMetrics.peakAmount > 0 && `(${formatCurrency(weeklyMetrics.peakAmount)})`}
                    </span>
                </div>
            </div>

            <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                        <XAxis 
                            dataKey="name" 
                            stroke="#94a3b8" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            dy={8}
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => v > 0 ? `${formatCurrency(v).replace(/\.00$/, '')}` : ''}
                        />
                        <Tooltip
                            cursor={{ stroke: "hsl(var(--primary) / 0.2)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-popover/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg flex flex-col gap-1 min-w-[120px]">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{getFullDayName(payload[0].payload.name)}</span>
                                            <span className="text-sm font-extrabold text-foreground">
                                                {formatCurrency(Number(payload[0].value))}
                                            </span>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorWeekly)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
