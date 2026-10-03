import React from "react";
import { Plus, Trash2, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface AddExpenseDialogFooterProps {
  expensesCount: number;
  isPending: boolean;
  onCancel: () => void;
  onRemoveCurrent: (e: React.MouseEvent) => void;
  onAddRow: () => void;
  onSubmit: () => void;
}

export const AddExpenseDialogFooter = ({
  expensesCount,
  isPending,
  onCancel,
  onRemoveCurrent,
  onAddRow,
  onSubmit,
}: AddExpenseDialogFooterProps) => {
  return (
    <DialogFooter className="p-4 border-t bg-background flex-row items-center gap-3 sm:justify-between shrink-0">
      <Button variant="ghost" onClick={onCancel} className="hidden sm:inline-flex">
        Cancel
      </Button>

      <div className="flex gap-3 w-full sm:w-auto">
        {expensesCount > 1 && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRemoveCurrent}
            className="sm:hidden shrink-0 border-destructive/50 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onAddRow}
          className="flex-1 sm:flex-none"
        >
          <Plus className="w-4 h-4 mr-1 sm:hidden" />
          <span className="sm:inline">Add Another</span>
        </Button>
        <Button
          onClick={onSubmit}
          className="flex-1 sm:flex-none min-w-[120px]"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="flex items-center justify-center gap-1">
              Save <span className="hidden sm:inline">All</span> ({expensesCount})
              <ChevronRight className="w-4 h-4 opacity-50" />
            </span>
          )}
        </Button>
      </div>
    </DialogFooter>
  );
};
