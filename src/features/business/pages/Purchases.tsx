import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Search, MoreHorizontal, FileText, Download, Pencil, Filter, Plus, TrendingDown, Clock, Eye, Trash2, Share2, ShoppingBag } from "lucide-react";
import { RecordPurchaseDialog } from "@/features/business/components/RecordPurchaseDialog";
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

export default function PurchasesPage() {
    const [isRecordOpen, setIsRecordOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft'>('all');
    const [editingPurchase, setEditingPurchase] = useState<any>(null);
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();

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

    interface Purchase {
        id: string;
        user_id: string;
        vendor_name: string;
        vendor_phone?: string;
        vendor_email?: string;
        vendor_gstin?: string;
        bill_number: string;
        status: 'paid' | 'pending' | 'overdue' | 'draft';
        total_amount: number;
        subtotal?: number;
        tax_amount?: number;
        tax_rate?: number;
        discount_amount?: number;
        date: string;
        items: any[];
    }

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("purchases" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });
            if (error) throw error;
            return data as any as Purchase[];
        },
        enabled: !!user
    });

    const handleEdit = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setIsRecordOpen(true);
    };

    const handlePreview = async (purchase: Purchase) => {
        // Map purchase fields to invoice generator
        const url = await generateInvoicePDF({
            invoice_number: purchase.bill_number || `PO-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date,
            customer_name: purchase.vendor_name, // Mapping Vendor to Customer field in the PDF
            customer_phone: purchase.vendor_phone,
            customer_email: purchase.vendor_email,
            customer_gstin: purchase.vendor_gstin,
            items: purchase.items || [],
            subtotal: purchase.subtotal || purchase.total_amount,
            discount_amount: purchase.discount_amount || 0,
            tax_amount: purchase.tax_amount || 0,
            total_amount: purchase.total_amount,
            tax_rate: purchase.tax_rate || 0,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        }, { action: 'preview', documentTitle: 'PURCHASE ORDER' });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handleDownload = (purchase: Purchase) => {
        generateInvoicePDF({
            invoice_number: purchase.bill_number || `PO-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date,
            customer_name: purchase.vendor_name,
            customer_phone: purchase.vendor_phone,
            customer_email: purchase.vendor_email,
            customer_gstin: purchase.vendor_gstin,
            items: purchase.items || [],
            subtotal: purchase.subtotal || purchase.total_amount,
            discount_amount: purchase.discount_amount || 0,
            tax_amount: purchase.tax_amount || 0,
            total_amount: purchase.total_amount,
            tax_rate: purchase.tax_rate || 0,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        }, { action: 'download', documentTitle: 'PURCHASE ORDER' });
    };

    const handleShare = async (purchase: Purchase) => {
        try {
            const billString = purchase.bill_number || `PO-${purchase.id.substring(0, 6).toUpperCase()}`;
            const url = await generateInvoicePDF({
                invoice_number: billString,
                date: purchase.date,
                customer_name: purchase.vendor_name,
                customer_phone: purchase.vendor_phone,
                customer_email: purchase.vendor_email,
                customer_gstin: purchase.vendor_gstin,
                items: purchase.items || [],
                subtotal: purchase.subtotal || purchase.total_amount,
                discount_amount: purchase.discount_amount || 0,
                tax_amount: purchase.tax_amount || 0,
                total_amount: purchase.total_amount,
                tax_rate: purchase.tax_rate || 0,
                business_details: profile ? {
                    name: (profile as any).business_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone,
                    gst: (profile as any).gst_number,
                    logo_url: (profile as any).business_logo,
                    signature_url: (profile as any).signature_url
                } : undefined
            }, { action: 'preview', documentTitle: 'PURCHASE ORDER' });

            if (url) {
                const response = await fetch(String(url));
                const blob = await response.blob();
                const file = new File([blob], `Purchase_${billString}.pdf`, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Purchase Order ${billString}`,
                        text: `Here is the purchase detail for ${purchase.vendor_name}`
                    });
                } else {
                    const shareText = `Purchase ${billString} from ${purchase.vendor_name}. Total: ${formatCurrency(purchase.total_amount)}`;
                    await navigator.clipboard.writeText(shareText);
                    alert("Purchase details copied to clipboard (Sharing PDF files directly is not supported on this device/browser).");
                }
            }
        } catch (error) {
            console.error("Error sharing purchase:", error);
            alert("Failed to share purchase.");
        }
    };

    const handleDelete = async (purchase: Purchase) => {
        if (window.confirm("Are you sure you want to delete this purchase? It will be moved to History & Bin.")) {
            // 1. Move to local storage recycle bin
            try {
                const storageKey = `recently_deleted_purchases_${user?.id}`;
                const existing = localStorage.getItem(storageKey);
                const deletedItems = existing ? JSON.parse(existing) : [];

                deletedItems.push({
                    ...purchase,
                    type: "purchase",
                    deleted_at: new Date().toISOString()
                });

                localStorage.setItem(storageKey, JSON.stringify(deletedItems));
            } catch (e) {
                console.warn("Failed to save to local recycle bin", e);
            }

            // 2. Remove from Supabase
            const { error } = await supabase
                .from("purchases" as any)
                .delete()
                .eq("id", purchase.id);

            if (error) {
                console.error("Error deleting purchase:", error);
                alert("Failed to delete purchase.");
            } else {
                queryClient.invalidateQueries({ queryKey: ["purchases", user?.id] });
            }
        }
    };

    // Calculate Metrics
    const today = new Date();

    const outstandingTotal = purchases
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const overdueTotal = purchases
        .filter(p => p.status === 'overdue')
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const spentThisMonth = purchases
        .filter(p => p.status === 'paid' && isSameMonth(new Date(p.date), today))
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const filteredPurchases = purchases.filter((purchase) => {
        const matchesSearch =
            purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || purchase.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Purchases & Bills</h2>
                        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Track and manage your vendor expenses and incoming bills.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 h-10 pl-10 pr-4 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-100"
                                placeholder="Search purchases..."
                            />
                        </div>
                        <button
                            onClick={() => {
                                setEditingPurchase(null);
                                setIsRecordOpen(true);
                            }}
                            className="flex items-center whitespace-nowrap gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Record Purchase
                        </button>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unpaid Bills</span>
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
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Bills</span>
                            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(overdueTotal)}</p>
                            <p className="text-[11px] font-semibold text-rose-600 flex items-center mt-2">
                                Requires attention
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spent this Month</span>
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(spentThisMonth)}</p>
                            <p className="text-[11px] font-semibold text-emerald-600 flex items-center mt-2">
                                Paid expenses
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
                                    <th className="px-6 py-4">Bill Ref</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Tax</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading purchases...</td></tr>
                                ) : filteredPurchases.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No purchases matching your criteria.</td></tr>
                                ) : (
                                    filteredPurchases.map((purchase) => (
                                        <tr key={purchase.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{purchase.bill_number ? purchase.bill_number : `#${purchase.id.substring(0, 6)}`}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{purchase.items?.length || 0} items</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {purchase.vendor_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                                        {purchase.vendor_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                {format(new Date(purchase.date), "MMM dd, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">
                                                {purchase.tax_amount ? formatCurrency(purchase.tax_amount) : formatCurrency(0)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-extrabold text-slate-900 dark:text-white text-right">
                                                {formatCurrency(purchase.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {purchase.status === 'paid' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">Paid</span>}
                                                {purchase.status === 'pending' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">Pending</span>}
                                                {purchase.status === 'overdue' && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">Overdue</span>}
                                                {(!purchase.status || purchase.status === 'draft') && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Draft</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePreview(purchase); }}
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
                                                            <DropdownMenuItem onClick={() => handlePreview(purchase)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Preview PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDownload(purchase)}>
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download PDF
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleShare(purchase)}>
                                                                <Share2 className="w-4 h-4 mr-2" />
                                                                Share Bill
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(purchase)}>
                                                                <Pencil className="w-4 h-4 mr-2" />
                                                                Edit Bill
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(purchase)} className="text-red-500 hover:text-red-600 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-300">
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Bill
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

                <RecordPurchaseDialog
                    open={isRecordOpen}
                    onOpenChange={(open) => {
                        setIsRecordOpen(open);
                        if (!open) setEditingPurchase(null);
                    }}
                    purchaseToEdit={editingPurchase}
                />
            </div>
        </AppLayout>
    );
}