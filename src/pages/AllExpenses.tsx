import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Filter, Trash2, Calendar, TrendingDown } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const AllExpenses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

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

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
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
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${expense.categories?.color}20` }}
                    >
                      {expense.categories?.icon}
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

export default AllExpenses;
