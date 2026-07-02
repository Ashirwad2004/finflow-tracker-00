import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PullToRefresh } from "@/components/layout/PullToRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, Trash2, Calendar, TrendingDown, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { MagicAddExpense } from "@/features/expenses/components/MagicAddExpense";
import { MonthlyExpenseReport } from "@/features/expenses/components/MonthlyExpenseReport";
import { LocalAIPredictionsPanel } from "@/features/expenses/components/LocalAIPredictionsPanel";
import { toast } from "@/core/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/core/lib/utils";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { generateFinanceInsight, FinanceInsight } from "@/core/integrations/ai/gemini";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

const AllExpenses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [aiReport, setAiReport] = useState<FinanceInsight | null>(null);
  const [aiReportTitle, setAiReportTitle] = useState("");
  const [activeAiAction, setActiveAiAction] = useState<string | null>(null);

  const { data: expenses = [], isLoading, refetch } = useExpensesQuery(user?.id);

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Expenses updated successfully.",
    });
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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

  // Filter and sort expenses
  const filteredExpenses = expenses
    .filter((exp) => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || exp.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default: // date-desc
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const totalFiltered = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const runFinanceAi = async (
    mode: "explain-expenses" | "losing-money" | "tax-summary" | "spending-prediction",
    title: string,
  ) => {
    if (!expenses.length) {
      toast({
        title: "No expenses to analyze",
        description: "Add a few expenses first, then  can create a useful report.",
      });
      return;
    }

    setActiveAiAction(mode);
    setAiReportTitle(title);
    try {
      const report = await generateFinanceInsight({ mode, expenses, categories });
      setAiReport(report);
    } catch (error: any) {
      toast({
        title: "Gemini analysis failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setActiveAiAction(null);
    }
  };

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Expenses</h1>
              <p className="text-muted-foreground">View and manage all your transactions</p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          <MagicAddExpense userId={user?.id || ""} categories={categories} />

          <Card className="border-violet-200/70 bg-violet-50/40 dark:bg-violet-950/10">
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-violet-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">Gemini Finance Tracker AI</h2>
                    <p className="text-sm text-muted-foreground">Analyze expenses, detect leaks, prepare summaries, and predict next month from your real transactions.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["explain-expenses", "Explain My Expenses"],
                    ["losing-money", "Where Am I Losing Money?"],
                    ["tax-summary", "Generate Tax Summary"],
                    ["spending-prediction", "Predict Next Month Spending"],
                  ].map(([mode, label]) => (
                    <Button
                      key={mode}
                      variant="outline"
                      size="sm"
                      onClick={() => runFinanceAi(mode as any, label)}
                      disabled={!!activeAiAction}
                      className="bg-background/80"
                    >
                      {activeAiAction === mode ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {aiReport && (
                <div className="rounded-xl border bg-background p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{aiReportTitle}</p>
                    <h3 className="font-bold text-lg">{aiReport.headline}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{aiReport.summary}</p>
                  </div>
                  {aiReport.topCategories.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Top spending categories</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {aiReport.topCategories.slice(0, 3).map((category) => (
                          <div key={category.name} className="rounded-lg border p-3">
                            <p className="font-semibold text-sm">{category.name}</p>
                            <p className="text-sm">₹{category.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{category.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiReport.predictions && aiReport.predictions.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-violet-700 dark:text-violet-400">
                        <Sparkles className="w-3.5 h-3.5" /> AI Spending Predictions
                      </p>
                      <ul className="space-y-1.5 pl-5 list-disc text-sm text-muted-foreground">
                        {aiReport.predictions.map((pred, idx) => (
                          <li key={idx}>{pred}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiReport.risks && aiReport.risks.length > 0 && (
                    <div className="pt-2">
                      <p className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5" /> Budget Risks & Warnings
                      </p>
                      <ul className="space-y-1.5 pl-5 list-disc text-sm text-muted-foreground">
                        {aiReport.risks.map((risk, idx) => (
                          <li key={idx} className="text-amber-800 dark:text-amber-400/90">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-3">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Suggested Action</p>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">{aiReport.suggestedAction}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingDown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
                  </p>
                  <p className="text-2xl font-bold">₹{totalFiltered.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Container */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full grid-cols-3 md:w-[500px]">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="monthly-report">Monthly Report</TabsTrigger>
                <TabsTrigger value="ai-predictions">AI Predictions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="transactions" className="space-y-6 mt-0">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="amount-desc">Highest Amount</SelectItem>
                        <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses List */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : filteredExpenses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <TrendingDown className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">No expenses found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || categoryFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Add your first expense to get started"}
                      </p>
                      <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${expense.categories?.color}20` }}
                          >
                            <CategoryIcon
                              name={expense.categories?.icon}
                              className="w-5 h-5"
                              color={expense.categories?.color}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{expense.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(expense.date), "MMM d, yyyy")}
                              <Badge variant="secondary" className="text-xs">
                                {expense.categories?.name}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₹{expense.amount.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExpense.mutate(expense.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly-report" className="mt-0">
              <MonthlyExpenseReport expenses={filteredExpenses} />
            </TabsContent>

            <TabsContent value="ai-predictions" className="mt-0">
              <LocalAIPredictionsPanel expenses={expenses} categories={categories} />
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>

      <AddExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categories={categories}
        userId={user?.id || ""}
      />
    </AppLayout>
  );
};

export default AllExpenses;
