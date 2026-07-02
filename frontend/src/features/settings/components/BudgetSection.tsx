import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  Edit2,
  ShieldAlert,
  Wallet,
  TrendingUp
} from "lucide-react";
import { toast } from "@/core/hooks/use-toast";
import { cn } from "@/core/lib/utils";
import { useCurrency } from "@/core/contexts/CurrencyContext";

interface BudgetSectionProps {
  userId: string;
  thisMonthExpenses: number;
}

/* ---------------- COMPONENT ---------------- */

export const BudgetSection = ({ userId, thisMonthExpenses }: BudgetSectionProps) => {
  const { formatCurrency, currency } = useCurrency();
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
      const { data, error } = await (supabase as any)
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
        const { error } = await (supabase as any)
          .from("budgets")
          .update({ amount })
          .eq("id", budget.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
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
  
  const pacingData = useMemo(() => {
    if (budgetLimit <= 0) return null;
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const timeProgress = (currentDay / daysInMonth) * 100;
    const isOverPace = percentage > timeProgress + 10;
    return { currentDay, daysInMonth, timeProgress, isOverPace };
  }, [budgetLimit, percentage]);

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
    <Card className="shadow-sm border-muted-foreground/10 overflow-hidden relative h-full flex flex-col">
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

      <CardContent className="flex-grow flex flex-col justify-center">
        {isEditing ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currency.symbol}</span>
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
          <div className="space-y-3">
            {/* Stats Row */}
            <div className="flex items-baseline justify-between">
              <span className={cn("text-2xl font-bold tabular-nums", statusColor)}>
                {formatCurrency(thisMonthExpenses)}
              </span>
              <span className="text-xs text-muted-foreground">
                of {formatCurrency(budgetLimit)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress
                value={Math.min(percentage, 100)}
                className="h-1.5 bg-secondary"
                indicatorClassName={progressColor}
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>{percentage.toFixed(0)}% used</span>
                {isOverBudget ? (
                  <span className="text-destructive font-semibold animate-pulse">
                    Exceeded
                  </span>
                ) : pacingData?.isOverPace ? (
                  <span className="text-orange-500 font-semibold animate-pulse" title={`Day ${pacingData.currentDay} of ${pacingData.daysInMonth}, but spent ${percentage.toFixed(0)}%`}>
                    Pacing Alert
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-muted-foreground">
              Not Set
            </span>
            <Button size="sm" variant="outline" onClick={startEditing} className="h-8 px-3 text-xs">
              Set Limit
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