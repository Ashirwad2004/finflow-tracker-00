import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Target, 
  Edit2, 
  Check, 
  X, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Wallet 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ---------------- UTILS ---------------- */

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

interface BudgetSectionProps {
  userId: string;
  thisMonthExpenses: number;
}

/* ---------------- COMPONENT ---------------- */

export const BudgetSection = ({ userId, thisMonthExpenses }: BudgetSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const queryClient = useQueryClient();

  // Memoize date to prevent recalc on render
  const monthString = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  }, []);

  /* --- DATA FETCHING --- */
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

  /* --- MUTATIONS --- */
  const saveBudget = useMutation({
    mutationFn: async (amount: number) => {
      if (budget?.id) {
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
      toast({
        title: "Budget Updated",
        description: "Your monthly spending limit has been set.",
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Update Failed",
        description: "Could not save your budget. Please try again.",
        variant: "destructive",
      });
    },
  });

  /* --- HANDLERS --- */
  const handleSave = () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    saveBudget.mutate(amount);
  };

  const startEditing = () => {
    setBudgetInput(budget?.amount?.toString() || "");
    setIsEditing(true);
  };

  /* --- CALCULATIONS --- */
  const budgetLimit = budget?.amount ?? 0;
  const percentage = budgetLimit > 0 ? (thisMonthExpenses / budgetLimit) * 100 : 0;
  const isOverBudget = thisMonthExpenses > budgetLimit && budgetLimit > 0;
  const remaining = Math.max(0, budgetLimit - thisMonthExpenses);

  // Determine UI State based on percentage
  const statusColor = useMemo(() => {
    if (isOverBudget) return "text-destructive";
    if (percentage >= 85) return "text-orange-500";
    return "text-primary";
  }, [isOverBudget, percentage]);

  const progressColor = useMemo(() => {
    if (isOverBudget) return "bg-destructive";
    if (percentage >= 85) return "bg-orange-500";
    return "bg-primary";
  }, [isOverBudget, percentage]);

  /* --- RENDER --- */
  if (isLoading) {
    return <BudgetSkeleton />;
  }

  return (
    <Card className="shadow-sm border-muted-foreground/10 overflow-hidden relative">
      {/* Background decoration */}
      <div className={cn("absolute top-0 left-0 w-1 h-full", progressColor.replace("bg-", "bg-opacity-50 bg-"))} />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            Monthly Budget
          </CardTitle>
          <CardDescription className="text-xs">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </div>
        
        {!isEditing && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={startEditing}>
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
              <Input
                type="number"
                placeholder="0.00"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="pl-7 font-mono text-lg"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saveBudget.isPending}>
                {saveBudget.isPending ? "Saving..." : "Save Budget"}
              </Button>
            </div>
          </div>
        ) : budgetLimit > 0 ? (
          <div className="space-y-5">
            {/* Stats Row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Spent</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-bold tabular-nums", statusColor)}>
                    {formatCurrency(thisMonthExpenses)}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    / {formatCurrency(budgetLimit)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  {isOverBudget ? "Exceeded" : "Remaining"}
                </p>
                <p className={cn("text-lg font-semibold tabular-nums", isOverBudget ? "text-destructive" : "text-foreground")}>
                  {isOverBudget ? "+" : ""}{formatCurrency(Math.abs(budgetLimit - thisMonthExpenses))}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={Math.min(percentage, 100)} 
                className="h-2.5 bg-secondary" 
                // We override the internal indicator color via CSS class injection or inline style if needed, 
                // but shadcn's progress usually takes 'bg-primary'. 
                // To force color: create a wrapper or use utility classes on the indicator if exposed.
                // Assuming standard Shadcn Progress structure:
                indicatorClassName={progressColor}
              />
              <div className="flex justify-between items-center text-xs">
                <span className={cn("font-medium", statusColor)}>
                  {percentage.toFixed(0)}% used
                </span>
                {isOverBudget && (
                  <span className="flex items-center gap-1 text-destructive font-semibold animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> Budget Exceeded
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
            <div className="bg-muted p-3 rounded-full">
              <Wallet className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No budget set</p>
              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                Set a monthly limit to track your savings goals effectively.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={startEditing} className="mt-2">
              <TrendingUp className="w-4 h-4 mr-2" />
              Set Monthly Goal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ---------------- SKELETON LOADER ---------------- */

const BudgetSkeleton = () => (
  <Card className="shadow-sm border-muted-foreground/10">
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-[120px]" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-[100px]" />
        <Skeleton className="h-8 w-[80px]" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
    </CardContent>
  </Card>
);