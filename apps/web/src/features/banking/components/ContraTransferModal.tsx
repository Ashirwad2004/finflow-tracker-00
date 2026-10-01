import React, { useState, useEffect } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { ArrowLeftRight, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BankAccount } from "./types";

interface ContraTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (transferData: {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        date: string;
        referenceNo: string;
        description: string;
    }) => Promise<void>;
    accounts: BankAccount[];
    balances: Record<string, number>;
}

export const ContraTransferModal: React.FC<ContraTransferModalProps> = ({
    isOpen,
    onClose,
    onTransfer,
    accounts,
    balances
}) => {
    const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || "");
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id || "");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [referenceNo, setReferenceNo] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (accounts.length >= 2) {
                setFromAccountId(accounts[0].id);
                setToAccountId(accounts[1].id);
            } else if (accounts.length === 1) {
                setFromAccountId(accounts[0].id);
                setToAccountId("");
            }
            setAmount("");
            setDate(format(new Date(), "yyyy-MM-dd"));
            setReferenceNo("CONTRA" + Math.floor(10000000 + Math.random() * 90000000));
            setDescription("Internal Contra Fund Transfer");
        }
    }, [isOpen, accounts]);

    const sourceAccount = accounts.find(a => a.id === fromAccountId);
    const destAccount = accounts.find(a => a.id === toAccountId);
    const sourceBalance = balances[fromAccountId] ?? sourceAccount?.initialBalance ?? 0;
    const isSourceOD = sourceAccount?.accountType === "overdraft";
    const sourceMaxLimit = isSourceOD ? (sourceAccount?.odLimit || 0) + sourceBalance : sourceBalance;

    const numAmount = parseFloat(amount) || 0;
    const isExceeding = numAmount > sourceMaxLimit && sourceMaxLimit >= 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fromAccountId || !toAccountId) {
            toast.error("Please select both source and destination accounts.");
            return;
        }

        if (fromAccountId === toAccountId) {
            toast.error("Source and destination accounts must be different.");
            return;
        }

        if (!numAmount || numAmount <= 0) {
            toast.error("Please enter a valid transfer amount.");
            return;
        }

        if (isExceeding) {
            toast.error(`Transfer amount exceeds available balance (₹${sourceMaxLimit.toLocaleString()}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onTransfer({
                fromAccountId,
                toAccountId,
                amount: numAmount,
                date,
                referenceNo: referenceNo.trim() || `TRF-${Date.now()}`,
                description: description.trim() || `Transfer from ${sourceAccount?.bankName} to ${destAccount?.bankName}`
            });
            onClose();
        } catch (err: any) {
            console.error("Contra transfer error:", err);
            toast.error(err.message || "Failed to complete internal transfer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-primary" /> Post Contra Transfer (F4)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Transfer money between business bank books or cash-in-hand register. Enforces double-entry contra accounting.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Transfer Direction Banner */}
                    <div className="bg-muted/40 border border-border/80 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span>From (Debit)</span>
                            <ArrowRight className="w-4 h-4 text-primary" />
                            <span>To (Credit)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={fromAccountId} onValueChange={setFromAccountId}>
                                <SelectTrigger className="h-9 text-xs font-semibold rounded-lg border-rose-500/30">
                                    <SelectValue placeholder="Source account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.bankName} ({a.accountNumber.slice(-4)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={toAccountId} onValueChange={setToAccountId}>
                                <SelectTrigger className="h-9 text-xs font-semibold rounded-lg border-emerald-500/30">
                                    <SelectValue placeholder="Target account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                                            {a.bankName} ({a.accountNumber.slice(-4)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {sourceAccount && (
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                <span>Available in {sourceAccount.bankName}:</span>
                                <span className="font-mono font-bold text-foreground">
                                    ₹{sourceMaxLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Transfer Amount (₹)
                            </label>
                            <Input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Amount in ₹"
                                className="h-9 text-xs font-mono font-bold rounded-xl"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Transfer Date
                            </label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="h-9 text-xs rounded-xl font-mono"
                                required
                            />
                        </div>
                    </div>

                    {isExceeding && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Amount exceeds available balance in source account!</span>
                        </div>
                    )}

                    {/* Reference & Narration */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Voucher / Reference No
                        </label>
                        <Input
                            value={referenceNo}
                            onChange={e => setReferenceNo(e.target.value)}
                            placeholder="e.g. CONTRA982103"
                            className="h-9 text-xs font-mono font-bold rounded-xl uppercase"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Narration / Memo
                        </label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Internal transfer memo..."
                            className="h-9 text-xs rounded-xl"
                        />
                    </div>

                    <DialogFooter className="pt-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-9 text-xs rounded-xl"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                            disabled={isSubmitting || isExceeding}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Transferring...</>
                            ) : (
                                "Execute Contra Transfer"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
