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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  ArrowLeft,
  Trash2,
  Users,
  IndianRupee, // Changed from DollarSign
  Link,
  Copy,
  Check,
  ArrowRight,
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

const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinUsername, setJoinUsername] = useState("");

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenseCategory, setExpenseCategory] = useState("");

  /* ---------------- GROUP ---------------- */

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

  /* ---------------- MEMBERS ---------------- */

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at");
      return data || [];
    },
  });

  /* ---------------- EXPENSES ---------------- */

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["group-expenses", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_expenses")
        .select("*, categories(name)")
        .eq("group_id", groupId)
        .order("date", { ascending: false });
      return data || [];
    },
  });

  /* ---------------- CATEGORIES ---------------- */

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  const isMember = members.some((m) => m.user_id === user?.id);
  const isCreator = group?.created_by === user?.id;

  /* ---------------- CALCULATIONS & SETTLEMENTS ---------------- */

  // 1. Calculate Total Expenses
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  // 2. Calculate Average per person
  const averageContribution =
    members.length > 0 ? totalExpenses / members.length : 0;

  // 3. Calculate how much each member paid
  const memberSpending = members.map((member) => {
    const paid = expenses
      .filter((e) => e.user_id === member.user_id)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { ...member, paid };
  });

  // 4. Determine Settlements (Who owes whom)
  const calculateSettlements = () => {
    // Calculate balances: Paid - Average
    // Positive balance = They paid more than average (Owed money)
    // Negative balance = They paid less than average (Owe money)
    let balances = memberSpending.map((m) => ({
      ...m,
      balance: m.paid - averageContribution,
    }));

    const settlements: { from: string; to: string; amount: number }[] = [];

    // Separate debtors (negative) and creditors (positive)
    // Sort by magnitude to minimize number of transactions
    let debtors = balances
      .filter((b) => b.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);
      
    let creditors = balances
      .filter((b) => b.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];

      // The amount to settle is the minimum of what's owed vs what's receivable
      let amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      // Create settlement
      settlements.push({
        from: debtor.username,
        to: creditor.username,
        amount: amount,
      });

      // Adjust remaining balances
      debtor.balance += amount;
      creditor.balance -= amount;

      // Move indices if settled (using small epsilon for float precision)
      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();

  /* ---------------- HELPERS ---------------- */

  const avatarColors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
  ];

  const avatarColor = (name: string) =>
    avatarColors[name.charCodeAt(0) % avatarColors.length];

  /* ---------------- ACTIONS ---------------- */

  const joinGroup = async () => {
    if (!joinUsername.trim()) return;

    await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user?.id,
      username: joinUsername.trim(),
    });

    toast({ title: "Joined group successfully" });
    setIsJoinDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
  };

  const addExpense = async () => {
    if (!expenseAmount || !expenseDescription) return;

    const member = members.find((m) => m.user_id === user?.id);
    if (!member) return;

    await supabase.from("group_expenses").insert({
      group_id: groupId,
      user_id: user?.id,
      username: member.username,
      amount: Number(expenseAmount),
      description: expenseDescription,
      date: expenseDate,
      category_id: expenseCategory || null,
    });

    toast({ title: "Expense added" });
    setIsAddExpenseOpen(false);
    queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
  };

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { data: expense } = await supabase
        .from("group_expenses")
        .select("*, categories(name, color, icon)")
        .eq("id", id)
        .single();

      if (expense) {
        const deletedExpenses = JSON.parse(
          localStorage.getItem(`recently_deleted_${user?.id}`) || "[]"
        );
        const deletedItem = {
          ...expense,
          group_id: groupId,
          deleted_at: new Date().toISOString(),
        };
        deletedExpenses.unshift(deletedItem);
        if (deletedExpenses.length > 50) {
          deletedExpenses.splice(50);
        }
        localStorage.setItem(
          `recently_deleted_${user?.id}`,
          JSON.stringify(deletedExpenses)
        );
      }

      await supabase
        .from("group_expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] }),
  });

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  const deleteGroup = useMutation({
    mutationFn: async () => {
      const { data: groupData } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupData) {
        const deletedGroups = JSON.parse(
          localStorage.getItem(`recently_deleted_groups_${user?.id}`) || "[]"
        );
        const deletedItem = {
          ...groupData,
          deleted_at: new Date().toISOString(),
        };
        deletedGroups.unshift(deletedItem);
        if (deletedGroups.length > 50) {
          deletedGroups.splice(50);
        }
        localStorage.setItem(
          `recently_deleted_groups_${user?.id}`,
          JSON.stringify(deletedGroups)
        );
      }

      await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("created_by", user?.id);
    },
    onSuccess: () => navigate("/groups"),
  });

  if (groupLoading || membersLoading || expensesLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const inviteLink =
    typeof window !== "undefined"
    ? `${window.location.origin}/join/${group?.invite_code}`
    : "";

  /* ---------------- UI ---------------- */

  return (
    <div className="container mx-auto px-4 py-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/groups")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground">{group.description}</p>
          </div>
        </div>

        {isCreator && (
          <div className="flex gap-2 self-end sm:self-auto">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)}>
              <Link className="w-4 h-4 mr-2" />
              Share
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is irreversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteGroup.mutate()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>₹{totalExpenses.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>{members.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg / Member</CardTitle>
          </CardHeader>
          <CardContent>₹{averageContribution.toFixed(2)}</CardContent>
        </Card>
      </div>

      {/* SETTLEMENTS (WHO PAYS WHO) */}
      <Card className="mb-8 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {/* UPDATED: Using IndianRupee icon here */}
            <IndianRupee className="w-5 h-5" /> Suggested Settlements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settlements.length === 0 ? (
            <p className="text-muted-foreground">All settled up! No debts.</p>
          ) : (
            settlements.map((s, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-500">{s.from}</span>
                  <span className="text-muted-foreground">owes</span>
                  <span className="font-semibold text-green-500">{s.to}</span>
                </div>
                <div className="flex items-center font-bold">
                   ₹{s.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* MEMBERS */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Members & Contribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberSpending.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-center p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className={avatarColor(m.username)}>
                  <AvatarFallback className="text-white">
                    {m.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                    <div className="font-medium">{m.username}</div>
                    <div className="text-xs text-muted-foreground">Paid: ₹{m.paid.toFixed(2)}</div>
                </div>
              </div>
              <div className={`text-sm font-bold ${m.paid - averageContribution >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {m.paid - averageContribution >= 0 
                  ? `+ receives ₹${(m.paid - averageContribution).toFixed(2)}` 
                  : `- owes ₹${Math.abs(m.paid - averageContribution).toFixed(2)}`
                }
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* EXPENSES */}
      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle>Expenses</CardTitle>
          {isMember && (
            <Button onClick={() => setIsAddExpenseOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex justify-between items-center border p-4 rounded-lg"
            >
              <div>
                <p className="font-medium">{e.description}</p>
                <p className="text-sm text-muted-foreground">
                  {e.username} • {new Date(e.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                ₹{Number(e.amount).toFixed(2)}
                {e.user_id === user?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteExpense.mutate(e.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* INVITE DIALOG */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Group Invite Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with others to invite them to join your group.
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD EXPENSE DIALOG */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="What did you spend on?"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={addExpense}
              className="w-full"
              disabled={!expenseAmount || !expenseDescription}
            >
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default GroupDetail;