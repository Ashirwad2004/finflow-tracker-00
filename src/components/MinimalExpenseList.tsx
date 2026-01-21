import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { FileText, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  bill_url?: string | null;
  categories: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface MinimalExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onDelete: (id: string) => void;
}

export const MinimalExpenseList = ({ expenses, isLoading, onDelete }: MinimalExpenseListProps) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const getIcon = (iconName: string) => {
    const iconKey = iconName.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = (LucideIcons as any)[iconKey];
    return Icon || LucideIcons.Circle;
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
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30">
            <Skeleton className="w-10 h-10 rounded-lg bg-slate-700/50" />
            <Skeleton className="h-4 flex-1 bg-slate-700/50" />
            <Skeleton className="h-4 w-20 bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-slate-400">No expenses yet</p>
        <p className="text-sm text-slate-500 mt-1">Add your first expense to get started</p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {expenses.slice(0, 15).map((expense, index) => {
            const Icon = getIcon(expense.categories.icon);
            return (
              <motion.button
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: index * 0.03 }
                }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setSelectedExpense(expense)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl",
                  "bg-slate-800/30 hover:bg-slate-800/50",
                  "border border-slate-700/30 hover:border-slate-600/50",
                  "transition-all duration-200",
                  "text-left group cursor-pointer"
                )}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${expense.categories.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: expense.categories.color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {expense.description}
                  </p>
                  <p className="text-xs text-slate-500">{expense.categories.name}</p>
                </div>
                
                <p className="font-semibold text-slate-300 tabular-nums">
                  {formatCurrency(expense.amount)}
                </p>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Eye className="w-5 h-5" />
              Expense Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = getIcon(selectedExpense.categories.icon);
                  return (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${selectedExpense.categories.color}20` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: selectedExpense.categories.color }} />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedExpense.description}</h3>
                  <Badge 
                    variant="secondary" 
                    className="mt-1 bg-slate-800 text-slate-300"
                    style={{ borderColor: selectedExpense.categories.color }}
                  >
                    {selectedExpense.categories.name}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Amount</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(selectedExpense.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                  <p className="text-lg font-medium text-slate-300 mt-1">
                    {new Date(selectedExpense.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>

              {selectedExpense.bill_url && (
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Attached Bill</p>
                  {selectedExpense.bill_url.endsWith('.pdf') ? (
                    <iframe
                      src={selectedExpense.bill_url}
                      className="w-full h-48 rounded-lg border border-slate-700"
                      title="Bill PDF"
                    />
                  ) : (
                    <img
                      src={selectedExpense.bill_url}
                      alt="Bill"
                      className="w-full rounded-lg border border-slate-700"
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={() => setSelectedExpense(null)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onDelete(selectedExpense.id);
                    setSelectedExpense(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
