import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { toast } from "@/core/hooks/use-toast";
import { BorrowedMoneyRecord } from "./borrowedMoneyPdfExport";

export function useBorrowedMoneyState(
  userId: string,
  onRefetchReady?: (refetch: () => Promise<void>) => void
) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<BorrowedMoneyRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: borrowedMoney = [], isLoading, refetch } = useQuery({
    queryKey: ["borrowed-money", userId],
    queryFn: async () => {
      // @ts-ignore: types.ts might be incomplete
      const { data, error } = await supabase
        .from("borrowed_money")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BorrowedMoneyRecord[];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(async () => {
        await refetch();
      });
    }
  }, [onRefetchReady, refetch]);

  const markAsRepaid = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      const { error } = await offlineMutate({
        table: "borrowed_money",
        action: "update",
        recordId: id,
        payload: { status: "paid" },
        userId,
      });

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Optimistic cache update
      queryClient.setQueryData(["borrowed-money", userId], (old: any) => {
        const updated = old
          ? old.map((debt: any) => (debt.id === id ? { ...debt, status: "paid" } : debt))
          : [];

        // Update borrowed-money-parties optimistically
        const pendingDebts = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        pendingDebts.forEach((record: any) => {
          const name = record.person_name.trim();
          const current = partyMap.get(name) || {
            personName: name,
            totalPending: 0,
            count: 0,
            lastTransactionDate: record.created_at,
          };
          current.totalPending += Number(record.amount);
          current.count += 1;
          partyMap.set(name, current);
        });
        queryClient.setQueryData(["borrowed-money-parties", userId], Array.from(partyMap.values()));

        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
        queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
      }
      toast({
        title: "Marked as repaid",
        description: "The debt has been marked as repaid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update status: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    },
  });

  const deleteDebt = useMutation({
    mutationFn: async (debt: BorrowedMoneyRecord) => {
      if (!userId) return;
      const { error } = await offlineMutate({
        table: "borrowed_money",
        action: "delete",
        recordId: debt.id,
        userId,
      });

      if (error) throw error;

      // Store in recently deleted (optional)
      const key = `recently_deleted_borrowed_money_${userId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({ ...debt, deleted_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing));
    },
    onSuccess: (_data, debt) => {
      // Optimistic cache update
      queryClient.setQueryData(["borrowed-money", userId], (old: any) => {
        const updated = old ? old.filter((item: any) => item.id !== debt.id) : [];

        // Update borrowed-money-parties optimistically
        const pendingDebts = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        pendingDebts.forEach((record: any) => {
          const name = record.person_name.trim();
          const current = partyMap.get(name) || {
            personName: name,
            totalPending: 0,
            count: 0,
            lastTransactionDate: record.created_at,
          };
          current.totalPending += Number(record.amount);
          current.count += 1;
          partyMap.set(name, current);
        });
        queryClient.setQueryData(["borrowed-money-parties", userId], Array.from(partyMap.values()));

        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
        queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
      }
      toast({
        title: "Record deleted",
        description: "The borrowed money record has been moved to recently deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedDebt(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete record: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    },
  });

  const handleDelete = (debt: BorrowedMoneyRecord) => {
    setSelectedDebt(debt);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDebt) {
      deleteDebt.mutate(selectedDebt);
    }
  };

  const pendingDebts = borrowedMoney.filter((debt) => debt.status === "pending");
  const repaidDebts = borrowedMoney.filter((debt) => debt.status === "paid");
  const totalPending = pendingDebts.reduce(
    (sum, debt) => sum + parseFloat(debt.amount.toString()),
    0
  );

  return {
    borrowedMoney,
    isLoading,
    pendingDebts,
    repaidDebts,
    totalPending,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedDebt,
    isExporting,
    setIsExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    markAsRepaid,
    handleDelete,
    confirmDelete,
  };
}
