import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, LogOut, TrendingDown, TrendingUp, Wallet, Users, Clock, Calculator, UserPlus } from "lucide-react";
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
import { QuickActionMenu } from "@/components/QuickActionMenu";

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLentMoneyDialogOpen, setIsLentMoneyDialogOpen] = useState(false);
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  console.log("Dashboard user:", user);

  // ... (queries)

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

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          categories (
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
    enabled: !!user,
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

  // ... (delete mutation and other logic) ...

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      // Find the expense to store in recently deleted
      const expenseToDelete = expenses.find(exp => exp.id === id);

      // Delete from database
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Store in localStorage for recently deleted (if found)
      if (expenseToDelete && user?.id) {
        const recentlyDeletedKey = `recently_deleted_${user.id}`;
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');

        const deletedItem = {
          ...expenseToDelete,
          deleted_at: new Date().toISOString()
        };

        existingDeleted.push(deletedItem);
        localStorage.setItem(recentlyDeletedKey, JSON.stringify(existingDeleted));

        console.log('Dashboard: Stored deleted expense in localStorage', { key: recentlyDeletedKey, deletedItem, totalItems: existingDeleted.length });
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">ExpenseTracker</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Welcome back, {profile?.display_name || "User"}!</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/groups")}
                className="p-2 sm:p-3"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Groups</span>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in">
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{thisMonthExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Current month spending</p>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total recorded</p>
            </CardContent>
          </Card>

          <BudgetSection userId={user?.id || ""} thisMonthExpenses={thisMonthExpenses} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold">
                {showRecentlyDeleted ? "Recently Deleted Expenses" : "Recent Expenses"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowRecentlyDeleted(!showRecentlyDeleted)}
                  size="sm"
                  variant="outline"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {showRecentlyDeleted ? "Show Expenses" : "Recently Deleted"}
                </Button>
                {!showRecentlyDeleted && (
                  <>
                    <Button onClick={() => navigate("/split-bills")} size="sm" variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Split Bills
                    </Button>
                    <Button onClick={() => setIsLentMoneyDialogOpen(true)} size="sm" variant="outline">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Lent Money
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </Button>
                  </>
                )}
              </div>
            </div>
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
          </div>

          <div className="space-y-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div>
              <h2 className="text-xl font-semibold mb-4">Spending by Category</h2>
              <ExpenseChart expenses={expenses} />
            </div>
            <LentMoneySection userId={user?.id || ""} />
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

      <QuickActionMenu
        onAddExpense={() => setIsAddDialogOpen(true)}
        onSplitBill={() => navigate("/split-bills")}
        onLentMoney={() => setIsLentMoneyDialogOpen(true)}
        onBorrowedMoney={() => navigate("/borrowed-money")}
      />
    </div>
  );
};
