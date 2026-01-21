import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Settings, Calculator } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { LentMoneyDialog } from "@/components/LentMoneyDialog";
import { Calculator as CalculatorComponent } from "@/components/calculator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";
import { FloatingActionMenu, type MenuOption } from "@/components/FloatingActionMenu";
import { BalanceRing } from "@/components/BalanceRing";
import { ContentSection } from "@/components/ContentSection";
import { MinimalExpenseList } from "@/components/MinimalExpenseList";
import { MinimalLentSection } from "@/components/MinimalLentSection";
import { motion } from "framer-motion";

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLentMoneyDialogOpen, setIsLentMoneyDialogOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [activeMenuOption, setActiveMenuOption] = useState<MenuOption | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`*, categories (id, name, color, icon)`)
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

  // Get current month's budget
  const monthString = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  })();

  const { data: budget } = useQuery({
    queryKey: ["budget", user?.id, monthString],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user?.id)
        .eq("month", monthString)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
        existingDeleted.push({ ...expenseToDelete, deleted_at: new Date().toISOString() });
        localStorage.setItem(recentlyDeletedKey, JSON.stringify(existingDeleted));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Expense deleted",
        description: "The expense has been moved to recently deleted.",
      });
    },
  });

  const handleMenuSelect = (option: MenuOption) => {
    if (option === "add") {
      setIsAddDialogOpen(true);
    } else if (option === "groups") {
      navigate("/groups");
    } else {
      setActiveMenuOption(option);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Calculate this month's expenses
  const thisMonthExpenses = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const budgetLimit = budget?.amount ?? 0;

  const renderContent = () => {
    switch (activeMenuOption) {
      case "transactions":
        return (
          <MinimalExpenseList
            expenses={expenses}
            isLoading={expensesLoading}
            onDelete={(id) => deleteExpense.mutate(id)}
          />
        );
      case "lent":
        return <MinimalLentSection userId={user?.id || ""} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header - Minimal */}
      <header className="relative z-10 border-b border-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-xl font-bold text-white">₹</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">ExpenseTracker</h1>
                <p className="text-xs text-slate-500">
                  {profile?.display_name ? `Hey, ${profile.display_name}` : "Welcome back"}
                </p>
              </div>
            </motion.div>

            <div className="flex items-center gap-2">
              <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                    <Calculator className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-slate-100">Calculator</DialogTitle>
                  </DialogHeader>
                  <CalculatorComponent />
                </DialogContent>
              </Dialog>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Balance Ring - Center Stage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-12"
          >
            <BalanceRing
              balance={thisMonthExpenses}
              budgetLimit={budgetLimit}
            />
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-4 mb-8"
          >
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-bold text-white mt-1">{expenses.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly Limit</p>
              <p className="text-2xl font-bold text-white mt-1">
                {budgetLimit > 0 ? `₹${budgetLimit.toLocaleString("en-IN")}` : "Not Set"}
              </p>
            </div>
          </motion.div>

          {/* Dynamic Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-900/50 rounded-3xl border border-slate-800/50 p-6 backdrop-blur-sm"
          >
            <ContentSection activeOption={activeMenuOption}>
              {renderContent()}
            </ContentSection>
          </motion.div>
        </div>
      </main>

      {/* Floating Action Menu */}
      <FloatingActionMenu
        onSelect={handleMenuSelect}
        activeOption={activeMenuOption}
      />

      {/* Dialogs */}
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
    </div>
  );
};
