import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export interface SettlementTarget {
    id: string;
    type: "sale" | "purchase";
    partyName: string;
    docNumber: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
}

interface PartySettlementDialogProps {
    settlementTarget: SettlementTarget | null;
    onClose: () => void;
    paymentAmount: string;
    setPaymentAmount: (amount: string) => void;
    paymentMethod: string;
    setPaymentMethod: (method: string) => void;
    paymentDate: string;
    setPaymentDate: (date: string) => void;
    paymentNotes: string;
    setPaymentNotes: (notes: string) => void;
    isSubmittingPayment: boolean;
    onSaveSettlement: () => void;
    formatCurrency: (amount: number) => string;
}

export const PartySettlementDialog: React.FC<PartySettlementDialogProps> = ({
    settlementTarget,
    onClose,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDate,
    setPaymentDate,
    paymentNotes,
    setPaymentNotes,
    isSubmittingPayment,
    onSaveSettlement,
    formatCurrency,
}) => {
    return (
        <Dialog open={!!settlementTarget} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[480px]">
                {settlementTarget && (() => {
                    const isSale = settlementTarget.type === "sale";
                    const currentPaid = Number(settlementTarget.amountPaid || 0);
                    const currentBal = Number(settlementTarget.balanceDue != null ? settlementTarget.balanceDue : Math.max(0, settlementTarget.totalAmount - currentPaid));
                    const enteredAmount = Number(paymentAmount) || 0;
                    const projectedBal = Math.max(0, Math.round((currentBal - enteredAmount) * 100) / 100);
                    const isFullySettled = enteredAmount >= currentBal;

                    return (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {isSale ? (
                                        <>
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                <ArrowDownLeft className="w-4 h-4" />
                                            </div>
                                            <span>Receive Payment (Customer Collection)</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </div>
                                            <span>Pay Supplier / Vendor</span>
                                        </>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    {isSale ? (
                                        <>
                                            Record collection received from <strong className="text-foreground">{settlementTarget.partyName}</strong> for invoice <strong className="text-foreground">{settlementTarget.docNumber}</strong>.
                                        </>
                                    ) : (
                                        <>
                                            Record payment made to <strong className="text-foreground">{settlementTarget.partyName}</strong> for purchase bill <strong className="text-foreground">{settlementTarget.docNumber}</strong>.
                                        </>
                                    )}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                {/* Financial Metric Cards */}
                                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            {isSale ? "Total Invoice" : "Total Bill"}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 truncate">
                                            {formatCurrency(settlementTarget.totalAmount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                            {isSale ? "Received" : "Paid"}
                                        </p>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                                            {formatCurrency(currentPaid)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isSale ? "text-amber-500" : "text-rose-500"}`}>
                                            {isSale ? "To Collect" : "To Pay"}
                                        </p>
                                        <p className={`text-sm font-bold mt-0.5 truncate ${isSale ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {formatCurrency(currentBal)}
                                        </p>
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {isSale ? "Amount Received / Collected" : "Amount Paid"}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentAmount(String(currentBal))}
                                            className="text-xs font-semibold text-primary hover:underline"
                                        >
                                            {isSale ? "Receive Full Due" : "Pay Full Due"} ({formatCurrency(currentBal)})
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max={currentBal}
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-10 px-3 text-base font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                        <span>{isSale ? "Remaining to Collect:" : "Remaining to Pay:"}</span>
                                        <span className={`font-semibold ${projectedBal === 0 ? 'text-emerald-600' : isSale ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {formatCurrency(projectedBal)} {isFullySettled ? '(Fully Settled)' : '(Partial)'}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Method & Date */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Payment Method
                                        </label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="upi">UPI / QR</option>
                                            <option value="bank_transfer">Bank Transfer / NEFT</option>
                                            <option value="card">Debit / Credit Card</option>
                                            <option value="cheque">Cheque</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Payment Date
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {/* Notes / Reference */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {isSale ? "Collection Reference / Notes" : "Payment Reference / Notes"}
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder={isSale ? "e.g. UPI txn ID, Cheque #, or receipt note" : "e.g. Bank IMPS/NEFT UTR, Cheque #, or payment note"}
                                        className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={isSubmittingPayment}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onSaveSettlement}
                                    disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                                    className={isSale ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "bg-rose-600 hover:bg-rose-700 text-white font-bold"}
                                >
                                    {isSubmittingPayment ? "Recording..." : isSale ? `Receive ${paymentAmount ? formatCurrency(Number(paymentAmount)) : ""}` : `Pay ${paymentAmount ? formatCurrency(Number(paymentAmount)) : ""}`}
                                </Button>
                            </DialogFooter>
                        </>
                    );
                })()}
            </DialogContent>
        </Dialog>
    );
};
