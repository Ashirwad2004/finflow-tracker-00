
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseChart } from "@/components/ExpenseChart";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { LentMoneyDialog } from "@/components/LentMoneyDialog";
import { BudgetSection } from "@/components/BudgetSection";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import { LentMoneySection } from "@/components/LentMoneySection";
import { Calculator as CalculatorComponent } from "@/components/calculator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";

import { AiInsights } from "@/components/AiInsights";

import { useCurrency } from "@/contexts/CurrencyContext";
import { SettingsDialog } from "@/components/SettingsDialog";
import { menuItems, businessMenuItems } from "./AppSidebar";
import { cn } from "@/lib/utils";
import BusinessDashboard from "@/pages/BusinessDashboard";
import { useBusiness } from "@/contexts/BusinessContext";
import { motion } from "framer-motion";
import { AnimatedCounter, DashboardCard } from "@/components/DashboardComponents";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { BusinessDetailsDialog } from "@/components/BusinessDetailsDialog";

export const Dashboard = () => {
  console.log("Dashboard component rendering...");
  const { user, signOut } = useAuth();
  const { isBusinessMode } = useBusiness();
  const { formatCurrency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLentMoneyDialogOpen, setIsLentMoneyDialogOpen] = useState(false);
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

  console.log("Dashboard user state:", user);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });


  // Personal Mode Hooks
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
  *,
  categories(
    id,
    name,
    color,
    icon
  )
    `)
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !isBusinessMode,
  });

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

        <BusinessDashboard />
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

  return (
    <div className="min-h-screen bg-background bg-noise">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">

            {/* Left Side: Menu Toggle + Brand */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Menu Button (Left Corner) */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0 overflow-y-auto">
                  <SheetHeader className="p-4 border-b text-left flex flex-row items-center justify-between space-y-0">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      ExpenseTracker
                    </SheetTitle>
                    {/* Close button is automatically rendered by SheetContent, we ensure spacing via layout if needed, 
                        but standard SheetContent usually places it absolutely. 
                        If we want a "Best UI", we might rely on the default absolute positioning 
                        or ensuring the title doesn't overlap. 
                        Adding pr-6 to title or container helps. 
                    */}
                  </SheetHeader>
                  <div className="py-2">
                    {menuItems.map((item) => (
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

                    <div className="border-t my-2" />

                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-4 px-6 py-4 h-auto text-base"
                      onClick={() => {
                        setIsAddDialogOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Plus className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">Add Expense</div>
                        <div className="text-xs text-muted-foreground font-normal">Create new record</div>
                      </div>
                    </Button>


                  </div>
                </SheetContent>
              </Sheet>

              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0 hidden md:flex">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">ExpenseTracker</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Welcome back, {profile?.display_name || "User"}!</p>
              </div>
            </div>

            {/* Right Side: Quick Actions (Desktop) */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Previous dropdown removed */}

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/groups")}
                className="p-2 sm:p-3 hidden sm:flex"
              >
                <UserPlus className="w-4 h-4" />
                <span className="ml-2">Groups</span>
              </Button>
              <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="p-2 sm:p-3">
                    <Calculator className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Calculator</DialogTitle>
                  </DialogHeader>
                  <CalculatorComponent />
                </DialogContent>
              </Dialog>
              <ThemeToggle />

              {/* Desktop Settings Button */}
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="hidden sm:flex p-2 sm:p-3">
                <Settings className="w-4 h-4" />
              </Button>

              <Button variant="outline" onClick={handleSignOut} size="sm" className="hidden sm:flex">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Button variant="outline" onClick={handleSignOut} size="sm" className="sm:hidden p-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AiInsights expenses={expenses} categories={categories} />
        </div>

        {/* MAIN DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Expenses"
            icon={TrendingDown}
            delay={0}
            withSparkline={true}
          >
            <AnimatedCounter value={totalExpenses} prefix={user?.user_metadata?.currency ? "" : "₹"} />
            {/* Note: In a real app we'd pass the currency symbol from context properly to AnimatedCounter if needed, but for now we rely on the parent logic or refine AnimatedCounter */}
          </DashboardCard>

          <DashboardCard
            title="This Month"
            icon={TrendingUp}
            delay={1}
            trend={{ value: 12, isPositive: false }}
            withSparkline={true}
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

          {/* Budget is complex component, we might need to wrap it later or just leave as is for now but formatted */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <BudgetSection userId={user?.id || ""} thisMonthExpenses={thisMonthExpenses} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN: EXPENSE LIST (Occupies 2cols on LG) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header with Actions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
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
                  <>
                    <Button onClick={() => navigate("/split-bills")} size="sm" variant="outline" className="hidden sm:flex">
                      <Users className="w-4 h-4 mr-2" />
                      Split
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Main List Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border shadow-sm overflow-hidden min-h-[400px]"
            >
              {showRecentlyDeleted ? (
                <RecentlyDeleted userId={user?.id || ""} />
              ) : (
                <ExpenseList
                  expenses={expenses}
                  isLoading={isLoading}
                  onDelete={(id) => deleteExpense.mutate(id)}
                  onDeleteAll={() => { }}
                />
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
                  <ExpenseChart expenses={expenses} />
                </div>
              </div>

              {/* Quick Actions / Other Sections could go here */}
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

      <LentMoneyDialog
        open={isLentMoneyDialogOpen}
        onOpenChange={setIsLentMoneyDialogOpen}
        userId={user?.id || ""}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
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
  );
};
