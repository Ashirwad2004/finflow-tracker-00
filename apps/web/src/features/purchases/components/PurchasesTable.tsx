import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { isRecordOverdue } from "@/core/utils/overdue";
import {
    Filter,
    MoreHorizontal,
    Printer,
    Eye,
    Download,
    Share2,
    Pencil,
    Trash2,
    ScrollText,
    ReceiptIndianRupee,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableLoadingRows } from "@/components/shared/PageStates";
import { Purchase } from "../types";
import { formatDateSafe } from "../hooks/usePurchasesPageCalculations";

export type PurchaseFilterStatus = 'all' | 'paid' | 'partial' | 'pending' | 'overdue';
export type PurchaseSortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

interface PurchasesTableProps {
    purchases: Purchase[];
    isLoading: boolean;
    searchTerm: string;
    filterStatus: PurchaseFilterStatus;
    setFilterStatus: (status: PurchaseFilterStatus) => void;
    sortBy: PurchaseSortOption;
    setSortBy: (sort: PurchaseSortOption) => void;
    onEdit: (purchase: Purchase) => void;
    onPrint: (purchase: Purchase) => void;
    onPreview: (purchase: Purchase) => void;
    onDownload: (purchase: Purchase) => void;
    onShare: (purchase: Purchase) => void;
    onDelete: (purchase: Purchase) => void;
    onOpenRecordPayment: (purchase: Purchase) => void;
    onOpenTranscript: (purchase: Purchase) => void;
}

export const PurchasesTable: React.FC<PurchasesTableProps> = ({
    purchases,
    isLoading,
    searchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    onEdit,
    onPrint,
    onPreview,
    onDownload,
    onShare,
    onDelete,
    onOpenRecordPayment,
    onOpenTranscript,
}) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { formatCurrency } = useCurrency();

    const sortedAndFilteredPurchases = useMemo(() => {
        const lowerSearch = searchTerm.trim().toLowerCase();
        const result = purchases.filter((purchase) => {
            const matchesSearch =
                !lowerSearch ||
                (purchase.vendor_name && purchase.vendor_name.toLowerCase().includes(lowerSearch)) ||
                (purchase.bill_number && purchase.bill_number.toLowerCase().includes(lowerSearch));

            let matchesFilter = filterStatus === 'all';
            const amtPaid = Number(purchase.amount_paid || 0);
            const balDue = Number(
                purchase.balance_due != null
                    ? purchase.balance_due
                    : Math.max(0, purchase.total_amount - amtPaid)
            );
            const isSettled = balDue <= 0.001 && purchase.total_amount > 0;
            const isOverdue = isRecordOverdue(purchase);

            if (filterStatus === 'paid') matchesFilter = isSettled || purchase.status === 'paid';
            if (filterStatus === 'partial') matchesFilter = (amtPaid > 0 && balDue > 0) || purchase.status === 'partial';
            if (filterStatus === 'overdue') matchesFilter = isOverdue && balDue > 0;
            if (filterStatus === 'pending') matchesFilter = balDue > 0 && !isOverdue && amtPaid === 0;

            return matchesFilter && matchesSearch;
        });

        return result.sort((a, b) => {
            if (sortBy === 'date-desc') {
                return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
            }
            if (sortBy === 'date-asc') {
                return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
            }
            if (sortBy === 'amount-desc') {
                return Number(b.total_amount || 0) - Number(a.total_amount || 0);
            }
            if (sortBy === 'amount-asc') {
                return Number(a.total_amount || 0) - Number(b.total_amount || 0);
            }
            return 0;
        });
    }, [purchases, searchTerm, filterStatus, sortBy]);

    const rowVirtualizer = useVirtualizer({
        count: sortedAndFilteredPurchases.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 65,
        overscan: 10,
    });

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 border-t-0 dark:bg-slate-800/50 gap-2">
                <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full">
                    {(['all', 'paid', 'partial', 'pending', 'overdue'] as PurchaseFilterStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-md shadow-2xs capitalize transition-all whitespace-nowrap ${
                                filterStatus === status
                                    ? 'bg-white dark:bg-slate-800 text-primary'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="Sort Purchases"
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <DropdownMenuItem
                            onClick={() => setSortBy('date-desc')}
                            className={`cursor-pointer py-2 ${sortBy === 'date-desc' ? 'font-bold text-primary' : ''}`}
                        >
                            Date: Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSortBy('date-asc')}
                            className={`cursor-pointer py-2 ${sortBy === 'date-asc' ? 'font-bold text-primary' : ''}`}
                        >
                            Date: Oldest First
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSortBy('amount-desc')}
                            className={`cursor-pointer py-2 ${sortBy === 'amount-desc' ? 'font-bold text-primary' : ''}`}
                        >
                            Amount: High to Low
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSortBy('amount-asc')}
                            className={`cursor-pointer py-2 ${sortBy === 'amount-asc' ? 'font-bold text-primary' : ''}`}
                        >
                            Amount: Low to High
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Mobile Touch-Friendly Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[65vh]">
                {isLoading ? (
                    <div className="p-6 text-center text-slate-400 text-xs">Loading purchase bills...</div>
                ) : sortedAndFilteredPurchases.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">No purchase bills matching your criteria.</div>
                ) : (
                    sortedAndFilteredPurchases.map((purchase) => {
                        const amtPaid = Number(purchase.amount_paid || 0);
                        const balDue = Number(
                            purchase.balance_due != null
                                ? purchase.balance_due
                                : Math.max(0, purchase.total_amount - amtPaid)
                        );
                        const isSettled = balDue <= 0.001 && purchase.total_amount > 0;

                        return (
                            <div
                                key={purchase.id}
                                onClick={() => onEdit(purchase)}
                                className="p-3.5 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                            {purchase.bill_number || `#${purchase.id.substring(0, 6)}`}
                                        </span>
                                        {isSettled || purchase.status === 'paid' ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                                Paid
                                            </span>
                                        ) : amtPaid > 0 && balDue > 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200">
                                                Partial
                                            </span>
                                        ) : isRecordOverdue(purchase) ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                                                Overdue
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                                                Unpaid
                                            </span>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            {balDue > 0 && (
                                                <DropdownMenuItem
                                                    onClick={() => onOpenRecordPayment(purchase)}
                                                    className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                                                >
                                                    <ReceiptIndianRupee className="w-4 h-4 mr-2" /> Record Payment Out
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => onOpenTranscript(purchase)} className="cursor-pointer">
                                                <ScrollText className="w-4 h-4 mr-2 text-slate-500" /> Payment Transcript
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onPrint(purchase)}>
                                                <Printer className="w-4 h-4 mr-2" /> Print Bill
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onPreview(purchase)}>
                                                <Eye className="w-4 h-4 mr-2" /> Preview PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDownload(purchase)}>
                                                <Download className="w-4 h-4 mr-2" /> Download PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onShare(purchase)}>
                                                <Share2 className="w-4 h-4 mr-2" /> Share Bill
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onEdit(purchase)}>
                                                <Pencil className="w-4 h-4 mr-2" /> Edit Bill
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDelete(purchase)} className="text-red-500 hover:text-red-600 focus:text-red-600">
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete Bill
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                        {purchase.vendor_name}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">{formatDateSafe(purchase.date, "MMM dd, yyyy")}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block">Total Amount</span>
                                        <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(purchase.total_amount)}</span>
                                    </div>
                                    {balDue > 0 ? (
                                        <div className="text-right">
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Balance Due</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(balDue)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <span className="text-[10px] text-emerald-600 block">Payment</span>
                                            <span className="font-bold text-emerald-600">Fully Settled</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop Virtualized Table (>= 768px) */}
            <div className="hidden md:block overflow-auto max-h-[65vh] w-full" ref={tableContainerRef}>
                <table className="w-full text-left border-collapse min-w-[1050px] relative">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <th className="px-4 py-2.5">Bill Ref</th>
                            <th className="px-4 py-2.5">Vendor</th>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5 text-right">Tax</th>
                            <th className="px-4 py-2.5 text-right">Total Amount</th>
                            <th className="px-4 py-2.5 text-right">Paid</th>
                            <th className="px-4 py-2.5 text-right">Balance Due</th>
                            <th className="px-4 py-2.5 text-center">Status</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoading ? (
                            <TableLoadingRows cols={9} rows={5} />
                        ) : sortedAndFilteredPurchases.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                    No purchases matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr>
                                        <td colSpan={9} style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                                    </tr>
                                )}
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const purchase = sortedAndFilteredPurchases[virtualRow.index];
                                    const amtPaid = Number(purchase.amount_paid || 0);
                                    const balDue = Number(
                                        purchase.balance_due != null
                                            ? purchase.balance_due
                                            : Math.max(0, purchase.total_amount - amtPaid)
                                    );
                                    const isSettled = balDue <= 0.001 && purchase.total_amount > 0;

                                    return (
                                        <tr
                                            key={purchase.id}
                                            onClick={() => onEdit(purchase)}
                                            className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {purchase.bill_number ? purchase.bill_number : `#${purchase.id.substring(0, 6)}`}
                                                    </p>
                                                    {purchase.bill_number?.startsWith("PAY-") && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 uppercase tracking-wider">
                                                            Payment Out
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{purchase.items?.length || 0} items</p>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        {purchase.vendor_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                                        {purchase.vendor_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                                <div>{formatDateSafe(purchase.date, "MMM dd, yyyy")}</div>
                                                {purchase.due_date && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        Due: {formatDateSafe(purchase.due_date, "MMM dd")}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                                                {purchase.tax_amount ? formatCurrency(purchase.tax_amount) : formatCurrency(0)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white text-right">
                                                {formatCurrency(purchase.total_amount)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                                {formatCurrency(amtPaid)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-right">
                                                {balDue > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(purchase);
                                                        }}
                                                        className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors block ml-auto"
                                                        title="Click to Record Payment Out"
                                                    >
                                                        {formatCurrency(balDue)}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 font-semibold">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {isSettled || purchase.status === 'paid' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenTranscript(purchase);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
                                                        title="Paid — Click to view Payment Ledger"
                                                    >
                                                        Paid
                                                    </button>
                                                ) : amtPaid > 0 && amtPaid < purchase.total_amount ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(purchase);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 hover:scale-105 transition-transform"
                                                        title={`Partial (Due: ${formatCurrency(balDue)}) — Click to Pay`}
                                                    >
                                                        Partial
                                                    </button>
                                                ) : isRecordOverdue(purchase) && amtPaid === 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(purchase);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:scale-105 transition-transform"
                                                        title="Overdue — Click to Pay"
                                                    >
                                                        Overdue
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(purchase);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
                                                        title="Unpaid — Click to Pay"
                                                    >
                                                        Unpaid
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                    {balDue > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onOpenRecordPayment(purchase);
                                                            }}
                                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-all mr-1"
                                                            title="Record Payment Out"
                                                        >
                                                            <ReceiptIndianRupee className="w-3 h-3" />
                                                            <span>Payment Out</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPrint(purchase);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
                                                        title="Print Bill"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            {balDue > 0 && (
                                                                <DropdownMenuItem
                                                                    onClick={() => onOpenRecordPayment(purchase)}
                                                                    className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                                                                >
                                                                    <ReceiptIndianRupee className="w-4 h-4 mr-2 text-indigo-500" />
                                                                    Record Payment Out
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => onOpenTranscript(purchase)}
                                                                className="cursor-pointer"
                                                            >
                                                                <ScrollText className="w-4 h-4 mr-2 text-slate-500" />
                                                                Payment Transcript / Ledger
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onPrint(purchase)}>
                                                                <Printer className="w-4 h-4 mr-2" />
                                                                Print Bill
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onPreview(purchase)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Preview PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onDownload(purchase)}>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onShare(purchase)}>
                                                                <Share2 className="w-4 h-4 mr-2" />
                                                                Share Bill
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onEdit(purchase)}>
                                                                <Pencil className="w-4 h-4 mr-2" />
                                                                Edit Bill
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => onDelete(purchase)}
                                                                className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Bill
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            style={{
                                                height: `${
                                                    rowVirtualizer.getTotalSize() -
                                                    rowVirtualizer.getVirtualItems()[
                                                        rowVirtualizer.getVirtualItems().length - 1
                                                    ].end
                                                }px`,
                                            }}
                                        />
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
