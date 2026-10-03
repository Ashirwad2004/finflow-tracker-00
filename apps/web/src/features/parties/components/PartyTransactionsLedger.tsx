import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    FileText,
    Plus,
    Edit,
    ArrowDownLeft,
    ArrowUpRight,
    Eye,
    MoreVertical,
    Download,
    Users,
} from "lucide-react";
import { Party } from "../types";
import { PartyLedgerMetrics } from "../lib/partyLedgerCalculations";

interface PartyTransactionsLedgerProps {
    activeParty: Party | null;
    activePartyMetrics: PartyLedgerMetrics;
    activePartyTransactions: any[];
    activeTab: "all" | "sales" | "purchases";
    setActiveTab: (tab: "all" | "sales" | "purchases") => void;
    formatCurrency: (amount: number) => string;
    onCreateInvoiceForParty: (party: Party) => void;
    onEditClick: (party: Party) => void;
    onOpenUniversalPayment: (type: "in" | "out", billId?: string) => void;
    onViewPartyVoucher: (txn: any) => void;
    onPreviewInvoicePDF: (sale: any) => void;
    onDownloadInvoicePDF: (sale: any) => void;
    onPreviewPurchasePDF: (purchase: any) => void;
    onDownloadPurchasePDF: (purchase: any) => void;
}

export const PartyTransactionsLedger: React.FC<PartyTransactionsLedgerProps> = ({
    activeParty,
    activePartyMetrics,
    activePartyTransactions,
    activeTab,
    setActiveTab,
    formatCurrency,
    onCreateInvoiceForParty,
    onEditClick,
    onOpenUniversalPayment,
    onViewPartyVoucher,
    onPreviewInvoicePDF,
    onDownloadInvoicePDF,
    onPreviewPurchasePDF,
    onDownloadPurchasePDF,
}) => {
    if (!activeParty) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-base font-bold text-slate-800 dark:text-white">No Party Selected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Select a party from the left directory list to view their complete contact details, financial statement, and transaction history on this screen.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Balance Summary Cards - Responsive & Clean */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 pb-0 shrink-0">
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate block">Total Invoiced / Billed</p>
                    <p className="text-xs sm:text-sm lg:text-base font-black font-mono text-slate-900 dark:text-white mt-0.5 truncate block" title={formatCurrency(activePartyMetrics.totalSalesAmount + activePartyMetrics.totalPurchasesAmount)}>
                        {formatCurrency(activePartyMetrics.totalSalesAmount + activePartyMetrics.totalPurchasesAmount)}
                    </p>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs overflow-hidden">
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate block">Total Collected / Paid</p>
                    <p className="text-xs sm:text-sm lg:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate block" title={formatCurrency(activePartyMetrics.totalSalesPaid + activePartyMetrics.totalPurchasesPaid)}>
                        {formatCurrency(activePartyMetrics.totalSalesPaid + activePartyMetrics.totalPurchasesPaid)}
                    </p>
                </div>

                <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs overflow-hidden ${
                    activePartyMetrics.receivable > activePartyMetrics.payable
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
                        : activePartyMetrics.payable > activePartyMetrics.receivable
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
                }`}>
                    <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate block ${
                        activePartyMetrics.receivable > activePartyMetrics.payable
                            ? 'text-amber-600 dark:text-amber-400'
                            : activePartyMetrics.payable > activePartyMetrics.receivable
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                        {activePartyMetrics.receivable > activePartyMetrics.payable
                            ? "Balance to Collect (Dr)"
                            : activePartyMetrics.payable > activePartyMetrics.receivable
                            ? "Balance to Pay (Cr)"
                            : "Settled / Cleared"}
                    </p>
                    <p className={`text-xs sm:text-sm lg:text-base font-black font-mono mt-0.5 truncate block ${
                        activePartyMetrics.receivable > activePartyMetrics.payable
                            ? 'text-amber-700 dark:text-amber-300'
                            : activePartyMetrics.payable > activePartyMetrics.receivable
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                    }`} title={formatCurrency(Math.abs(activePartyMetrics.receivable - activePartyMetrics.payable))}>
                        {formatCurrency(
                            Math.abs(activePartyMetrics.receivable - activePartyMetrics.payable)
                        )}
                    </p>
                </div>
            </div>

            {/* Transaction History & Ledger Table */}
            <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
                                activeTab === "all"
                                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            All ({activePartyMetrics.totalRecords})
                        </button>
                        <button
                            onClick={() => setActiveTab("sales")}
                            className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
                                activeTab === "sales"
                                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            Sales ({activePartyMetrics.partySales.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("purchases")}
                            className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
                                activeTab === "purchases"
                                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            Purchases ({activePartyMetrics.partyPurchases.length})
                        </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Showing {activePartyTransactions.length} records
                    </span>
                </div>

                {/* Scrollable Transactions List / Table */}
                <div className="flex-1 overflow-y-auto min-h-0 pt-2 custom-scrollbar">
                    {activePartyTransactions.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1.5" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No transactions recorded yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Any invoices or bills created for this party will be tracked live right here.</p>
                            <Button
                                size="sm"
                                onClick={() => onCreateInvoiceForParty(activeParty)}
                                className="bg-primary text-white text-xs font-bold h-7 px-2.5"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Create First Invoice
                            </Button>
                        </div>
                    ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs">
                            <table className="w-full text-left border-collapse min-w-[620px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-2.5 py-2 whitespace-nowrap">Date</th>
                                        <th className="px-2.5 py-2 whitespace-nowrap">Document #</th>
                                        <th className="px-2 py-2 whitespace-nowrap">Type</th>
                                        <th className="px-2.5 py-2 text-right whitespace-nowrap">Total Amount</th>
                                        <th className="px-2.5 py-2 text-right whitespace-nowrap">Paid Amount</th>
                                        <th className="px-2.5 py-2 text-right whitespace-nowrap">Balance Due</th>
                                        <th className="px-2 py-2 text-center whitespace-nowrap">Status</th>
                                        <th className="px-2.5 py-2 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {activePartyTransactions.map((txn: any) => {
                                        const isSale = txn.docType === 'sale';
                                        const isPurchase = txn.docType === 'purchase';
                                        const isReceipt = txn.docType === 'receipt';
                                        const isPayment = txn.docType === 'payment';
                                        const isOpening = txn.docType === 'opening_balance';
                                        const isFullyPaid = isOpening ? false : (txn.status === 'paid' || txn.balanceDue <= 0);
                                        const isPartial = isOpening ? false : (txn.status === 'partial' || (txn.paid > 0 && txn.balanceDue > 0));

                                        return (
                                            <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-2.5 py-2 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">
                                                    {txn.date ? (isNaN(new Date(txn.date).getTime()) ? txn.date : format(new Date(txn.date), "dd MMM yyyy")) : "-"}
                                                </td>
                                                <td className="px-2.5 py-2 font-bold text-slate-900 dark:text-white whitespace-nowrap text-[11px] sm:text-xs">
                                                    {isOpening ? "OPENING" : `#${txn.docNumber}`}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                                                        isOpening
                                                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                                            : isReceipt
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : isPayment
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                            : isSale
                                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                    }`}>
                                                        {isOpening ? 'Opening' : isReceipt ? 'Payment In' : isPayment ? 'Payment Out' : isSale ? 'Sale' : 'Purchase'}
                                                    </span>
                                                </td>
                                                <td className="px-2.5 py-2 text-right font-black font-mono text-slate-900 dark:text-white whitespace-nowrap text-[11px] sm:text-xs">
                                                    {formatCurrency(txn.total)}
                                                </td>
                                                <td className="px-2.5 py-2 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-[11px] sm:text-xs">
                                                    {isOpening ? "-" : formatCurrency(txn.paid)}
                                                </td>
                                                <td className="px-2.5 py-2 text-right whitespace-nowrap font-mono">
                                                    {txn.balanceDue > 0 ? (
                                                        <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs">
                                                            {formatCurrency(txn.balanceDue)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 font-medium text-[11px] sm:text-xs">₹0</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    {isOpening ? (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                                                            txn.isReceivable
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                                                        }`}>
                                                            {txn.isReceivable ? 'To Collect' : 'To Pay'}
                                                        </span>
                                                    ) : (isReceipt || isPayment) ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900">
                                                            Settled
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${
                                                            isFullyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900' :
                                                            isPartial ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900' :
                                                            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                                                        }`}>
                                                            {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2.5 py-2 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Opening Balance row: Quick edit */}
                                                        {isOpening && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onEditClick(activeParty)}
                                                                className="h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1"
                                                                title="Edit party opening balance"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                <span>Edit</span>
                                                            </Button>
                                                        )}

                                                        {/* Quick Multi-Bill Settlement Buttons */}
                                                        {!isOpening && isSale && txn.balanceDue > 0 && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onOpenUniversalPayment("in", txn.raw.id)}
                                                                className="h-6 sm:h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-bold shadow-xs flex items-center gap-0.5"
                                                                title={`Receive payment for #${txn.docNumber}`}
                                                            >
                                                                <ArrowDownLeft className="w-3 h-3" />
                                                                <span>Receive</span>
                                                            </Button>
                                                        )}

                                                        {!isOpening && isPurchase && txn.balanceDue > 0 && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onOpenUniversalPayment("out", txn.raw.id)}
                                                                className="h-6 sm:h-7 px-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] sm:text-[11px] font-bold shadow-xs flex items-center gap-0.5"
                                                                title={`Pay bill #${txn.docNumber}`}
                                                            >
                                                                <ArrowUpRight className="w-3 h-3" />
                                                                <span>Pay</span>
                                                            </Button>
                                                        )}

                                                        {/* View Voucher / Receipt Button for Payment In / Out */}
                                                        {(isReceipt || isPayment) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onViewPartyVoucher(txn)}
                                                                className="h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 border-slate-300 dark:border-slate-700"
                                                                title={isReceipt ? "View Payment Receipt" : "View Payment Voucher"}
                                                            >
                                                                <Eye className="w-3 h-3 text-slate-500" />
                                                                <span>Receipt</span>
                                                            </Button>
                                                        )}

                                                        {/* Sleek Document Actions Menu */}
                                                        {!isOpening && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                                                        title="Document Actions"
                                                                    >
                                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-36 text-xs">
                                                                    {(isReceipt || isPayment) ? (
                                                                        <DropdownMenuItem
                                                                            onClick={() => onViewPartyVoucher(txn)}
                                                                            className="cursor-pointer py-1.5"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                                            <span>View Receipt</span>
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <>
                                                                            <DropdownMenuItem
                                                                                onClick={() => isSale ? onPreviewInvoicePDF(txn.raw) : onPreviewPurchasePDF(txn.raw)}
                                                                                className="cursor-pointer py-1.5"
                                                                            >
                                                                                <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                                                <span>View PDF</span>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => isSale ? onDownloadInvoicePDF(txn.raw) : onDownloadPurchasePDF(txn.raw)}
                                                                                className="cursor-pointer py-1.5"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                                                <span>Download</span>
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
