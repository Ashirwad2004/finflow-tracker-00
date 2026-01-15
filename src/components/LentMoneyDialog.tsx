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
import { 
  TrendingUp, 
  User, 
  CalendarIcon, 
  Banknote, 
  FileText,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility, typical in shadcn

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

  const addLentMoney = useMutation({
    mutationFn: async (data: {
      amount: number;
      personName: string;
      description: string;
      dueDate?: string;
    }) => {
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

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lent-money"] });
      toast({
        title: "Success",
        description: `Recorded ₹${amount} lent to ${personName}.`,
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record transaction.",
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
          title: "Check details",
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
      <DialogContent className="sm:max-w-[500px] w-[95%] rounded-2xl p-0 gap-0 overflow-hidden border shadow-xl bg-background/95 backdrop-blur-xl">
        
        {/* Header Section */}
        <div className="bg-muted/30 p-6 pb-8 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-primary">
              <div className="p-2 bg-primary/10 rounded-full">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              Record Lent Money
            </DialogTitle>
            <DialogDescription className="text-base pt-1">
              Who are you lending money to today?
            </DialogDescription>
          </DialogHeader>

          {/* Hero Amount Input */}
          <div className="mt-8 flex justify-center">
            <div className="relative w-full max-w-[280px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground/50">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-20 pl-10 text-center text-4xl font-bold border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
                autoFocus
                required
              />
              {/* Underline animation or visual indicator */}
              <div className="h-1 w-full bg-muted rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: amount ? "100%" : "0%" }}
                />
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">Enter amount</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Person Input */}
            <div className="space-y-2">
              <Label htmlFor="personName" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Lending To
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
                <Input
                  id="personName"
                  placeholder="e.g. John Doe"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="pl-10 h-11 bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Due Date (Optional)
              </Label>
              <div className="relative group">
                <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-10 h-11 bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Description
            </Label>
            <div className="relative group">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
              <Textarea
                id="description"
                placeholder="What is this for? (e.g. Dinner, Rent)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-10 min-h-[80px] resize-none bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg py-2.5"
                required
              />
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="gap-3 sm:gap-2 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
              className="w-full sm:w-auto hover:bg-muted"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full sm:w-auto min-w-[140px] rounded-lg shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Banknote className="mr-2 h-4 w-4" />
                  Record Loan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};