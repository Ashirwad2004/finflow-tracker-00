import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Calendar, CheckCircle, AlertCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EditLentMoneyDialog } from "./EditLentMoneyDialog";
import { cn } from "@/lib/utils";

interface MinimalLentSectionProps {
  userId: string;
}

interface LentMoneyRecord {
  id: string;
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const MinimalLentSection = ({ userId }: MinimalLentSectionProps) => {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LentMoneyRecord | null>(null);

  const { data: lentMoney = [], isLoading } = useQuery({
    queryKey: ["lent-money", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lent_money")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LentMoneyRecord[];
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
      toast({ title: "Marked as repaid" });
    },
  });

  const deleteLoan = useMutation({
    mutationFn: async (loan: LentMoneyRecord) => {
      const { error } = await supabase
        .from("lent_money")
        .delete()
        .eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({ title: "Record deleted" });
      setDeleteDialogOpen(false);
    },
  });

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30">
            <Skeleton className="w-10 h-10 rounded-full bg-slate-700/50" />
            <Skeleton className="h-4 flex-1 bg-slate-700/50" />
            <Skeleton className="h-4 w-20 bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  const pendingLoans = lentMoney.filter((loan) => loan.status === "pending");
  const repaidLoans = lentMoney.filter((loan) => loan.status === "repaid");

  if (pendingLoans.length === 0 && repaidLoans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <User className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-slate-400">No loans tracked</p>
        <p className="text-sm text-slate-500 mt-1">Add a lent money record to get started</p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {/* Pending Loans */}
        <AnimatePresence mode="popLayout">
          {pendingLoans.map((loan, index) => (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: index * 0.03 } }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl",
                "bg-slate-800/30 border border-slate-700/30",
                "group"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-amber-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-200 truncate">{loan.person_name}</p>
                  {isOverdue(loan.due_date) && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{loan.description}</p>
                {loan.due_date && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Due: {format(new Date(loan.due_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              
              <p className="font-semibold text-amber-400 tabular-nums">
                {formatCurrency(loan.amount)}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                  onClick={() => markAsRepaid.mutate(loan.id)}
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => { setSelectedLoan(loan); setEditDialogOpen(true); }}
                      className="text-slate-200"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { setSelectedLoan(loan); setDeleteDialogOpen(true); }}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Repaid Section */}
        {repaidLoans.length > 0 && (
          <div className="pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-3">Recently Repaid</p>
            <div className="space-y-2">
              {repaidLoans.slice(0, 3).map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 text-sm"
                >
                  <span className="text-slate-500 truncate">{loan.person_name}</span>
                  <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {formatCurrency(loan.amount)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Record</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this record for {selectedLoan?.person_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLoan && deleteLoan.mutate(selectedLoan)}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditLentMoneyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lentMoney={selectedLoan}
      />
    </>
  );
};
