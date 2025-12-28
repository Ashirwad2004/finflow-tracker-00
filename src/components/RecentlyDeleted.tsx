import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Clock, User, Users } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface DeletedExpense {
  id: string;
  type: "expense";
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

interface DeletedLentMoney {
  id: string;
  type: "lent_money";
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
  deleted_at?: string | null;
}

interface DeletedSplitBill {
  id: string;
  type: "split_bill";
  title: string;
  total_amount: number;
  user_id: string;
  deleted_at?: string | null;
  participants?: Array<{
    name: string;
    amount: number;
    is_paid: boolean;
  }>;
}

type DeletedItem = DeletedExpense | DeletedLentMoney | DeletedSplitBill;

interface RecentlyDeletedProps {
  userId: string;
}

export const RecentlyDeleted = ({ userId }: RecentlyDeletedProps) => {
  const queryClient = useQueryClient();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);

  const refreshDeletedItems = useCallback(() => {
    if (userId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Load expenses
      const expensesKey = `recently_deleted_${userId}`;
      const storedExpenses = JSON.parse(localStorage.getItem(expensesKey) || '[]');
      const validExpenses = storedExpenses
        .filter((item: any) => new Date(item.deleted_at || '') > thirtyDaysAgo)
        .map((item: any) => ({ ...item, type: "expense" as const }));
      localStorage.setItem(expensesKey, JSON.stringify(validExpenses.map(({ type, ...rest }: any) => rest)));

      // Load lent money
      const lentMoneyKey = `recently_deleted_lent_money_${userId}`;
      const storedLentMoney = JSON.parse(localStorage.getItem(lentMoneyKey) || '[]');
      const validLentMoney = storedLentMoney
        .filter((item: any) => new Date(item.deleted_at || '') > thirtyDaysAgo)
        .map((item: any) => ({ ...item, type: "lent_money" as const }));
      localStorage.setItem(lentMoneyKey, JSON.stringify(validLentMoney.map(({ type, ...rest }: any) => rest)));

      // Load split bills
      const splitBillsKey = `recently_deleted_split_bills_${userId}`;
      const storedSplitBills = JSON.parse(localStorage.getItem(splitBillsKey) || '[]');
      const validSplitBills = storedSplitBills
        .filter((item: any) => new Date(item.deleted_at || '') > thirtyDaysAgo)
        .map((item: any) => ({ ...item, type: "split_bill" as const }));
      localStorage.setItem(splitBillsKey, JSON.stringify(validSplitBills.map(({ type, ...rest }: any) => rest)));

      // Combine and sort by deleted_at
      const allItems = [...validExpenses, ...validLentMoney, ...validSplitBills];
      allItems.sort((a, b) => new Date(b.deleted_at || '').getTime() - new Date(a.deleted_at || '').getTime());
      
      setDeletedItems(allItems);
    }
  }, [userId]);

  useEffect(() => {
    refreshDeletedItems();
  }, [userId, refreshDeletedItems]);

  const restoreExpense = useMutation({
    mutationFn: async (expense: DeletedExpense) => {
      const expenseData = {
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category_id: expense.categories.id,
        user_id: userId!,
      };

      const { error } = await supabase.from("expenses").insert(expenseData);
      if (error) throw error;

      const recentlyDeletedKey = `recently_deleted_${userId}`;
      const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || '[]');
      const updatedDeleted = existingDeleted.filter((item: any) => item.id !== expense.id);
      localStorage.setItem(recentlyDeletedKey, JSON.stringify(updatedDeleted));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      refreshDeletedItems();
      toast({ title: "Expense restored", description: "The expense has been restored successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore expense. Please try again.", variant: "destructive" });
    },
  });

  const restoreLentMoney = useMutation({
    mutationFn: async (lentMoney: DeletedLentMoney) => {
      const { type, deleted_at, ...data } = lentMoney;
      const { error } = await supabase.from("lent_money").insert(data);
      if (error) throw error;

      const key = `recently_deleted_lent_money_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter((item: any) => item.id !== lentMoney.id);
      localStorage.setItem(key, JSON.stringify(updated));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      refreshDeletedItems();
      toast({ title: "Lent money restored", description: "The lent money record has been restored." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore lent money. Please try again.", variant: "destructive" });
    },
  });

  const restoreSplitBill = useMutation({
    mutationFn: async (splitBill: DeletedSplitBill) => {
      const { type, deleted_at, participants, ...billData } = splitBill;
      
      const { data: bill, error: billError } = await supabase
        .from("split_bills")
        .insert(billData)
        .select()
        .single();

      if (billError) throw billError;

      if (participants && participants.length > 0) {
        const participantsToInsert = participants.map(p => ({
          split_bill_id: bill.id,
          name: p.name,
          amount: p.amount,
          is_paid: p.is_paid,
        }));

        const { error: partError } = await supabase
          .from("split_bill_participants")
          .insert(participantsToInsert);

        if (partError) throw partError;
      }

      const key = `recently_deleted_split_bills_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter((item: any) => item.id !== splitBill.id);
      localStorage.setItem(key, JSON.stringify(updated));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      refreshDeletedItems();
      toast({ title: "Split bill restored", description: "The split bill has been restored." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to restore split bill. Please try again.", variant: "destructive" });
    },
  });

  const permanentlyDeleteItem = useMutation({
    mutationFn: async (item: DeletedItem) => {
      let key = "";
      if (item.type === "expense") {
        key = `recently_deleted_${userId}`;
      } else if (item.type === "lent_money") {
        key = `recently_deleted_lent_money_${userId}`;
      } else if (item.type === "split_bill") {
        key = `recently_deleted_split_bills_${userId}`;
      }

      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter((i: any) => i.id !== item.id);
      localStorage.setItem(key, JSON.stringify(updated));
    },
    onSuccess: () => {
      refreshDeletedItems();
      toast({ title: "Permanently deleted", description: "The item has been permanently removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item. Please try again.", variant: "destructive" });
    },
  });

  const handleRestore = (item: DeletedItem) => {
    if (item.type === "expense") {
      restoreExpense.mutate(item);
    } else if (item.type === "lent_money") {
      restoreLentMoney.mutate(item);
    } else if (item.type === "split_bill") {
      restoreSplitBill.mutate(item);
    }
  };

  const getDaysUntilDeletion = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return 30;
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

  const getItemDetails = (item: DeletedItem) => {
    if (item.type === "expense") {
      const Icon = getIcon(item.categories.icon);
      return {
        icon: <Icon className="w-5 h-5" style={{ color: item.categories.color }} />,
        iconBg: `${item.categories.color}20`,
        title: item.description,
        subtitle: item.categories.name,
        date: new Date(item.date).toLocaleDateString(),
        amount: item.amount,
        badge: null,
      };
    } else if (item.type === "lent_money") {
      return {
        icon: <User className="w-5 h-5 text-blue-500" />,
        iconBg: "hsl(var(--primary) / 0.1)",
        title: item.person_name,
        subtitle: item.description,
        date: null,
        amount: item.amount,
        badge: <Badge variant="secondary" className="text-xs">Lent Money</Badge>,
      };
    } else {
      return {
        icon: <Users className="w-5 h-5 text-purple-500" />,
        iconBg: "hsl(var(--accent) / 0.2)",
        title: item.title,
        subtitle: `${item.participants?.length || 0} participants`,
        date: null,
        amount: item.total_amount,
        badge: <Badge variant="secondary" className="text-xs">Split Bill</Badge>,
      };
    }
  };

  if (deletedItems.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No recently deleted items.</p>
          <p className="text-sm text-muted-foreground mt-2">Deleted items will appear here for 30 days before being permanently removed.</p>
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
          {deletedItems.map((item) => {
            const details = getItemDetails(item);
            const daysLeft = getDaysUntilDeletion(item.deleted_at);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: details.iconBg }}
                    >
                      {details.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{details.title}</p>
                        {details.badge}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                        <span>{details.subtitle}</span>
                        {details.date && (
                          <>
                            <span>•</span>
                            <span>{details.date}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="text-orange-600">
                          {daysLeft === 0 ? "Deleting soon" : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-semibold text-lg text-foreground">
                      ₹{parseFloat(details.amount.toString()).toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(item)}
                        className="hover:text-green-600 flex-shrink-0"
                        title="Restore"
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
                            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete
                              "{details.title}" and remove it from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => permanentlyDeleteItem.mutate(item)}
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