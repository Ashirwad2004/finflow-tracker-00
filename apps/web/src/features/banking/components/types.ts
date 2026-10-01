export type AccountType = "checking" | "savings" | "overdraft" | "cash";
export type TransactionType = "deposit" | "withdrawal";
export type PaymentMode = "NEFT" | "RTGS" | "IMPS" | "UPI" | "Cheque" | "Cash" | "Net Banking" | "Card";

export type TransactionCategory = 
    | "Sales Revenue" 
    | "Customer Payment"
    | "Vendor Payment" 
    | "Salary" 
    | "Utilities" 
    | "Rent" 
    | "Transfer" 
    | "Tax" 
    | "Bank Charges"
    | "Interest"
    | "Loan / EMI"
    | "Owner Drawing"
    | "Other";

export interface BankAccount {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    isDefault: boolean;
    accountType: AccountType;
    initialBalance: number;
    odLimit?: number;
    upiId?: string;
    colorTheme?: string;
    isArchived?: boolean;
    notes?: string;
}

export interface BankTransaction {
    id: string;
    accountId: string;
    date: string;
    type: TransactionType;
    amount: number;
    category: TransactionCategory | string;
    paymentMode: PaymentMode | string;
    referenceNo: string;
    description: string;
    partyName?: string;
    isReconciled: boolean;
    reconciledAt?: string;
    matchedStatementLineId?: string;
    transferToAccountId?: string;
    linkedContraTxId?: string;
    linkedChequeId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface BankStatementImport {
    id: string;
    accountId: string;
    filename: string;
    importedAt: string;
    totalLines: number;
    reconciledLines: number;
    openingBalance?: number;
    closingBalance?: number;
    startDate?: string;
    endDate?: string;
}

export interface BankStatementLine {
    id: string;
    importId: string;
    accountId: string;
    date: string;
    narration: string;
    referenceNo: string;
    withdrawal: number;
    deposit: number;
    balance?: number;
    status: "unmatched" | "matched" | "created_in_ledger" | "ignored";
    matchedTxId?: string;
    matchedAt?: string;
}

export interface ChequeRecord {
    id: string;
    accountId: string;
    chequeType: "received" | "issued";
    chequeNumber: string;
    partyName: string;
    partyId?: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    clearanceDate?: string;
    bankName?: string;
    status: "pending" | "deposited" | "cleared" | "bounced" | "cancelled";
    bounceReason?: string;
    linkedTransactionId?: string;
    notes?: string;
}

/**
 * Visual styling theme for Indian banks
 */
export interface BankTheme {
    gradient: string;
    accent: string;
    border: string;
    badgeBg: string;
    badgeText: string;
}

export function getBankTheme(bankName: string, customTheme?: string): BankTheme {
    const s = (bankName || "").toLowerCase();
    
    if (s.includes("state bank") || s.includes("sbi")) {
        return {
            gradient: "from-blue-900 via-sky-900 to-indigo-950 text-white",
            accent: "text-sky-300",
            border: "border-sky-500/30",
            badgeBg: "bg-sky-500/20",
            badgeText: "text-sky-200"
        };
    }
    if (s.includes("hdfc")) {
        return {
            gradient: "from-blue-950 via-slate-900 to-red-950 text-white",
            accent: "text-red-400",
            border: "border-red-500/30",
            badgeBg: "bg-red-500/20",
            badgeText: "text-red-200"
        };
    }
    if (s.includes("icici")) {
        return {
            gradient: "from-amber-950 via-orange-950 to-red-950 text-white",
            accent: "text-orange-300",
            border: "border-orange-500/30",
            badgeBg: "bg-orange-500/20",
            badgeText: "text-orange-200"
        };
    }
    if (s.includes("baroda") || s.includes("bob")) {
        return {
            gradient: "from-orange-900 via-amber-900 to-slate-950 text-white",
            accent: "text-amber-300",
            border: "border-orange-500/30",
            badgeBg: "bg-orange-500/20",
            badgeText: "text-orange-200"
        };
    }
    if (s.includes("axis")) {
        return {
            gradient: "from-rose-950 via-red-950 to-neutral-900 text-white",
            accent: "text-rose-300",
            border: "border-rose-500/30",
            badgeBg: "bg-rose-500/20",
            badgeText: "text-rose-200"
        };
    }
    if (s.includes("kotak")) {
        return {
            gradient: "from-red-950 via-slate-900 to-rose-950 text-white",
            accent: "text-red-300",
            border: "border-red-500/30",
            badgeBg: "bg-red-500/20",
            badgeText: "text-red-200"
        };
    }
    if (s.includes("punjab") || s.includes("pnb")) {
        return {
            gradient: "from-yellow-950 via-amber-900 to-rose-950 text-white",
            accent: "text-amber-300",
            border: "border-amber-500/30",
            badgeBg: "bg-amber-500/20",
            badgeText: "text-amber-200"
        };
    }
    if (s.includes("cash")) {
        return {
            gradient: "from-emerald-950 via-teal-950 to-slate-900 text-white",
            accent: "text-emerald-300",
            border: "border-emerald-500/30",
            badgeBg: "bg-emerald-500/20",
            badgeText: "text-emerald-200"
        };
    }

    // Default premium slate theme
    return {
        gradient: "from-slate-900 via-slate-850 to-slate-950 text-white",
        accent: "text-indigo-300",
        border: "border-slate-700/50",
        badgeBg: "bg-primary/20",
        badgeText: "text-primary-foreground"
    };
}
