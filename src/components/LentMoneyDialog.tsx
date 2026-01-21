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
import { cn } from "@/lib/utils"; 

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
      {/* 1. max-h-[90vh]: Prevents dialog from being taller than the screen.
         2. overflow-y-auto: Allows scrolling inside the dialog on small screens if keyboard pops up.
         3. w-[95%] sm:w-full: Takes up almost full width on mobile, but respects max-width on desktop.
      */}
      <DialogContent className="sm:max-w-[480px] w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border shadow-xl bg-background/95 backdrop-blur-xl">
        
        {/* Header Section - Reduced padding on mobile */}
        <div className="bg-muted/30 p-5 sm:p-6 pb-6 sm:pb-8 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-primary">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              Record Lent Money
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base pt-1">
              Who are you lending money to today?
            </DialogDescription>
          </DialogHeader>

          {/* Hero Amount Input */}
          <div className="mt-6 sm:mt-8 flex justify-center">
            <div className="relative w-full max-w-[240px] sm:max-w-[280px]">
              <span className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-bold text-muted-foreground/50">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                // Responsive font size: text-3xl on mobile, text-4xl on desktop
                className="h-16 sm:h-20 pl-8 sm:pl-10 text-center text-3xl sm:text-4xl font-bold border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
                autoFocus
                required
              />
              <div className="h-1 w-full bg-muted rounded-full mt-1 sm:mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: amount ? "100%" : "0%" }}
                />
              </div>
            </div>
          </div>
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">Enter amount</p>
        </div>

        {/* Form Body - Responsive padding and stacking */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Stacks on mobile (grid-cols-1), side-by-side on tablet+ (grid-cols-2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Person Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="personName" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Lending To
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
                <Input
                  id="personName"
                  placeholder="e.g. John Doe"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="pl-10 h-10 sm:h-11 bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="dueDate" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Due Date <span className="text-muted-foreground/50 lowercase">(optional)</span>
              </Label>
              <div className="relative group">
                <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-10 h-10 sm:h-11 bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Description
            </Label>
            <div className="relative group">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary group-focus-within:text-primary" />
              <Textarea
                id="description"
                placeholder="What is this for? (e.g. Dinner, Rent)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-10 min-h-[80px] sm:min-h-[90px] resize-none bg-muted/20 border-muted-foreground/20 focus:bg-background transition-all rounded-lg py-2.5 text-sm sm:text-base"
                required
              />
            </div>
          </div>

          {/* Footer Actions - Stack buttons on very small screens if needed, otherwise flex */}
          <DialogFooter className="gap-3 sm:gap-2 pt-2 sm:pt-4 flex-col sm:flex-row">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
              className="w-full sm:w-auto hover:bg-muted order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full sm:w-auto min-w-[140px] rounded-lg shadow-lg shadow-primary/20 order-1 sm:order-2"
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