import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useToast } from "@/core/hooks/use-toast";
import { StoreSalesman } from "../types";

interface UseStoreSalesmenProps {
  currentStoreId: string | null | undefined;
  isSalesman: boolean;
}

export function useStoreSalesmen({ currentStoreId, isSalesman }: UseStoreSalesmenProps) {
  const { toast } = useToast();

  const [newSalesmanOrders, setNewSalesmanOrders] = useState(true);
  const [newSalesmanReturns, setNewSalesmanReturns] = useState(true);

  const {
    data: salesmen = [] as StoreSalesman[],
    isLoading: isLoadingSalesmen,
    refetch: refetchSalesmen,
  } = useQuery({
    queryKey: ["storeSalesmen", currentStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_salesmen")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching salesmen:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentStoreId && !isSalesman,
  });

  const addSalesman = useMutation({
    mutationFn: async (newSalesman: {
      name: string;
      email: string;
      phone?: string;
      can_manage_orders?: boolean;
      can_manage_returns?: boolean;
    }) => {
      const { error } = await (supabase as any).from("store_salesmen").insert({
        store_id: currentStoreId,
        salesman_email: newSalesman.email.trim().toLowerCase(),
        salesman_name: newSalesman.name.trim(),
        salesman_phone: newSalesman.phone?.trim() || null,
        can_manage_orders: newSalesman.can_manage_orders ?? true,
        can_manage_returns: newSalesman.can_manage_returns ?? true,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Salesman Added", description: "Salesman has been granted access to order fulfillment." });
      refetchSalesmen();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateSalesmanSettings = useMutation({
    mutationFn: async ({
      id,
      is_active,
      can_manage_orders,
      can_manage_returns,
    }: {
      id: string;
      is_active?: boolean;
      can_manage_orders?: boolean;
      can_manage_returns?: boolean;
    }) => {
      const updatePayload: any = {};
      if (is_active !== undefined) updatePayload.is_active = is_active;
      if (can_manage_orders !== undefined) updatePayload.can_manage_orders = can_manage_orders;
      if (can_manage_returns !== undefined) updatePayload.can_manage_returns = can_manage_returns;

      const { error } = await (supabase as any)
        .from("store_salesmen")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Permissions Updated", description: "Salesman access permissions updated successfully." });
      refetchSalesmen();
    },
    onError: (err: any) => {
      toast({ title: "Error Updating Permissions", description: err.message, variant: "destructive" });
    },
  });

  const removeSalesman = useMutation({
    mutationFn: async (salesmanId: string) => {
      const { error } = await supabase.from("store_salesmen").delete().eq("id", salesmanId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Salesman Removed", description: "The salesman has been removed." });
      refetchSalesmen();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return {
    salesmen,
    isLoadingSalesmen,
    refetchSalesmen,
    newSalesmanOrders,
    setNewSalesmanOrders,
    newSalesmanReturns,
    setNewSalesmanReturns,
    addSalesman,
    updateSalesmanSettings,
    removeSalesman,
  };
}
