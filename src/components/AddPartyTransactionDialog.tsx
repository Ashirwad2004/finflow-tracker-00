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

const partyTransactionSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  category_id: z.string().uuid("Please select a category"),
  party: z.string().trim().min(1, "Party name is required"),
  transaction_type: z.enum(["received", "payable"], "Please select transaction type"),
  date: z.string(),
});

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface AddPartyTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  userId: string;
}

interface PartyTransactionRow {
  description: string;
  amount: string;
  categoryId: string;
  party: string;
  transactionType: string;
  date: string;
  billFile: File | null;
  billPreview: string | null;
}

export const AddPartyTransactionDialog = ({
  open,
  onOpenChange,
  categories,
  userId,
}: AddPartyTransactionDialogProps) => {
  const queryClient = useQueryClient();

  const [transactions, setTransactions] = useState<PartyTransactionRow[]>([
    {
      description: "",
      amount: "",
      categoryId: "",
      party: "",
      transactionType: "",
      date: new Date().toISOString().split("T")[0],
      billFile: null,
      billPreview: null,
    },
  ]);

  const addRow = () => {
    setTransactions([
      ...transactions,
      {
        description: "",
        amount: "",
        categoryId: "",
        party: "",
        transactionType: "",
        date: new Date().toISOString().split("T")[0],
        billFile: null,
        billPreview: null,
      },
    ]);
  };

  const removeRow = (index: number) => {
    // Revoke object URL to prevent memory leak
    if (transactions[index].billPreview) {
      URL.revokeObjectURL(transactions[index].billPreview!);
    }
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const updateTransaction = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
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
    const updated = [...transactions];

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

    setTransactions(updated);
  };

  const handleFileUploaded = (index: number, file: File, preview: string) => {
    const updated = [...transactions];
    // Revoke previous preview URL if exists
    if (updated[index].billPreview) {
      URL.revokeObjectURL(updated[index].billPreview!);
    }
    updated[index].billFile = file;
    updated[index].billPreview = preview;
    setTransactions(updated);
  };

  const handleClearFile = (index: number) => {
    const updated = [...transactions];
    if (updated[index].billPreview) {
      URL.revokeObjectURL(updated[index].billPreview!);
    }
    updated[index].billFile = null;
    updated[index].billPreview = null;
    setTransactions(updated);
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

  const addPartyTransactions = useMutation({
    mutationFn: async () => {
      const payload = await Promise.all(
        transactions.map(async (t) => {
          let billUrl = null;
          if (t.billFile) {
            billUrl = await uploadBillToStorage(t.billFile);
          }

          return {
            description: t.description,
            amount: parseFloat(t.amount),
            category_id: t.categoryId,
            date: t.date,
            user_id: userId,
            bill_url: billUrl,
            party: t.party,
            transaction_type: t.transactionType,
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
      queryClient.invalidateQueries({ queryKey: ["party-balances"] });
      toast({
        title: "Party transactions added",
        description: `${transactions.length} party transaction(s) added successfully.`,
      });
      onOpenChange(false);
      // Clean up preview URLs
      transactions.forEach((t) => {
        if (t.billPreview) {
          URL.revokeObjectURL(t.billPreview);
        }
      });
      setTransactions([
        {
          description: "",
          amount: "",
          categoryId: "",
          party: "",
          transactionType: "",
          date: new Date().toISOString().split("T")[0],
          billFile: null,
          billPreview: null,
        },
      ]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add party transactions",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      transactions.forEach((trans) => {
        partyTransactionSchema.parse({
          description: trans.description,
          amount: parseFloat(trans.amount),
          category_id: trans.categoryId,
          party: trans.party,
          transaction_type: trans.transactionType,
          date: trans.date,
        });
      });

      addPartyTransactions.mutate();
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
          <DialogTitle>Add Party Transaction</DialogTitle>
          <DialogDescription>
            Record transactions with parties (people, shops, clients). Upload a bill to auto-fill details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {transactions.map((transaction, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3"
            >
              {/* Bill Upload */}
              <BillUpload
                onDataExtracted={(data) => handleBillDataExtracted(index, data)}
                onFileUploaded={(file, preview) => handleFileUploaded(index, file, preview)}
                uploadedPreview={transaction.billPreview}
                onClearFile={() => handleClearFile(index)}
              />

              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  placeholder="What was this transaction for?"
                  value={transaction.description}
                  onChange={(e) =>
                    updateTransaction(index, "description", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={transaction.amount}
                  onChange={(e) =>
                    updateTransaction(index, "amount", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={transaction.categoryId}
                  onValueChange={(value) =>
                    updateTransaction(index, "categoryId", value)
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
                <Label>Party (Person/Shop/Client)</Label>
                <Input
                  placeholder="John Doe, Walmart, Client ABC..."
                  value={transaction.party}
                  onChange={(e) =>
                    updateTransaction(index, "party", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Transaction Type</Label>
                <Select
                  value={transaction.transactionType}
                  onValueChange={(value) =>
                    updateTransaction(index, "transactionType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received (Party gave money to me)</SelectItem>
                    <SelectItem value="payable">Payable (I have to pay money to party)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={transaction.date}
                  onChange={(e) =>
                    updateTransaction(index, "date", e.target.value)
                  }
                />
              </div>

              {transactions.length > 1 && (
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
            + Add another party transaction
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
              disabled={addPartyTransactions.isPending}
            >
              {addPartyTransactions.isPending ? "Saving..." : "Save Transactions"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};