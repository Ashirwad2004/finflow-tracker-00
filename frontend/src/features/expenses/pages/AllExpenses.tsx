import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Plus, Search, Filter, Trash2, Calendar, TrendingDown, Receipt, Wallet, PieChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddExpenseDialog } from "@/features/expenses/components/AddExpenseDialog";
import { MonthlyExpenseReport } from "@/features/expenses/components/MonthlyExpenseReport";
import { toast } from "@/core/hooks/use-toast";
import { format, isSameMonth } from "date-fns";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

const AllExpenses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
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
      const expenseToDelete = expenses.find((exp: any) => exp.id === id);

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
    onMutate: async (id: string) => {
      if (!user?.id) return;

      await queryClient.cancelQueries({ queryKey: ["expenses", user.id] });
      const previousExpenses = queryClient.getQueryData<any[]>(["expenses", user.id]) ?? expenses;

      queryClient.setQueryData(["expenses", user.id], (old: any[] | undefined) =>
        (old ?? []).filter((exp: any) => exp.id !== id)
      );

      return { previousExpenses };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Expense deleted",
        description: "Moved to recently deleted.",
      });
    },
    onError: (_error, _id, context) => {
      if (user?.id && context?.previousExpenses) {
        queryClient.setQueryData(["expenses", user.id], context.previousExpenses);
      }

      toast({
        title: "Error",
        description: "Failed to delete expense.",
        variant: "destructive",
      });
    },
  });

  // Calculate clean high-level KPIs
  const { totalExpenses, spentThisMonth, topCategoryName, topCategoryAmount, avgExpense } = useMemo(() => {
    const total = expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
    const today = new Date();

    let thisMonthSum = 0;
    const categoryTotals: Record<string, { name: string; amount: number }> = {};

    expenses.forEach((exp: any) => {
      const amt = Number(exp.amount) || 0;
      if (exp.date) {
        const d = new Date(exp.date);
        if (!isNaN(d.getTime()) && isSameMonth(d, today)) {
          thisMonthSum += amt;
        }
      }
      const catName = exp.categories?.name || "Uncategorized";
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { name: catName, amount: 0 };
      }
      categoryTotals[catName].amount += amt;
    });

    let topCatName = "None";
    let topCatAmt = 0;
    Object.values(categoryTotals).forEach((cat) => {
      if (cat.amount > topCatAmt) {
        topCatAmt = cat.amount;
        topCatName = cat.name;
      }
    });

    const avg = expenses.length > 0 ? total / expenses.length : 0;

    return {
      totalExpenses: total,
      spentThisMonth: thisMonthSum,
      topCategoryName: topCatName,
      topCategoryAmount: topCatAmt,
      avgExpense: avg,
    };
  }, [expenses]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp: any) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (exp.description || "").toLowerCase().includes(query) ||
          (exp.categories?.name || "").toLowerCase().includes(query);
        const matchesCategory = categoryFilter === "all" || exp.category_id === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case "amount-desc":
            return Number(b.amount) - Number(a.amount);
          case "amount-asc":
            return Number(a.amount) - Number(b.amount);
          default: // date-desc
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
      });
  }, [expenses, searchQuery, categoryFilter, sortBy]);

  const totalFiltered = useMemo(() => {
    return filteredExpenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0);
  }, [filteredExpenses]);

  const rowVirtualizer = useVirtualizer({
    count: filteredExpenses.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 76,
    overscan: 5,
  });

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-display">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                All Expenses
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Track, filter, and audit your company operational costs and spending.
              </p>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-primary text-primary-foreground font-medium shadow-xs hover:shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Expenses
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(totalExpenses)}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                  {expenses.length} transaction{expenses.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Receipt className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Spent This Month
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(spentThisMonth)}
                </p>
                <p className="text-[10px] font-medium text-emerald-500 mt-0.5">
                  Current calendar month
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Top Category
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate max-w-[130px]" title={topCategoryName}>
                  {topCategoryName}
                </p>
                <p className="text-[10px] font-medium text-violet-500 mt-0.5">
                  {formatCurrency(topCategoryAmount)}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <PieChart className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Avg. Expense
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(avgExpense)}
                </p>
                <p className="text-[10px] font-medium text-amber-500 mt-0.5">
                  Per transaction ticket
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
          </div>

          {/* Clean Tabs Container */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl h-10 border border-slate-200/60 dark:border-slate-700/50 w-full sm:w-[280px]">
                <TabsTrigger
                  value="transactions"
                  className="flex-1 text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold"
                >
                  Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="monthly-report"
                  className="flex-1 text-xs py-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs font-semibold"
                >
                  Monthly Report
                </TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground font-medium">
                Showing <span className="font-bold text-foreground">{filteredExpenses.length}</span> of {expenses.length} records
                {filteredExpenses.length > 0 && (
                  <> • Total: <span className="font-bold text-foreground">{formatCurrency(totalFiltered)}</span></>
                )}
              </div>
            </div>

            {/* Transactions View */}
            <TabsContent value="transactions" className="space-y-4 mt-0">
              {/* Search & Filter Toolbar */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardContent className="p-3.5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search expenses by description or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-48 h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
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

              {/* Transactions List */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Expense Records
                  </CardTitle>
                  {filteredExpenses.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {filteredExpenses.length} entries
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
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
                    <div className="text-center py-12">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <TrendingDown className="w-6 h-6 text-slate-400" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">
                        No expenses found
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {searchQuery || categoryFilter !== "all"
                          ? "Try adjusting your search or category filter"
                          : "Record your first expense to track business spending"}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setIsAddDialogOpen(true)}
                        variant="outline"
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Expense
                      </Button>
                    </div>
                  ) : (
                    <div
                      ref={scrollContainerRef}
                      className="max-h-[65vh] overflow-y-auto pr-1 rounded-lg"
                    >
                      <div
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: "100%",
                          position: "relative",
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const expense = filteredExpenses[virtualRow.index];
                          return (
                            <div
                              key={virtualRow.key}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="pb-2.5"
                            >
                              <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group h-full">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                                  style={{ backgroundColor: `${expense.categories?.color || "#6366f1"}20` }}
                                >
                                  <CategoryIcon
                                    name={expense.categories?.icon}
                                    className="w-4.5 h-4.5"
                                    color={expense.categories?.color}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {expense.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {format(new Date(expense.date), "MMM d, yyyy")}
                                    </span>
                                    {expense.categories?.name && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 font-normal shrink-0"
                                      >
                                        {expense.categories.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                                    {formatCurrency(expense.amount)}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this expense?")) {
                                      deleteExpense.mutate(expense.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 h-8 w-8 rounded-lg"
                                  title="Delete Expense"
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

            {/* Monthly Report View */}
            <TabsContent value="monthly-report" className="mt-0">
              <MonthlyExpenseReport expenses={expenses} />
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