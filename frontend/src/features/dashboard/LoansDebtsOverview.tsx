import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineMutate } from "@/core/offline/apiService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/core/hooks/use-toast";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/core/lib/utils";
import { isRecordOverdue } from "@/core/utils/overdue";
import { 
  HandCoins, 
  MessageSquare, 
  Check, 
  Calendar, 
  Plus, 
  ArrowRight,
  User
} from "lucide-react";
import { format } from "date-fns";

interface LoansDebtsOverviewProps {
  lentMoney: any[];
  borrowedMoney: any[];
  userId: string;
  onLendClick: () => void;
  onBorrowClick: () => void;
}

export const LoansDebtsOverview = ({
  lentMoney,
  borrowedMoney,
  userId,
  onLendClick,
  onBorrowClick
}: LoansDebtsOverviewProps) => {
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lent");

  // Filter pending (active) items
  const pendingLent = lentMoney.filter((l) => l.status === "pending");
  const pendingBorrowed = borrowedMoney.filter((b) => b.status === "pending");

  // Repaid mutations
  const settleLoan = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      const { error } = await offlineMutate({
        table: "lent_money",
        action: "update",
        recordId: id,
        payload: { status: "paid" },
        userId
      });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Update cache
      queryClient.setQueryData(["lent-money", userId], (old: any) => {
        const updated = old ? old.map((loan: any) => loan.id === id ? { ...loan, status: "paid" } : loan) : [];
        // Update parties optimistically
        const active = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        active.forEach((record: any) => {
          const name = record.person_name.trim();
          const current = partyMap.get(name) || {
            personName: name,
            totalPending: 0,
            count: 0,
            lastTransactionDate: record.created_at,
          };
          current.totalPending += Number(record.amount);
          current.count += 1;
          partyMap.set(name, current);
        });
        queryClient.setQueryData(["lent-money-parties", userId], Array.from(partyMap.values()));
        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["lent-money"] });
        queryClient.invalidateQueries({ queryKey: ["lent-money-parties"] });
      }
      toast({
        title: "Loan Settled",
        description: "The loan has been marked as fully repaid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to settle loan: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    }
  });

  const settleDebt = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      const { error } = await offlineMutate({
        table: "borrowed_money",
        action: "update",
        recordId: id,
        payload: { status: "paid" },
        userId
      });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Update cache
      queryClient.setQueryData(["borrowed-money", userId], (old: any) => {
        const updated = old ? old.map((debt: any) => debt.id === id ? { ...debt, status: "paid" } : debt) : [];
        // Update parties optimistically
        const active = updated.filter((record: any) => record.status === "pending");
        const partyMap = new Map<string, any>();
        active.forEach((record: any) => {
          const name = record.person_name.trim();
          const current = partyMap.get(name) || {
            personName: name,
            totalPending: 0,
            count: 0,
            lastTransactionDate: record.created_at,
          };
          current.totalPending += Number(record.amount);
          current.count += 1;
          partyMap.set(name, current);
        });
        queryClient.setQueryData(["borrowed-money-parties", userId], Array.from(partyMap.values()));
        return updated;
      });

      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
        queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
      }
      toast({
        title: "Debt Paid",
        description: "The debt has been marked as fully paid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to settle debt: " + (error?.message || "Please try again."),
        variant: "destructive",
      });
    }
  });

  const handleWhatsAppReminder = (record: any) => {
    const text = `Hi ${record.person_name}, this is a friendly reminder regarding the outstanding amount of ${formatCurrency(record.amount)} lent for "${record.description || 'personal transaction'}". Please settle it when you get a chance. Thanks!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const getDueDateLabel = (dueDateStr: string | null) => {
    if (!dueDateStr) return "No due date";
    const date = new Date(dueDateStr);
    return `Due ${format(date, "MMM d, yyyy")}`;
  };

  return (
    <Card className="bg-card rounded-2xl border shadow-sm p-6 overflow-hidden relative group">
      {/* Top indicator stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-rose-500" />
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-indigo-500" />
          Loans & Debts Hub
        </h3>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
          Accounts
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        Track money lent to friends or outstanding bills/debts you owe.
      </p>

      <Tabs defaultValue="lent" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 w-full bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <TabsTrigger 
            value="lent" 
            className="rounded-lg text-xs font-bold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm"
          >
            Lent ({pendingLent.length})
          </TabsTrigger>
          <TabsTrigger 
            value="borrowed" 
            className="rounded-lg text-xs font-bold py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-sm"
          >
            Borrowed ({pendingBorrowed.length})
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="lent" className="m-0 focus-visible:outline-none animate-fade-in">
            {pendingLent.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">All Settled Up!</h4>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                  No outstanding money lent to others right now.
                </p>
                <Button 
                  onClick={onLendClick} 
                  size="sm" 
                  className="mt-3.5 h-8 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Lend Money
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1"
              >
                {pendingLent.slice(0, 4).map((loan) => {
                  const overdue = isRecordOverdue(loan);
                  return (
                    <div 
                      key={loan.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/[0.02] dark:to-teal-500/[0.02] hover:shadow-sm transition-all duration-200",
                        overdue ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-emerald-500/10"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                          overdue 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        )}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {loan.person_name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {loan.description || "Lent money"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className={cn(
                              "text-[9px] font-bold",
                              overdue ? "text-rose-500" : "text-muted-foreground"
                            )}>
                              {overdue ? "OVERDUE • " : ""}{getDueDateLabel(loan.due_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(loan.amount)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleWhatsAppReminder(loan)}
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 rounded-lg text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/10"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => settleLoan.mutate(loan.id)}
                            disabled={settleLoan.isPending}
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-500/10"
                            title="Mark as Settled"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {pendingLent.length > 4 && (
                  <button 
                    onClick={() => navigate("/lent-money")}
                    className="w-full text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1.5 flex items-center justify-center gap-1"
                  >
                    View all {pendingLent.length} loans <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="borrowed" className="m-0 focus-visible:outline-none animate-fade-in">
            {pendingBorrowed.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20"
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
                  <Check className="w-5 h-5 text-rose-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Outstanding Debts!</h4>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                  You don't owe any money to anyone right now.
                </p>
                <Button 
                  onClick={onBorrowClick} 
                  size="sm" 
                  className="mt-3.5 h-8 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Record Debt
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1"
              >
                {pendingBorrowed.slice(0, 4).map((debt) => {
                  const overdue = isRecordOverdue(debt);
                  return (
                    <div 
                      key={debt.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-3 bg-gradient-to-r from-rose-500/5 to-orange-500/5 dark:from-rose-500/[0.02] dark:to-orange-500/[0.02] hover:shadow-sm transition-all duration-200",
                        overdue ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-rose-500/10"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                          overdue 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse" 
                            : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        )}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {debt.person_name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {debt.description || "Borrowed money"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className={cn(
                              "text-[9px] font-bold",
                              overdue ? "text-rose-500" : "text-muted-foreground"
                            )}>
                              {overdue ? "OVERDUE • " : ""}{getDueDateLabel(debt.due_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(debt.amount)}
                        </span>
                        
                        <Button
                          onClick={() => settleDebt.mutate(debt.id)}
                          disabled={settleDebt.isPending}
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-500/10"
                          title="Mark as Repaid"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {pendingBorrowed.length > 4 && (
                  <button 
                    onClick={() => navigate("/borrowed-money")}
                    className="w-full text-center text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline pt-1.5 flex items-center justify-center gap-1"
                  >
                    View all {pendingBorrowed.length} debts <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Footer navigation shortcut */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <button 
          onClick={() => navigate(activeTab === "lent" ? "/lent-money" : "/borrowed-money")}
          className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View Full Ledger <ArrowRight className="w-3 h-3" />
        </button>
        <div className="flex gap-1.5">
          <Button 
            onClick={onLendClick} 
            size="xs" 
            variant="ghost" 
            className="h-6 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5"
          >
            + Lend
          </Button>
          <Button 
            onClick={onBorrowClick} 
            size="xs" 
            variant="ghost" 
            className="h-6 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/5"
          >
            + Borrow
          </Button>
        </div>
      </div>
    </Card>
  );
};