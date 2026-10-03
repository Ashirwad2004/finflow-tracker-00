import React from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expense } from "../types";

interface GroupExpensesTabProps {
  expenses: Expense[];
  totalExpenses: number;
  isMember: boolean;
  membersCount: number;
  currentUserId?: string;
  onOpenAddExpense: () => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function GroupExpensesTab({
  expenses,
  totalExpenses,
  isMember,
  membersCount,
  currentUserId,
  onOpenAddExpense,
  onDeleteExpense,
}: GroupExpensesTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 h-full">
      <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
        <div className="text-sm text-muted-foreground">
          Total spent: <span className="text-foreground font-bold">₹{totalExpenses.toFixed(0)}</span>
        </div>
        {isMember && (
          <Button onClick={onOpenAddExpense}>
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No expenses yet.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-20">
          {expenses.map((expense) => {
            const involvedCount = expense.split_data ? expense.split_data.length : membersCount;
            return (
              <Card key={expense.id} className="group overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex gap-4">
                  {/* Date Box */}
                  <div className="flex flex-col items-center justify-center bg-muted rounded-lg w-16 h-16 shrink-0 border">
                    <span className="text-xs text-muted-foreground uppercase font-bold">
                      {new Date(expense.date).toLocaleString("default", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold">
                      {new Date(expense.date).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold truncate pr-2">{expense.description}</h4>
                      <span className="font-bold whitespace-nowrap">₹{expense.amount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                            Paid by {expense.username}
                          </span>
                        </div>
                        <div>
                          For: {expense.split_data ? `${involvedCount} people` : "Everyone"}
                        </div>
                      </div>

                      {expense.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteExpense(expense.id)}
                          aria-label={`Delete expense ${expense.description}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
