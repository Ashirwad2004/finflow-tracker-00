import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { offlineMutate } from "@/core/offline/apiService";
import { toast } from "@/core/hooks/use-toast";
import { LentMoneyRecord } from "./lentMoneyPdfExport";

export function useLentMoneyState(userId: string) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LentMoneyRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: lentMoney = [], isLoading } = useQuery({
    queryKey: ["lent-money", userId],
    queryFn: async () => {
      // @ts-ignore: types.ts might be incomplete
      const { data, error } = await supabase
        .from("lent_money")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LentMoneyRecord[];
    },
    enabled: !!userId,
  });

  const deleteLentMoney = useMutation({
    mutationFn: async (id: string) => {
      const loanToDelete = lentMoney.find((loan) => loan.id === id);

      if (!userId) return;
      const { error } = await offlineMutate({
        table: "lent_money",
        action: "delete",
        recordId: id,
        userId,
      });

      if (error) throw error;

      if (loanToDelete) {
        const recentlyDeletedKey = `recently_deleted_lent_money_${userId}`;
        const existingDeleted = JSON.parse(localStorage.getItem(recentlyDeletedKey) || "[]");

        const deletedItem = {
          ...loanToDelete,
          deleted_at: new Date().toISOString(),
        };

        existingDeleted.push(deletedItem);
        localStorage.setItem(recentlyDeletedKey, JSON.stringify(existingDeleted));
      }
    },
    onSuccess: (_data, id) => {
      // Optimistic cache update
      queryClient.setQueryData(["lent-money", userId], (old: any) => {
        const updated = old ? old.filter((loan: any) => loan.id !== id) : [];

        // Update lent-money-parties optimistically
        const pendingLoans = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        pendingLoans.forEach((record: any) => {
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
        queryClient.setQueryData(["lent-money-parties", userId], Array.from(partyMap.values()));

        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["lent-money"] });
        queryClient.invalidateQueries({ queryKey: ["lent-money-parties"] });
      }
      toast({
        title: "Record deleted",
        description: "Moved to History & Bin.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete record: " + error.message,
        variant: "destructive",
      });
    },
  });

  const markAsRepaid = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      const { error } = await offlineMutate({
        table: "lent_money",
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
      queryClient.setQueryData(["lent-money", userId], (old: any) => {
        const updated = old
          ? old.map((loan: any) => (loan.id === id ? { ...loan, status: "paid" } : loan))
          : [];

        // Update lent-money-parties optimistically
        const pendingLoans = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        pendingLoans.forEach((record: any) => {
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
        queryClient.setQueryData(["lent-money-parties", userId], Array.from(partyMap.values()));

        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["lent-money"] });
        queryClient.invalidateQueries({ queryKey: ["lent-money-parties"] });
      }
      toast({
        title: "Marked as repaid",
        description: "The loan has been marked as repaid.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update status: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (loan: LentMoneyRecord) => {
    setSelectedLoan(loan);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedLoan) {
      deleteLentMoney.mutate(selectedLoan.id);
    }
  };

  const handleEdit = (loan: LentMoneyRecord) => {
    setSelectedLoan(loan);
    setEditDialogOpen(true);
  };

  const pendingLoans = lentMoney.filter((loan) => loan.status === "pending");
  const repaidLoans = lentMoney.filter((loan) => loan.status === "paid");
  const totalPending = pendingLoans.reduce((sum, loan) => sum + Number(loan.amount), 0);

  return {
    lentMoney,
    isLoading,
    pendingLoans,
    repaidLoans,
    totalPending,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedLoan,
    editDialogOpen,
    setEditDialogOpen,
    isExporting,
    setIsExporting,
    isSettingsOpen,
    setIsSettingsOpen,
    markAsRepaid,
    handleDelete,
    confirmDelete,
    handleEdit,
  };
}
