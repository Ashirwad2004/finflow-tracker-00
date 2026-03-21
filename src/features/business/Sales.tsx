import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Search, MoreHorizontal, FileText, Download, Pencil, Filter, Plus, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Clock, Eye, Trash2, Share2, Settings2, Info } from "lucide-react";
import { CreateInvoiceDialog } from "@/features/invoices/CreateInvoiceDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format, isSameMonth } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSalesSettings } from "@/core/hooks/use-sales-settings";

export default function SalesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft'>('all');
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();
    const { settings, updateSetting, resetSettings } = useSalesSettings(user?.id);

    // Fetch Profile for Business Details
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    interface Sale {
        id: string;
        user_id: string;
        customer_name: string;
        customer_phone?: string;
        customer_email?: string;
        customer_gstin?: string;
        invoice_number: string;
        status: 'paid' | 'pending' | 'overdue' | 'draft';
        total_amount: number;
        subtotal?: number;
        tax_amount?: number;
        tax_rate?: number;
        discount_amount?: number;
        date: string;
        items: any[];
    }

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });
            if (error) throw error;
            return data as any as Sale[];
        },
        enabled: !!user
    });

    const handleEdit = (invoice: Sale) => {
        setEditingInvoice(invoice);
        setIsCreateOpen(true);
    };

    const handlePreview = async (invoice: Sale) => {
        const url = await generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: invoice.items || [],
            subtotal: invoice.subtotal || invoice.total_amount,
            discount_amount: invoice.discount_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate || 0,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        }, { action: 'preview' });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handleDownload = (invoice: Sale) => {
        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: invoice.items || [],
            subtotal: invoice.subtotal || invoice.total_amount,
            discount_amount: invoice.discount_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate || 0,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        }, { action: 'download' });
    };

    const handleShare = async (invoice: Sale) => {
        try {
            const url = await generateInvoicePDF({
                invoice_number: invoice.invoice_number,
                date: invoice.date,
                customer_name: invoice.customer_name,
                customer_phone: invoice.customer_phone,
                customer_email: invoice.customer_email,
                customer_gstin: invoice.customer_gstin,
                items: invoice.items || [],
                subtotal: invoice.subtotal || invoice.total_amount,
                discount_amount: invoice.discount_amount || 0,
                tax_amount: invoice.tax_amount || 0,
                total_amount: invoice.total_amount,
                tax_rate: invoice.tax_rate || 0,
                business_details: profile ? {
                    name: (profile as any).business_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone,
                    gst: (profile as any).gst_number,
                    logo_url: (profile as any).business_logo,
                    signature_url: (profile as any).signature_url
                } : undefined
            }, { action: 'preview' });

            if (url) {
                const response = await fetch(String(url));
                const blob = await response.blob();
                const file = new File([blob], `Invoice_${invoice.invoice_number}.pdf`, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Invoice ${invoice.invoice_number}`,
                        text: `Here is the invoice for ${invoice.customer_name}`
                    });
                } else {
                    const shareText = `Invoice ${invoice.invoice_number} for ${invoice.customer_name}. Total: ${formatCurrency(invoice.total_amount)}`;
                    await navigator.clipboard.writeText(shareText);
                    alert("Invoice details copied to clipboard (Sharing PDF files directly is not supported on this device/browser).");
                }
            }
        } catch (error) {
            console.error("Error sharing invoice:", error);
            alert("Failed to share invoice.");
        }
    };

    const handleDelete = async (invoice: Sale) => {
        const shouldProceed = settings.confirmBeforeDelete
            ? window.confirm("Are you sure you want to delete this invoice? It will be moved to History & Bin.")
            : true;

        if (!shouldProceed) return;

        // 1. Move to local storage recycle bin
        try {
            const storageKey = `recently_deleted_sales_${user?.id}`;
            const existing = localStorage.getItem(storageKey);
            const deletedItems = existing ? JSON.parse(existing) : [];

            deletedItems.push({
                ...invoice,
                type: "sale",
                deleted_at: new Date().toISOString()
            });

            localStorage.setItem(storageKey, JSON.stringify(deletedItems));
        } catch (e) {
            console.warn("Failed to save to local recycle bin", e);
        }

        // 2. Remove from Supabase
        const { error } = await supabase
            .from("sales" as any)
            .delete()
            .eq("id", invoice.id);

        if (error) {
            console.error("Error deleting invoice:", error);
            alert("Failed to delete invoice.");
        } else {
            queryClient.invalidateQueries({ queryKey: ["sales", user?.id] });
        }
    };

    // Calculate Metrics
    const today = new Date();

    const outstandingTotal = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const overdueTotal = invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const paidThisMonth = invoices
        .filter(inv => inv.status === 'paid' && isSameMonth(new Date(inv.date), today))
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch =
            invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || invoice.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Sales & Invoices</h2>
                        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage and monitor all your customer billing operations.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 h-10 pl-10 pr-4 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-100"
                                placeholder="Search invoices..."
                            />
                        </div>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center whitespace-nowrap gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-sm transition-all"
                        >
                            <Settings2 className="w-4 h-4" />
                            Sales Settings
                        </button>
                        <button
                            onClick={() => {
                                setEditingInvoice(null);
                                setIsCreateOpen(true);
                            }}
                            className="flex items-center whitespace-nowrap gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Invoice
                        </button>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(outstandingTotal)}</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-2">
                                Pending payment
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Amount</span>
                            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(overdueTotal)}</p>
                            <p className="text-[11px] font-semibold text-rose-600 flex items-center mt-2">
                                <TrendingDown className="w-3 h-3 mr-1" /> Requires attention
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid this Month</span>
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(paidThisMonth)}</p>
                            <p className="text-[11px] font-semibold text-emerald-600 flex items-center mt-2">
                                <TrendingUp className="w-3 h-3 mr-1" /> Revenue received
                            </p>
                        </div>
                    </div>
                </div>

                {/* Data Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 border-t-0 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full">
                            {['all', 'paid', 'pending', 'overdue'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm capitalize transition-all whitespace-nowrap ${filterStatus === status
                                        ? 'bg-white dark:bg-slate-800 text-primary'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <th className="px-6 py-4">Invoice</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Issue Date</th>
                                    <th className="px-6 py-4 text-right">Tax</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading invoices...</td></tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No invoices matching your criteria.</td></tr>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{invoice.invoice_number}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{invoice.items?.length || 0} items</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {invoice.customer_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                                        {invoice.customer_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {format(new Date(invoice.date), "MMM dd, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">
                                                {invoice.tax_amount ? formatCurrency(invoice.tax_amount) : formatCurrency(0)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-extrabold text-slate-900 dark:text-white text-right">
                                                {formatCurrency(invoice.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {invoice.status === 'paid' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">Paid</span>}
                                                {invoice.status === 'pending' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">Pending</span>}
                                                {invoice.status === 'overdue' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">Overdue</span>}
                                                {invoice.status === 'draft' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Draft</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePreview(invoice); }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
                                                        title="Preview PDF"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all">
                                                                <MoreHorizontal className="w-5 h-5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onClick={() => handlePreview(invoice)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Preview PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownload(invoice)}>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShare(invoice)}>
                                                                <Share2 className="w-4 h-4 mr-2" />
                                                                Share Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                                                <Pencil className="w-4 h-4 mr-2" />
                                                                Edit Invoice
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(invoice)} className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300">
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Invoice
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <CreateInvoiceDialog
                    open={isCreateOpen}
                    onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) setEditingInvoice(null);
                    }}
                    invoiceToEdit={editingInvoice}
                    salesSettings={settings}
                />

                {/* Sales Settings Dialog */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-primary" />
                                Sales Settings
                            </DialogTitle>
                            <DialogDescription>
                                Configure invoicing defaults, accounting controls, and workflow preferences.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-1 py-2">

                            {/* ── INVOICING DEFAULTS ── */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Invoicing Defaults</p>

                            {/* Default Tax Rate */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Tax Rate</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Pre-filled on every new invoice. Common GST slabs: 0, 5, 12, 18, 28%.</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number" min={0} max={100}
                                        value={settings.defaultTaxRate}
                                        onChange={(e) => updateSetting("defaultTaxRate", Math.min(100, Math.max(0, Number(e.target.value))))}
                                        className="w-16 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-500">%</span>
                                </div>
                            </div>

                            {/* Default Invoice Status */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Invoice Status</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">The pre-selected status when opening the Create Invoice form.</p>
                                </div>
                                <select
                                    value={settings.defaultStatus}
                                    onChange={(e) => updateSetting("defaultStatus", e.target.value as any)}
                                    className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            {/* Invoice Number Prefix */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Invoice Number Prefix</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Prepended to every auto-generated invoice number.<br/>
                                        e.g. <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-</span> → <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-42</span>
                                    </p>
                                </div>
                                <input
                                    type="text" maxLength={10}
                                    value={settings.invoiceNumberPrefix}
                                    onChange={(e) => updateSetting("invoiceNumberPrefix", e.target.value.toUpperCase())}
                                    placeholder="e.g. INV-"
                                    className="w-24 h-9 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Payment Terms */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Payment Terms</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Days from invoice date until payment is due. Set to 0 to disable due dates.</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number" min={0} max={365}
                                        value={settings.defaultPaymentTermsDays}
                                        onChange={(e) => updateSetting("defaultPaymentTermsDays", Math.max(0, Number(e.target.value)))}
                                        className="w-16 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm text-slate-500">days</span>
                                </div>
                            </div>

                            {/* ── ACCOUNTING CONTROLS ── */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">Accounting Controls</p>

                            {/* Prevent Backdating */}
                            <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                                settings.preventBackdating
                                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Prevent Backdating</p>
                                        {settings.preventBackdating && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">Active</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Block invoices dated more than <span className="font-semibold">{settings.backdatingLimitDays} days</span> in the past. Protects closed accounting periods.
                                    </p>
                                    {settings.preventBackdating && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-slate-500">Limit:</span>
                                            <input
                                                type="number" min={1} max={365}
                                                value={settings.backdatingLimitDays}
                                                onChange={(e) => updateSetting("backdatingLimitDays", Math.max(1, Number(e.target.value)))}
                                                className="w-16 h-7 text-right text-sm font-bold rounded-lg border border-amber-300 bg-white dark:bg-amber-950/20 px-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <span className="text-xs text-slate-500">days</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.preventBackdating}
                                    onClick={() => updateSetting("preventBackdating", !settings.preventBackdating)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
                                        settings.preventBackdating ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.preventBackdating ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* Round Off Total */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Round Off Invoice Total</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Rounds the final payable amount to the nearest rupee. The round-off difference is shown as a separate line item on the invoice — standard CA practice.
                                    </p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.roundOffTotal}
                                    onClick={() => updateSetting("roundOffTotal", !settings.roundOffTotal)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.roundOffTotal ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.roundOffTotal ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* GST Mode */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">GST Display Mode</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        How tax is labelled on invoices.<br/>
                                        <span className="font-semibold">IGST</span> = inter-state &bull; <span className="font-semibold">CGST+SGST</span> = intra-state
                                    </p>
                                </div>
                                <select
                                    value={settings.gstMode}
                                    onChange={(e) => updateSetting("gstMode", e.target.value as any)}
                                    className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="none">Generic Tax</option>
                                    <option value="igst">IGST</option>
                                    <option value="cgst_sgst">CGST + SGST</option>
                                </select>
                            </div>

                            {/* ── WORKFLOW ── */}
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">Workflow</p>

                            {/* Warn on Outstanding Balance */}
                            <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                                settings.warnOnOutstandingBalance
                                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Warn on Outstanding Balance</p>
                                        {settings.warnOnOutstandingBalance && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700">Active</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Show a warning before creating a new invoice if the customer already has unpaid or overdue invoices.
                                    </p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.warnOnOutstandingBalance}
                                    onClick={() => updateSetting("warnOnOutstandingBalance", !settings.warnOnOutstandingBalance)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${
                                        settings.warnOnOutstandingBalance ? "border-rose-500 bg-rose-500" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.warnOnOutstandingBalance ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* Confirm Before Delete */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Confirm Before Delete</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Show a confirmation dialog before permanently deleting an invoice.</p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.confirmBeforeDelete}
                                    onClick={() => updateSetting("confirmBeforeDelete", !settings.confirmBeforeDelete)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.confirmBeforeDelete ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.confirmBeforeDelete ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* Info note */}
                            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                    All changes apply immediately. Defaults apply to new invoices only; existing invoices are unaffected.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="ghost" size="sm" onClick={resetSettings} className="text-slate-500 mr-auto">
                                Reset to Defaults
                            </Button>
                            <Button onClick={() => setIsSettingsOpen(false)}>Done</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}