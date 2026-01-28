
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    trend?: { value: number; isPositive: boolean }; // optional trend pill
}

export const DashboardCard = ({ title, icon: Icon, children, className, delay = 0, trend }: DashboardCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay: delay * 0.1,
                type: "spring",
                stiffness: 260,
                damping: 20
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={cn(
                "relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm",
                "hover:shadow-lg transition-shadow duration-300",
                // "bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900", // Subtle gradient
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

            <CardContent>
                <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-foreground">
                        {children}
                    </div>

                    {trend && (
                        <div className={cn(
                            "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                            trend.isPositive
                                ? "text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : "text-rose-600 bg-rose-100/50 dark:bg-rose-900/20 dark:text-rose-400"
                        )}>
                            {trend.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
            </CardContent>
        </motion.div>
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
