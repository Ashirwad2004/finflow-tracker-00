import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/core/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

// --- ANIMATED COUNTER ---
// Animates a number from 0 to 'value' over 'duration' seconds.
export const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        // simple lerp animation for smoothness
        let start = 0;
        const end = value;
        if (start === end) return;

        // determine duration based on magnitude roughly, but cap it
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function: easeOutExpo
            const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = start + (end - start) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    // Format with commas/decimals if needed, but for now just raw number + prefix/suffix
    // Or better, use Intl.NumberFormat inside the component if 'value' is raw
    // tailored for currency
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(displayValue);

    return (
        <span className="tabular-nums tracking-tight">
            {prefix}{formatted}{suffix}
        </span>
    );
};


// --- DASHBOARD CARD ---
// A glassmorphic, hover-lifting card wrapper
interface DashboardCardProps {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    delay?: number; // animation delay index
    trend?: { value: number; isPositive: boolean; isExpense?: boolean }; // optional trend pill
    sparklineData?: { amount: number }[]; // optional sparkline data for trends
}

export const DashboardCard = ({ title, icon: Icon, children, className, delay = 0, trend, sparklineData }: DashboardCardProps) => {
    const sparkColor = trend ? (trend.isPositive ? "#ef4444" : "#10b981") : "#6366f1";
    const gradId = `sparkline-grad-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div
            style={{ animationDelay: `${delay * 100}ms`, animationFillMode: 'both' }}
            className={cn(
                "relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm h-full flex flex-col",
                "animate-in fade-in slide-in-from-bottom-4 duration-500",
                "hover:-translate-y-1 hover:shadow-lg transition-all duration-300",
                className
            )}
        >
            {/* Subtle top glow line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                    {title}
                </CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-2xl font-bold text-foreground truncate">
                            {children}
                        </div>

                        {trend && (() => {
                            const isIncrease = trend.isPositive;
                            const isFavorable = trend.isExpense ? !isIncrease : isIncrease;
                            const ArrowIcon = isIncrease ? TrendingUp : TrendingDown;

                            return (
                                <div className={cn(
                                    "flex items-center text-[10px] font-semibold leading-none",
                                    isFavorable
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                )}>
                                    <ArrowIcon className="w-3 h-3 mr-0.5" />
                                    {Math.abs(trend.value).toFixed(0)}%
                                </div>
                            );
                        })()}
                    </div>

                    {sparklineData && sparklineData.length > 0 && (
                        <div className="w-20 h-8 shrink-0 opacity-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                    <defs>
                                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={sparkColor} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke={sparkColor}
                                        strokeWidth={1.5}
                                        fillOpacity={1}
                                        fill={`url(#${gradId})`}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </CardContent>
        </div>
    );
};

// --- EMPTY STATE ---
export const EmptyState = ({
    title,
    description,
    action,
    icon: Icon = Minus
}: {
    title: string;
    description: string;
    action?: React.ReactNode;
    icon?: React.ElementType;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl bg-muted/20"
        >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {action && (
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
}