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
import { Plus, ArrowLeft, Edit, Trash2, Users, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const GroupDetail = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
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
        .eq("user_id", user?.id); // Only allow deleting own expenses

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

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const memberContributions = members.map(member => {
    const memberExpenses = expenses.filter(exp => exp.user_id === member.user_id);
    const total = memberExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    return {
      ...member,
      totalExpenses: total,
      expenseCount: memberExpenses.length,
    };
  });

  const averageContribution = members.length > 0 ? totalExpenses / members.length : 0;

  if (groupLoading || membersLoading || expensesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group...</p>
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
        <div className="flex items-center gap-4 mb-8">
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
            <CardContent className="space-y-4">
              {memberContributions.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {member.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.expenseCount} expenses
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{member.totalExpenses.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.totalExpenses > averageContribution ? '+' : ''}
                      ₹{(member.totalExpenses - averageContribution).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

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