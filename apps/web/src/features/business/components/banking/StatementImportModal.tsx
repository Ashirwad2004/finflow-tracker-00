import React, { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    UploadCloud, 
    FileText, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    FileSpreadsheet,
    ArrowDownLeft,
    ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { BankAccount } from "./types";
import { parseStatementFile, ParsedStatementResult } from "../../services/statementParser";

interface StatementImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: BankAccount[];
    onImportSuccess: (accountId: string, parsed: ParsedStatementResult) => Promise<void>;
}

export const StatementImportModal: React.FC<StatementImportModalProps> = ({
    isOpen,
    onClose,
    accounts,
    onImportSuccess
}) => {
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || "");
    const [isParsing, setIsParsing] = useState(false);
    const [parsedResult, setParsedResult] = useState<ParsedStatementResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFileSelect = async (file: File) => {
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
            toast.error("Please select an Excel (.xlsx, .xls) or CSV statement file.");
            return;
        }

        setIsParsing(true);
        try {
            const res = await parseStatementFile(file);
            setParsedResult(res);
            toast.success(`Successfully parsed ${res.lines.length} transactions from statement.`);
        } catch (err: any) {
            console.error("Statement parsing error:", err);
            toast.error(err.message || "Failed to parse bank statement file.");
            setParsedResult(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleImportSubmit = async () => {
        if (!selectedAccountId) {
            toast.error("Please select a target bank account.");
            return;
        }
        if (!parsedResult || parsedResult.lines.length === 0) {
            toast.error("No valid transactions found to import.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onImportSuccess(selectedAccountId, parsedResult);
            toast.success("Bank statement imported into reconciliation workspace!");
            setParsedResult(null);
            onClose();
        } catch (err: any) {
            console.error("Statement import save error:", err);
            toast.error(err.message || "Failed to save bank statement.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] rounded-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" /> Import Bank Statement
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Upload your bank's original Excel (.xlsx) or CSV export (SBI, HDFC, ICICI, Axis, Kotak, BoB, etc.) to reconcile ledger entries.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Target Bank Account */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Target Bank Book
                        </label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
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

                    {/* Upload Dropzone */}
                    {!parsedResult ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-2xl p-7 text-center flex flex-col items-center justify-center space-y-3 cursor-pointer transition-all ${
                                dragActive ? "border-primary bg-primary/5" : "border-border/80 hover:border-primary/50 bg-card/40"
                            }`}
                            onClick={() => {
                                const el = document.getElementById("statement-file-input");
                                el?.click();
                            }}
                        >
                            <input
                                type="file"
                                id="statement-file-input"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                }}
                            />

                            {isParsing ? (
                                <div className="flex flex-col items-center space-y-2 py-4">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        Reading statement and auto-detecting bank format...
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <UploadCloud className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">
                                            Click to browse or drag & drop statement file
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Supports Excel (.xlsx, .xls) and CSV statements
                                        </p>
                                    </div>
                                    <div className="text-[9px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                                        Auto-detects SBI, HDFC, ICICI, Axis, Kotak, BoB, Canara & PNB formats
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* Statement Parsed Summary & Preview */
                        <div className="space-y-3">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                            {parsedResult.filename}
                                        </h4>
                                        <p className="text-[10px] text-emerald-600/80">
                                            {parsedResult.lines.length} lines parsed ({parsedResult.startDate} to {parsedResult.endDate})
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setParsedResult(null)}
                                    className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                    Replace File
                                </Button>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-muted/40 border p-2.5 rounded-xl flex items-center gap-2">
                                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Credits</span>
                                        <span className="font-mono font-bold text-emerald-600">
                                            +₹{parsedResult.totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-muted/40 border p-2.5 rounded-xl flex items-center gap-2">
                                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                                    <div>
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total Debits</span>
                                        <span className="font-mono font-bold text-rose-600">
                                            -₹{parsedResult.totalWithdrawals.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Table Preview (First 4 rows) */}
                            <div className="border border-border/80 rounded-xl overflow-hidden text-[10px]">
                                <div className="bg-muted/50 px-3 py-1.5 font-bold text-muted-foreground flex justify-between border-b">
                                    <span>Sample Statement Rows</span>
                                    <span>Showing top {Math.min(parsedResult.lines.length, 4)} of {parsedResult.lines.length}</span>
                                </div>
                                <div className="divide-y divide-border/60 max-h-[140px] overflow-y-auto">
                                    {parsedResult.lines.slice(0, 4).map((l, idx) => (
                                        <div key={idx} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/30">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-foreground">{l.date}</span>
                                                    <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[120px]">
                                                        {l.referenceNo}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground truncate max-w-[280px]">
                                                    {l.narration}
                                                </p>
                                            </div>
                                            <span className={`font-mono font-bold shrink-0 ${l.deposit > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                {l.deposit > 0 ? `+₹${l.deposit.toLocaleString()}` : `-₹${l.withdrawal.toLocaleString()}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
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
                            onClick={handleImportSubmit}
                            disabled={!parsedResult || isSubmitting}
                            className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Importing...</>
                            ) : (
                                "Import to BRS Workspace"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
