import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
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
import { Plus, Search, Filter, Trash2, Calendar, TrendingDown, Sparkles, Loader2 } from "lucide-react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const rowVirtualizer = useVirtualizer({
    count: filteredExpenses.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80, // estimated height of row + gap
    overscan: 5,
  });

  const runFinanceAi = async (
    mode: "explain-expenses" | "losing-money" | "tax-summary" | "spending-prediction",
    title: string,
  ) => {
    if (!expenses.length) {
      toast({
        title: "No expenses to analyze",
        description: "Add a few expenses first, then RupeeBill AI can create a useful report.",
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-foreground">All Expenses</h1>
              <p className="text-xs text-muted-foreground">View and manage all your transactions</p>
            </div>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="bg-gradient-primary text-sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Expense
            </Button>
          </div>

          <MagicAddExpense userId={user?.id || ""} categories={categories} />

          <Card className="border-violet-200/70 bg-violet-50/40 dark:bg-violet-950/10">
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-violet-600 text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Gemini Finance Tracker AI</h2>
                    <p className="text-xs text-muted-foreground">Analyze expenses, detect leaks, prepare summaries, and predict next month from your real transactions.</p>
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
                      className="bg-background/80 text-xs h-8"
                    >
                      {activeAiAction === mode ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {aiReport && (
                <div className="rounded-lg border bg-background p-3 space-y-2.5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{aiReportTitle}</p>
                    <h3 className="font-semibold text-sm">{aiReport.headline}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{aiReport.summary}</p>
                  </div>
                  {aiReport.topCategories.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1.5">Top spending categories</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {aiReport.topCategories.slice(0, 3).map((category) => (
                          <div key={category.name} className="rounded-lg border p-2.5">
                            <p className="font-semibold text-xs">{category.name}</p>
                            <p className="text-xs">₹{category.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{category.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-2.5">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Suggested Action</p>
                    <p className="text-xs text-emerald-900 dark:text-emerald-100">{aiReport.suggestedAction}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-primary/10">
                  <TrendingDown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
                  </p>
                  <p className="text-xl font-bold">₹{totalFiltered.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Container */}
          <Tabs defaultValue="transactions" className="space-y-5">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full grid-cols-3 md:w-[500px]">
                <TabsTrigger value="transactions" className="text-xs">Transactions</TabsTrigger>
                <TabsTrigger value="monthly-report" className="text-xs">Monthly Report</TabsTrigger>
                <TabsTrigger value="ai-predictions" className="text-xs">AI Predictions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="transactions" className="space-y-5 mt-0">
              {/* Filters */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                        <Filter className="w-3.5 h-3.5 mr-1.5" />
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
                      <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-1/3" />
                            <Skeleton className="h-2.5 w-1/4" />
                          </div>
                          <Skeleton className="h-5 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : filteredExpenses.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                        <TrendingDown className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1.5">No expenses found</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {searchQuery || categoryFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Add your first expense to get started"}
                      </p>
                      <Button size="sm" onClick={() => setIsAddDialogOpen(true)} variant="outline" className="text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Expense
                      </Button>
                    </div>
                  ) : (
                    <div 
                      ref={scrollContainerRef} 
                      className="max-h-[70vh] overflow-y-auto pr-2 rounded-lg"
                    >
                      <div
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const expense = filteredExpenses[virtualRow.index];
                          return (
                            <div
                              key={virtualRow.key}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="pb-2.5" // Adds spacing between virtualized rows
                            >
                              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group h-full">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${expense.categories?.color}20` }}
                                >
                                  <CategoryIcon
                                    name={expense.categories?.icon}
                                    className="w-4 h-4"
                                    color={expense.categories?.color}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{expense.description}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(expense.date), "MMM d, yyyy")}
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      {expense.categories?.name}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-semibold text-sm">₹{expense.amount.toFixed(2)}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteExpense.mutate(expense.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0 h-8 w-8"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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