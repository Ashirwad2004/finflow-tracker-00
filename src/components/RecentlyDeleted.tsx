import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  RotateCcw,
  Clock,
  User,
  Users,
  CheckSquare,
  Square,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ---------------- TYPES ---------------- */

interface DeletedExpense {
  id: string;
  type: "expense";
  description: string;
  amount: number;
  date: string;
  deleted_at?: string | null;
  group_id?: string;
  username?: string;
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
  participants?: {
    name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

interface DeletedGroup {
  id: string;
  type: "group";
  name: string;
  description: string;
  created_by: string;
  deleted_at?: string | null;
  members_count?: number;
  expenses_count?: number;
}

type DeletedItem =
  | DeletedExpense
  | DeletedLentMoney
  | DeletedSplitBill
  | DeletedGroup;

export const RecentlyDeleted = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  /* ---------------- HELPERS ---------------- */

  const getKey = (item: DeletedItem) =>
    `${item.type}|${item.id}`;

  /* ---------------- LOAD ---------------- */

  const refreshDeletedItems = useCallback(() => {
    if (!userId) return;

    const load = (key: string, type: any) =>
      JSON.parse(localStorage.getItem(key) || "[]").map(
        (i: any) => ({ ...i, type })
      );

    const all = [
      ...load(`recently_deleted_${userId}`, "expense"),
      ...load(`recently_deleted_lent_money_${userId}`, "lent_money"),
      ...load(`recently_deleted_split_bills_${userId}`, "split_bill"),
      ...load(`recently_deleted_groups_${userId}`, "group"),
    ];

    all.sort(
      (a, b) =>
        new Date(b.deleted_at || "").getTime() -
        new Date(a.deleted_at || "").getTime()
    );

    setDeletedItems(all);
  }, [userId]);

  useEffect(() => {
    refreshDeletedItems();
  }, [refreshDeletedItems]);

  /* ---------------- SELECT ---------------- */

  const toggleSelectItem = (key: string) => {
    setSelectedItems(prev =>
      prev.includes(key)
        ? prev.filter(i => i !== key)
        : [...prev, key]
    );
  };

  const selectAllItems = () => {
    if (selectedItems.length === deletedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(deletedItems.map(getKey));
    }
  };

  /* ---------------- DELETE SELECTED ---------------- */

  const deleteSelectedItems = useMutation({
    mutationFn: async () => {
      for (const key of selectedItems) {
        const [type, id] = key.split("|");

        const storageKey =
          type === "expense"
            ? `recently_deleted_${userId}`
            : type === "lent_money"
            ? `recently_deleted_lent_money_${userId}`
            : type === "split_bill"
            ? `recently_deleted_split_bills_${userId}`
            : `recently_deleted_groups_${userId}`;

        const existing = JSON.parse(
          localStorage.getItem(storageKey) || "[]"
        );

        localStorage.setItem(
          storageKey,
          JSON.stringify(existing.filter((i: any) => i.id !== id))
        );
      }
    },
    onSuccess: () => {
      setSelectedItems([]);
      refreshDeletedItems();
      toast({
        title: "Deleted",
        description: "Selected items permanently deleted",
      });
    },
  });

  /* ---------------- RESTORE ---------------- */

  const handleRestore = (item: DeletedItem) => {
    if (item.type === "expense") {
      if (item.group_id) {
        // Restore group expense
        supabase.from("group_expenses").insert({
          group_id: item.group_id,
          user_id: userId,
          username: item.username || "Unknown",
          description: item.description,
          amount: item.amount,
          date: item.date,
          category_id: item.categories?.id,
        });
        queryClient.invalidateQueries({ queryKey: ["group-expenses", item.group_id] });
      } else {
        // Restore regular expense
        supabase.from("expenses").insert({
          description: item.description,
          amount: item.amount,
          date: item.date,
          category_id: item.categories.id,
          user_id: userId,
        });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      }
    } else if (item.type === "group") {
      // Restore group
      supabase.from("groups").insert({
        name: item.name,
        description: item.description,
        created_by: userId,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    }

    const key =
      item.type === "expense"
        ? `recently_deleted_${userId}`
        : item.type === "lent_money"
        ? `recently_deleted_lent_money_${userId}`
        : item.type === "split_bill"
        ? `recently_deleted_split_bills_${userId}`
        : `recently_deleted_groups_${userId}`;

    const existing = JSON.parse(
      localStorage.getItem(key) || "[]"
    );

    localStorage.setItem(
      key,
      JSON.stringify(existing.filter((i: any) => i.id !== item.id))
    );

    refreshDeletedItems();
    toast({ title: "Restored successfully" });
  };

  /* ---------------- UI ---------------- */

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recently Deleted
          </CardTitle>

          {deletedItems.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllItems}>
                {selectedItems.length === deletedItems.length ? (
                  <CheckSquare className="w-4 h-4 mr-1" />
                ) : (
                  <Square className="w-4 h-4 mr-1" />
                )}
                {selectedItems.length === deletedItems.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>

              {selectedItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedItems.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete selected items?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is permanent.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteSelectedItems.mutate()
                        }
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="divide-y">
        {deletedItems.map(item => {
          const key = getKey(item);
          return (
            <div key={key} className="flex items-center gap-3 p-4">
              <Checkbox
                checked={selectedItems.includes(key)}
                onCheckedChange={() => toggleSelectItem(key)}
              />
              <div className="flex-1">
                <p className="font-medium">
                  {"title" in item
                    ? item.title
                    : "name" in item
                    ? item.name
                    : "person_name" in item
                    ? item.person_name
                    : item.description}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {item.type.replace("_", " ")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRestore(item)}
              >
                <RotateCcw className="w-4 h-4 text-green-600" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
