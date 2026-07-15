import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Plus,
  LogOut,
  TrendingDown,
  TrendingUp,
  Wallet,
  Users,
  Clock,
  Calculator,
  UserPlus,
  Menu,
  Settings,
  X,
  ArrowRight,
  Zap,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { ExpenseList } from "@/features/expenses/components/ExpenseList";
import { ExpenseChart } from "@/features/expenses/components/ExpenseChart";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/features/expenses/components/EditExpenseDialog";
import { LentMoneyDialog } from "@/features/loans/components/LentMoneyDialog";
import { BorrowedMoneyDialog } from "@/features/loans/components/BorrowedMoneyDialog";
import { BudgetSection } from "@/features/settings/components/BudgetSection";
import { RecentlyDeleted } from "@/features/trash/components/RecentlyDeleted";
import { LentMoneySection } from "@/features/loans/components/LentMoneySection";
import { Calculator as CalculatorComponent } from "@/components/shared/calculator";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { toast } from "@/core/hooks/use-toast";

import { AiInsights } from "@/features/dashboard/AiInsights";

import { useCurrency } from "@/core/contexts/CurrencyContext";
import { SettingsDialog } from "@/features/settings/components/SettingsDialog";
import { menuItems, businessMenuItems } from "@/components/layout/AppSidebar";
import { cn } from "@/core/lib/utils";
const BusinessDashboard = lazy(() => import("@/features/business/pages/BusinessDashboard"));
import { useBusiness } from "@/core/contexts/BusinessContext";
import { motion } from "framer-motion";
import { AnimatedCounter, DashboardCard } from "@/features/dashboard/DashboardComponents";
import { OnboardingDialog } from "@/features/settings/components/OnboardingDialog";
import { BusinessDetailsDialog } from "@/features/business/components/BusinessDetailsDialog";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { isBusinessMode } = useBusiness();
  const { formatCurrency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLentMoneyDialogOpen, setIsLentMoneyDialogOpen] = useState(false);
  const [isBorrowedMoneyDialogOpen, setIsBorrowedMoneyDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toggleBusinessMode } = useBusiness();

  useEffect(() => {
    if (user) {
      const hasOnboarded = localStorage.getItem(`onboarded_${user.id}`);
      if (!hasOnboarded) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingSelect = async (mode: 'personal' | 'business') => {
    if (mode === 'business') {
      await toggleBusinessMode(true);
      setShowBusinessDetails(true);
    }
    if (user) {
      localStorage.setItem(`onboarded_${user.id}`, 'true');
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

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const expenseToDelete = expenses.find(exp => exp.id === id);

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (expenseToDelete && user?.id) {
        const recentlyDeletedKey = `recently_deleted_${user.id}`;
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');

        const deletedItem = {
          ...expenseToDelete,
          deleted_at: new Date().toISOString()
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
  const weeklyBarData = useMemo(() => {
    const data: { name: string; amount: number }[] = [];
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
        amount
      });
    }
    return data;
  }, [expenses]);

  // Weekly metrics calculations
  const weeklyMetrics = useMemo(() => {
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
      Sat: "Saturday"
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

  // Pre-calculate memoized components to avoid conditional hook calls in JSX
  const memoizedExpenseList = useMemo(() => (
    <ExpenseList
      expenses={thisMonthExpensesList}
      isLoading={isLoading}
      onEdit={(expense) => setExpenseToEdit(expense)}
      onDelete={(id) => deleteExpense.mutate(id)}
      onDeleteAll={() => { }}
    />
  ), [thisMonthExpensesList, isLoading, deleteExpense]);

  const memoizedExpenseChart = useMemo(() => (
    <ExpenseChart expenses={expenses} />
  ), [expenses]);

  // Business Mode View
  if (isBusinessMode) {
    return (
      <AppLayout>
        {/* Mobile Header - Hidden on Desktop */}
        <div className="md:hidden border-b bg-card shadow-sm p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] p-0 overflow-y-auto">
                <SheetHeader className="p-4 border-b text-left">
                  <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    FinFlow Business
                  </SheetTitle>
                </SheetHeader>
                <div className="py-2">
                  {businessMenuItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className="w-full justify-start gap-4 px-6 py-4 h-auto text-base"
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground font-normal">{item.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="font-bold text-lg">FinFlow Business</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center p-20" aria-busy="true" aria-live="polite">
            <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <BusinessDashboard />
        </Suspense>
      </AppLayout>
    );
  }



  const handleSignOut = async () => {
    await signOut();
  };

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

  return (
    <AppLayout>
      <div className="min-h-screen bg-background bg-noise">
        <main className="container mx-auto px-4 py-8">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Personal Dashboard</h1>
              <p className="text-muted-foreground text-sm">Welcome back, {profile?.display_name || "User"}!</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/groups")}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Groups</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <AiInsights expenses={expenses} categories={categories} />
          </div>

          {/* Summary Banner & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Cashflow Summary Card */}
            <div className="lg:col-span-2 p-6 bg-white border dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-500" /> Outstanding Balances
                </h3>
                <p className="text-xs text-muted-foreground mb-4 font-medium">Summary of your active loans and payables</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Lent</span>
                    <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(pendingLentTotal)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Borrowed</span>
                    <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatCurrency(pendingBorrowedTotal)}
                    </p>
                  </div>
                  <div className="space-y-1 border-l pl-4 border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Net Status</span>
                    <p className={cn("text-lg sm:text-xl font-bold tabular-nums", netOutstanding >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {netOutstanding >= 0 ? "+" : ""}{formatCurrency(netOutstanding)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-6 bg-white border dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500 animate-pulse" /> Quick Actions
                </h3>
                <p className="text-xs text-muted-foreground mb-4 font-medium">Frequently used commands</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/30 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 text-violet-500" /> Add Expense
                  </Button>
                  <Button
                    onClick={() => setIsLentMoneyDialogOpen(true)}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 text-emerald-500" /> Lend Money
                  </Button>
                  <Button
                    onClick={() => setIsBorrowedMoneyDialogOpen(true)}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 text-rose-500" /> Record Debt
                  </Button>
                  <Button
                    onClick={() => navigate("/groups")}
                    variant="outline"
                    className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 text-xs font-semibold"
                  >
                    <Users className="w-4 h-4 text-blue-500" /> Share Bill
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN DASHBOARD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Expenses"
              icon={TrendingDown}
              delay={0}
              sparklineData={monthlySparkline}
            >
              <AnimatedCounter value={totalExpenses} prefix={user?.user_metadata?.currency ? "" : "₹"} />
            </DashboardCard>

            <DashboardCard
              title="This Month"
              icon={TrendingUp}
              delay={1}
              trend={{ value: expenseTrendValue, isPositive: isExpenseTrendPositive, isExpense: true }}
              sparklineData={last7DaysSparkline}
            >
              <AnimatedCounter value={thisMonthExpenses} prefix={user?.user_metadata?.currency ? "" : "₹"} />
            </DashboardCard>

            <DashboardCard
              title="Transactions"
              icon={Wallet}
              delay={2}
              sparklineData={transactionsSparkline}
            >
              {expenses.length}
            </DashboardCard>

            <div className="animate-slide-up h-full" style={{ animationDelay: '0.3s' }}>
              <BudgetSection userId={user?.id || ""} thisMonthExpenses={thisMonthExpenses} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: EXPENSE LIST & WEEKLY TREND (Occupies 2cols on LG) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-500">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {showRecentlyDeleted ? "Recently Deleted" : "Recent Transactions"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {showRecentlyDeleted ? "Manage your deleted items" : "Track and manage your daily spending"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setShowRecentlyDeleted(!showRecentlyDeleted)}
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {showRecentlyDeleted ? "Back to List" : "History"}
                  </Button>

                  {!showRecentlyDeleted && (
                    <Button
                      onClick={() => navigate("/expenses")}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      View All
                    </Button>
                  )}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden"
              >
                {showRecentlyDeleted ? (
                  <RecentlyDeleted userId={user?.id || ""} />
                ) : (
                  memoizedExpenseList
                )}
              </motion.div>

              {/* Weekly Spending Trend Chart */}
              {!showRecentlyDeleted && (
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
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
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
              )}
            </div>

            {/* RIGHT COLUMN: CHARTS & LENT MONEY (Occupies 1col on LG) */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Spending Analysis
                  </h3>
                  <div className="h-[300px] w-full min-h-[300px]">
                    {memoizedExpenseChart}
                  </div>
                </div>

                <LentMoneySection userId={user?.id || ""} />
              </motion.div>
            </div>
          </div>
        </main>

        <AddExpenseDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          categories={categories}
          userId={user?.id || ""}
        />

        <EditExpenseDialog
          open={!!expenseToEdit}
          onOpenChange={(open) => !open && setExpenseToEdit(null)}
          expense={expenseToEdit}
          categories={categories}
        />

        <LentMoneyDialog
          open={isLentMoneyDialogOpen}
          onOpenChange={setIsLentMoneyDialogOpen}
          userId={user?.id || ""}
        />

        <BorrowedMoneyDialog
          open={isBorrowedMoneyDialogOpen}
          onOpenChange={setIsBorrowedMoneyDialogOpen}
          userId={user?.id || ""}
        />

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />

        <OnboardingDialog
          open={showOnboarding}
          onSelect={handleOnboardingSelect}
        />

        <BusinessDetailsDialog
          open={showBusinessDetails}
          onOpenChange={setShowBusinessDetails}
        />
      </div>
    </AppLayout>
  );
};
