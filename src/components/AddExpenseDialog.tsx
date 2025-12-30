import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const expenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  category_id: z.string().uuid("Please select a category"),
  date: z.string(),
});

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  userId: string;
}

export const AddExpenseDialog = ({
  open,
  onOpenChange,
  categories,
  userId,
}: AddExpenseDialogProps) => {
  const queryClient = useQueryClient();

  const [expenses, setExpenses] = useState([
    {
      description: "",
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
    },
  ]);

  const addRow = () => {
    setExpenses([
      ...expenses,
      {
        description: "",
        amount: "",
        categoryId: "",
        date: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeRow = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const updateExpense = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  };

  const addExpenses = useMutation({
    mutationFn: async () => {
      const payload = expenses.map((e) => ({
        description: e.description,
        amount: parseFloat(e.amount),
        category_id: e.categoryId,
        date: e.date,
        user_id: userId,
      }));

      const { error } = await supabase
        .from("expenses")
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({
        title: "Expenses added",
        description: `${expenses.length} expense(s) added successfully.`,
      });
      onOpenChange(false);
      setExpenses([
        {
          description: "",
          amount: "",
          categoryId: "",
          date: new Date().toISOString().split("T")[0],
        },
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expenses",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      expenses.forEach((e) => {
        expenseSchema.parse({
          description: e.description,
          amount: parseFloat(e.amount),
          category_id: e.categoryId,
          date: e.date,
        });
      });

      addExpenses.mutate();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expenses</DialogTitle>
          <DialogDescription>
            Add multiple expenses at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  placeholder="Coffee, Taxi, Grocery..."
                  value={expense.description}
                  onChange={(e) =>
                    updateExpense(index, "description", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expense.amount}
                  onChange={(e) =>
                    updateExpense(index, "amount", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={expense.categoryId}
                  onValueChange={(value) =>
                    updateExpense(index, "categoryId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expense.date}
                  onChange={(e) =>
                    updateExpense(index, "date", e.target.value)
                  }
                />
              </div>

              {expenses.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRow(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            className="w-full"
          >
            + Add another expense
          </Button>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={addExpenses.isPending}
            >
              {addExpenses.isPending ? "Saving..." : "Save Expenses"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
