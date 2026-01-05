import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowLeft, Trash2, Users, DollarSign, Link, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const GroupDetail = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinUsername, setJoinUsername] = useState("");

  // Form states
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState("");

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (error) {
          // If table doesn't exist, throw a user-friendly error
          if (error.message?.includes('relation "public.groups" does not exist')) {
            throw new Error('Group tables not found. Please run the SQL script to create the database tables.');
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Error fetching group:', err);
        throw err;
      }
    },
    enabled: !!groupId,
  });

  const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_id", groupId)
          .order("joined_at");

        if (error) {
          // If table doesn't exist, return empty array
          if (error.message?.includes('relation "public.group_members" does not exist')) {
            return [];
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Error fetching members:', err);
        return [];
      }
    },
    enabled: !!groupId,
  });

  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ["group-expenses", groupId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("group_expenses")
          .select(`
            *,
            categories (
              id,
              name,
              color,
              icon
            )
          `)
          .eq("group_id", groupId)
          .order("date", { ascending: false });

        if (error) {
          // If table doesn't exist, return empty array
          if (error.message?.includes('relation "public.group_expenses" does not exist')) {
            return [];
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Error fetching expenses:', err);
        return [];
      }
    },
    enabled: !!groupId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const isMember = members.some(member => member.user_id === user?.id);

  const joinGroup = async () => {
    if (!joinUsername.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          username: joinUsername.trim(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Joined group successfully!",
      });

      setIsJoinDialogOpen(false);
      setJoinUsername("");
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    }
  };

  const addExpense = async () => {
    if (!expenseAmount || !expenseDescription) {
      toast({
        title: "Error",
        description: "Amount and description are required",
        variant: "destructive",
      });
      return;
    }

    const currentMember = members.find(m => m.user_id === user?.id);
    if (!currentMember) {
      toast({
        title: "Error",
        description: "You must be a member to add expenses",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("group_expenses")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          username: currentMember.username,
          amount: parseFloat(expenseAmount),
          description: expenseDescription,
          date: expenseDate,
          category_id: expenseCategory || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense added successfully!",
      });

      setIsAddExpenseOpen(false);
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setExpenseCategory("");
      queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    }
  };

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from("group_expenses")
        .delete()
        .eq("id", expenseId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId)
        .eq("created_by", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group deleted successfully!",
      });
      navigate("/groups");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    },
  });

  const isCreator = group?.created_by === user?.id;

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  
  // Avatar colors based on username hash
  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  const memberContributions = members.map(member => {
    const memberExpenses = expenses.filter(exp => exp.user_id === member.user_id);
    const total = memberExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    return {
      ...member,
      totalExpenses: total,
      expenseCount: memberExpenses.length,
      avatarColor: getAvatarColor(member.username),
    };
  });

  const averageContribution = members.length > 0 ? totalExpenses / members.length : 0;

  if (groupLoading || membersLoading || expensesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Members Skeleton */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-6 w-20 ml-auto" />
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expenses Skeleton */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (groupError?.message?.includes('Group tables not found')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Database Tables Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The group expenses feature requires database tables that haven't been created yet.
            Please run the SQL script provided in the project to create the necessary tables.
          </p>
          <div className="bg-muted p-4 rounded-lg text-left text-sm font-mono mb-4">
            <p className="text-muted-foreground mb-2">Run this in your Supabase SQL Editor:</p>
            <p>Check the create_group_tables.sql file in your project root</p>
          </div>
          <Button onClick={() => navigate("/groups")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/groups")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
              {group.description && (
                <p className="text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isMember && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Link className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Members</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Share this link with others to invite them to join this group:
                    </p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`₹{window.location.origin}/join/₹{group.invite_code}`}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`₹{window.location.origin}/join/₹{group.invite_code}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                          toast({
                            title: "Copied!",
                            description: "Invite link copied to clipboard",
                          });
                        }}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Invite Code</p>
                      <p className="font-mono text-lg font-bold">{group.invite_code}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {isCreator && (
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
                      Are you sure you want to delete this group? This will permanently delete all expenses and member data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteGroup.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per Member</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{averageContribution.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberContributions.map((member) => {
                const diff = member.totalExpenses - averageContribution;
                const isPositive = diff > 0;
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className={`w-10 h-10 ₹{member.avatarColor}`}>
                        <AvatarFallback className="text-white font-semibold bg-transparent">
                          {member.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.expenseCount} {member.expenseCount === 1 ? 'expense' : 'expenses'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{member.totalExpenses.toFixed(2)}</p>
                      <Badge variant={isPositive ? "default" : diff < 0 ? "destructive" : "secondary"} className="text-xs">
                        {isPositive ? '+' : ''}₹{diff.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {!isMember && (
                <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Join Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Choose a username for this group</Label>
                        <Input
                          id="username"
                          value={joinUsername}
                          onChange={(e) => setJoinUsername(e.target.value)}
                          placeholder="Enter your username"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsJoinDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={joinGroup}>Join Group</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Expenses</CardTitle>
                {isMember && (
                  <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Group Expense</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description *</Label>
                          <Textarea
                            id="description"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            placeholder="What was this expense for?"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="date">Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category (Optional)</Label>
                          <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                            <SelectTrigger>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddExpenseOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button onClick={addExpense}>Add Expense</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No expenses yet</p>
                  {isMember && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Add your first expense to get started
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{expense.description}</p>
                          {expense.categories && (
                            <Badge variant="secondary" className="text-xs">
                              {expense.categories.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{expense.username}</span>
                          <span>{new Date(expense.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">₹{parseFloat(expense.amount.toString()).toFixed(2)}</span>
                        {expense.user_id === user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteExpense.mutate(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;