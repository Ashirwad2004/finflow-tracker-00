import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import {
    TrendingDown,
    User,
    CalendarIcon,
    Banknote,
    FileText,
    Loader2,
    ChevronsUpDown,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const borrowedMoneySchema = z.object({
    amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
    personName: z.string().trim().min(2, "Person name must be at least 2 characters"),
    description: z.string().trim().min(1, "Description is required"),
    dueDate: z.string().optional(),
});

interface BorrowedMoneyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    defaultPersonName?: string;
}

export const BorrowedMoneyDialog = ({ open, onOpenChange, userId, defaultPersonName = "" }: BorrowedMoneyDialogProps) => {
    const [amount, setAmount] = useState("");
    const [personName, setPersonName] = useState(defaultPersonName);
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);

    // Sync prop changes to state
    useEffect(() => {
        if (open) {
            setPersonName(defaultPersonName);
        }
    }, [defaultPersonName, open]);

    const queryClient = useQueryClient();

    // Fetch unique person names for autocomplete (from borrowed_money table)
    const { data: existingParties = [] } = useQuery({
        queryKey: ["borrowed-parties-list", userId],
        queryFn: async () => {
            const { data } = await supabase
                .from("borrowed_money")
                .select("person_name")
                .eq("user_id", userId);

            if (!data) return [];
            const uniqueNames = Array.from(new Set(data.map(d => d.person_name)));
            return uniqueNames.sort();
        },
        enabled: open && !!userId,
    });

    const addBorrowedMoney = useMutation({
        mutationFn: async (data: {
            amount: number;
            personName: string;
            description: string;
            dueDate?: string;
        }) => {
            const { data: result, error } = await supabase
                .from("borrowed_money")
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
            queryClient.invalidateQueries({ queryKey: ["borrowed-money"] });
            queryClient.invalidateQueries({ queryKey: ["borrowed-money-parties"] });
            toast({
                title: "Success",
                description: `Recorded ₹${amount} borrowed from ${personName}.`,
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
            const validatedData = borrowedMoneySchema.parse({
                amount,
                personName,
                description,
                dueDate: dueDate || undefined,
            });

            await addBorrowedMoney.mutateAsync({
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
            <DialogContent className="sm:max-w-[480px] w-[95%] max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0 border shadow-xl bg-background/95 backdrop-blur-xl">

                <div className="bg-muted/30 p-5 sm:p-6 pb-6 sm:pb-8 border-b">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-destructive">
                            <div className="p-1.5 sm:p-2 bg-destructive/10 rounded-full">
                                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                            </div>
                            Record Borrowed Money
                        </DialogTitle>
                        <DialogDescription className="text-sm sm:text-base pt-1">
                            Who are you borrowing from?
                        </DialogDescription>
                    </DialogHeader>

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
                                className="h-16 sm:h-20 pl-8 sm:pl-10 text-center text-3xl sm:text-4xl font-bold border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0 text-destructive"
                                autoFocus
                                required
                            />
                            <div className="h-1 w-full bg-muted rounded-full mt-1 sm:mt-2 overflow-hidden">
                                <div
                                    className="h-full bg-destructive transition-all duration-300"
                                    style={{ width: amount ? "100%" : "0%" }}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">Enter amount</p>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        {/* Person Input + History Selection */}
                        <div className="space-y-1.5 sm:space-y-2 flex flex-col">
                            <Label htmlFor="personName" className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                                Borrowing From
                            </Label>
                            <div className="relative flex gap-2">
                                <div className="relative flex-1 group">
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

                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 bg-muted/20 border-muted-foreground/20"
                                            title="Select from history"
                                        >
                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="end">
                                        <Command>
                                            <CommandInput placeholder="Search history..." />
                                            <CommandList>
                                                <CommandEmpty className="py-2 text-sm text-center text-muted-foreground">No recent parties.</CommandEmpty>
                                                <CommandGroup heading="Recent">
                                                    {existingParties.map((party) => (
                                                        <CommandItem
                                                            key={party}
                                                            value={party}
                                                            onSelect={(currentValue) => {
                                                                setPersonName(party);
                                                                setOpenCombobox(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    personName === party ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {party}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

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
                            className="w-full sm:w-auto min-w-[140px] rounded-lg shadow-lg shadow-destructive/20 order-1 sm:order-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Banknote className="mr-2 h-4 w-4" />
                                    Record Debt
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
