import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useBusiness } from "@/core/contexts/BusinessContext";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { toast } from "@/core/hooks/use-toast";
import { WeeklySpendingDataPoint, WeeklyMetrics } from "../components/WeeklySpendingChart";

export function useDashboardData() {
    const { user, signOut } = useAuth();
    const { isBusinessMode, toggleBusinessMode } = useBusiness();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isLentMoneyDialogOpen, setIsLentMoneyDialogOpen] = useState(false);
    const [isBorrowedMoneyDialogOpen, setIsBorrowedMoneyDialogOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
    const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showBusinessDetails, setShowBusinessDetails] = useState(false);

    useEffect(() => {
        if (user) {
            const hasOnboarded = localStorage.getItem(`onboarded_${user.id}`);
            if (!hasOnboarded) {
                setShowOnboarding(true);
            }
        }
    }, [user]);

    const handleOnboardingSelect = async (mode: "personal" | "business") => {
        if (mode === "business") {
            await toggleBusinessMode(true);
            setShowBusinessDetails(true);
        }
        if (user) {
            localStorage.setItem(`onboarded_${user.id}`, "true");
        }
        setShowOnboarding(false);
    };

    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id || "")
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // Personal Mode Hooks
    const { data: expenses = [], isLoading } = useExpensesQuery(user?.id, isBusinessMode);

    const { data: categories = [] } = useQuery<any[]>({
        queryKey: ["categories"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("categories")
                .select("*")
                .order("name");

            if (error) throw error;
            return data || [];
        },
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: string) => {
            const expenseToDelete = expenses.find(exp => exp.id === id);

            const { error } = await (supabase as any)
                .from("expenses")
                .delete()
                .eq("id", id);

            if (error) throw error;

            if (expenseToDelete && user?.id) {
                const recentlyDeletedKey = `recently_deleted_${user.id}`;
                const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || "[]");

                const deletedItem = {
                    ...expenseToDelete,
                    deleted_at: new Date().toISOString(),
                };

                existingDeleted.push(deletedItem);
                localStorage.setItem(recentlyDeletedKey, JSON.stringify(existingDeleted));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["deleted-expenses"] });
            toast({
                title: "Expense moved to recently deleted",
                description: "The expense has been moved to recently deleted. It will be permanently deleted after 30 days.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete expense. Please try again.",
                variant: "destructive",
            });
        },
    });

    // Query Lent Money
    const { data: lentMoney = [] } = useQuery({
        queryKey: ["lent-money", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("lent_money")
                .select("*")
                .eq("user_id", user?.id || "");
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id,
    });

    // Query Borrowed Money
    const { data: borrowedMoney = [] } = useQuery({
        queryKey: ["borrowed-money", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("borrowed_money")
                .select("*")
                .eq("user_id", user?.id || "");
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id,
    });

    const pendingLentTotal = useMemo(() => {
        return lentMoney
            .filter((l: any) => l.status === "pending")
            .reduce((sum: number, l: any) => sum + parseFloat(l.amount.toString()), 0);
    }, [lentMoney]);

    const pendingBorrowedTotal = useMemo(() => {
        return borrowedMoney
            .filter((b: any) => b.status === "pending")
            .reduce((sum: number, b: any) => sum + parseFloat(b.amount.toString()), 0);
    }, [borrowedMoney]);

    const netOutstanding = pendingLentTotal - pendingBorrowedTotal;

    // Sparkline data for the last 7 days
    const last7DaysSparkline = useMemo(() => {
        const data: { amount: number }[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dateStr = d.toDateString();
            const dailyExpenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.toDateString() === dateStr;
            });
            const amount = dailyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
            data.push({ amount });
        }
        return data;
    }, [expenses]);

    // Sparkline data for monthly comparison
    const monthlySparkline = useMemo(() => {
        const data: { amount: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const monthlyExp = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getMonth() === m && expDate.getFullYear() === y;
            });
            const amount = monthlyExp.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
            data.push({ amount });
        }
        return data;
    }, [expenses]);

    // Sparkline data for Transactions Count
    const transactionsSparkline = useMemo(() => {
        const data: { amount: number }[] = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dateStr = d.toDateString();
            const dailyCount = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.toDateString() === dateStr;
            }).length;
            data.push({ amount: dailyCount });
        }
        return data;
    }, [expenses]);

    // Weekly spending bar chart data (last 7 days)
    const weeklyBarData = useMemo<WeeklySpendingDataPoint[]>(() => {
        const data: WeeklySpendingDataPoint[] = [];
        const now = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dateStr = d.toDateString();
            const dailyExpenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.toDateString() === dateStr;
            });
            const amount = dailyExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
            data.push({
                name: days[d.getDay()],
                amount,
            });
        }
        return data;
    }, [expenses]);

    // Weekly metrics calculations
    const weeklyMetrics = useMemo<WeeklyMetrics>(() => {
        const total = weeklyBarData.reduce((sum, item) => sum + item.amount, 0);
        const average = total / 7;
        const peakDayItem = [...weeklyBarData].sort((a, b) => b.amount - a.amount)[0];
        const peakDay = peakDayItem && peakDayItem.amount > 0 ? peakDayItem.name : "N/A";
        const peakAmount = peakDayItem ? peakDayItem.amount : 0;
        return { total, average, peakDay, peakAmount };
    }, [weeklyBarData]);

    const getFullDayName = (shortName: string) => {
        const dayNames: Record<string, string> = {
            Sun: "Sunday",
            Mon: "Monday",
            Tue: "Tuesday",
            Wed: "Wednesday",
            Thu: "Thursday",
            Fri: "Friday",
            Sat: "Saturday",
        };
        return dayNames[shortName] || shortName;
    };

    const thisMonthExpensesList = useMemo(() => {
        const now = new Date();
        return expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        });
    }, [expenses]);

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    const thisMonthExpenses = thisMonthExpensesList.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

    const lastMonthExpenses = expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            const now = new Date();
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

    let expenseTrendValue = 0;
    if (lastMonthExpenses > 0) {
        expenseTrendValue = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
    } else if (thisMonthExpenses > 0) {
        expenseTrendValue = 100;
    }
    const isExpenseTrendPositive = expenseTrendValue > 0;

    return {
        user,
        profile,
        signOut,
        isBusinessMode,
        formatCurrency,
        expenses,
        isLoading,
        categories,
        deleteExpense,
        lentMoney,
        borrowedMoney,
        pendingLentTotal,
        pendingBorrowedTotal,
        netOutstanding,
        totalExpenses,
        thisMonthExpensesList,
        thisMonthExpenses,
        expenseTrendValue,
        isExpenseTrendPositive,
        monthlySparkline,
        last7DaysSparkline,
        transactionsSparkline,
        weeklyBarData,
        weeklyMetrics,
        getFullDayName,
        isAddDialogOpen,
        setIsAddDialogOpen,
        isLentMoneyDialogOpen,
        setIsLentMoneyDialogOpen,
        isBorrowedMoneyDialogOpen,
        setIsBorrowedMoneyDialogOpen,
        expenseToEdit,
        setExpenseToEdit,
        showRecentlyDeleted,
        setShowRecentlyDeleted,
        isSettingsOpen,
        setIsSettingsOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        showOnboarding,
        setShowOnboarding,
        showBusinessDetails,
        setShowBusinessDetails,
        handleOnboardingSelect,
    };
}
