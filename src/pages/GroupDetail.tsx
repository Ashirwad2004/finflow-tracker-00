import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ArrowLeft,
  Trash2,
  IndianRupee,
  Link,
  Copy,
  Check,
  FileDown,
  Loader2,
  Receipt,
  Users,
  PieChart
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
import { AppLayout } from "@/components/layout/AppLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GroupExpenseDialog } from "@/components/GroupExpenseDialog";

// Types
interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  user_id: string;
  username: string;
  category_id?: string;
  split_data?: string[] | null; // Array of user_ids involved
  categories?: { name: string; color: string; icon: string };
}

interface Member {
  user_id: string;
  username: string;
  joined_at: string;
}

const GroupDetailSkeleton = () => (
  <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl space-y-6">
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

const GroupDetail = () => {
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
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at");
      return data as Member[] || [];
    },
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["group-expenses", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_expenses")
        .select("*, categories(name, color, icon)")
        .eq("group_id", groupId)
        .order("date", { ascending: false });

      // Parse split_data if it's a string, though supabase client usually gives JSON
      // Safety check if we need manual parsing, but Supabase JS client handles JSON types automatically
      return data as Expense[] || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  // --- HELPERS ---

  const isMember = members.some((m) => m.user_id === user?.id);
  const isCreator = group?.created_by === user?.id;
  const currentMember = members.find(m => m.user_id === user?.id);

  // --- SETTLEMENT LOGIC (UPDATED) ---

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Revised calculation using split_data
  const calculateBalances = () => {
    // Initialize balances map: userId -> number (positive = owed to them, negative = they owe)
    const balances: Record<string, number> = {};
    members.forEach(m => balances[m.user_id] = 0);

    expenses.forEach(expense => {
      const payerId = expense.user_id;
      const amount = Number(expense.amount);

      // Credit the payer
      balances[payerId] = (balances[payerId] || 0) + amount;

      // Determine who splits this
      let involvedUserIds: string[] = [];

      if (expense.split_data && Array.isArray(expense.split_data) && expense.split_data.length > 0) {
        involvedUserIds = expense.split_data;
      } else {
        // Default: Split among ALL members at the time (simplified to current members)
        involvedUserIds = members.map(m => m.user_id);
      }

      // Filter out invalid users just in case
      involvedUserIds = involvedUserIds.filter(id => members.some(m => m.user_id === id));

      if (involvedUserIds.length > 0) {
        const amountPerPerson = amount / involvedUserIds.length;
        involvedUserIds.forEach(userId => {
          balances[userId] = (balances[userId] || 0) - amountPerPerson;
        });
      }
    });

    return members.map(m => ({
      ...m,
      balance: balances[m.user_id] || 0
    }));
  };

  const memberBalances = calculateBalances();

  const calculateSettlements = () => {
    const settlements: { from: string; to: string; amount: number }[] = [];

    // Deep copy to avoid mutating state ref
    const balances = memberBalances.map(m => ({ ...m }));

    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      // Amount to settle is min of what debtor owes and what creditor is owed
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      settlements.push({
        from: debtor.username,
        to: creditor.username,
        amount: amount,
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();
  const myBalance = memberBalances.find(m => m.user_id === user?.id)?.balance || 0;

  // --- ACTIONS ---

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      // Logic for soft delete / tracking recently deleted (simplified from original)
      const expense = expenses.find(e => e.id === id);
      if (expense) {
        const deletedExpenses = JSON.parse(localStorage.getItem(`recently_deleted_${user?.id}`) || "[]");
        deletedExpenses.unshift({ ...expense, group_id: groupId, deleted_at: new Date().toISOString() });
        localStorage.setItem(`recently_deleted_${user?.id}`, JSON.stringify(deletedExpenses.slice(0, 50)));
      }

      await supabase.from("group_expenses").delete().eq("id", id).eq("user_id", user?.id);
    },
    onSuccess: () => {
      toast({ title: "Expense deleted" });
      queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
    }
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      // Soft delete tracking
      if (group) {
        const deletedGroups = JSON.parse(localStorage.getItem(`recently_deleted_groups_${user?.id}`) || "[]");
        deletedGroups.unshift({ ...group, deleted_at: new Date().toISOString() });
        localStorage.setItem(`recently_deleted_groups_${user?.id}`, JSON.stringify(deletedGroups.slice(0, 50)));
      }
      await supabase.from("groups").delete().eq("id", groupId).eq("created_by", user?.id);
    },
    onSuccess: () => navigate("/groups"),
  });

  const handleExportPDF = () => {
    // ... Existing PDF logic kept mostly same, updated for new list
    if (!group || expenses.length === 0) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text(group.name, 14, 20);
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, 14, 26);

      let currentY = 40;

      // Settlements
      if (settlements.length > 0) {
        doc.setFontSize(14);
        doc.text("Settlements", 14, 35);
        autoTable(doc, {
          startY: 40,
          head: [["From", "To", "Amount"]],
          body: settlements.map(s => [s.from, s.to, s.amount.toFixed(2)]),
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Expenses
      doc.text("Transactions", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Date", "Description", "Paid By", "Amount", "Split Mode"]],
        body: expenses.map(e => [
          new Date(e.date).toLocaleDateString(),
          e.description,
          e.username,
          e.amount.toFixed(2),
          e.split_data ? `${e.split_data.length} ppl` : 'Everyone'
        ])
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

  // --- RENDER ---

  if (groupLoading || membersLoading || expensesLoading) {
    return (
      <AppLayout>
        <GroupDetailSkeleton />
      </AppLayout>
    );
  }

  const avatarColors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500"];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <AppLayout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-5xl h-full flex flex-col">

        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/groups")} className="-ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">{group?.name}</h1>
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                  {members.length} members
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{group?.description || "No description"}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {/* Action Buttons */}
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
              PDF
            </Button>

            {isCreator && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsInviteDialogOpen(true)}>
                  <Link className="w-4 h-4 mr-2" /> Invite
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteGroup.mutate()}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* TABS Layout for content */}
        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">

            {/* My Balance Card */}
            <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <IndianRupee className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary-foreground/80">My Position</CardDescription>
                <CardTitle className="text-4xl font-bold flex items-center">
                  {myBalance > 0 ? "+" : ""}{Number(myBalance).toFixed(0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-90">
                  {myBalance > 0.01
                    ? "You are owed money overall."
                    : myBalance < -0.01
                      ? "You owe money to the group."
                      : "You are all settled up!"}
                </p>
              </CardContent>
            </Card>

            {/* Settlements */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <PieChart className="w-5 h-5 opacity-70" /> Suggested Settlements
              </h3>
              {settlements.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground border-dashed">
                  <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No debts pending.
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {settlements.map((s, i) => (
                    <Card key={i} className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background">
                          <AvatarFallback className={getAvatarColor(s.from)}></AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <span className="font-semibold">{s.from === currentMember?.username ? "You" : s.from}</span>
                          <span className="text-muted-foreground mx-1">owes</span>
                          <span className="font-semibold">{s.to === currentMember?.username ? "You" : s.to}</span>
                        </div>
                      </div>
                      <div className="font-bold text-red-500">₹{s.amount.toFixed(0)}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Members Balances List */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 opacity-70" /> Member Balances
              </h3>
              <Card>
                <CardContent className="p-0">
                  {memberBalances.map((m, idx) => (
                    <div key={m.user_id} className={`flex items-center justify-between p-4 ${idx !== members.length - 1 ? 'border-b' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`${getAvatarColor(m.username)} text-white`}>
                            {m.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{m.username}</span>
                      </div>
                      <span className={`font-bold ${m.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {m.balance >= 0 ? "+" : ""}{m.balance.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* EXPENSES TAB */}
          <TabsContent value="expenses" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 h-full">
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Total spent: <span className="text-foreground font-bold">₹{totalExpenses.toFixed(0)}</span>
              </div>
              {isMember && (
                <Button onClick={() => setIsAddExpenseOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Expense
                </Button>
              )}
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No expenses yet.</p>
              </div>
            ) : (
              <div className="space-y-3 pb-20">
                {expenses.map((expense) => {
                  const involvedCount = expense.split_data ? expense.split_data.length : members.length;
                  return (
                    <Card key={expense.id} className="group overflow-hidden hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex gap-4">
                        {/* Date Box */}
                        <div className="flex flex-col items-center justify-center bg-muted rounded-lg w-16 h-16 shrink-0 border">
                          <span className="text-xs text-muted-foreground uppercase font-bold">
                            {new Date(expense.date).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-xl font-bold">
                            {new Date(expense.date).getDate()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-2">{expense.description}</h4>
                            <span className="font-bold whitespace-nowrap">₹{expense.amount.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between items-end mt-1">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  Paid by {expense.username}
                                </span>
                              </div>
                              <div>
                                For: {expense.split_data ? `${involvedCount} people` : "Everyone"}
                              </div>
                            </div>

                            {expense.user_id === user?.id && (
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteExpense.mutate(expense.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* DIALOGS */}
        <GroupExpenseDialog
          open={isAddExpenseOpen}
          onOpenChange={setIsAddExpenseOpen}
          groupId={groupId!}
          members={members}
          categories={categories}
          userId={user?.id!}
          currentMemberUsername={currentMember?.username}
        />

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Friends</DialogTitle></DialogHeader>
            <div className="flex gap-2">
              <Input value={`${window.location.origin}/join/${group?.invite_code}`} readOnly />
              <Button onClick={copyInviteLink}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
};

export default GroupDetail;
