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
import { ArrowDownLeft, ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BankAccount, TransactionType, PaymentMode, TransactionCategory, BankTransaction } from "./types";

interface RecordTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (txData: Partial<BankTransaction>) => Promise<void>;
    accounts: BankAccount[];
    initialType?: TransactionType;
    initialAccountId?: string;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    accounts,
    initialType = "deposit",
    initialAccountId
}) => {
    const [type, setType] = useState<TransactionType>(initialType);
    const [accountId, setAccountId] = useState(initialAccountId || accounts[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [category, setCategory] = useState<TransactionCategory>(
        initialType === "deposit" ? "Sales Revenue" : "Vendor Payment"
    );
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("NEFT");
    const [referenceNo, setReferenceNo] = useState("");
    const [partyName, setPartyName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setType(initialType);
            setAccountId(initialAccountId || accounts[0]?.id || "");
            setAmount("");
            setDate(format(new Date(), "yyyy-MM-dd"));
            setCategory(initialType === "deposit" ? "Sales Revenue" : "Vendor Payment");
            setPaymentMode(initialType === "deposit" ? "UPI" : "NEFT");
            setReferenceNo("UTR" + Math.floor(1000000000 + Math.random() * 9000000000));
            setPartyName("");
            setDescription("");
        }
    }, [isOpen, initialType, initialAccountId, accounts]);

    const handleGenerateUTR = () => {
        setReferenceNo("UTR" + Math.floor(1000000000 + Math.random() * 9000000000));
        toast.info("Generated sample UTR reference code");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!accountId) {
            toast.error("Please select a bank account.");
            return;
        }

        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                accountId,
                date,
                type,
                amount: numAmount,
                category,
                paymentMode,
                referenceNo: referenceNo.trim() || `REF-${Date.now()}`,
                partyName: partyName.trim() || undefined,
                description: description.trim() || `${type === "deposit" ? "Credit" : "Debit"} - ${category}`,
                isReconciled: false
            });
            onClose();
        } catch (err: any) {
            console.error("Error recording transaction:", err);
            toast.error(err.message || "Failed to record transaction.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        {type === "deposit" ? (
                            <><ArrowDownLeft className="w-5 h-5 text-emerald-500" /> Record Inward Credit (Deposit)</>
                        ) : (
                            <><ArrowUpRight className="w-5 h-5 text-rose-500" /> Record Outward Debit (Payment)</>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Post bank entry directly to your general ledger. Reconcile later with bank statements.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Account & Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Bank Book
                            </label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.bankName} ({a.accountNumber.slice(-4)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Amount (₹)
                            </label>
                            <Input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="e.g. 25000"
                                className="h-9 text-xs font-mono font-bold rounded-xl"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Date & Payment Mode */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Date
                            </label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="h-9 text-xs rounded-xl font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Payment Mode
                            </label>
                            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UPI">UPI / QR</SelectItem>
                                    <SelectItem value="NEFT">NEFT</SelectItem>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="IMPS">IMPS</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                    <SelectItem value="Cash">Cash Deposit/Withdrawal</SelectItem>
                                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                                    <SelectItem value="Card">Debit/Credit Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Category & Party */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Category
                            </label>
                            <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {type === "deposit" ? (
                                        <>
                                            <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                                            <SelectItem value="Customer Payment">Customer Receivable</SelectItem>
                                            <SelectItem value="Interest">Bank Interest</SelectItem>
                                            <SelectItem value="Transfer">Internal Contra Transfer</SelectItem>
                                            <SelectItem value="Other">Other Inward Income</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="Vendor Payment">Vendor Payment</SelectItem>
                                            <SelectItem value="Salary">Salary & Payroll</SelectItem>
                                            <SelectItem value="Utilities">Electricity & Utilities</SelectItem>
                                            <SelectItem value="Rent">Office / Shop Rent</SelectItem>
                                            <SelectItem value="Tax">GST / TDS / Tax Payment</SelectItem>
                                            <SelectItem value="Bank Charges">Bank Charges & Fees</SelectItem>
                                            <SelectItem value="Loan / EMI">Loan EMI / Financing</SelectItem>
                                            <SelectItem value="Owner Drawing">Owner Drawings</SelectItem>
                                            <SelectItem value="Transfer">Internal Contra Transfer</SelectItem>
                                            <SelectItem value="Other">Other Expense</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                {type === "deposit" ? "Received From (Party)" : "Paid To (Party)"}
                            </label>
                            <Input
                                value={partyName}
                                onChange={e => setPartyName(e.target.value)}
                                placeholder="Customer / Vendor name"
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Reference / UTR Number */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Reference No / UTR / Cheque No
                            </label>
                            <button
                                type="button"
                                onClick={handleGenerateUTR}
                                className="text-[9px] text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                                <Sparkles className="w-2.5 h-2.5" /> Auto-generate
                            </button>
                        </div>
                        <Input
                            value={referenceNo}
                            onChange={e => setReferenceNo(e.target.value)}
                            placeholder="e.g. UTR92837482910"
                            className="h-9 text-xs font-mono font-bold rounded-xl uppercase"
                            required
                        />
                    </div>

                    {/* Narration */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Narration / Memo
                        </label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional transaction notes..."
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
                            className={type === "deposit" ? "h-9 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "h-9 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Posting...</>
                            ) : (
                                `Post ${type === "deposit" ? "Credit" : "Debit"} Entry`
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
