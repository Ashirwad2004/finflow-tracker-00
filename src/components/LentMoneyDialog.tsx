import { useState } from "react";
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
import { TrendingUp, User } from "lucide-react";

const lentMoneySchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  personName: z.string().trim().min(2, "Person name must be at least 2 characters"),
  description: z.string().trim().min(1, "Description is required"),
  dueDate: z.string().optional(),
});

interface LentMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const LentMoneyDialog = ({ open, onOpenChange, userId }: LentMoneyDialogProps) => {
  const [amount, setAmount] = useState("");
  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  console.log("LentMoneyDialog rendered with userId:", userId);

  const addLentMoney = useMutation({
    mutationFn: async (data: {
      amount: number;
      personName: string;
      description: string;
      dueDate?: string;
    }) => {
      console.log("Adding lent money:", data, "userId:", userId);
      const { data: result, error } = await supabase
        .from("lent_money")
        .insert({
          user_id: userId,
          amount: data.amount,
          person_name: data.personName,
          description: data.description,
          due_date: data.dueDate || null,
          status: "pending",
        });

      console.log("Supabase response:", { result, error });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Lent money recorded",
        description: "The lent money has been successfully recorded.",
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Error adding lent money:", error);
      toast({
        title: "Error",
        description: "Failed to record lent money. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = lentMoneySchema.parse({
        amount,
        personName,
        description,
        dueDate: dueDate || undefined,
      });

      await addLentMoney.mutateAsync({
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

  const handleClose = () => {
    setAmount("");
    setPersonName("");
    setDescription("");
    setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border rounded-none shadow-md animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Record Lent Money
          </DialogTitle>
          <DialogDescription>
            Keep track of money you've lent to others. Add details to help you remember.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-4">
            <div className="border rounded-none p-3 shadow-sm transition-all duration-200 hover:shadow-lg bg-muted/20">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="amount"
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
            <div className="border rounded-none p-3 shadow-sm transition-all duration-200 hover:shadow-lg bg-muted/20">
              <Label htmlFor="personName">Person</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="personName"
                  placeholder="John Doe"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="pl-10 rounded-none"
                  required
                />
              </div>
            </div>
            <div className="border rounded-none p-3 shadow-sm transition-all duration-200 hover:shadow-lg bg-muted/20">
              <Label htmlFor="description">Description</Label>
              <div className="relative mt-2">
                <Textarea
                  id="description"
                  placeholder="What was the money lent for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-none"
                  required
                />
              </div>
            </div>
            <div className="border rounded-none p-3 shadow-sm transition-all duration-200 hover:shadow-lg bg-muted/20">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative mt-2">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-none"
                />
              </div>
            </div>
          </div>
          <div className="border rounded-none p-3 shadow-sm transition-all duration-200 hover:shadow-lg bg-muted/20">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Recording..." : "Record Lent Money"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};