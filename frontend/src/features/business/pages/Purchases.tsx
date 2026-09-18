import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Search, MoreHorizontal, FileText, Download, Pencil, Filter, Plus, TrendingDown, Clock, Eye, Trash2, Share2, ShoppingBag, Zap, ReceiptIndianRupee, ScrollText, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { RecordPurchaseDialog } from "@/features/business/components/RecordPurchaseDialog";
import { RecordBillPaymentDialog, BillPaymentTarget } from "@/features/business/components/RecordBillPaymentDialog";
import { UniversalPaymentDialog } from "@/features/business/components/UniversalPaymentDialog";
import { PaymentOutRegister } from "@/features/business/components/PaymentOutRegister";
import { BillPaymentTranscriptDialog } from "@/features/business/components/BillPaymentTranscriptDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { isRecordOverdue, getOverdueDaysThreshold } from "@/core/utils/overdue";
import { format, isSameMonth } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableLoadingRows } from "@/components/shared/PageStates";
import { PurchaseOrderRegister } from "@/features/business/components/orders/PurchaseOrderRegister";


export default function PurchasesPage() {
    const queryClient = useQueryClient();
    const [isRecordOpen, setIsRecordOpen] = useState(false);
    const [startWithScanner, setStartWithScanner] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft'>('all');
    const [editingPurchase, setEditingPurchase] = useState<any>(null);
    const [paymentPurchase, setPaymentPurchase] = useState<BillPaymentTarget | null>(null);
    const [transcriptPurchase, setTranscriptPurchase] = useState<BillPaymentTarget | null>(null);
    const [isPaymentOutOpen, setIsPaymentOutOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get("tab");
    const activeTab: "bills" | "payment-out" | "purchase-order" = 
        currentTab === "payment-out"
            ? "payment-out"
            : currentTab === "purchase-order"
            ? "purchase-order"
            : "bills";

    const setActiveTab = (tab: "bills" | "payment-out" | "purchase-order") => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tab === "payment-out") {
                next.set("tab", "payment-out");
            } else if (tab === "purchase-order") {
                next.set("tab", "purchase-order");
            } else {
                next.delete("tab");
            }
            return next;
        });
    };
    
    // Virtualizer table scroll container ref
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();

    // Fetch Profile for Business Details
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id || "")
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user
    });

    const { data: parties = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("parties")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (e) {
                console.warn("[Purchases] Parties fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("parties", user.id)) || [];
        },
        enabled: !!user
    });

    const { data: products = [] } = useQuery({
        queryKey: ["products", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("products")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("name", { ascending: true });
                if (!error && data) return data;
            } catch (e) {
                console.warn("[Purchases] Products fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("products", user.id)) || [];
        },
        enabled: !!user,
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
        amount_paid?: number;
        balance_due?: number;
        date: string;
        due_date?: string;
        items: any[];
        notes?: string;
        payment_method?: string;
        place_of_supply?: string;
        attachment_url?: string;
    }

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchases")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });
                if (!error && data) return data as any as Purchase[];
            } catch (e) {
                console.warn("[Purchases] Supabase fetch failed offline, falling back to local cache:", e);
            }
            const cached = queryClient.getQueryData<Purchase[]>(["purchases", user.id]);
            if (cached && cached.length > 0) return cached;
            const localData = await sqliteService.getAll<Purchase>("purchases", user.id);
            return localData || [];
        },
        enabled: !!user
    });

    const getPurchasePaymentTarget = (purchase: Purchase): BillPaymentTarget => {
        const amtPaid = Number(purchase.amount_paid || 0);
        const balDue = Number(
            purchase.balance_due != null
                ? purchase.balance_due
                : Math.max(0, purchase.total_amount - amtPaid)
        );
        return {
            id: purchase.id,
            billNumber: purchase.bill_number || `#${purchase.id.substring(0, 6).toUpperCase()}`,
            partyName: purchase.vendor_name,
            partyGstin: purchase.vendor_gstin,
            partyPhone: purchase.vendor_phone,
            totalAmount: purchase.total_amount,
            amountPaid: amtPaid,
            balanceDue: balDue,
            date: purchase.date || (purchase as any).created_at,
            dueDate: purchase.due_date,
            notes: purchase.notes,
            paymentMethod: "cash",
            type: "purchase",
            rawRecord: purchase,
        };
    };

    const handleEdit = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setIsRecordOpen(true);
    };

    const handlePreview = async (purchase: Purchase) => {
        // Map purchase fields to invoice generator
        const billNumber = purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`;
        const url = await generateInvoicePDF({
            invoice_number: billNumber,
            date: purchase.date || (purchase as any).created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: purchase.amount_paid,
            balance_due: purchase.balance_due,
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
        }, { action: 'preview', documentTitle: 'PURCHASE BILL' });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handleDownload = (purchase: Purchase) => {
        const billNumber = purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`;
        generateInvoicePDF({
            invoice_number: billNumber,
            date: purchase.date || (purchase as any).created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: purchase.amount_paid,
            balance_due: purchase.balance_due,
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
        }, { action: 'download', documentTitle: 'PURCHASE BILL' });
    };

    const handleShare = async (purchase: Purchase) => {
        try {
            const billString = purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`;
            const url = await generateInvoicePDF({
                invoice_number: billString,
                date: purchase.date || (purchase as any).created_at,
                due_date: purchase.due_date,
                status: purchase.status,
                amount_paid: purchase.amount_paid,
                balance_due: purchase.balance_due,
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
            }, { action: 'preview', documentTitle: 'PURCHASE BILL' });

            if (url) {
                const response = await fetch(String(url));
                const blob = await response.blob();
                const file = new File([blob], `PurchaseBill_${billString}.pdf`, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Purchase Bill ${billString}`,
                        text: `Here is the purchase bill detail for ${purchase.vendor_name}`
                    });
                } else {
                    const shareText = `Purchase Bill ${billString} from ${purchase.vendor_name}. Total: ${formatCurrency(purchase.total_amount)}`;
                    await navigator.clipboard.writeText(shareText);
                    alert("Purchase bill details copied to clipboard (Sharing PDF files directly is not supported on this device/browser).");
                }
            }
        } catch (error) {
            console.error("Error sharing purchase:", error);
            alert("Failed to share purchase.");
        }
    };

    const handleDelete = async (purchase: Purchase) => {
        if (!user?.id) return;
        if (window.confirm(`Are you sure you want to delete purchase bill ${purchase.bill_number}? It will be moved to Recycle Bin.`)) {
            // 1. Move to local storage recycle bin
            try {
                const storageKey = `recently_deleted_purchases_${user.id}`;
                const existing = localStorage.getItem(storageKey);
                const deletedItems = existing ? JSON.parse(existing) : [];

                const filtered = deletedItems.filter((i: any) => i.id !== purchase.id);
                filtered.unshift({
                    ...purchase,
                    type: "purchase",
                    deleted_at: new Date().toISOString()
                });

                localStorage.setItem(storageKey, JSON.stringify(filtered));
            } catch (e) {
                console.warn("Failed to save to local recycle bin", e);
            }

            // 2. Remove from Supabase/Queue
            try {
                await offlineMutate({
                    table: "purchases",
                    action: "delete",
                    recordId: purchase.id,
                    userId: user.id
                });

                // Optimistic update
                queryClient.setQueryData(["purchases", user.id], (old: any) => {
                    return old ? old.filter((p: any) => p.id !== purchase.id) : [];
                });

                if (navigator.onLine) {
                    queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
                    queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
                }

                toast.success(`Purchase bill ${purchase.bill_number} moved to Recycle Bin.`);
            } catch (err: any) {
                console.error("Error deleting purchase:", err);
                toast.error("Failed to delete purchase. Please try again.");
            }
        }
    };

    // Safe Date Formatter helper
    const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "N/A";
        return format(date, formatTemplate);
    };

    // Calculate Metrics using system-wide overdue logic
    const today = new Date();
    const overdueDaysThreshold = getOverdueDaysThreshold();

    const overdueTotal = purchases
        .filter(p => isRecordOverdue(p))
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const outstandingTotal = purchases
        .filter(p => p.status === 'pending' && !isRecordOverdue(p))
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const spentThisMonth = purchases
        .filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return p.status === 'paid' && !isNaN(d.getTime()) && isSameMonth(d, today);
        })
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const filteredPurchases = purchases.filter((purchase) => {
        const matchesSearch =
            purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            purchase.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesFilter = filterStatus === 'all';
        if (filterStatus === 'paid') matchesFilter = purchase.status === 'paid';
        if (filterStatus === 'draft') matchesFilter = !purchase.status || purchase.status === 'draft';
        if (filterStatus === 'overdue') matchesFilter = isRecordOverdue(purchase);
        if (filterStatus === 'pending') matchesFilter = purchase.status === 'pending' && !isRecordOverdue(purchase);

        return matchesFilter && matchesSearch;
    });

    const rowVirtualizer = useVirtualizer({
        count: filteredPurchases.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 80, // Approximate height of table row
        overscan: 10,
    });

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
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
                                setStartWithScanner(true);
                                setIsRecordOpen(true);
                            }}
                            className="flex items-center whitespace-nowrap gap-2 px-3.5 py-2 text-sm font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg shadow-xs transition-all"
                        >
                            <Zap className="w-4 h-4 text-violet-500 animate-pulse" />
                            <span className="hidden sm:inline">⚡ Scan & Auto-Save</span>
                            <span className="sm:hidden">Scan</span>
                        </button>

                        <button
                            onClick={() => {
                                setPaymentPurchase(null);
                                setIsPaymentOutOpen(true);
                            }}
                            className="flex items-center whitespace-nowrap gap-1.5 px-3.5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all"
                            title="Record Payment Out (With or Without Bill)"
                        >
                            <ReceiptIndianRupee className="w-4 h-4" />
                            <span>+ Payment Out</span>
                        </button>

                        <button
                            onClick={() => {
                                setEditingPurchase(null);
                                setStartWithScanner(false);
                                setIsRecordOpen(true);
                            }}
                            className="flex items-center whitespace-nowrap gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Record Purchase</span>
                        </button>
                    </div>
                </div>

                {/* Vyapar Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit mb-6">
                    <button
                        onClick={() => setActiveTab("bills")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "bills"
                                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Purchases</span>
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
                            {purchases.filter(p => !p.bill_number?.startsWith("PAY-")).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("payment-out")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "payment-out"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        }`}
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Payment Out</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("purchase-order")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "purchase-order"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Purchase Order</span>
                    </button>
                </div>

                {activeTab === "purchase-order" ? (
                    <PurchaseOrderRegister
                        userId={user?.id || ""}
                        parties={parties}
                        products={products}
                    />
                ) : activeTab === "payment-out" ? (
                    <PaymentOutRegister
                        purchases={purchases}
                        parties={parties}
                        onOpenRecordPaymentOut={() => {
                            setPaymentPurchase(null);
                            setIsPaymentOutOpen(true);
                        }}
                        onOpenTranscript={(rawRecord) => setTranscriptPurchase(getPurchasePaymentTarget(rawRecord))}
                        onPreviewPurchase={handlePreview}
                    />
                ) : (
                    <>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Unpaid Bills</span>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(outstandingTotal)}</p>
                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Pending payment</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Clock className="w-4.5 h-4.5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Bills</span>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(overdueTotal)}</p>
                            <p className="text-[10px] font-medium text-rose-500 mt-0.5">Requires attention</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <TrendingDown className="w-4.5 h-4.5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Spent this Month</span>
                            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(spentThisMonth)}</p>
                            <p className="text-[10px] font-medium text-emerald-500 mt-0.5">Paid expenses</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4.5 h-4.5" />
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

                    <div 
                        className="overflow-auto max-h-[65vh] w-full"
                        ref={tableContainerRef}
                    >
                        <table className="w-full text-left border-collapse min-w-[1050px] relative">
                            <thead className="sticky top-0 z-10 shadow-sm">
                                <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <th className="px-5 py-3.5">Bill Ref</th>
                                    <th className="px-5 py-3.5">Vendor</th>
                                    <th className="px-5 py-3.5">Date</th>
                                    <th className="px-5 py-3.5 text-right">Tax</th>
                                    <th className="px-5 py-3.5 text-right">Total Amount</th>
                                    <th className="px-5 py-3.5 text-right">Paid</th>
                                    <th className="px-5 py-3.5 text-right">Balance Due</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <TableLoadingRows cols={9} rows={5} />
                                ) : filteredPurchases.length === 0 ? (
                                    <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No purchases matching your criteria.</td></tr>
                                ) : (
                                    <>
                                        {rowVirtualizer.getVirtualItems().length > 0 && (
                                            <tr>
                                                <td colSpan={9} style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }} />
                                            </tr>
                                        )}
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const purchase = filteredPurchases[virtualRow.index];
                                            const amtPaid = Number(purchase.amount_paid || 0);
                                            const balDue = Number(
                                                purchase.balance_due != null
                                                    ? purchase.balance_due
                                                    : Math.max(0, purchase.total_amount - amtPaid)
                                            );
                                            const isSettled = balDue <= 0.001 && purchase.total_amount > 0;

                                            return (
                                        <tr key={purchase.id} onClick={() => handleEdit(purchase)} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{purchase.bill_number ? purchase.bill_number : `#${purchase.id.substring(0, 6)}`}</p>
                                                    {purchase.bill_number?.startsWith("PAY-") && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 uppercase tracking-wider">
                                                            Payment Out
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{purchase.items?.length || 0} items</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {purchase.vendor_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                                        {purchase.vendor_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                                                <div>{formatDateSafe(purchase.date, "MMM dd, yyyy")}</div>
                                                {purchase.due_date && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Due: {formatDateSafe(purchase.due_date, "MMM dd")}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 text-right">
                                                {purchase.tax_amount ? formatCurrency(purchase.tax_amount) : formatCurrency(0)}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm font-extrabold text-slate-900 dark:text-white text-right">
                                                {formatCurrency(purchase.total_amount)}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                                                {formatCurrency(amtPaid)}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-right">
                                                {balDue > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPaymentPurchase(getPurchasePaymentTarget(purchase));
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
                                            <td className="px-5 py-3.5 text-center">
                                                {isSettled || purchase.status === 'paid' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTranscriptPurchase(getPurchasePaymentTarget(purchase));
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
                                                        title="Paid — Click to view Payment Ledger"
                                                    >
                                                        Paid
                                                    </button>
                                                ) : amtPaid > 0 && amtPaid < purchase.total_amount ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPaymentPurchase(getPurchasePaymentTarget(purchase));
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 hover:scale-105 transition-transform"
                                                        title={`Partial (Due: ${formatCurrency(balDue)}) — Click to Pay`}
                                                    >
                                                        Partial
                                                    </button>
                                                ) : isRecordOverdue(purchase) && amtPaid === 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPaymentPurchase(getPurchasePaymentTarget(purchase));
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:scale-105 transition-transform"
                                                        title="Overdue — Click to Pay"
                                                    >
                                                        Overdue
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPaymentPurchase(getPurchasePaymentTarget(purchase));
                                                        }}
                                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
                                                        title="Unpaid — Click to Pay"
                                                    >
                                                        Unpaid
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                    {balDue > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPaymentPurchase(getPurchasePaymentTarget(purchase));
                                                            }}
                                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-all mr-1"
                                                            title="Record Payment Out"
                                                        >
                                                            <ReceiptIndianRupee className="w-3.5 h-3.5" />
                                                            <span>Payment Out</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePreview(purchase); }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all"
                                                        title="Preview PDF"
                                                    >
                                                        <FileText className="w-4 h-4" />
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
                                                                    onClick={() => setPaymentPurchase(getPurchasePaymentTarget(purchase))}
                                                                    className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                                                                >
                                                                    <ReceiptIndianRupee className="w-4 h-4 mr-2 text-indigo-500" />
                                                                    Record Payment Out
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => setTranscriptPurchase(getPurchasePaymentTarget(purchase))}
                                                                className="cursor-pointer"
                                                            >
                                                                <ScrollText className="w-4 h-4 mr-2 text-slate-500" />
                                                                Payment Transcript / Ledger
                                                            </DropdownMenuItem>
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
                                            );
                                        })}
                                        {rowVirtualizer.getVirtualItems().length > 0 && (
                                            <tr>
                                                <td colSpan={9} style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }} />
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
                )}

                <RecordPurchaseDialog
                    open={isRecordOpen}
                    onOpenChange={(open) => {
                        setIsRecordOpen(open);
                        if (!open) {
                            setEditingPurchase(null);
                            setStartWithScanner(false);
                        }
                    }}
                    purchaseToEdit={editingPurchase}
                    startWithScanner={startWithScanner}
                />

                {/* Universal Payment Out (Voucher) Dialog */}
                <UniversalPaymentDialog
                    open={isPaymentOutOpen || !!paymentPurchase}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsPaymentOutOpen(false);
                            setPaymentPurchase(null);
                        }
                    }}
                    mode="payment_out"
                    initialBill={paymentPurchase}
                />

                {/* CA Bill Payment Transcript / Ledger Audit Dialog */}
                <BillPaymentTranscriptDialog
                    open={!!transcriptPurchase}
                    onOpenChange={(open) => !open && setTranscriptPurchase(null)}
                    bill={transcriptPurchase}
                    onOpenRecordPayment={(target) => setPaymentPurchase(target)}
                />
            </div>
        </AppLayout>
    );
}