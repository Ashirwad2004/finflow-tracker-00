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
  Receipt,
  Users,
  HandCoins,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";

/* ---------------- TYPES ---------------- */

type ItemType = "expense" | "lent_money" | "split_bill" | "group";

interface BaseDeletedItem {
  id: string;
  type: ItemType;
  deleted_at: string;
}

interface DeletedExpense extends BaseDeletedItem {
  type: "expense";
  description: string;
  amount: number;
  date: string;
  group_id?: string;
  username?: string;
  categories?: { id: string; name: string; color: string; icon: string };
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
  participants?: { name: string; amount: number; is_paid: boolean }[];
}

interface DeletedGroup extends BaseDeletedItem {
  type: "group";
  name: string;
  description: string;
  created_by: string;
}

type DeletedItem = DeletedExpense | DeletedLentMoney | DeletedSplitBill | DeletedGroup;

/* ---------------- UTILS ---------------- */

const safeJSONParse = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error parsing localStorage key "${key}":`, error);
    return fallback;
  }
};

// Updated to use Indian Locale (en-IN) for Rupee symbol and formatting
const formatCurrency = (amount: number, currency: string = "INR") => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0, // Keeps numbers clean (e.g., ₹500 instead of ₹500.00)
  }).format(amount);
};

/* ---------------- STORAGE HOOK ---------------- */

const useTrashStorage = (userId: string) => {
  const getStorageKey = useCallback((type: ItemType) => {
    const keys: Record<ItemType, string> = {
      expense: `recently_deleted_${userId}`,
      lent_money: `recently_deleted_lent_money_${userId}`,
      split_bill: `recently_deleted_split_bills_${userId}`,
      group: `recently_deleted_groups_${userId}`,
    };
    return keys[type];
  }, [userId]);

  const getAllDeletedItems = useCallback((): DeletedItem[] => {
    if (!userId) return [];

    const load = <T extends DeletedItem>(type: ItemType): T[] => {
      const items = safeJSONParse<any[]>(getStorageKey(type), []);
      return items.map((i) => ({
        ...i,
        type,
        deleted_at: i.deleted_at || new Date().toISOString(),
      }));
    };

    const allItems = [
      ...load<DeletedExpense>("expense"),
      ...load<DeletedLentMoney>("lent_money"),
      ...load<DeletedSplitBill>("split_bill"),
      ...load<DeletedGroup>("group"),
    ];

    // Sort by most recently deleted
    return allItems.sort((a, b) => 
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    );
  }, [userId, getStorageKey]);

  const removePermanently = useCallback((itemsToRemove: { id: string; type: ItemType }[]) => {
    const types: ItemType[] = ["expense", "lent_money", "split_bill", "group"];

    types.forEach((type) => {
      const idsToRemove = itemsToRemove
        .filter((i) => i.type === type)
        .map((i) => i.id);

      if (idsToRemove.length > 0) {
        const key = getStorageKey(type);
        const existing = safeJSONParse<BaseDeletedItem[]>(key, []);
        const updated = existing.filter((i) => !idsToRemove.includes(i.id));
        localStorage.setItem(key, JSON.stringify(updated));
      }
    });
  }, [getStorageKey]);

  return { getAllDeletedItems, removePermanently };
};

/* ---------------- MAIN COMPONENT ---------------- */

interface RecentlyDeletedProps {
  userId: string;
  currencyCode?: string;
  onClose?: () => void; // Optional: If used in a modal/drawer
}

// Default currencyCode updated to "INR"
export const RecentlyDeleted = ({ userId, currencyCode = "INR", onClose }: RecentlyDeletedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAllDeletedItems, removePermanently } = useTrashStorage(userId);
  
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load items on mount
  useEffect(() => {
    setDeletedItems(getAllDeletedItems());
  }, [getAllDeletedItems]);

  const refreshList = useCallback(() => {
    setDeletedItems(getAllDeletedItems());
    setSelectedIds(new Set());
  }, [getAllDeletedItems]);

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
      toast({ 
        title: "Permanently Deleted", 
        description: "Items have been removed from history." 
      });
    },
  });

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id);
    let error: any = null;

    try {
      if (item.type === "expense") {
        const payload = item.group_id
          ? {
              group_id: item.group_id,
              user_id: userId,
              username: item.username || "Unknown",
              description: item.description,
              amount: item.amount,
              date: item.date,
              category_id: item.categories?.id || null,
            }
          : {
              description: item.description,
              amount: item.amount,
              date: item.date,
              category_id: item.categories?.id || null,
              user_id: userId,
            };

        const table = item.group_id ? "group_expenses" : "expenses";
        const { error: err } = await supabase.from(table).insert(payload);
        
        // Handle Foreign Key Error (e.g., Group no longer exists)
        if (err?.code === "23503") {
          throw new Error("Cannot restore: The group this expense belonged to no longer exists.");
        }
        if (err) throw err;
        
        queryClient.invalidateQueries({ 
          queryKey: item.group_id ? ["group-expenses", item.group_id] : ["expenses"] 
        });
      } 
      
      else if (item.type === "group") {
        const { error: err } = await supabase.from("groups").insert({
          name: item.name,
          description: item.description,
          created_by: userId,
          invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        });
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      } 
      
      else if (item.type === "lent_money") {
        const { error: err } = await supabase.from("lent_money").insert({
          user_id: userId,
          amount: item.amount,
          person_name: item.person_name,
          description: item.description,
          due_date: item.due_date,
          status: item.status || "pending",
        });
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      } 
      
      else if (item.type === "split_bill") {
        const { data: bill, error: billError } = await supabase
          .from("split_bills")
          .insert({ user_id: userId, title: item.title, total_amount: item.total_amount })
          .select()
          .single();

        if (billError) throw billError;

        if (bill && item.participants?.length) {
          const { error: partError } = await supabase
            .from("split_bill_participants")
            .insert(
              item.participants.map((p) => ({
                split_bill_id: bill.id,
                name: p.name,
                amount: p.amount,
                is_paid: p.is_paid,
              }))
            );
          if (partError) throw partError;
        }
        queryClient.invalidateQueries({ queryKey: ["split-bills"] });
      }

      // Success
      removePermanently([{ id: item.id, type: item.type }]);
      refreshList();
      toast({ 
        title: "Restored successfully", 
        description: "Item moved back to active list.",
        variant: "default" 
      });

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

  /* ---------------- UI HELPERS ---------------- */

  const hasItems = deletedItems.length > 0;
  const isAllSelected = hasItems && selectedIds.size === deletedItems.length;

  return (
    <Card className="w-full h-full flex flex-col shadow-sm border-dashed">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Clock className="w-5 h-5 text-muted-foreground" />
              History & Bin
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Manage locally stored deleted items.
            </CardDescription>
          </div>

          {hasItems && (
            <div className="flex w-full sm:w-auto gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleAll}
                className="flex-1 sm:flex-none"
              >
                {isAllSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                <span className="sr-only sm:not-sr-only">{isAllSelected ? "Deselect" : "Select All"}</span>
                <span className="sm:hidden">{isAllSelected ? "None" : "All"}</span>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    disabled={selectedIds.size === 0}
                    className="flex-1 sm:flex-none"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. These items will be permanently removed from your local history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteMutation.mutate()} 
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea className="h-[60vh] sm:h-[500px] px-4 md:px-6">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground gap-3">
              <div className="bg-muted p-4 rounded-full">
                <Trash2 className="w-8 h-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="font-medium">No deleted items</p>
                <p className="text-sm opacity-70">Items deleted recently will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2 pb-6">
              {deletedItems.map((item) => (
                <DeletedItemRow
                  key={getKey(item)}
                  item={item}
                  currencyCode={currencyCode}
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
  currencyCode,
  isSelected,
  isRestoring,
  onToggle,
  onRestore,
}: {
  item: DeletedItem;
  currencyCode: string;
  isSelected: boolean;
  isRestoring: boolean;
  onToggle: () => void;
  onRestore: () => void;
}) => {
  const getMetadata = (item: DeletedItem) => {
    switch (item.type) {
      case "expense":
        return {
          title: item.description,
          subtitle: `Expense • ${new Date(item.date).toLocaleDateString()}`,
          amount: item.amount,
          icon: <Wallet className="w-4 h-4" />,
          color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      case "lent_money":
        return {
          title: item.person_name,
          subtitle: `Lent • ${item.description || "No desc"}`,
          amount: item.amount,
          icon: <HandCoins className="w-4 h-4" />,
          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "split_bill":
        return {
          title: item.title,
          subtitle: "Split Bill",
          amount: item.total_amount,
          icon: <Receipt className="w-4 h-4" />,
          color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        };
      case "group":
        return {
          title: item.name,
          subtitle: "Group",
          amount: null,
          icon: <Users className="w-4 h-4" />,
          color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        };
      default:
        return { title: "Item", subtitle: "", amount: 0, icon: <AlertCircle />, color: "bg-gray-100" };
    }
  };

  const { title, subtitle, amount, icon, color } = getMetadata(item);

  return (
    <div 
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
        isSelected 
          ? "bg-primary/5 border-primary/50 shadow-sm" 
          : "hover:bg-muted/60 bg-card border-border/60"
      )}
    >
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={onToggle}
        className="mt-0.5"
        aria-label={`Select ${title}`}
      />
      
      <div className={cn("w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-md", color)}>
        {item.type === "expense" && item.categories?.icon ? (
          <span className="text-lg leading-none">{item.categories.icon}</span>
        ) : (
          icon
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-medium text-sm truncate leading-tight">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 h-4 capitalize font-normal tracking-wide"
          >
            {item.type.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline-block">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {amount !== null && (
          <div className="text-sm font-semibold whitespace-nowrap tabular-nums">
             {formatCurrency(amount, currencyCode)}
          </div>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click if we add row-click logic later
            onRestore();
          }}
          disabled={isRestoring}
          aria-label={`Restore ${title}`}
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};