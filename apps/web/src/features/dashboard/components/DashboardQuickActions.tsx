import React from "react";
import { Wallet, Zap, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/lib/utils";

interface DashboardQuickActionsProps {
    pendingLentTotal: number;
    pendingBorrowedTotal: number;
    netOutstanding: number;
    formatCurrency: (value: number) => string;
    onAddExpense: () => void;
    onLendMoney: () => void;
    onRecordDebt: () => void;
    onShareBill: () => void;
}

export function DashboardQuickActions({
    pendingLentTotal,
    pendingBorrowedTotal,
    netOutstanding,
    formatCurrency,
    onAddExpense,
    onLendMoney,
    onRecordDebt,
    onShareBill,
}: DashboardQuickActionsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Cashflow Summary Card */}
            <div className="lg:col-span-2 p-6 bg-white border dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-indigo-500" /> Outstanding Balances
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 font-medium">Summary of your active loans and payables</p>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Lent</span>
                            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatCurrency(pendingLentTotal)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Borrowed</span>
                            <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatCurrency(pendingBorrowedTotal)}
                            </p>
                        </div>
                        <div className="space-y-1 border-l pl-4 border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Net Status</span>
                            <p className={cn("text-lg sm:text-xl font-bold tabular-nums", netOutstanding >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                {netOutstanding >= 0 ? "+" : ""}{formatCurrency(netOutstanding)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-6 bg-white border dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-500 animate-pulse" /> Quick Actions
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 font-medium">Frequently used commands</p>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={onAddExpense}
                            variant="outline"
                            className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/30 text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 text-violet-500" /> Add Expense
                        </Button>
                        <Button
                            onClick={onLendMoney}
                            variant="outline"
                            className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 text-emerald-500" /> Lend Money
                        </Button>
                        <Button
                            onClick={onRecordDebt}
                            variant="outline"
                            className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 text-rose-500" /> Record Debt
                        </Button>
                        <Button
                            onClick={onShareBill}
                            variant="outline"
                            className="flex items-center justify-start gap-2 h-10 px-3 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 text-xs font-semibold"
                        >
                            <Users className="w-4 h-4 text-blue-500" /> Share Bill
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
