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
import { BillUpload } from "./BillUpload";

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

interface ExpenseRow {
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  billFile: File | null;
  billPreview: string | null;
}

export const AddExpenseDialog = ({
  open,
  onOpenChange,
  categories,
  userId,
}: AddExpenseDialogProps) => {
  const queryClient = useQueryClient();

  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    {
      description: "",
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      billFile: null,
      billPreview: null,
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
        billFile: null,
        billPreview: null,
      },
    ]);
  };

  const removeRow = (index: number) => {
    // Revoke object URL to prevent memory leak
    if (expenses[index].billPreview) {
      URL.revokeObjectURL(expenses[index].billPreview!);
    }
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

  const handleBillDataExtracted = (
    index: number,
    data: {
      merchant_name: string | null;
      total_amount: number | null;
      bill_date: string | null;
      category_suggestion: string | null;
    }
  ) => {
    const updated = [...expenses];
    
    if (data.merchant_name) {
      updated[index].description = data.merchant_name;
    }
    if (data.total_amount) {
      updated[index].amount = data.total_amount.toString();
    }
    if (data.bill_date) {
      updated[index].date = data.bill_date;
    }
    if (data.category_suggestion) {
      // Find matching category
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === data.category_suggestion?.toLowerCase()
      );
      if (matchedCategory) {
        updated[index].categoryId = matchedCategory.id;
      }
    }
    
    setExpenses(updated);
  };

  const handleFileUploaded = (index: number, file: File, preview: string) => {
    const updated = [...expenses];
    // Revoke previous preview URL if exists
    if (updated[index].billPreview) {
      URL.revokeObjectURL(updated[index].billPreview!);
    }
    updated[index].billFile = file;
    updated[index].billPreview = preview;
    setExpenses(updated);
  };

  const handleClearFile = (index: number) => {
    const updated = [...expenses];
    if (updated[index].billPreview) {
      URL.revokeObjectURL(updated[index].billPreview!);
    }
    updated[index].billFile = null;
    updated[index].billPreview = null;
    setExpenses(updated);
  };

  const uploadBillToStorage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('bills')
      .upload(fileName, file);
    
    if (error) {
      console.error('Bill upload error:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('bills')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const addExpenses = useMutation({
    mutationFn: async () => {
      const payload = await Promise.all(
        expenses.map(async (e) => {
          let billUrl = null;
          if (e.billFile) {
            billUrl = await uploadBillToStorage(e.billFile);
          }
          
          return {
            description: e.description,
            amount: parseFloat(e.amount),
            category_id: e.categoryId,
            date: e.date,
            user_id: userId,
            bill_url: billUrl,
          };
        })
      );

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
      // Clean up preview URLs
      expenses.forEach((e) => {
        if (e.billPreview) {
          URL.revokeObjectURL(e.billPreview);
        }
      });
      setExpenses([
        {
          description: "",
          amount: "",
          categoryId: "",
          date: new Date().toISOString().split("T")[0],
          billFile: null,
          billPreview: null,
        },
      ]);
    },
    onError: (error: Error) => {
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
      expenses.forEach((exp) => {
        expenseSchema.parse({
          description: exp.description,
          amount: parseFloat(exp.amount),
          category_id: exp.categoryId,
          date: exp.date,
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
            Upload a bill to auto-fill details or enter manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {expenses.map((expense, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3"
            >
              {/* Bill Upload */}
              <BillUpload
                onDataExtracted={(data) => handleBillDataExtracted(index, data)}
                onFileUploaded={(file, preview) => handleFileUploaded(index, file, preview)}
                uploadedPreview={expense.billPreview}
                onClearFile={() => handleClearFile(index)}
              />

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
