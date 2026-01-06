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
  DollarSign,
  Link,
  Copy,
  Check,
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

  /* ---------------- CALCULATIONS ---------------- */

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const averageContribution =
    members.length > 0 ? totalExpenses / members.length : 0;

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
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/groups")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground">{group.description}</p>
          </div>
        </div>

        {isCreator && (
          <div className="flex gap-2">
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
      <div className="grid grid-cols-3 gap-6 mb-8">
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

      {/* MEMBERS */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
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
                <span>{m.username}</span>
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
    </div>
  );
};

export default GroupDetail;
