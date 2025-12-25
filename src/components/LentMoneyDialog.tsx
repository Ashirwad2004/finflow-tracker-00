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
  description: z.string().trim().optional(),
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

  // Check if user is authenticated
  if (!userId || userId === "") {
    console.error("No userId provided to LentMoneyDialog");
    return null;
  }

  const addLentMoney = useMutation({
    mutationFn: async (data: {
      amount: number;
      personName: string;
      description: string;
      dueDate?: string;
    }) => {
      console.log("Adding lent money:", data, "userId:", userId);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Current session:", session, "Session error:", sessionError);
      
      if (!session) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        console.log("Refresh session result:", refreshData, "Refresh error:", refreshError);
        
        if (!refreshData.session) {
          throw new Error("User is not authenticated. Please log in again.");
        }
      }

      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      const { data: result, error } = await supabase
        .from("lent_money")
        .insert({
          user_id: userId,
          amount: data.amount,
          person_name: data.personName,
          description: data.description,
          due_date: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : null,
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
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to record lent money: ${error.message || 'Unknown error'}. Please try again.`,
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
      <DialogContent className="sm:max-w-[425px]">
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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="personName" className="text-right">
                Person
              </Label>
              <div className="col-span-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="personName"
                    placeholder="John Doe"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="What was the money lent for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Lent Money"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};