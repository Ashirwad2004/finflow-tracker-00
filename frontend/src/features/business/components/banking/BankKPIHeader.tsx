import React from "react";
import { Landmark, TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";

interface BankKPIHeaderProps {
    totalLiquidAssets: number;
    inflow30Days: number;
    outflow30Days: number;
    pendingChequesCount: number;
    pendingChequesAmount: number;
    unreconciledCount: number;
    onGoToReconciliation?: () => void;
    onGoToCheques?: () => void;
}

export const BankKPIHeader: React.FC<BankKPIHeaderProps> = ({
    totalLiquidAssets,
    inflow30Days,
    outflow30Days,
    pendingChequesCount,
    pendingChequesAmount,
    unreconciledCount,
    onGoToReconciliation,
    onGoToCheques
}) => {
    const netCashFlow = inflow30Days - outflow30Days;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Liquid Assets */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Landmark className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                        Total Liquid Assets
                    </span>
                    <span className="text-lg font-bold text-foreground font-mono truncate block">
                        ₹{totalLiquidAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* 30D Inflows (Credits) */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                        30D Inflows (CR)
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate block">
                        +₹{inflow30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* 30D Outflows (Debits) */}
            <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <TrendingDown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                        30D Outflows (DR)
                    </span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono truncate block">
                        -₹{outflow30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Cheques / PDCs in Transit */}
            <div 
                onClick={onGoToCheques}
                className="bg-card border border-border/80 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer hover:border-amber-500/50"
            >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                            Cheques in Transit
                        </span>
                        {pendingChequesCount > 0 && (
                            <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                {pendingChequesCount}
                            </span>
                        )}
                    </div>
                    <span className="text-lg font-bold text-foreground font-mono truncate block">
                        ₹{pendingChequesAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Reconciliation Status */}
            <div 
                onClick={onGoToReconciliation}
                className={cn(
                    "bg-card border p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer",
                    unreconciledCount > 0 
                        ? "border-amber-500/40 hover:border-amber-500" 
                        : "border-emerald-500/40 hover:border-emerald-500"
                )}
            >
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    unreconciledCount > 0 
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                    {unreconciledCount > 0 ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                        Reconciliation (BRS)
                    </span>
                    <span className={cn(
                        "text-sm font-bold truncate block",
                        unreconciledCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                        {unreconciledCount > 0 ? `${unreconciledCount} Unmatched` : "100% Reconciled"}
                    </span>
                </div>
            </div>
        </div>
    );
};
