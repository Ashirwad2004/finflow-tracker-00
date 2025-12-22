import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Target, Edit2, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BudgetSectionProps {
  userId: string;
  thisMonthExpenses: number;
}

export const BudgetSection = ({ userId, thisMonthExpenses }: BudgetSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [hasNotified, setHasNotified] = useState(false);
  const queryClient = useQueryClient();

  const currentMonth = new Date();
  currentMonth.setDate(1);
  const monthString = currentMonth.toISOString().split('T')[0];

  const { data: budget, isLoading } = useQuery({
    queryKey: ["budget", userId, monthString],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month", monthString)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const saveBudget = useMutation({
    mutationFn: async (amount: number) => {
      if (budget) {
        const { error } = await supabase
          .from("budgets")
          .update({ amount })
          .eq("id", budget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budgets")
          .insert({ user_id: userId, amount, month: monthString });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
      setIsEditing(false);
      setHasNotified(false);
      toast({
        title: "Budget saved",
        description: "Your monthly budget has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }
    saveBudget.mutate(amount);
  };

  const handleEdit = () => {
    setBudgetAmount(budget?.amount?.toString() || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setBudgetAmount("");
  };

  // Check if budget exceeded and show notification
  useEffect(() => {
    if (budget && budget.amount > 0 && !hasNotified) {
      const budgetLimit = parseFloat(budget.amount.toString());
      const percentUsed = (thisMonthExpenses / budgetLimit) * 100;
      
      if (thisMonthExpenses > budgetLimit) {
        toast({
          title: "Budget Exceeded! 🚨",
          description: `You've exceeded your monthly budget by ₹${(thisMonthExpenses - budgetLimit).toFixed(2)}`,
          variant: "destructive",
        });
        setHasNotified(true);
      } else if (percentUsed >= 80) {
        toast({
          title: "Budget Warning ⚠️",
          description: `You've used ${percentUsed.toFixed(0)}% of your monthly budget.`,
        });
        setHasNotified(true);
      }
    }
  }, [budget, thisMonthExpenses, hasNotified]);

  const budgetLimit = budget && budget.amount > 0 ? parseFloat(budget.amount.toString()) : 0;
  const percentUsed = budgetLimit >= 0 ? Math.min((thisMonthExpenses / budgetLimit) * 100, 100) : 0;
  const isOverBudget = thisMonthExpenses > budgetLimit && budgetLimit >= 0;
  const remaining = budgetLimit - thisMonthExpenses;

  if (isLoading) {
    return (
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-6">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-card bg-gradient-card ${isOverBudget ? 'border-destructive border-2' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Monthly Budget
          {isOverBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </CardTitle>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Enter budget amount"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="text-lg"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saveBudget.isPending}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : budget && budget.amount > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <div className="text-2xl font-bold">₹{budgetLimit.toFixed(2)}</div>
              <span className={`text-sm ${isOverBudget ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                {isOverBudget ? `Over by ₹${Math.abs(remaining).toFixed(2)}` : `₹${remaining.toFixed(2)} left`}
              </span>
            </div>
            <Progress 
              value={percentUsed} 
              className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : percentUsed >= 80 ? '[&>div]:bg-yellow-500' : ''}`}
            />
            <p className="text-xs text-muted-foreground">
              {percentUsed.toFixed(0)}% of budget used this month
            </p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-muted-foreground text-sm mb-3">No budget set for this month</p>
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Set Budget
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
