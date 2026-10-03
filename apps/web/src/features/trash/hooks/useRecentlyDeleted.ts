import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { DeletedItem, ItemType } from "../types";
import { useTrashStorage } from "./useTrashStorage";

export function useRecentlyDeleted(userId: string) {
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
        description: "Items have been removed from history.",
      });
    },
  });

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id);

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
        const { error: err } = await (supabase as any).from(table).insert(payload);

        // Handle Foreign Key Error (e.g., Group no longer exists)
        if (err?.code === "23503") {
          throw new Error("Cannot restore: The group this expense belonged to no longer exists.");
        }
        if (err) throw err;

        queryClient.invalidateQueries({
          queryKey: item.group_id ? ["group-expenses", item.group_id] : ["expenses"],
        });
      } else if (item.type === "group") {
        const { error: err } = await (supabase as any).from("groups").insert({
          name: item.name,
          description: item.description,
          created_by: userId,
          invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        });
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      } else if (item.type === "lent_money") {
        const { error: err } = await (supabase as any).from("lent_money").insert({
          user_id: userId,
          amount: item.amount,
          person_name: item.person_name,
          description: item.description,
          due_date: item.due_date,
          status: item.status || "pending",
        });
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      } else if (item.type === "borrowed_money") {
        const { error: err } = await (supabase as any).from("borrowed_money").insert({
          user_id: userId,
          amount: item.amount,
          person_name: item.person_name,
          description: item.description,
          due_date: item.due_date,
          status: item.status || "pending",
        });
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
      } else if (item.type === "party") {
        const { error: err } = await supabase.from("parties").insert({
          user_id: userId,
          name: item.name,
          type: item.party_type,
          phone: item.phone,
          email: item.email,
          address: item.address,
          gst_number: item.gst_number,
        } as any);
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["parties"] });
      } else if (item.type === "product") {
        const { error: err } = await supabase.from("products").insert({
          user_id: userId,
          name: item.name,
          price: Number(item.price) || 0,
          cost_price: item.cost_price != null && !isNaN(Number(item.cost_price)) ? Number(item.cost_price) : null,
          stock_quantity: Number(item.stock_quantity) || 0,
          unit: item.unit || "pc",
          is_listed_online: Boolean(item.is_listed_online),
          online_description: item.online_description || null,
          image_url: item.image_url || null,
          mrp: item.mrp != null && !isNaN(Number(item.mrp)) ? Number(item.mrp) : null,
          tax_rate: item.tax_rate != null && !isNaN(Number(item.tax_rate)) ? Number(item.tax_rate) : 0,
          barcode: item.barcode || null,
          barcode_type: item.barcode_type || "code128",
          barcode_source: item.barcode_source || "manufacturer",
          sku: item.sku || null,
          category: item.category || null,
          hsn_code: item.hsn_code || null,
          rack_location: item.rack_location || null,
        } as any);
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else if (item.type === "sale") {
        const { error: err } = await supabase.from("sales" as any).insert({
          id: item.id,
          user_id: item.user_id,
          customer_name: item.customer_name,
          invoice_number: item.invoice_number,
          status: item.status,
          total_amount: item.total_amount,
          subtotal: item.subtotal,
          tax_amount: item.tax_amount,
          date: item.date,
          items: item.items,
        } as any);
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["sales", userId] });
      } else if (item.type === "purchase") {
        const payload: any = {
          id: item.id,
          user_id: item.user_id || userId,
          party_id: item.party_id || null,
          vendor_name: item.vendor_name || "Unknown Vendor",
          bill_number: item.bill_number || "BILL",
          status: item.status || "pending",
          total_amount: Number(item.total_amount) || 0,
          subtotal: item.subtotal != null ? Number(item.subtotal) : Number(item.total_amount) || 0,
          tax_amount: Number(item.tax_amount) || 0,
          tax_rate: Number(item.tax_rate) || 0,
          discount_amount: Number(item.discount_amount) || 0,
          amount_paid: Number(item.amount_paid) || 0,
          balance_due: item.balance_due != null ? Number(item.balance_due) : Number(item.total_amount) || 0,
          date: item.date ? String(item.date).split("T")[0] : new Date().toISOString().split("T")[0],
          due_date: item.due_date ? String(item.due_date).split("T")[0] : null,
          items: Array.isArray(item.items) ? item.items : [],
          place_of_supply: item.place_of_supply || null,
          notes: item.notes || (item.payment_mode ? `Payment: ${item.payment_mode}` : null),
          vendor_phone: item.vendor_phone || null,
          vendor_email: item.vendor_email || null,
          vendor_gstin: item.vendor_gstin || null,
          attachment_url: item.attachment_url || null,
          cgst: Number(item.cgst) || 0,
          sgst: Number(item.sgst) || 0,
          igst: Number(item.igst) || 0,
        };
        const { error: err } = await (supabase as any).from("purchases").insert(payload);
        if (err) throw err;
        queryClient.invalidateQueries({ queryKey: ["purchases", userId] });
        queryClient.invalidateQueries({ queryKey: ["parties", userId] });
      }

      // Success
      removePermanently([{ id: item.id, type: item.type }]);
      refreshList();
      toast({
        title: "Restored successfully",
        description: "Item moved back to active list.",
        variant: "default",
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

  const hasItems = deletedItems.length > 0;
  const isAllSelected = hasItems && selectedIds.size === deletedItems.length;

  return {
    deletedItems,
    selectedIds,
    restoringId,
    hasItems,
    isAllSelected,
    getKey,
    toggleSelect,
    toggleAll,
    deleteMutation,
    handleRestore,
    refreshList,
  };
}
