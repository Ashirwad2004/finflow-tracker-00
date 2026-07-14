import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { Plus, Building2, Trash2, Edit2, CheckCircle2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    isDefault: boolean;
}

const BankDetailsPage = () => {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

    // Form states
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [branchName, setBranchName] = useState("");

    // Load accounts
    useEffect(() => {
        try {
            const saved = localStorage.getItem("finflow_bank_accounts");
            if (saved) {
                setAccounts(JSON.parse(saved));
            } else {
                // Seed with a default sample account so the user has a reference point
                const seed: BankAccount[] = [
                    {
                        id: "sample-1",
                        bankName: "State Bank of India",
                        accountNumber: "332405891234",
                        ifscCode: "SBI0001609",
                        branchName: "Main Branch",
                        isDefault: true
                    }
                ];
                setAccounts(seed);
                localStorage.setItem("finflow_bank_accounts", JSON.stringify(seed));
            }
        } catch (e) {
            console.error("Failed to parse bank accounts", e);
        }
    }, []);

    const saveAccounts = (updatedList: BankAccount[]) => {
        setAccounts(updatedList);
        localStorage.setItem("finflow_bank_accounts", JSON.stringify(updatedList));
    };

    const handleOpenDialog = (acc?: BankAccount) => {
        if (acc) {
            setEditingAccount(acc);
            setBankName(acc.bankName);
            setAccountNumber(acc.accountNumber);
            setIfscCode(acc.ifscCode);
            setBranchName(acc.branchName);
        } else {
            setEditingAccount(null);
            setBankName("");
            setAccountNumber("");
            setIfscCode("");
            setBranchName("");
        }
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim() || !branchName.trim()) {
            toast.error("Please fill in all bank details.");
            return;
        }

        let updated: BankAccount[];

        if (editingAccount) {
            updated = accounts.map(a => 
                a.id === editingAccount.id 
                    ? { ...a, bankName, accountNumber, ifscCode, branchName } 
                    : a
            );
            toast.success("Bank details updated successfully!");
        } else {
            const newAcc: BankAccount = {
                id: crypto.randomUUID(),
                bankName,
                accountNumber,
                ifscCode,
                branchName,
                isDefault: accounts.length === 0 // Default if it is the first account
            };
            updated = [...accounts, newAcc];
            toast.success("New bank account added!");
        }

        saveAccounts(updated);
        setIsOpen(false);
    };

    const handleDelete = (id: string) => {
        const target = accounts.find(a => a.id === id);
        if (!target) return;

        if (target.isDefault && accounts.length > 1) {
            toast.error("Cannot delete the default account. Mark another account as default first.");
            return;
        }

        const filtered = accounts.filter(a => a.id !== id);
        // If we deleted the default account and have others remaining, set the first one as default
        if (target.isDefault && filtered.length > 0) {
            filtered[0].isDefault = true;
        }

        saveAccounts(filtered);
        toast.success("Bank account removed.");
    };

    const handleSetDefault = (id: string) => {
        const updated = accounts.map(a => ({
            ...a,
            isDefault: a.id === id
        }));
        saveAccounts(updated);
        toast.success("Default invoice bank account updated!");
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Landmark className="w-6 h-6 text-primary" />
                            Bank Account Settings
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            Configure your business bank accounts. The default account will automatically print on your Tally and ledger invoice templates.
                        </p>
                    </div>
                    <Button 
                        onClick={() => handleOpenDialog()} 
                        className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary hover:bg-primary/95 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Add Bank Account
                    </Button>
                </div>

                {/* Account List Grid */}
                {accounts.length === 0 ? (
                    <div className="border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3 bg-card/50">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm">No bank accounts configured</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                            Add your first business bank account to display details on invoice prints.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {accounts.map((acc) => (
                            <div 
                                key={acc.id}
                                className={cn(
                                    "relative bg-card rounded-2xl border p-5 transition-all flex flex-col justify-between space-y-4 hover:shadow-md",
                                    acc.isDefault ? "border-primary ring-2 ring-primary/10 shadow-sm" : "border-border"
                                )}
                            >
                                {/* Default Badge */}
                                {acc.isDefault && (
                                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Default
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{acc.bankName}</h3>
                                            <span className="text-[10px] text-muted-foreground">Branch: {acc.branchName}</span>
                                        </div>
                                    </div>

                                    {/* Account info list */}
                                    <div className="grid grid-cols-2 gap-y-2 pt-2 border-t text-[11px] font-mono">
                                        <div>
                                            <span className="text-[9px] text-muted-foreground uppercase block font-sans">Account Number</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{acc.accountNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-muted-foreground uppercase block font-sans">IFSC Code</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{acc.ifscCode}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between border-t pt-3">
                                    <button 
                                        onClick={() => handleSetDefault(acc.id)}
                                        disabled={acc.isDefault}
                                        className={cn(
                                            "text-[10px] font-bold transition-all disabled:opacity-50",
                                            acc.isDefault 
                                                ? "text-primary cursor-default" 
                                                : "text-slate-500 hover:text-primary"
                                        )}
                                    >
                                        {acc.isDefault ? "Selected for prints" : "Set as default"}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleOpenDialog(acc)}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800"
                                            title="Edit account details"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(acc.id)}
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                            title="Remove account"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bank Account Form Dialog */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">
                                {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Enter your business bank details precisely. They will render automatically on printed ledgers.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">Bank Name</label>
                                <Input 
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    placeholder="e.g. State Bank of India"
                                    className="h-9 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">Account Number</label>
                                <Input 
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    placeholder="e.g. 332405891234"
                                    className="h-9 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">IFSC Code</label>
                                    <Input 
                                        value={ifscCode}
                                        onChange={e => setIfscCode(e.target.value)}
                                        placeholder="e.g. SBIN0001609"
                                        className="h-9 text-xs rounded-xl uppercase"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">Branch Name</label>
                                    <Input 
                                        value={branchName}
                                        onChange={e => setBranchName(e.target.value)}
                                        placeholder="e.g. Connaught Place"
                                        className="h-9 text-xs rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-3">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsOpen(false)}
                                    className="h-9 text-xs rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/95 text-white"
                                >
                                    {editingAccount ? "Save Changes" : "Add Account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AppLayout>
    );
};

export default BankDetailsPage;