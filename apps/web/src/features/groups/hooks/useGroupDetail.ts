import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { toast } from "@/core/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Expense, Member, SettlementRecord, SettlementItem } from "../types";

export function useGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- QUERIES ---

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("groups")
        .select("*")
        .eq("id", groupId || "")
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("group_members")
        .select("*")
        .eq("group_id", groupId || "")
        .order("joined_at");
      return (data as Member[]) || [];
    },
    refetchInterval: 30000,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["group-expenses", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("group_expenses")
        .select("*, categories(name, color, icon)")
        .eq("group_id", groupId || "")
        .order("date", { ascending: false });

      return (data as Expense[]) || [];
    },
    refetchInterval: 30000,
  });

  const { data: settlementRecords = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ["group-settlements", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_settlements")
        .select("*")
        .eq("group_id", groupId || "")
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SettlementRecord[];
    },
    refetchInterval: 30000,
  });

  // Real-time Postgres Changes subscription for specific group updates
  useEffect(() => {
    if (!groupId) return;

    const channelName = `realtime:group-detail:${groupId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group", groupId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_expenses",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_settlements",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-settlements", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("categories").select("*");
      return data || [];
    },
  });

  const isMember = members.some((m) => m.user_id === user?.id);
  const isCreator = group?.created_by === user?.id;
  const currentMember = members.find((m) => m.user_id === user?.id);

  // --- SETTLEMENT LOGIC ---

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const calculateBalances = (): Member[] => {
    const balances: Record<string, number> = {};
    members.forEach((m) => (balances[m.user_id] = 0));

    expenses.forEach((expense) => {
      const payerId = expense.user_id;
      const amount = Number(expense.amount);

      balances[payerId] = (balances[payerId] || 0) + amount;

      let involvedUserIds: string[] = [];

      if (expense.split_data && Array.isArray(expense.split_data) && expense.split_data.length > 0) {
        involvedUserIds = expense.split_data;
      } else {
        involvedUserIds = members.map((m) => m.user_id);
      }

      involvedUserIds = involvedUserIds.filter((id) => members.some((m) => m.user_id === id));

      if (involvedUserIds.length > 0) {
        const amountPerPerson = amount / involvedUserIds.length;
        involvedUserIds.forEach((userId) => {
          balances[userId] = (balances[userId] || 0) - amountPerPerson;
        });
      }
    });

    settlementRecords.forEach((settlement) => {
      if (settlement.status !== "paid") return;
      balances[settlement.from_user_id] = (balances[settlement.from_user_id] || 0) + Number(settlement.amount);
      balances[settlement.to_user_id] = (balances[settlement.to_user_id] || 0) - Number(settlement.amount);
    });

    return members.map((m) => ({
      ...m,
      balance: balances[m.user_id] || 0,
    }));
  };

  const memberBalances = calculateBalances();

  const calculateSettlements = (): SettlementItem[] => {
    const settlements: SettlementItem[] = [];

    const balances = memberBalances.map((m) => ({ ...m, balance: m.balance ?? 0 }));

    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      settlements.push({
        from: debtor.username,
        to: creditor.username,
        from_user_id: debtor.user_id,
        to_user_id: creditor.user_id,
        amount,
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();
  const myBalance = memberBalances.find((m) => m.user_id === user?.id)?.balance || 0;

  const recordSettlement = useMutation({
    mutationFn: async (settlement: SettlementItem) => {
      if (!groupId || !user?.id) throw new Error("You must be signed in to record a settlement.");

      const { error } = await (supabase as any)
        .from("group_settlements")
        .insert({
          group_id: groupId,
          from_user_id: settlement.from_user_id,
          to_user_id: settlement.to_user_id,
          amount: Number(settlement.amount.toFixed(2)),
          status: "paid",
          paid_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settlement recorded", description: "Group balances have been updated." });
      queryClient.invalidateQueries({ queryKey: ["group-settlements", groupId] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not record settlement", description: error.message, variant: "destructive" });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const expense = expenses.find((e) => e.id === id);
      if (expense && user?.id) {
        const deletedExpenses = JSON.parse(localStorage.getItem(`recently_deleted_${user.id}`) || "[]");
        deletedExpenses.unshift({ ...expense, group_id: groupId, deleted_at: new Date().toISOString() });
        localStorage.setItem(`recently_deleted_${user.id}`, JSON.stringify(deletedExpenses.slice(0, 50)));
      }

      if (!user?.id) return;
      await offlineMutate({
        table: "group_expenses",
        action: "delete",
        recordId: id,
        userId: user.id,
      });
    },
    onSuccess: (_data, id) => {
      toast({ title: "Expense deleted" });

      queryClient.setQueryData(["group-expenses", groupId], (old: any) => {
        return old ? old.filter((e: any) => e.id !== id) : [];
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
      }
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      if (group && user?.id) {
        const deletedGroups = JSON.parse(localStorage.getItem(`recently_deleted_groups_${user.id}`) || "[]");
        deletedGroups.unshift({ ...group, deleted_at: new Date().toISOString() });
        localStorage.setItem(`recently_deleted_groups_${user.id}`, JSON.stringify(deletedGroups.slice(0, 50)));
      }
      if (!user?.id) return;
      await offlineMutate({
        table: "groups",
        action: "delete",
        recordId: groupId!,
        userId: user.id,
      });
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.setQueryData(["groups", user.id], (old: any) => {
          return old ? old.filter((g: any) => g.id !== groupId) : [];
        });
      }
      navigate("/groups");
    },
  });

  const handleExportPDF = () => {
    if (!group || expenses.length === 0) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(group.name, 14, 20);
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, 14, 26);

      let currentY = 40;

      if (settlements.length > 0) {
        doc.setFontSize(14);
        doc.text("Settlements", 14, 35);
        autoTable(doc, {
          startY: 40,
          head: [["From", "To", "Amount"]],
          body: settlements.map((s) => [s.from, s.to, s.amount.toFixed(2)]),
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.text("Transactions", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Date", "Description", "Paid By", "Amount", "Split Mode"]],
        body: expenses.map((e) => [
          new Date(e.date).toLocaleDateString(),
          e.description,
          e.username,
          e.amount.toFixed(2),
          e.split_data ? `${e.split_data.length} ppl` : "Everyone",
        ]),
      });
      doc.save(`${group.name}_report.pdf`);
      toast({ title: "Report downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const copyInviteLink = async () => {
    const link = `${window.location.origin}/join/${group?.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = groupLoading || membersLoading || expensesLoading || settlementsLoading;

  return {
    groupId,
    user,
    navigate,
    group,
    members,
    expenses,
    categories,
    settlements,
    memberBalances,
    myBalance,
    totalExpenses,
    isMember,
    isCreator,
    currentMember,
    isLoading,
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    isInviteDialogOpen,
    setIsInviteDialogOpen,
    copied,
    isExporting,
    handleExportPDF,
    copyInviteLink,
    recordSettlement,
    deleteExpense,
    deleteGroup,
  };
}
