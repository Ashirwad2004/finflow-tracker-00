import { useAuth } from "@/core/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { format } from "date-fns";
import { useExpensesQuery } from "@/features/expenses/api/useExpensesQuery";
import { PartySummary, GroupReportItem, LentMoneyItem, BorrowedMoneyItem } from "./types";

export function usePersonalReportsData() {
  const { user } = useAuth();

  const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return format(date, formatTemplate);
  };

  // Fetch all lent money
  const { data: lentMoney = [], isLoading: loadingLent } = useQuery<LentMoneyItem[]>({
    queryKey: ["reports-lent-money", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lent_money")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LentMoneyItem[];
    },
    enabled: !!user,
  });

  // Fetch all borrowed money
  const { data: borrowedMoney = [], isLoading: loadingBorrowed } = useQuery<BorrowedMoneyItem[]>({
    queryKey: ["reports-borrowed-money", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("borrowed_money")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BorrowedMoneyItem[];
    },
    enabled: !!user,
  });

  // Fetch all expenses (Now realtime)
  const { data: expenses = [], isLoading: loadingExpenses } = useExpensesQuery(user?.id);

  // Fetch joined groups and their expenses for group report section
  const { data: userGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["reports-user-groups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as any[];

      const { data: memberships, error: membershipsError } = await (supabase as any)
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membershipsError) throw membershipsError;

      const groupIds = (memberships || []).map((m: any) => m.group_id).filter(Boolean);
      if (!groupIds.length) return [] as any[];

      const { data, error } = await (supabase as any)
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const groupIds = userGroups.map((group: any) => group.id).filter(Boolean);

  const { data: groupMembers = [], isLoading: loadingGroupMembers } = useQuery({
    queryKey: ["reports-group-members", groupIds],
    queryFn: async () => {
      if (!groupIds.length) return [] as any[];

      const { data, error } = await (supabase as any)
        .from("group_members")
        .select("*")
        .in("group_id", groupIds);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: groupIds.length > 0,
  });

  const { data: groupExpenses = [], isLoading: loadingGroupExpenses } = useQuery({
    queryKey: ["reports-group-expenses", groupIds],
    queryFn: async () => {
      if (!groupIds.length) return [] as any[];

      const { data, error } = await (supabase as any)
        .from("group_expenses")
        .select("*, categories(name, color, icon)")
        .in("group_id", groupIds)
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: groupIds.length > 0,
  });

  const isLoading =
    loadingLent ||
    loadingBorrowed ||
    loadingExpenses ||
    loadingGroups ||
    loadingGroupMembers ||
    loadingGroupExpenses;

  // Party-wise Aggregation
  const partyMap = new Map<string, { lent: number; borrowed: number; net: number; hasPending: boolean }>();

  // Process Lent
  lentMoney.forEach((item) => {
    const name = item.person_name.trim();
    const current = partyMap.get(name) || { lent: 0, borrowed: 0, net: 0, hasPending: false };
    current.lent += Number(item.amount);
    if (item.status === "pending") {
      current.net += Number(item.amount); // You are owed this
      current.hasPending = true;
    }
    partyMap.set(name, current);
  });

  // Process Borrowed
  borrowedMoney.forEach((item) => {
    const name = item.person_name.trim();
    const current = partyMap.get(name) || { lent: 0, borrowed: 0, net: 0, hasPending: false };
    current.borrowed += Number(item.amount);
    if (item.status === "pending") {
      current.net -= Number(item.amount); // You owe this
      current.hasPending = true;
    }
    partyMap.set(name, current);
  });

  const parties: PartySummary[] = Array.from(partyMap.entries())
    .filter(([_, totals]) => totals.hasPending)
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.net - a.net); // Sort by highest owed to you

  const totalLent = lentMoney.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalBorrowed = borrowedMoney.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const groupReports: GroupReportItem[] = userGroups
    .map((group: any) => {
      const members = groupMembers.filter((member: any) => member.group_id === group.id);
      const expensesForGroup = groupExpenses.filter((expense: any) => expense.group_id === group.id);
      const memberIds = members.map((member: any) => member.user_id).filter(Boolean);

      let balance = 0;

      expensesForGroup.forEach((expense: any) => {
        const amount = Number(expense.amount || 0);
        const involvedUsers =
          expense.split_data && Array.isArray(expense.split_data) && expense.split_data.length > 0
            ? expense.split_data
            : memberIds.length > 0
            ? memberIds
            : [];

        const validUsers = involvedUsers.filter((id: string) => memberIds.includes(id));

        if (expense.user_id === user?.id) {
          balance += amount;
        }

        if (validUsers.includes(user?.id)) {
          const share = amount / Math.max(validUsers.length, 1);
          balance -= share;
        }
      });

      return {
        id: group.id,
        name: group.name,
        members: members.length,
        totalSpent: expensesForGroup.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0),
        balance: Number(balance.toFixed(2)),
        status: balance > 0 ? "You are owed" : balance < 0 ? "You owe" : "Settled",
      };
    })
    .filter((group) => group.members > 0 || group.totalSpent > 0)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return {
    lentMoney,
    borrowedMoney,
    expenses,
    parties,
    groupReports,
    totalLent,
    totalBorrowed,
    totalExpenses,
    isLoading,
    formatDateSafe,
  };
}
