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
import { Check, Loader2, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";
import { BankAccount, AccountType } from "./types";
import { lookupIFSC, isValidIFSC } from "../../services/ifscService";

interface BankAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (accountData: Partial<BankAccount>) => Promise<void>;
    editingAccount?: BankAccount | null;
}

export const BankAccountModal: React.FC<BankAccountModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingAccount
}) => {
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [branchName, setBranchName] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("checking");
    const [initialBalance, setInitialBalance] = useState("0");
    const [odLimit, setOdLimit] = useState("0");
    const [upiId, setUpiId] = useState("");
    const [isDefault, setIsDefault] = useState(false);

    // IFSC lookup state
    const [isLookingUpIFSC, setIsLookingUpIFSC] = useState(false);
    const [ifscVerified, setIfscVerified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingAccount) {
            setBankName(editingAccount.bankName || "");
            setAccountNumber(editingAccount.accountNumber || "");
            setIfscCode(editingAccount.ifscCode || "");
            setBranchName(editingAccount.branchName || "");
            setAccountType(editingAccount.accountType || "checking");
            setInitialBalance(String(editingAccount.initialBalance ?? 0));
            setOdLimit(String(editingAccount.odLimit ?? 0));
            setUpiId(editingAccount.upiId || "");
            setIsDefault(Boolean(editingAccount.isDefault));
            setIfscVerified(isValidIFSC(editingAccount.ifscCode));
        } else {
            setBankName("");
            setAccountNumber("");
            setIfscCode("");
            setBranchName("");
            setAccountType("checking");
            setInitialBalance("0");
            setOdLimit("0");
            setUpiId("");
            setIsDefault(false);
            setIfscVerified(false);
        }
    }, [editingAccount, isOpen]);

    // Handle IFSC change & auto-lookup
    const handleIfscChange = async (val: string) => {
        const clean = val.toUpperCase().trim();
        setIfscCode(clean);

        if (clean.length === 11) {
            setIsLookingUpIFSC(true);
            try {
                const details = await lookupIFSC(clean);
                if (details) {
                    if (!bankName || bankName === "Unknown Bank") {
                        setBankName(details.bank);
                    }
                    if (details.branch) {
                        setBranchName(`${details.branch}${details.city ? `, ${details.city}` : ""}`);
                    }
                    setIfscVerified(true);
                    toast.success(`IFSC Verified: ${details.bank} (${details.branch})`);
                } else {
                    setIfscVerified(false);
                }
            } catch {
                setIfscVerified(false);
            } finally {
                setIsLookingUpIFSC(false);
            }
        } else {
            setIfscVerified(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!bankName.trim()) {
            toast.error("Please enter a Bank Name.");
            return;
        }

        if (accountType !== "cash") {
            if (!accountNumber.trim()) {
                toast.error("Please enter a valid Account Number.");
                return;
            }
            if (!ifscCode.trim()) {
                toast.error("Please enter an IFSC Code.");
                return;
            }
        }

        setIsSaving(true);
        try {
            await onSave({
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim() || "CASH-REGISTER",
                ifscCode: ifscCode.trim() || "CASH0000000",
                branchName: branchName.trim() || "Main",
                accountType,
                initialBalance: parseFloat(initialBalance) || 0,
                odLimit: accountType === "overdraft" ? (parseFloat(odLimit) || 0) : 0,
                upiId: upiId.trim() || undefined,
                isDefault
            });
            onClose();
        } catch (err: any) {
            console.error("Error saving bank account:", err);
            toast.error(err.message || "Failed to save bank account.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Configure business bank parameters. Details automatically link with accounting registers and invoice prints.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        {/* Account Type */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Account Type
                            </label>
                            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="checking">Current / Checking</SelectItem>
                                    <SelectItem value="savings">Savings Account</SelectItem>
                                    <SelectItem value="overdraft">Overdraft / OD / CC</SelectItem>
                                    <SelectItem value="cash">Cash in Hand / Safe</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* IFSC Code with Live Auto-Lookup */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    IFSC Code
                                </label>
                                {isLookingUpIFSC && (
                                    <span className="text-[9px] text-primary flex items-center gap-1 font-semibold">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verifying
                                    </span>
                                )}
                                {ifscVerified && (
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-bold">
                                        <Check className="w-2.5 h-2.5" /> Verified
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <Input
                                    value={ifscCode}
                                    onChange={e => handleIfscChange(e.target.value)}
                                    placeholder="e.g. SBIN0001609"
                                    maxLength={11}
                                    disabled={accountType === "cash"}
                                    className="h-9 text-xs font-mono uppercase rounded-xl"
                                    required={accountType !== "cash"}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Bank Name
                        </label>
                        <Input
                            value={bankName}
                            onChange={e => setBankName(e.target.value)}
                            placeholder="e.g. State Bank of India, HDFC Bank, ICICI Bank"
                            className="h-9 text-xs rounded-xl"
                            required
                        />
                    </div>

                    {/* Account Number & Branch */}
                    {accountType !== "cash" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Account Number
                                </label>
                                <Input
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    placeholder="e.g. 100293848123"
                                    className="h-9 text-xs font-mono font-semibold rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Branch Name
                                </label>
                                <Input
                                    value={branchName}
                                    onChange={e => setBranchName(e.target.value)}
                                    placeholder="e.g. Connaught Place"
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    {/* Initial Balance & OD Limit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Initial Opening Balance (₹)
                            </label>
                            <Input
                                type="number"
                                step="any"
                                value={initialBalance}
                                onChange={e => setInitialBalance(e.target.value)}
                                placeholder="0"
                                className="h-9 text-xs rounded-xl font-mono"
                                required
                            />
                        </div>

                        {accountType === "overdraft" && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-rose-500 block">
                                    Sanctioned Overdraft Limit (₹)
                                </label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={odLimit}
                                    onChange={e => setOdLimit(e.target.value)}
                                    placeholder="500000"
                                    className="h-9 text-xs border-rose-500/30 rounded-xl font-mono"
                                    required
                                />
                            </div>
                        )}

                        {accountType !== "overdraft" && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Account UPI ID (Optional)
                                </label>
                                <Input
                                    value={upiId}
                                    onChange={e => setUpiId(e.target.value)}
                                    placeholder="e.g. storename@sbi"
                                    className="h-9 text-xs font-mono rounded-xl"
                                />
                            </div>
                        )}
                    </div>

                    {/* Default Account Checkbox */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                        <input
                            type="checkbox"
                            id="isDefaultAccount"
                            checked={isDefault}
                            onChange={e => setIsDefault(e.target.checked)}
                            className="rounded border-border h-4 w-4 text-primary focus:ring-primary"
                        />
                        <label htmlFor="isDefaultAccount" className="text-xs text-foreground font-medium cursor-pointer">
                            Set as Default Bank Account (printed on Tax Invoices & QR codes)
                        </label>
                    </div>

                    <DialogFooter className="pt-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-9 text-xs rounded-xl"
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</>
                            ) : editingAccount ? (
                                "Update Account"
                            ) : (
                                "Add Account"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
