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
  X
} from "lucide-react";
import { ExpenseList } from "@/features/expenses/components/ExpenseList";
import { ExpenseChart } from "@/features/expenses/components/ExpenseChart";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { EditExpenseDialog } from "@/features/expenses/components/EditExpenseDialog";
import { LentMoneyDialog } from "@/features/loans/components/LentMoneyDialog";
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

  // Pre-calculate memoized components to avoid conditional hook calls in JSX
  const memoizedExpenseList = useMemo(() => (
    <ExpenseList
      expenses={expenses}
      isLoading={isLoading}
      onEdit={(expense) => setExpenseToEdit(expense)}
      onDelete={(id) => deleteExpense.mutate(id)}
      onDeleteAll={() => { }}
    />
  ), [expenses, isLoading, deleteExpense]);

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

        <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading Business Dashboard...</div>}>
          <BusinessDashboard />
        </Suspense>
      </AppLayout>
    );
  }



  const handleSignOut = async () => {
    await signOut();
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const thisMonthExpenses = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

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

          {/* MAIN DASHBOARD GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Expenses"
              icon={TrendingDown}
              delay={0}
            >
              <AnimatedCounter value={totalExpenses} prefix={user?.user_metadata?.currency ? "" : "₹"} />
            </DashboardCard>

            <DashboardCard
              title="This Month"
              icon={TrendingUp}
              delay={1}
              trend={{ value: expenseTrendValue, isPositive: isExpenseTrendPositive, isExpense: true }}
            >
              <AnimatedCounter value={thisMonthExpenses} prefix={user?.user_metadata?.currency ? "" : "₹"} />
            </DashboardCard>

            <DashboardCard
              title="Transactions"
              icon={Wallet}
              delay={2}
            >
              {expenses.length}
            </DashboardCard>

            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <BudgetSection userId={user?.id || ""} thisMonthExpenses={thisMonthExpenses} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: EXPENSE LIST (Occupies 2cols on LG) */}
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
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  )}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden min-h-[400px]"
              >
                {showRecentlyDeleted ? (
                  <RecentlyDeleted userId={user?.id || ""} />
                ) : (
                  memoizedExpenseList
                )}
              </motion.div>
            </div>

            {/* RIGHT COLUMN: CHARTS & INSIGHTS */}
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
