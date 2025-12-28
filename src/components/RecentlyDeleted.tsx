import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DeletedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  deleted_at?: string | null;
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface RecentlyDeletedProps {
  userId: string;
}

export const RecentlyDeleted = ({ userId }: RecentlyDeletedProps) => {
  const queryClient = useQueryClient();
  const [deletedExpenses, setDeletedExpenses] = useState<DeletedExpense[]>([]);

  // Function to refresh deleted expenses from localStorage
  const refreshDeletedExpenses = useCallback(() => {
    if (userId) {
      const recentlyDeletedKey = `recently_deleted_${userId}`;
      const stored = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');
      console.log('RecentlyDeleted: Loading from localStorage', { key: recentlyDeletedKey, stored });
      
      // Filter out items older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const validItems = stored.filter((item: DeletedExpense) => 
        new Date(item.deleted_at || '') > thirtyDaysAgo
      );
      
      console.log('RecentlyDeleted: Valid items after filtering', validItems);
      
      // Update localStorage with cleaned data
      localStorage.setItem(recentlyDeletedKey, JSON.stringify(validItems));
      setDeletedExpenses(validItems);
    }
  }, [userId]);

  // Load deleted expenses from localStorage
  useEffect(() => {
    refreshDeletedExpenses();
  }, [userId, refreshDeletedExpenses]);

  const restoreExpense = useMutation({
    mutationFn: async (expense: DeletedExpense) => {
      // Map the data to match database schema
      const expenseData = {
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category_id: expense.categories.id,
        user_id: userId!,
      };

      const { error } = await supabase
        .from("expenses")
        .insert(expenseData);

      if (error) throw error;

      // Remove from localStorage
      if (userId) {
        const recentlyDeletedKey = `recently_deleted_${userId}`;
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');
        const updatedDeleted = existingDeleted.filter((item: DeletedExpense) => item.id !== expense.id);
        localStorage.setItem(recentlyDeletedKey, JSON.stringify(updatedDeleted));
        setDeletedExpenses(updatedDeleted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      refreshDeletedExpenses();
      toast({
        title: "Expense restored",
        description: "The expense has been restored successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const permanentlyDeleteExpense = useMutation({
    mutationFn: async (id: string) => {
      // Just remove from localStorage (already deleted from database)
      if (userId) {
        const recentlyDeletedKey = `recently_deleted_${userId}`;
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');
        const updatedDeleted = existingDeleted.filter((item: DeletedExpense) => item.id !== id);
        localStorage.setItem(recentlyDeletedKey, JSON.stringify(updatedDeleted));
        setDeletedExpenses(updatedDeleted);
      }
    },
    onSuccess: () => {
      refreshDeletedExpenses();
      toast({
        title: "Expense permanently deleted",
        description: "The expense has been permanently removed.",
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

  const getDaysUntilDeletion = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return 30; // Default to 30 days if not set
    const deletedDate = new Date(deletedAt);
    const thirtyDaysLater = new Date(deletedDate);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const now = new Date();
    const diffTime = thirtyDaysLater.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getIcon = (iconName: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> => {
    const iconKey = iconName.split('-').map((word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') as keyof typeof LucideIcons;
    const IconComponent = LucideIcons[iconKey];
    if (typeof IconComponent === 'function' || (IconComponent && typeof IconComponent === 'object' && 'render' in IconComponent)) {
      return IconComponent as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    }
    return LucideIcons.Circle;
  };

  if (deletedExpenses.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recently deleted expenses.</p>
          <p className="text-sm text-muted-foreground mt-2">Deleted expenses will appear here for 30 days before being permanently removed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recently Deleted
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {deletedExpenses.map((expense) => {
            const Icon = getIcon(expense.categories.icon);
            const daysLeft = getDaysUntilDeletion(expense.deleted_at);
            return (
              <div
                key={expense.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${expense.categories.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: expense.categories.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{expense.description}</p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                        <span>{expense.categories.name}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-orange-600">
                          {daysLeft === 0 ? "Deleting soon" : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-semibold text-lg text-foreground">
                      ₹{parseFloat(expense.amount.toString()).toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => restoreExpense.mutate(expense)}
                        className="hover:text-green-600 flex-shrink-0"
                        title="Restore expense"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive flex-shrink-0"
                            title="Permanently delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently Delete Expense</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the expense
                              "{expense.description}" and remove it from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => permanentlyDeleteExpense.mutate(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};