import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Pencil, User } from "lucide-react";

const lentMoneySchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  personName: z.string().trim().min(2, "Person name must be at least 2 characters"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: z.string().optional(),
});

interface LentMoneyRecord {
  id: string;
  amount: number;
  person_name: string;
  description: string;
  due_date: string | null;
  status: string;
}

interface EditLentMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lentMoney: LentMoneyRecord | null;
}

export const EditLentMoneyDialog = ({ open, onOpenChange, lentMoney }: EditLentMoneyDialogProps) => {
  const [amount, setAmount] = useState("");
  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lentMoney) {
      setAmount(lentMoney.amount.toString());
      setPersonName(lentMoney.person_name);
      setDescription(lentMoney.description);
      setDueDate(lentMoney.due_date || "");
    }
  }, [lentMoney]);

  const updateLentMoney = useMutation({
    mutationFn: async (data: {
      id: string;
      amount: number;
      personName: string;
      description: string;
      dueDate?: string;
    }) => {
      const { error } = await supabase
        .from("lent_money")
        .update({
          amount: data.amount,
          person_name: data.personName,
          description: data.description,
          due_date: data.dueDate || null,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Lent money updated",
        description: "The record has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lentMoney) return;
    
    setLoading(true);

    try {
      const validatedData = lentMoneySchema.parse({
        amount,
        personName,
        description,
        dueDate: dueDate || undefined,
      });

      await updateLentMoney.mutateAsync({
        id: lentMoney.id,
        amount: parseFloat(validatedData.amount),
        personName: validatedData.personName,
        description: validatedData.description,
        dueDate: validatedData.dueDate,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border rounded-none shadow-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Lent Money
          </DialogTitle>
          <DialogDescription>
            Update the details of this lent money record.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-4">
            <div className="border rounded-none p-3 shadow-sm bg-muted/20">
              <Label htmlFor="edit-amount">Amount</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 rounded-none"
                  required
                />
              </div>
            </div>
            <div className="border rounded-none p-3 shadow-sm bg-muted/20">
              <Label htmlFor="edit-personName">Person</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-personName"
                  placeholder="John Doe"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="pl-10 rounded-none"
                  required
                />
              </div>
            </div>
            <div className="border rounded-none p-3 shadow-sm bg-muted/20">
              <Label htmlFor="edit-description">Description</Label>
              <div className="relative mt-2">
                <Textarea
                  id="edit-description"
                  placeholder="What was the money lent for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-none"
                  required
                />
              </div>
            </div>
            <div className="border rounded-none p-3 shadow-sm bg-muted/20">
              <Label htmlFor="edit-dueDate">Due Date</Label>
              <div className="relative mt-2">
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
