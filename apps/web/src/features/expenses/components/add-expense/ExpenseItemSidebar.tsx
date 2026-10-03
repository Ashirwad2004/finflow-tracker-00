import React from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ExpenseRow } from "./types";

interface ExpenseItemSidebarProps {
  expenses: ExpenseRow[];
  activeTab: number;
  setActiveTab: (index: number) => void;
  isValidRow: (row: ExpenseRow) => boolean;
  addRow: () => void;
  removeRow: (e: React.MouseEvent, index: number) => void;
  currencySymbol: string;
  onClose: () => void;
}

export const ExpenseItemSidebar = ({
  expenses,
  activeTab,
  setActiveTab,
  isValidRow,
  addRow,
  removeRow,
  currencySymbol,
  onClose,
}: ExpenseItemSidebarProps) => {
  return (
    <div className="w-full sm:w-[280px] bg-muted/30 border-b sm:border-b-0 sm:border-r flex flex-col shrink-0">
      {/* Header Area */}
      <div className="p-4 border-b bg-background/50 backdrop-blur flex justify-between items-start">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle>Add Expenses</DialogTitle>
          <DialogDescription className="text-xs">
            {expenses.length} item{expenses.length !== 1 ? "s" : ""} total
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 sm:hidden -mt-1 -mr-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap sm:whitespace-normal">
        <div className="flex sm:flex-col p-2 gap-2 w-max sm:w-full">
          {expenses.map((expense, index) => {
            const isValid = isValidRow(expense);
            const isActive = activeTab === index;

            return (
              <div
                key={expense.id}
                onClick={() => setActiveTab(index)}
                className={cn(
                  "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border select-none",
                  "w-[160px] sm:w-full",
                  isActive
                    ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/10"
                    : "bg-transparent border-transparent hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p
                    className={cn(
                      "text-sm font-medium truncate leading-none mb-1",
                      !expense.description && "text-muted-foreground italic"
                    )}
                  >
                    {expense.description || "New Item"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {expense.amount
                      ? `${currencySymbol}${expense.amount}`
                      : `${currencySymbol}0.00`}
                  </p>
                </div>

                <div className="absolute top-2 right-2 sm:static sm:top-auto sm:right-auto text-muted-foreground/30">
                  {isValid ? (
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500/70" />
                  ) : (
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500/70" />
                  )}
                </div>

                {expenses.length > 1 && (
                  <button
                    onClick={(e) => removeRow(e, index)}
                    className="hidden sm:group-hover:block sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          <Button
            variant="ghost"
            className="h-auto py-3 sm:py-2 px-4 justify-center sm:justify-start gap-2 text-muted-foreground hover:text-primary border border-dashed border-muted-foreground/20 hover:border-primary/50 bg-muted/10 sm:bg-transparent rounded-lg sm:w-full"
            onClick={addRow}
          >
            <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Add</span>
          </Button>
        </div>
        <ScrollBar orientation="horizontal" className="sm:hidden" />
      </ScrollArea>
    </div>
  );
};
