import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { BillUpload } from "./BillUpload";
import {
  Trash2,
  Plus,
  Receipt,
  CalendarDays,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- SCHEMAS & TYPES ---------------- */

const expenseSchema = z.object({
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  category_id: z.string().uuid(),
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
  id: string; // Temp ID for React keys
  description: string;
  amount: string;
  categoryId: string;
  date: string;
  billFile: File | null;
  billPreview: string | null;
}

/* ---------------- COMPONENT ---------------- */

export const AddExpenseDialog = ({
  open,
  onOpenChange,
  categories,
  userId,
}: AddExpenseDialogProps) => {
  const queryClient = useQueryClient();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      billFile: null,
      billPreview: null,
    },
  ]);

  // Helper to validate a specific row for UI feedback (green check / red dot)
  const isValidRow = (row: ExpenseRow) => {
    return (
      row.description.trim().length > 0 &&
      !isNaN(parseFloat(row.amount)) &&
      parseFloat(row.amount) > 0 &&
      row.categoryId !== ""
    );
  };

  /* ---------------- HANDLERS ---------------- */

  const addRow = () => {
    const newRow = {
      id: crypto.randomUUID(),
      description: "",
      amount: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      billFile: null,
      billPreview: null,
    };
    setExpenses([...expenses, newRow]);
    // Automatically switch to the new tab
    setActiveTab(expenses.length);
  };

  const removeRow = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent tab switching when clicking delete
    
    if (expenses.length === 1) {
      toast({ title: "Cannot delete last item", variant: "destructive" });
      return;
    }

    if (expenses[index].billPreview) {
      URL.revokeObjectURL(expenses[index].billPreview!);
    }

    const newExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(newExpenses);
    
    // Adjust active tab if necessary
    if (activeTab >= index && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const updateExpense = (field: keyof ExpenseRow, value: any) => {
    const updated = [...expenses];
    updated[activeTab] = { ...updated[activeTab], [field]: value };
    setExpenses(updated);
  };

  const handleBillData = (data: any) => {
    const updated = [...expenses];
    const current = updated[activeTab];
    
    if (data.merchant_name) current.description = data.merchant_name;
    if (data.total_amount) current.amount = data.total_amount.toString();
    if (data.bill_date) current.date = data.bill_date;
    if (data.category_suggestion) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === data.category_suggestion?.toLowerCase()
      );
      if (match) current.categoryId = match.id;
    }
    setExpenses(updated);
  };

  const handleFileUpload = (file: File, preview: string) => {
    const updated = [...expenses];
    if (updated[activeTab].billPreview) URL.revokeObjectURL(updated[activeTab].billPreview!);
    updated[activeTab].billFile = file;
    updated[activeTab].billPreview = preview;
    setExpenses(updated);
  };

  const handleClearFile = () => {
    const updated = [...expenses];
    if (updated[activeTab].billPreview) URL.revokeObjectURL(updated[activeTab].billPreview!);
    updated[activeTab].billFile = null;
    updated[activeTab].billPreview = null;
    setExpenses(updated);
  };

  // --- Submission Logic (Same as before) ---
  const uploadBillToStorage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('bills').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('bills').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const addExpensesMutation = useMutation({
    mutationFn: async () => {
      const payload = await Promise.all(
        expenses.map(async (e) => {
          let billUrl = null;
          if (e.billFile) billUrl = await uploadBillToStorage(e.billFile);
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
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Success", description: "All expenses saved successfully." });
      onOpenChange(false);
      // Reset
      expenses.forEach(e => e.billPreview && URL.revokeObjectURL(e.billPreview));
      setExpenses([{ id: crypto.randomUUID(), description: "", amount: "", categoryId: "", date: new Date().toISOString().split("T")[0], billFile: null, billPreview: null }]);
      setActiveTab(0);
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    try {
      expenses.forEach(e => expenseSchema.parse({
        description: e.description,
        amount: parseFloat(e.amount),
        category_id: e.categoryId,
        date: e.date
      }));
      addExpensesMutation.mutate();
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast({ title: "Validation Error", description: "Please check all fields in all tabs.", variant: "destructive" });
      }
    }
  };

  /* ---------------- UI ---------------- */
  
  const currentExpense = expenses[activeTab];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] h-[90vh] sm:h-[600px] p-0 gap-0 overflow-hidden flex flex-col sm:flex-row rounded-2xl border-0 shadow-2xl bg-background">
        
        {/* === LEFT SIDEBAR (Navigation) === */}
        <div className="w-full sm:w-[280px] bg-muted/30 border-r flex flex-col h-[140px] sm:h-auto">
          <div className="p-4 border-b bg-background/50 backdrop-blur">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle>Add Expenses</DialogTitle>
              <DialogDescription className="text-xs">
                {expenses.length} item{expenses.length !== 1 ? 's' : ''} total
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 sm:h-full">
            {/* Mobile: Horizontal, Desktop: Vertical */}
            <div className="flex sm:flex-col p-2 gap-2">
              {expenses.map((expense, index) => {
                const isValid = isValidRow(expense);
                const isActive = activeTab === index;
                
                return (
                  <div
                    key={expense.id}
                    onClick={() => setActiveTab(index)}
                    className={cn(
                      "group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border select-none min-w-[160px] sm:min-w-0",
                      isActive 
                        ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/10" 
                        : "bg-transparent border-transparent hover:bg-muted/50"
                    )}
                  >
                    {/* Status Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate leading-none mb-1", !expense.description && "text-muted-foreground italic")}>
                        {expense.description || "New Item"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {expense.amount ? `₹${expense.amount}` : "₹0.00"}
                      </p>
                    </div>

                    {/* Validation Indicator */}
                    <div className="text-muted-foreground/30">
                       {isValid ? <CheckCircle2 className="w-4 h-4 text-green-500/70" /> : <AlertCircle className="w-4 h-4 text-amber-500/70" />}
                    </div>

                    {/* Delete Button (Hover Only on Desktop) */}
                    {expenses.length > 1 && (
                      <button
                        onClick={(e) => removeRow(e, index)}
                        className="opacity-0 group-hover:opacity-100 sm:absolute sm:right-2 sm:top-1/2 sm:-translate-y-1/2 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-primary border border-dashed border-transparent hover:border-primary/20"
                onClick={addRow}
              >
                <Plus className="w-4 h-4" /> Add Another
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* === RIGHT PANEL (Active Form) === */}
        <div className="flex-1 flex flex-col min-w-0 bg-background h-full">
          
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300" key={currentExpense.id}>
              
              {/* Hero Input: Amount */}
              <div className="space-y-4 text-center">
                 <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                   Expense Amount
                 </Label>
                 <div className="relative inline-block w-full">
                    <IndianRupee className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/30" />
                    <Input 
                       type="number"
                       step="0.01"
                       placeholder="0.00"
                       className="text-center text-5xl font-bold h-20 border-0 border-b-2 border-muted focus-visible:ring-0 focus-visible:border-primary rounded-none px-8 placeholder:text-muted-foreground/20"
                       value={currentExpense.amount}
                       onChange={(e) => updateExpense("amount", e.target.value)}
                       autoFocus
                    />
                 </div>
              </div>

              {/* Main Fields */}
              <div className="grid gap-5">
                 
                 <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5" /> Description
                    </Label>
                    <Input
                       placeholder="What is this for?"
                       className="bg-muted/10"
                       value={currentExpense.description}
                       onChange={(e) => updateExpense("description", e.target.value)}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" /> Category
                      </Label>
                      <Select
                        value={currentExpense.categoryId}
                        onValueChange={(val) => updateExpense("categoryId", val)}
                      >
                        <SelectTrigger className="bg-muted/10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                               <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: c.color}} />
                                  {c.name}
                               </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5" /> Date
                      </Label>
                      <Input 
                        type="date"
                        className="bg-muted/10"
                        value={currentExpense.date}
                        onChange={(e) => updateExpense("date", e.target.value)}
                      />
                    </div>
                 </div>
              </div>

              {/* Bill Upload Section */}
              <Separator />
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase mb-3 block">
                  Attachment
                </Label>
                <BillUpload
                    onDataExtracted={handleBillData}
                    onFileUploaded={handleFileUpload}
                    uploadedPreview={currentExpense.billPreview}
                    onClearFile={handleClearFile}
                />
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t bg-background flex items-center justify-between sm:justify-between gap-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={addRow}
                className="flex-1 sm:flex-none"
              >
                Add Another
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 sm:flex-none min-w-[120px]"
                disabled={addExpensesMutation.isPending}
              >
                {addExpensesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Save All ({expenses.length}) <ChevronRight className="w-4 h-4 ml-1 opacity-50" /></>
                )}
              </Button>
            </div>
          </DialogFooter>

        </div>
      </DialogContent>
    </Dialog>
  );
};