import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  RotateCcw,
  Clock,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
} from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

/* ---------------- TYPES ---------------- */

type ItemType = "expense" | "lent_money" | "split_bill" | "group";

interface BaseDeletedItem {
  id: string;
  type: ItemType;
  deleted_at: string; // Enforce deleted_at existence
}

interface DeletedExpense extends BaseDeletedItem {
  type: "expense";
  description: string;
  amount: number;
  date: string;
  group_id?: string;
  username?: string;
  categories?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface DeletedLentMoney extends BaseDeletedItem {
  type: "lent_money";
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
}

interface DeletedSplitBill extends BaseDeletedItem {
  type: "split_bill";
  title: string;
  total_amount: number;
  user_id: string;
  participants?: {
    name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

interface DeletedGroup extends BaseDeletedItem {
  type: "group";
  name: string;
  description: string;
  created_by: string;
  members_count?: number;
}

type DeletedItem = DeletedExpense | DeletedLentMoney | DeletedSplitBill | DeletedGroup;

/* ---------------- STORAGE HOOK ---------------- */

const useTrashStorage = (userId: string) => {
  const getStorageKey = (type: ItemType) => {
    switch (type) {
      case "expense": return `recently_deleted_${userId}`;
      case "lent_money": return `recently_deleted_lent_money_${userId}`;
      case "split_bill": return `recently_deleted_split_bills_${userId}`;
      case "group": return `recently_deleted_groups_${userId}`;
    }
  };

  const getAllDeletedItems = useCallback((): DeletedItem[] => {
    if (!userId) return [];
    
    const load = <T extends DeletedItem>(type: ItemType): T[] => {
      try {
        const items = JSON.parse(localStorage.getItem(getStorageKey(type)) || "[]");
        return items.map((i: any) => ({ ...i, type, deleted_at: i.deleted_at || new Date().toISOString() }));
      } catch (e) {
        console.error(`Error parsing ${type} storage`, e);
        return [];
      }
    };

    return [
      ...load<DeletedExpense>("expense"),
      ...load<DeletedLentMoney>("lent_money"),
      ...load<DeletedSplitBill>("split_bill"),
      ...load<DeletedGroup>("group"),
    ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  }, [userId]);

  const removePermanently = (itemsToRemove: { id: string; type: ItemType }[]) => {
    // Group by type to minimize localStorage writes
    const types = ["expense", "lent_money", "split_bill", "group"] as ItemType[];
    
    types.forEach((type) => {
      const idsToRemoveForType = itemsToRemove
        .filter((i) => i.type === type)
        .map((i) => i.id);

      if (idsToRemoveForType.length > 0) {
        const key = getStorageKey(type);
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = existing.filter((i: any) => !idsToRemoveForType.includes(i.id));
        localStorage.setItem(key, JSON.stringify(updated));
      }
    });
  };

  return { getAllDeletedItems, removePermanently };
};

/* ---------------- COMPONENT ---------------- */

export const RecentlyDeleted = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { getAllDeletedItems, removePermanently } = useTrashStorage(userId);
  
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    setDeletedItems(getAllDeletedItems());
  }, [getAllDeletedItems]);

  const refreshList = () => {
    setDeletedItems(getAllDeletedItems());
    setSelectedIds(new Set()); // Clear selection on refresh
  };

  /* ---------------- SELECTION LOGIC ---------------- */

  const getKey = (item: { type: string; id: string }) => `${item.type}|${item.id}`;

  const toggleSelect = (key: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === deletedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletedItems.map(getKey)));
    }
  };

  /* ---------------- ACTIONS ---------------- */

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const itemsToDelete = Array.from(selectedIds).map((key) => {
        const [type, id] = key.split("|");
        return { type: type as ItemType, id };
      });
      removePermanently(itemsToDelete);
    },
    onSuccess: () => {
      refreshList();
      toast({ title: "Permanently Deleted", description: "Selected items have been removed." });
    },
  });

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id);
    let error: any = null;

    try {
      // 1. RESTORE EXPENSE
      if (item.type === "expense") {
        if (item.group_id) {
          const { error: err } = await supabase.from("group_expenses").insert({
            group_id: item.group_id,
            user_id: userId,
            username: item.username || "Unknown",
            description: item.description,
            amount: item.amount,
            date: item.date,
            category_id: item.categories?.id || null,
          });
          error = err;
          if (!err) queryClient.invalidateQueries({ queryKey: ["group-expenses", item.group_id] });
        } else {
          const { error: err } = await supabase.from("expenses").insert({
            description: item.description,
            amount: item.amount,
            date: item.date,
            category_id: item.categories?.id || null,
            user_id: userId,
          });
          error = err;
          if (!err) queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }
      } 
      
      // 2. RESTORE GROUP
      else if (item.type === "group") {
        const { error: err } = await supabase.from("groups").insert({
          name: item.name,
          description: item.description,
          created_by: userId,
          invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        });
        error = err;
        if (!err) queryClient.invalidateQueries({ queryKey: ["groups"] });
      } 
      
      // 3. RESTORE LENT MONEY
      else if (item.type === "lent_money") {
        const { error: err } = await supabase.from("lent_money").insert({
          user_id: userId,
          amount: item.amount,
          person_name: item.person_name,
          description: item.description,
          due_date: item.due_date,
          status: item.status || "pending",
        });
        error = err;
        if (!err) queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      } 
      
      // 4. RESTORE SPLIT BILL
      else if (item.type === "split_bill") {
        // Transaction-like behavior via sequential awaits
        const { data: bill, error: billError } = await supabase
          .from("split_bills")
          .insert({
            user_id: userId,
            title: item.title,
            total_amount: item.total_amount
          })
          .select()
          .single();

        if (billError) throw billError;

        if (bill && item.participants && item.participants.length > 0) {
           const { error: partError } = await supabase
            .from("split_bill_participants")
            .insert(
              item.participants.map(p => ({
                split_bill_id: bill.id,
                name: p.name,
                amount: p.amount,
                is_paid: p.is_paid
              }))
            );
            if (partError) throw partError;
        }
        queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      }

      if (error) throw error;

      // Success: Remove from storage
      removePermanently([{ id: item.id, type: item.type }]);
      refreshList();
      toast({ title: "Restored successfully", description: "Item has been moved back to your active list." });

    } catch (err: any) {
      console.error("Restore failed:", err);
      toast({
        title: "Restore Failed",
        description: err.message || "Could not restore the item.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  /* ---------------- UI RENDER ---------------- */

  const hasItems = deletedItems.length > 0;
  const isAllSelected = hasItems && selectedIds.size === deletedItems.length;

  return (
    <Card className="w-full h-full flex flex-col shadow-sm border-dashed">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Bin / History
            </CardTitle>
            <CardDescription>
              Items are stored locally. Restoring adds them back to the database.
            </CardDescription>
          </div>

          {hasItems && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {isAllSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                {isAllSelected ? "Deselect All" : "Select All"}
              </Button>

              {selectedIds.size > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedIds.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. These items will be removed from your local history forever.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                        Delete Forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[500px] px-6">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <div className="bg-muted p-4 rounded-full">
                <Trash2 className="w-8 h-8 opacity-50" />
              </div>
              <p>Your trash bin is empty.</p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {deletedItems.map((item) => (
                <DeletedItemRow
                  key={`${item.type}|${item.id}`}
                  item={item}
                  isSelected={selectedIds.has(getKey(item))}
                  isRestoring={restoringId === item.id}
                  onToggle={() => toggleSelect(getKey(item))}
                  onRestore={() => handleRestore(item)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/* ---------------- SUB-COMPONENT ---------------- */

const DeletedItemRow = ({
  item,
  isSelected,
  isRestoring,
  onToggle,
  onRestore,
}: {
  item: DeletedItem;
  isSelected: boolean;
  isRestoring: boolean;
  onToggle: () => void;
  onRestore: () => void;
}) => {
  const getItemDetails = (item: DeletedItem) => {
    switch (item.type) {
      case "expense":
        return {
          title: item.description,
          subtitle: `Expense • ${new Date(item.date).toLocaleDateString()}`,
          amount: item.amount,
          icon: item.categories?.icon || "💸",
        };
      case "lent_money":
        return {
          title: item.person_name,
          subtitle: `Lent • ${item.description || "No desc"}`,
          amount: item.amount,
          icon: "🤝",
        };
      case "split_bill":
        return {
          title: item.title,
          subtitle: "Split Bill",
          amount: item.total_amount,
          icon: "🧾",
        };
      case "group":
        return {
          title: item.name,
          subtitle: `Group • ${item.description || "No desc"}`,
          amount: null,
          icon: "👥",
        };
      default:
        return { title: "Unknown", subtitle: "Unknown", amount: 0, icon: "?" };
    }
  };

  const { title, subtitle, amount, icon } = getItemDetails(item);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? "bg-accent/50 border-primary/50" : "hover:bg-muted/50"}`}>
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      
      <div className="w-8 h-8 flex items-center justify-center bg-muted rounded text-lg">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
            {item.type.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
        </div>
      </div>

      {amount !== null && (
        <div className="text-sm font-semibold whitespace-nowrap">
           {amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </div>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30"
        onClick={onRestore}
        disabled={isRestoring}
        title="Restore item"
      >
        {isRestoring ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};