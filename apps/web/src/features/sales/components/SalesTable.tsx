import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import {
    Filter,
    MoreHorizontal,
    Printer,
    Eye,
    Download,
    Share2,
    MessageCircle,
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
import { Sale } from "../types";
import { formatDateSafe } from "../hooks/useSalesCalculations";

export type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue' | 'draft' | 'partial';
export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

interface SalesTableProps {
    invoices: Sale[];
    isLoading: boolean;
    searchTerm: string;
    filterStatus: FilterStatus;
    setFilterStatus: (status: FilterStatus) => void;
    sortBy: SortOption;
    setSortBy: (sort: SortOption) => void;
    onEdit: (invoice: Sale) => void;
    onPrint: (invoice: Sale) => void;
    onPreview: (invoice: Sale) => void;
    onDownload: (invoice: Sale) => void;
    onShare: (invoice: Sale) => void;
    onWhatsApp: (invoice: Sale) => void;
    onGenerateEInvoice: (invoice: Sale) => void;
    onDelete: (invoice: Sale) => void;
    onOpenRecordPayment: (invoice: Sale) => void;
    onOpenTranscript: (invoice: Sale) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
    invoices,
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
    onWhatsApp,
    onGenerateEInvoice,
    onDelete,
    onOpenRecordPayment,
    onOpenTranscript,
}) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { formatCurrency } = useCurrency();

    const sortedAndFilteredInvoices = useMemo(() => {
        const lowerSearch = searchTerm.trim().toLowerCase();
        const filtered = invoices.filter((invoice) => {
            const matchesSearch =
                !lowerSearch ||
                (invoice.customer_name && invoice.customer_name.toLowerCase().includes(lowerSearch)) ||
                (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(lowerSearch));
            const matchesFilter = filterStatus === 'all' || invoice.status === filterStatus;
            return matchesFilter && matchesSearch;
        });

        if (filtered.length <= 1) return filtered;

        return [...filtered].sort((a, b) => {
            if (sortBy === 'date-desc') {
                return (b.date || "").localeCompare(a.date || "");
            }
            if (sortBy === 'date-asc') {
                return (a.date || "").localeCompare(b.date || "");
            }
            if (sortBy === 'amount-desc') {
                return Number(b.total_amount || 0) - Number(a.total_amount || 0);
            }
            if (sortBy === 'amount-asc') {
                return Number(a.total_amount || 0) - Number(b.total_amount || 0);
            }
            return 0;
        });
    }, [invoices, searchTerm, filterStatus, sortBy]);

    const rowVirtualizer = useVirtualizer({
        count: sortedAndFilteredInvoices.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 80,
        overscan: 10,
    });

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 border-t-0 dark:bg-slate-800/50">
                <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full">
                    {(['all', 'paid', 'partial', 'pending', 'overdue'] as FilterStatus[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm capitalize transition-all whitespace-nowrap ${
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
                            title="Sort Invoices"
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

            <div className="overflow-auto flex-1 min-h-0 w-full" ref={tableContainerRef}>
                <table className="w-full text-left border-collapse min-w-[1050px] relative">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <th className="px-4 py-2.5">Invoice</th>
                            <th className="px-4 py-2.5">Customer</th>
                            <th className="px-4 py-2.5">Issue Date</th>
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
                            <TableLoadingRows cols={9} rows={6} />
                        ) : sortedAndFilteredInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                    No invoices matching your criteria.
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
                                    const invoice = sortedAndFilteredInvoices[virtualRow.index];
                                    const currentPaid = Number(invoice.amount_paid || 0);
                                    const balDue = Number(
                                        invoice.balance_due != null
                                            ? invoice.balance_due
                                            : Math.max(0, invoice.total_amount - currentPaid)
                                    );
                                    const isFullyPaid = balDue <= 0.001 && invoice.total_amount > 0;

                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {invoice.invoice_number}
                                                    </p>
                                                    {((invoice as any).document_type === 'receipt' ||
                                                        invoice.invoice_number?.startsWith('REC-')) && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 uppercase tracking-wider">
                                                            Receipt
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {invoice.items?.length || 0} items
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                        {invoice.customer_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                                        {invoice.customer_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                                <div>{formatDateSafe(invoice.date, "MMM dd, yyyy")}</div>
                                                {invoice.due_date && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        Due: {formatDateSafe(invoice.due_date, "MMM dd")}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                                                {invoice.tax_amount ? formatCurrency(invoice.tax_amount) : formatCurrency(0)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-extrabold text-slate-900 dark:text-white text-right">
                                                {formatCurrency(invoice.total_amount)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                                {formatCurrency(currentPaid)}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-right">
                                                {balDue > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(invoice);
                                                        }}
                                                        className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-colors block ml-auto"
                                                        title="Click to Record Payment In"
                                                    >
                                                        {formatCurrency(balDue)}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 font-semibold">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {isFullyPaid || invoice.status === 'paid' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenTranscript(invoice);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
                                                        title="Paid — Click to view Payment Ledger"
                                                    >
                                                        Paid
                                                    </button>
                                                ) : invoice.status === 'partial' ||
                                                  (currentPaid > 0 && currentPaid < invoice.total_amount) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(invoice);
                                                        }}
                                                        className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform cursor-pointer mx-auto"
                                                        title="Click to Receive Payment"
                                                    >
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                                            Partial
                                                        </span>
                                                    </button>
                                                ) : invoice.status === 'overdue' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(invoice);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:scale-105 transition-transform"
                                                        title="Overdue — Click to Receive Payment"
                                                    >
                                                        Overdue
                                                    </button>
                                                ) : invoice.status === 'pending' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenRecordPayment(invoice);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
                                                        title="Pending — Click to Receive Payment"
                                                    >
                                                        Pending
                                                    </button>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                        Draft
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                    {balDue > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onOpenRecordPayment(invoice);
                                                            }}
                                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-all mr-1"
                                                            title="Record Payment In"
                                                        >
                                                            <ReceiptIndianRupee className="w-3.5 h-3.5" />
                                                            <span>Payment In</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPrint(invoice);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
                                                        title="Print Invoice"
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
                                                                    onClick={() => onOpenRecordPayment(invoice)}
                                                                    className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                                                                >
                                                                    <ReceiptIndianRupee className="w-4 h-4 mr-2 text-emerald-500" />
                                                                    Receive Payment
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => onOpenTranscript(invoice)}
                                                                className="cursor-pointer"
                                                            >
                                                                <ScrollText className="w-4 h-4 mr-2 text-slate-500" />
                                                                Payment Transcript / Ledger
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onPrint(invoice)}>
                                                                <Printer className="w-4 h-4 mr-2" />
                                                                Print Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onPreview(invoice)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Preview PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onDownload(invoice)}>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => onShare(invoice)}>
                                                                <Share2 className="w-4 h-4 mr-2" />
                                                                Share Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => onWhatsApp(invoice)}
                                                                className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                                                            >
                                                                <MessageCircle className="w-4 h-4 mr-2 text-emerald-500" />
                                                                Send via WhatsApp
                                                            </DropdownMenuItem>
                                                            {invoice.customer_gstin && invoice.customer_gstin.length === 15 && (
                                                                <DropdownMenuItem
                                                                    onClick={() => onGenerateEInvoice(invoice)}
                                                                    className="cursor-pointer py-2"
                                                                >
                                                                    <Download className="w-4 h-4 mr-2 text-blue-500" />
                                                                    E-Invoice JSON
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => onEdit(invoice)}>
                                                                <Pencil className="w-4 h-4 mr-2" />
                                                                Edit Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => onDelete(invoice)}
                                                                className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Invoice
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
