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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AppLayout } from "@/components/AppLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const GroupDetailSkeleton = () => (
  <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
    <div className="flex flex-col gap-4 mb-6 sm:mb-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="mb-6 sm:mb-8">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>

    <Card className="mb-6 sm:mb-8">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
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

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenseCategory, setExpenseCategory] = useState("");

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
      return data || [];
    },
  });

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

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*");
      return data || [];
    },
  });

  const isMember = members.some((m) => m.user_id === user?.id);
  const isCreator = group?.created_by === user?.id;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const averageContribution =
    members.length > 0 ? totalExpenses / members.length : 0;

  const memberSpending = members.map((member) => {
    const paid = expenses
      .filter((e) => e.user_id === member.user_id)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    return { ...member, paid };
  });

  const calculateSettlements = () => {
    const balances = memberSpending.map((m) => ({
      ...m,
      balance: m.paid - averageContribution,
    }));

    const settlements: { from: string; to: string; amount: number }[] = [];

    const debtors = balances
      .filter((b) => b.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);
      
    const creditors = balances
      .filter((b) => b.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

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

  const handleExportPDF = () => {
    if (!group || expenses.length === 0) {
      toast({
        title: "No Data",
        description: "There are no expenses to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text(group.name, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Expenses: Rs. ${totalExpenses.toFixed(2)}`, 14, 40);
      doc.text(`Average Per Person: Rs. ${averageContribution.toFixed(2)}`, 14, 46);

      let currentY = 55;

      if (settlements.length > 0) {
        doc.setFontSize(14);
        doc.text("Suggested Settlements", 14, currentY);
        currentY += 5;

        const settlementRows = settlements.map(s => [
          s.from,
          "owes",
          s.to,
          `Rs. ${s.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["From", "Action", "To", "Amount"]],
          body: settlementRows,
          theme: 'striped',
          headStyles: { fillColor: [66, 66, 66] },
        });

        const lastTable = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable;
        currentY = lastTable.finalY + 15;
      }

      doc.setFontSize(14);
      doc.text("Expense Details", 14, currentY);
      currentY += 5;

      const expenseRows = expenses.map(e => [
        new Date(e.date).toLocaleDateString(),
        e.description,
        e.categories?.name || "General",
        e.username,
        `Rs. ${Number(e.amount).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Date", "Description", "Category", "Paid By", "Amount"]],
        body: expenseRows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`${group.name.replace(/\s+/g, '_')}_expenses.pdf`);

      toast({
        title: "Success",
        description: "Expense report downloaded successfully.",
      });

    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate the PDF file.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

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
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseCategory("");
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
    return (
      <AppLayout>
        <GroupDetailSkeleton />
      </AppLayout>
    );
  }

  const inviteLink =
    typeof window !== "undefined"
    ? `${window.location.origin}/join/${group?.invite_code}`
    : "";

  return (
    <AppLayout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/groups")} className="flex-shrink-0 mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{group?.name}</h1>
              {group?.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportPDF} 
              disabled={isExporting || expenses.length === 0}
              className="text-xs sm:text-sm"
            >
              {isExporting ? (
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <FileDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              )}
              <span className="hidden xs:inline">Report</span>
              <span className="xs:hidden">PDF</span>
            </Button>

            {isCreator && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsInviteDialogOpen(true)} className="text-xs sm:text-sm">
                  <Link className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Share
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="text-xs sm:text-sm">
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-4 sm:mx-auto max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is irreversible. All expenses and data will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteGroup.mutate()} className="w-full sm:w-auto">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-sm sm:text-xl font-bold">₹{totalExpenses.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Members</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-sm sm:text-xl font-bold">{members.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg/Person</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <p className="text-sm sm:text-xl font-bold">₹{averageContribution.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* SETTLEMENTS */}
        <Card className="mb-6 sm:mb-8 border-l-4 border-l-primary">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" /> Settlements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {settlements.length === 0 ? (
              <p className="text-sm text-muted-foreground">All settled up! No debts.</p>
            ) : (
              settlements.map((s, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-2"
                >
                  <div className="flex items-center gap-1 sm:gap-2 text-sm flex-wrap">
                    <span className="font-semibold text-red-500">{s.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold text-green-500">{s.to}</span>
                  </div>
                  <div className="font-bold text-sm sm:text-base">
                    ₹{s.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* MEMBERS */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Members & Contribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
            {memberSpending.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center p-3 bg-muted rounded-lg gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Avatar className={`${avatarColor(m.username)} w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0`}>
                    <AvatarFallback className="text-white text-xs sm:text-sm">
                      {m.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{m.username}</div>
                    <div className="text-xs text-muted-foreground">Paid: ₹{m.paid.toFixed(0)}</div>
                  </div>
                </div>
                <div className={`text-xs sm:text-sm font-bold flex-shrink-0 ${m.paid - averageContribution >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {m.paid - averageContribution >= 0 
                    ? `+₹${(m.paid - averageContribution).toFixed(0)}` 
                    : `-₹${Math.abs(m.paid - averageContribution).toFixed(0)}`
                  }
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* EXPENSES */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Expenses</CardTitle>
            {isMember && (
              <Button size="sm" onClick={() => setIsAddExpenseOpen(true)} className="text-xs sm:text-sm">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> 
                <span className="hidden xs:inline">Add Expense</span>
                <span className="xs:hidden">Add</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6">
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses yet. Add your first expense!</p>
            ) : (
              expenses.map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between items-start sm:items-center border p-3 sm:p-4 rounded-lg gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate">{e.description}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {e.username} • {new Date(e.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="font-bold text-sm sm:text-base">₹{Number(e.amount).toFixed(0)}</span>
                    {e.user_id === user?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8"
                        onClick={() => deleteExpense.mutate(e.id)}
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* INVITE DIALOG */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="mx-4 sm:mx-auto max-w-md">
            <DialogHeader>
              <DialogTitle>Share Group Invite Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this link with others to invite them to join your group.
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs sm:text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyInviteLink}
                  className="flex-shrink-0"
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
          <DialogContent className="mx-4 sm:mx-auto max-w-md">
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
    </AppLayout>
  );
};

export default GroupDetail;
