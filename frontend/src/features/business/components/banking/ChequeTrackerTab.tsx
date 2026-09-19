import React, { useState, useMemo } from "react";
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Plus, 
    AlertTriangle, 
    ArrowDownLeft, 
    ArrowUpRight,
    Search,
    Loader2,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { BankAccount, ChequeRecord } from "./types";

interface ChequeTrackerTabProps {
    accounts: BankAccount[];
    cheques: ChequeRecord[];
    onCreateCheque: (chequeData: Partial<ChequeRecord>) => Promise<void>;
    onUpdateChequeStatus: (chequeId: string, status: ChequeRecord["status"], bounceReason?: string) => Promise<void>;
    onClearCheque: (cheque: ChequeRecord) => Promise<void>;
}

export const ChequeTrackerTab: React.FC<ChequeTrackerTabProps> = ({
    accounts,
    cheques,
    onCreateCheque,
    onUpdateChequeStatus,
    onClearCheque
}) => {
    const [typeFilter, setTypeFilter] = useState<"all" | "received" | "issued">("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const [chequeType, setChequeType] = useState<"received" | "issued">("received");
    const [chequeNumber, setChequeNumber] = useState("");
    const [partyName, setPartyName] = useState("");
    const [amount, setAmount] = useState("");
    const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [bankName, setBankName] = useState("");
    const [notes, setNotes] = useState("");

    // Bounce modal
    const [bounceModalCheque, setBounceModalCheque] = useState<ChequeRecord | null>(null);
    const [bounceReason, setBounceReason] = useState("Insufficient Funds");

    // Metrics
    const pendingReceivables = useMemo(() => {
        return cheques
            .filter(c => c.chequeType === "received" && (c.status === "pending" || c.status === "deposited"))
            .reduce((sum, c) => sum + c.amount, 0);
    }, [cheques]);

    const pendingPayables = useMemo(() => {
        return cheques
            .filter(c => c.chequeType === "issued" && c.status === "pending")
            .reduce((sum, c) => sum + c.amount, 0);
    }, [cheques]);

    const filteredCheques = useMemo(() => {
        return cheques.filter(c => {
            if (typeFilter !== "all" && c.chequeType !== typeFilter) return false;
            if (statusFilter !== "all" && c.status !== statusFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchNum = c.chequeNumber.toLowerCase().includes(q);
                const matchParty = c.partyName.toLowerCase().includes(q);
                const matchBank = c.bankName?.toLowerCase().includes(q);
                if (!matchNum && !matchParty && !matchBank) return false;
            }

            return true;
        });
    }, [cheques, typeFilter, statusFilter, searchQuery]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
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

        if (!chequeNumber.trim()) {
            toast.error("Please enter a 6-digit CTS cheque number.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreateCheque({
                accountId,
                chequeType,
                chequeNumber: chequeNumber.trim(),
                partyName: partyName.trim(),
                amount: numAmount,
                issueDate,
                dueDate,
                bankName: bankName.trim() || undefined,
                notes: notes.trim() || undefined,
                status: "pending"
            });
            toast.success(`Cheque #${chequeNumber} registered in tracker!`);
            setIsAddOpen(false);
            setChequeNumber("");
            setPartyName("");
            setAmount("");
            setBankName("");
            setNotes("");
        } catch (err: any) {
            console.error("Failed to create cheque:", err);
            toast.error(err.message || "Failed to record cheque.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmBounce = async () => {
        if (!bounceModalCheque) return;
        try {
            await onUpdateChequeStatus(bounceModalCheque.id, "bounced", bounceReason);
            toast.error(`Cheque #${bounceModalCheque.chequeNumber} marked as Bounced (${bounceReason}).`);
            setBounceModalCheque(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to update cheque status.");
        }
    };

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Cheques in Transit (Net)
                        </span>
                        <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                            ₹{(pendingReceivables - pendingPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
                            Pending Receivables (Inward)
                        </span>
                        <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                            +₹{pendingReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <ArrowDownLeft className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">
                            Pending Payables (Outward)
                        </span>
                        <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                            -₹{pendingPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter and Action Bar */}
            <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-48 sm:w-60">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search Cheque #, Party..."
                            className="pl-8 h-9 text-xs rounded-xl"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Type Filter */}
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[140px]">
                            <SelectValue placeholder="All Cheques" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Cheques</SelectItem>
                            <SelectItem value="received">Received (Inward)</SelectItem>
                            <SelectItem value="issued">Issued (Outward)</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-xs rounded-xl w-[130px]">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="deposited">Deposited</SelectItem>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="bounced">Bounced</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" /> Record Cheque (PDC)
                </Button>
            </div>

            {/* Cheque Register Table */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[100px] text-xs font-bold">Cheque #</TableHead>
                            <TableHead className="text-xs font-bold">Type</TableHead>
                            <TableHead className="text-xs font-bold">Party / Drawer</TableHead>
                            <TableHead className="text-xs font-bold">Bank Account</TableHead>
                            <TableHead className="text-xs font-bold">Due Date (PDC)</TableHead>
                            <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
                            <TableHead className="text-xs font-bold text-center w-[100px]">Status</TableHead>
                            <TableHead className="w-[150px] text-center text-xs font-bold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCheques.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-36 text-center text-xs text-muted-foreground">
                                    No cheques found matching filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCheques.map(c => {
                                const acc = accounts.find(a => a.id === c.accountId);

                                return (
                                    <TableRow key={c.id} className="hover:bg-muted/30 text-xs">
                                        <TableCell className="font-mono font-bold text-xs py-2.5">
                                            #{c.chequeNumber}
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            <Badge 
                                                variant="outline" 
                                                className={`text-[9px] px-1.5 py-0 font-bold ${
                                                    c.chequeType === "received" 
                                                        ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5" 
                                                        : "text-rose-600 border-rose-500/20 bg-rose-500/5"
                                                }`}
                                            >
                                                {c.chequeType === "received" ? "Received (CR)" : "Issued (DR)"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            <span className="font-semibold text-foreground block truncate max-w-[140px]">
                                                {c.partyName}
                                            </span>
                                            {c.bankName && (
                                                <span className="text-[9px] text-muted-foreground block truncate max-w-[140px]">
                                                    {c.bankName}
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="py-2.5">
                                            <span className="font-medium text-foreground block">
                                                {acc?.bankName || "Unknown"}
                                            </span>
                                        </TableCell>

                                        <TableCell className="font-mono text-[11px] py-2.5">
                                            {c.dueDate}
                                        </TableCell>

                                        <TableCell className={`text-right font-mono font-bold py-2.5 ${
                                            c.chequeType === "received" ? "text-emerald-600" : "text-rose-600"
                                        }`}>
                                            ₹{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center py-2.5">
                                            {c.status === "cleared" && (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[9px] px-1.5 py-0.5">
                                                    Cleared
                                                </Badge>
                                            )}
                                            {c.status === "pending" && (
                                                <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px] px-1.5 py-0.5">
                                                    Pending
                                                </Badge>
                                            )}
                                            {c.status === "deposited" && (
                                                <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[9px] px-1.5 py-0.5">
                                                    Deposited
                                                </Badge>
                                            )}
                                            {c.status === "bounced" && (
                                                <Badge className="bg-rose-500/10 text-rose-600 border-0 text-[9px] px-1.5 py-0.5" title={c.bounceReason}>
                                                    Bounced
                                                </Badge>
                                            )}
                                            {c.status === "cancelled" && (
                                                <Badge className="bg-muted text-muted-foreground border-0 text-[9px] px-1.5 py-0.5">
                                                    Cancelled
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-center py-2.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {c.status !== "cleared" && c.status !== "cancelled" && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => onClearCheque(c)}
                                                        className="h-6 text-[9px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold"
                                                        title="Mark cleared & record in bank ledger"
                                                    >
                                                        Clear
                                                    </Button>
                                                )}
                                                {c.status === "pending" && c.chequeType === "received" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onUpdateChequeStatus(c.id, "deposited")}
                                                        className="h-6 text-[9px] px-1.5 rounded-md"
                                                    >
                                                        Deposit
                                                    </Button>
                                                )}
                                                {c.status !== "cleared" && c.status !== "bounced" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setBounceModalCheque(c)}
                                                        className="h-6 text-[9px] px-1 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                                    >
                                                        Bounce
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Record Cheque Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">
                            Record Cheque / PDC
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Track post-dated cheques (PDCs) and bank clearings. Clearing a cheque automatically posts to the bank ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Cheque Type
                                </label>
                                <Select value={chequeType} onValueChange={(v) => setChequeType(v as any)}>
                                    <SelectTrigger className="h-9 text-xs rounded-xl">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="received">Cheque Received (From Customer)</SelectItem>
                                        <SelectItem value="issued">Cheque Issued (To Vendor)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Cheque Number (6 Digits)
                                </label>
                                <Input
                                    value={chequeNumber}
                                    onChange={e => setChequeNumber(e.target.value)}
                                    placeholder="e.g. 004812"
                                    maxLength={6}
                                    className="h-9 text-xs font-mono font-bold rounded-xl"
                                    required
                                />
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
                                    placeholder="e.g. 50000"
                                    className="h-9 text-xs font-mono font-bold rounded-xl"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Party / Drawer Name
                                </label>
                                <Input
                                    value={partyName}
                                    onChange={e => setPartyName(e.target.value)}
                                    placeholder="Customer or Supplier name"
                                    className="h-9 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Drawer's Bank Name
                                </label>
                                <Input
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    placeholder="e.g. HDFC Bank"
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Issue Date
                                </label>
                                <Input
                                    type="date"
                                    value={issueDate}
                                    onChange={e => setIssueDate(e.target.value)}
                                    className="h-9 text-xs rounded-xl font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                    Due Date (PDC Maturity)
                                </label>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="h-9 text-xs rounded-xl font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Remarks / Notes
                            </label>
                            <Input
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Invoice or bill reference..."
                                className="h-9 text-xs rounded-xl"
                            />
                        </div>

                        <DialogFooter className="pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddOpen(false)}
                                className="h-9 text-xs rounded-xl"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</>
                                ) : (
                                    "Save Cheque"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bounce Confirmation Modal */}
            <Dialog open={!!bounceModalCheque} onOpenChange={() => setBounceModalCheque(null)}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Mark Cheque as Bounced
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select the reason for cheque return. This updates the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Return Reason
                            </label>
                            <Select value={bounceReason} onValueChange={setBounceReason}>
                                <SelectTrigger className="h-9 text-xs rounded-xl">
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Insufficient Funds">Funds Insufficient (Code 01)</SelectItem>
                                    <SelectItem value="Signature Mismatch">Signature Differs (Code 02)</SelectItem>
                                    <SelectItem value="Stop Payment">Payment Stopped by Drawer</SelectItem>
                                    <SelectItem value="Post Dated / Stale">Post Dated / Stale Cheque</SelectItem>
                                    <SelectItem value="Account Closed">Account Closed / Frozen</SelectItem>
                                    <SelectItem value="Other">Other Technical Reason</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setBounceModalCheque(null)}
                            className="h-9 text-xs rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmBounce}
                            className="h-9 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                        >
                            Confirm Cheque Bounce
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
