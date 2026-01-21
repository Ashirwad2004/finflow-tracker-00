import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseChart } from "@/components/ExpenseChart";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { BudgetSection } from "@/components/BudgetSection";
import { LentMoneySection } from "@/components/LentMoneySection";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "@/hooks/use-toast";

export const Dashboard = () => {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
        .order("date", { ascending: false })
        .limit(10); // Show only recent 10 on dashboard
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["all-expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, date")
        .eq("user_id", user?.id);
      
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
      queryClient.invalidateQueries({ queryKey: ["all-expenses"] });
      toast({
        title: "Expense deleted",
        description: "Moved to recently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense.",
        variant: "destructive",
      });
    },
  });

  const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const thisMonthExpenses = allExpenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview at a glance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-muted-foreground mt-1">Current month</p>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allExpenses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total recorded</p>
            </CardContent>
          </Card>

          <BudgetSection userId={user?.id || ""} thisMonthExpenses={thisMonthExpenses} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Expenses</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <ExpenseList
                expenses={expenses}
                isLoading={isLoading}
                onDelete={(id) => deleteExpense.mutate(id)}
              />
            </CardContent>
          </Card>

          {/* Spending Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseChart expenses={expenses} />
            </CardContent>
          </Card>

          {/* Lent Money Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Money Lent</CardTitle>
            </CardHeader>
            <CardContent>
              <LentMoneySection userId={user?.id || ""} />
            </CardContent>
          </Card>
        </div>
      </div>

      <AddExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categories={categories}
        userId={user?.id || ""}
      />
    </AppLayout>
  );
};
