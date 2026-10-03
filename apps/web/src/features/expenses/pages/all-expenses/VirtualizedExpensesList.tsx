import type { RefObject } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { TrendingDown, Plus, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface VirtualizedExpensesListProps {
  isLoading: boolean;
  filteredExpenses: any[];
  searchQuery: string;
  categoryFilter: string;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  rowVirtualizer: any;
  formatCurrency: (amount: number) => string;
  onAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
}

export function VirtualizedExpensesList({
  isLoading,
  filteredExpenses,
  searchQuery,
  categoryFilter,
  scrollContainerRef,
  rowVirtualizer,
  formatCurrency,
  onAddExpense,
  onDeleteExpense,
}: VirtualizedExpensesListProps) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Expense Records
        </CardTitle>
        {filteredExpenses.length > 0 && (
          <Badge variant="secondary" className="text-xs font-semibold">
            {filteredExpenses.length} entries
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
              >
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <TrendingDown className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">
              No expenses found
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all"
                ? "Try adjusting your search or category filter"
                : "Record your first expense to track business spending"}
            </p>
            <Button
              size="sm"
              onClick={onAddExpense}
              variant="outline"
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Expense
            </Button>
          </div>
        ) : (
          <div
            ref={scrollContainerRef as any}
            className="max-h-[65vh] overflow-y-auto pr-1 rounded-lg"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                const expense = filteredExpenses[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-2.5"
                  >
                    <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group h-full">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${expense.categories?.color || "#6366f1"}20`,
                        }}
                      >
                        <CategoryIcon
                          name={expense.categories?.icon}
                          className="w-4.5 h-4.5"
                          color={expense.categories?.color}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {expense.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </span>
                          {expense.categories?.name && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-normal shrink-0"
                            >
                              {expense.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this expense?"
                            )
                          ) {
                            onDeleteExpense(expense.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0 h-8 w-8 rounded-lg"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
