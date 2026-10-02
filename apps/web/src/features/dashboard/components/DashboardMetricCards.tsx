import React from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { DashboardCard, AnimatedCounter } from "@/features/dashboard/DashboardComponents";
import { BudgetSection } from "@/features/settings/components/BudgetSection";

interface DashboardMetricCardsProps {
    totalExpenses: number;
    thisMonthExpenses: number;
    transactionsCount: number;
    expenseTrendValue: number;
    isExpenseTrendPositive: boolean;
    monthlySparkline: { amount: number }[];
    last7DaysSparkline: { amount: number }[];
    transactionsSparkline: { amount: number }[];
    userId?: string;
    hasCustomCurrency?: boolean;
}

export function DashboardMetricCards({
    totalExpenses,
    thisMonthExpenses,
    transactionsCount,
    expenseTrendValue,
    isExpenseTrendPositive,
    monthlySparkline,
    last7DaysSparkline,
    transactionsSparkline,
    userId = "",
    hasCustomCurrency = false,
}: DashboardMetricCardsProps) {
    const currencyPrefix = hasCustomCurrency ? "" : "₹";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
                title="Total Expenses"
                icon={TrendingDown}
                delay={0}
                sparklineData={monthlySparkline}
            >
                <AnimatedCounter value={totalExpenses} prefix={currencyPrefix} />
            </DashboardCard>

            <DashboardCard
                title="This Month"
                icon={TrendingUp}
                delay={1}
                trend={{ value: expenseTrendValue, isPositive: isExpenseTrendPositive, isExpense: true }}
                sparklineData={last7DaysSparkline}
            >
                <AnimatedCounter value={thisMonthExpenses} prefix={currencyPrefix} />
            </DashboardCard>

            <DashboardCard
                title="Transactions"
                icon={Wallet}
                delay={2}
                sparklineData={transactionsSparkline}
            >
                {transactionsCount}
            </DashboardCard>

            <div className="animate-slide-up h-full" style={{ animationDelay: "0.3s" }}>
                <BudgetSection userId={userId} thisMonthExpenses={thisMonthExpenses} />
            </div>
        </div>
    );
}
