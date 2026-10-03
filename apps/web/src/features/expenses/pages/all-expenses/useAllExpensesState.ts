import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { toast } from "@/core/hooks/use-toast";
import { isSameMonth } from "date-fns";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { useCurrency } from "@/core/contexts/CurrencyContext";

export function useAllExpensesState() {
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
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || "[]");

        const deletedItem = {
          ...expenseToDelete,
          deleted_at: new Date().toISOString(),
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

  return {
    expenses,
    isLoading,
    categories,
    isAddDialogOpen,
    setIsAddDialogOpen,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    scrollContainerRef,
    handleRefresh,
    deleteExpense,
    totalExpenses,
    spentThisMonth,
    topCategoryName,
    topCategoryAmount,
    avgExpense,
    filteredExpenses,
    totalFiltered,
    rowVirtualizer,
    formatCurrency,
    user,
  };
}
