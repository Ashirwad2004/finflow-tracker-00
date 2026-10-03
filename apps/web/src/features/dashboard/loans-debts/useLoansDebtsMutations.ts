import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { toast } from "@/core/hooks/use-toast";

export function useLoansDebtsMutations(userId: string) {
  const queryClient = useQueryClient();

  const settleLoan = useMutation({
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
      queryClient.setQueryData(["lent-money", userId], (old: any) => {
        const updated = old
          ? old.map((loan: any) => (loan.id === id ? { ...loan, status: "paid" } : loan))
          : [];
        const active = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        active.forEach((record: any) => {
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
        title: "Loan Settled",
        description: "The loan has been marked as fully repaid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to settle loan: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    },
  });

  const settleDebt = useMutation({
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
      queryClient.setQueryData(["borrowed-money", userId], (old: any) => {
        const updated = old
          ? old.map((debt: any) => (debt.id === id ? { ...debt, status: "paid" } : debt))
          : [];
        const active = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        active.forEach((record: any) => {
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
        title: "Debt Paid",
        description: "The debt has been marked as fully paid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to settle debt: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    },
  });

  return {
    settleLoan,
    settleDebt,
  };
}
