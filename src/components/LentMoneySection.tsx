import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { User, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface LentMoneySectionProps {
  userId: string;
}

export const LentMoneySection = ({ userId }: LentMoneySectionProps) => {
  const queryClient = useQueryClient();

  const { data: lentMoney = [], isLoading } = useQuery({
    queryKey: ["lent-money", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lent_money")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const markAsRepaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lent_money")
        .update({ status: "repaid" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Marked as repaid",
        description: "The loan has been marked as repaid.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const pendingLoans = lentMoney.filter((loan) => loan.status === "pending");
  const repaidLoans = lentMoney.filter((loan) => loan.status === "repaid");
  const totalPending = pendingLoans.reduce(
    (sum, loan) => sum + parseFloat(loan.amount.toString()),
    0
  );

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lent Money
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Lent Money
          </CardTitle>
          {pendingLoans.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              ₹{totalPending.toFixed(2)} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingLoans.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending loans</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {pendingLoans.map((loan) => (
              <div
                key={loan.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{loan.person_name}</span>
                    {isOverdue(loan.due_date) && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-1">
                    {loan.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      ₹{parseFloat(loan.amount.toString()).toFixed(2)}
                    </span>
                    {loan.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {format(new Date(loan.due_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRepaid.mutate(loan.id)}
                  className="ml-2 flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Repaid
                </Button>
              </div>
            ))}
          </div>
        )}

        {repaidLoans.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">
              Recently repaid ({repaidLoans.length})
            </p>
            <div className="space-y-2">
              {repaidLoans.slice(0, 3).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm"
                >
                  <span className="text-muted-foreground truncate">
                    {loan.person_name}
                  </span>
                  <Badge variant="outline" className="text-xs text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    ₹{parseFloat(loan.amount.toString()).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
