import { useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AppLayout } from "@/components/layout/AppLayout";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { generateEInvoiceJSON, downloadJSON } from "@/core/utils/einvoiceGenerator";
import { Search, MoreHorizontal, FileText, Download, Pencil, Filter, Plus, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Clock, Eye, Trash2, Share2, Settings2, Info, MessageSquare, QrCode, Mail, MessageCircle, ReceiptIndianRupee, Receipt, ArrowDownLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { dispatchJob, subscribeToJob, JobEvent } from "@/core/utils/jobQueue";
import { CreateInvoiceDialog } from "@/features/business/components/CreateInvoiceDialog";
import { RecordBillPaymentDialog, BillPaymentTarget } from "@/features/business/components/RecordBillPaymentDialog";
import { UniversalPaymentDialog } from "@/features/business/components/UniversalPaymentDialog";
import { PaymentInRegister } from "@/features/business/components/PaymentInRegister";
import { BillPaymentTranscriptDialog } from "@/features/business/components/BillPaymentTranscriptDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
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
import { TableLoadingRows } from "@/components/shared/PageStates";
// Line item on an invoice — typed instead of `any` so a bad field name
// (e.g. "qty" vs "quantity") fails at compile time, not in production billing.
interface SaleItem {
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    amount?: number;
    total?: number;
    hsn_code?: string;
    unit?: string;
}

interface Sale {
    id: string;
    user_id: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    customer_gstin?: string;
    invoice_number: string;
    status: 'paid' | 'pending' | 'overdue' | 'draft' | 'partial';
    total_amount: number;
    amount_paid?: number;
    balance_due?: number;
    subtotal?: number;
    tax_amount?: number;
    tax_rate?: number;
    discount_amount?: number;
    date: string;
    due_date?: string | null;
    items: SaleItem[];
    notes?: string | null;
}

export default function SalesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'draft' | 'partial'>('all');
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

    const [paymentTarget, setPaymentTarget] = useState<BillPaymentTarget | null>(null);
    const [transcriptTarget, setTranscriptTarget] = useState<BillPaymentTarget | null>(null);
    const [isPaymentInOpen, setIsPaymentInOpen] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get("tab");
    const activeTab: "invoices" | "payment-in" | "sales-order" = 
        currentTab === "payment-in"
            ? "payment-in"
            : currentTab === "sales-order"
            ? "sales-order"
            : "invoices";

    const setActiveTab = (tab: "invoices" | "payment-in" | "sales-order") => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tab === "payment-in") {
                next.set("tab", "payment-in");
            } else if (tab === "sales-order") {
                next.set("tab", "sales-order");
            } else {
                next.delete("tab");
            }
            return next;
        });
    };
    
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();
    const { settings, updateSetting, resetSettings } = useSalesSettings(user?.id);

    // Fetch Profile for Business Details
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            try {
                const { data, error } = await (supabase as any)
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                if (!error && data) return data;
            } catch (e) {
                console.warn("[Sales] Profile fetch failed offline, falling back to cache:", e);
            }
            const cached = queryClient.getQueryData<any>(["profile", user.id]);
            if (cached) return cached;
            return await sqliteService.getById<any>(user.id);
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
                console.warn("[Sales] Parties fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("parties", user.id)) || [];
        },
        enabled: !!user
    });

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            let salesData: any[] = [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sales")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });
                if (!error && data) {
                    salesData = data;
                }
            } catch (e) {
                console.warn("[Sales] Sales fetch failed offline, falling back to cache:", e);
            }

            if (!salesData || salesData.length === 0) {
                const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
                if (cached && cached.length > 0) {
                    salesData = cached;
                } else {
                    salesData = await sqliteService.getAll<any>("sales", user.id);
                }
            }
            
            const today = new Date().toISOString().split("T")[0];
            return (salesData || []).map(inv => {
                if (inv.status === 'pending' && inv.due_date && inv.due_date < today) {
                    return { ...inv, status: 'overdue' };
                }
                return inv;
            }) as Sale[];
        },
        enabled: !!user
    });

    const handleEdit = (invoice: Sale) => {
        setEditingInvoice(invoice);
        setIsCreateOpen(true);
    };

    const getSalePaymentTarget = (invoice: Sale): BillPaymentTarget => {
        const currentPaid = Number(invoice.amount_paid || 0);
        const balDue = Number(
            invoice.balance_due != null
                ? invoice.balance_due
                : Math.max(0, invoice.total_amount - currentPaid)
        );
        return {
            id: invoice.id,
            billNumber: invoice.invoice_number,
            partyName: invoice.customer_name,
            partyGstin: invoice.customer_gstin,
            partyPhone: invoice.customer_phone,
            totalAmount: invoice.total_amount,
            amountPaid: currentPaid,
            balanceDue: balDue,
            date: invoice.date,
            dueDate: invoice.due_date,
            notes: invoice.notes,
            paymentMethod: (invoice as any).payment_method || "cash",
            type: "sale",
            rawRecord: invoice,
        };
    };

    const handleOpenRecordPayment = (invoice: Sale) => {
        setPaymentTarget(getSalePaymentTarget(invoice));
    };

    const handleOpenTranscript = (invoice: Sale) => {
        setTranscriptTarget(getSalePaymentTarget(invoice));
    };

    const handlePreview = async (invoice: Sale) => {
        const url = await generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date || (invoice as any).created_at,
            due_date: invoice.due_date || undefined,
            status: invoice.status,
            amount_paid: invoice.amount_paid,
            balance_due: invoice.balance_due,
            payment_method: (invoice as any).payment_method,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: (invoice.items || []).map(item => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
            subtotal: invoice.subtotal || invoice.total_amount,
            discount_amount: invoice.discount_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate || 0,
            irn: (invoice as any).irn,
            eway_bill_number: (invoice as any).eway_bill_number,
            qr_code: (invoice as any).qr_code,
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
            date: invoice.date || (invoice as any).created_at,
            due_date: invoice.due_date || undefined,
            status: invoice.status,
            amount_paid: invoice.amount_paid,
            balance_due: invoice.balance_due,
            payment_method: (invoice as any).payment_method,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: (invoice.items || []).map(item => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
            subtotal: invoice.subtotal || invoice.total_amount,
            discount_amount: invoice.discount_amount || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate || 0,
            irn: (invoice as any).irn,
            eway_bill_number: (invoice as any).eway_bill_number,
            qr_code: (invoice as any).qr_code,
            business_details: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo,
                signature_url: (profile as any).signature_url
            } : undefined
        }, { action: 'download' });
        toast.success(`Invoice ${invoice.invoice_number} downloaded.`);
    };

    const handleShare = async (invoice: Sale) => {
        try {
            const url = await generateInvoicePDF({
                invoice_number: invoice.invoice_number,
                date: invoice.date || (invoice as any).created_at,
                due_date: invoice.due_date || undefined,
                status: invoice.status,
                amount_paid: invoice.amount_paid,
                balance_due: invoice.balance_due,
                payment_method: (invoice as any).payment_method,
                customer_name: invoice.customer_name,
                customer_phone: invoice.customer_phone,
                customer_email: invoice.customer_email,
                customer_gstin: invoice.customer_gstin,
                items: (invoice.items || []).map(item => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
                subtotal: invoice.subtotal || invoice.total_amount,
                discount_amount: invoice.discount_amount || 0,
                tax_amount: invoice.tax_amount || 0,
                total_amount: invoice.total_amount,
                tax_rate: invoice.tax_rate || 0,
                irn: (invoice as any).irn,
                eway_bill_number: (invoice as any).eway_bill_number,
                qr_code: (invoice as any).qr_code,
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
                    toast.success("Invoice details copied to clipboard — direct PDF sharing isn't supported on this device/browser.");
                }
            }
        } catch (error) {
            console.error("Error sharing invoice:", error);
            toast.error("Failed to share invoice. Please try again.");
        }
    };

    const handleGenerateEInvoice = (invoice: Sale) => {
        if (!profile) return toast.error("Profile not loaded.");
        if (!invoice.customer_gstin || invoice.customer_gstin.length < 15) {
            toast.error("E-Invoice requires a valid 15-digit customer GSTIN.");
            return;
        }
        if (invoice.total_amount <= 0) {
            toast.error("Invoice amount must be greater than 0.");
            return;
        }
        try {
            const payload = generateEInvoiceJSON(invoice, profile);
            downloadJSON(payload, `EInvoice_${invoice.invoice_number}.json`);
            toast.success("E-Invoice JSON generated successfully!");
        } catch (error) {
            console.error("Error generating E-Invoice:", error);
            toast.error("Failed to generate E-Invoice JSON.");
        }
    };

    const handleBulkEmail = async () => {
        const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
        if (overdueInvoices.length === 0) {
            toast.info("No overdue invoices to send reminders for.");
            return;
        }

        try {
            const jobId = await dispatchJob('send_bulk_email', { invoices: overdueInvoices });
            toast.success(`Dispatched email reminders for ${overdueInvoices.length} customers in the background.`);
            
            // Subscribe to listen to completion
            subscribeToJob(jobId, (job) => {
                if (job.status === 'completed') {
                    const res = JSON.parse(job.error_log || '{}');
                    toast.success(`Bulk Email finished: Sent ${res.sent} emails, ${res.failed} failed.`);
                } else if (job.status === 'failed') {
                    toast.error(`Bulk Email failed: ${job.error_log}`);
                }
            });
        } catch (error) {
            toast.error("Failed to start bulk email task.");
        }
    };

    const handleDelete = async (invoice: Sale) => {
        const shouldProceed = settings.confirmBeforeDelete
            ? window.confirm("Are you sure you want to delete invoice? It will be moved to History & Bin.")
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

        // 2. Remove from Supabase/Queue
        if (!user?.id) return;
        try {
            await offlineMutate({
                table: "sales",
                action: "delete",
                recordId: invoice.id,
                userId: user.id
            });

            // Optimistic update
            queryClient.setQueryData(["sales", user.id], (old: any) => {
                return old ? old.filter((inv: any) => inv.id !== invoice.id) : [];
            });

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
            }

            toast.success(`Invoice ${invoice.invoice_number} moved to Recycle Bin.`);
        } catch (err: any) {
            console.error("Error deleting invoice:", err);
            toast.error("Failed to delete invoice. Please try again.");
        }
    };

    // Safe Date Formatter helper
    const formatDateSafe = (dateStr: string | null | undefined, formatTemplate: string) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "N/A";
        return format(date, formatTemplate);
    };

    // Calculate Metrics
    const today = new Date();

    const outstandingTotal = invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'partial')
        .reduce((sum, inv) => {
            if (inv.status === 'partial') {
                return sum + Number(inv.balance_due != null ? inv.balance_due : Math.max(0, inv.total_amount - (inv.amount_paid || 0)));
            }
            return sum + Number(inv.total_amount || 0);
        }, 0);

    const overdueTotal = invoices
        .filter(inv => inv.status === 'overdue')
        .reduce((sum, inv) => sum + Number(inv.balance_due != null ? inv.balance_due : inv.total_amount || 0), 0);

    const paidThisMonth = invoices
        .filter(inv => {
            if (!inv.date) return false;
            const d = new Date(inv.date);
            return !isNaN(d.getTime()) && isSameMonth(d, today);
        })
        .reduce((sum, inv) => {
            if (inv.status === 'paid') return sum + Number(inv.total_amount || 0);
            if (inv.status === 'partial') return sum + Number(inv.amount_paid || 0);
            return sum;
        }, 0);

    // Accountant-facing stats: actual collected cash from both paid and partial invoices
    const totalRevenue = invoices
        .reduce((sum, inv) => {
            if (inv.status === 'paid') return sum + Number(inv.total_amount || 0);
            if (inv.status === 'partial') return sum + Number(inv.amount_paid || 0);
            return sum;
        }, 0);

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    const collectionRate = totalBilled > 0
        ? Math.round((totalRevenue / totalBilled) * 100)
        : 0;

    const avgInvoiceValue = invoices.length > 0
        ? totalBilled / invoices.length
        : 0;

    const sortedAndFilteredInvoices = useMemo(() => {
        const filtered = invoices.filter((invoice) => {
            const matchesSearch =
                invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterStatus === 'all' || invoice.status === filterStatus;
            return matchesFilter && matchesSearch;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'date-desc') {
                const dB = b.date ? new Date(b.date).getTime() : 0;
                const dA = a.date ? new Date(a.date).getTime() : 0;
                return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
            }
            if (sortBy === 'date-asc') {
                const dB = b.date ? new Date(b.date).getTime() : 0;
                const dA = a.date ? new Date(a.date).getTime() : 0;
                return (isNaN(dA) ? 0 : dA) - (isNaN(dB) ? 0 : dB);
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
        estimateSize: () => 80, // Approximate height of table row
        overscan: 10,
    });
    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 animate-fade-in text-slate-900 dark:text-slate-100 font-display flex flex-col h-full">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-3">
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Sales & Invoices</h2>
                        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage and monitor all your customer billing operations.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <div className="relative group w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-100"
                                placeholder="Search invoices..."
                            />
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
                            >
                                <Settings2 className="w-4 h-4" />
                                Sales Settings
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial">
                                        Bulk Actions <MoreHorizontal className="w-4 h-4 ml-1" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <DropdownMenuItem onClick={handleBulkEmail} className="cursor-pointer py-2">
                                        <Mail className="w-4 h-4 mr-2" /> Send Emails to Overdue
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                                onClick={() => {
                                    setPaymentTarget(null);
                                    setIsPaymentInOpen(true);
                                }}
                                className="flex items-center justify-center whitespace-nowrap gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
                                title="Record Payment In (With or Without Bill)"
                            >
                                <ReceiptIndianRupee className="w-4 h-4" />
                                <span>+ Payment In</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingInvoice(null);
                                    setIsCreateOpen(true);
                                }}
                                className="flex items-center justify-center whitespace-nowrap gap-2 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
                            >
                                <Plus className="w-4 h-4" />
                                Create Invoice
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vyapar Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit mb-4">
                    <button
                        onClick={() => setActiveTab("invoices")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "invoices"
                                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Sales</span>
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
                            {invoices.filter(i => (i as any).document_type !== 'receipt' && !i.invoice_number?.startsWith('REC-')).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("payment-in")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "payment-in"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        }`}
                    >
                        <ArrowDownLeft className="w-4 h-4" />
                        <span>Payment In</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("sales-order")}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            activeTab === "sales-order"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Sales Order</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                            Soon
                        </span>
                    </button>
                </div>

                {activeTab === "sales-order" ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
                        <div className="max-w-lg mx-auto flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
                                <ShoppingBag className="w-8 h-8" />
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-3">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Planned Module • Ready for Later Implementation</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Sales Order Management
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                Book customer advance orders, track fulfillment stages, and convert confirmed orders to GST Tax Invoices in 1-click. You can implement this module whenever you are ready!
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left mb-6">
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Advance Bookings</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Record customer orders prior to physical delivery or dispatch.</p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Convert to Invoice</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Generate final Sale Invoices directly from the order.</p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Advance Payments</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Track token or partial advance payment linked to orders.</p>
                                </div>
                                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">4. Order Fulfillment</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Status tracking: Open, Partial, Completed, Cancelled.</p>
                                </div>
                            </div>

                            <button
                                onClick={() => toast.info("Sales Order creation will be implemented in the next phase as planned.")}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm"
                            >
                                + Create Sales Order (Preview)
                            </button>
                        </div>
                    </div>
                ) : activeTab === "payment-in" ? (
                    <PaymentInRegister
                        sales={invoices}
                        parties={parties}
                        onOpenRecordPaymentIn={() => {
                            setPaymentTarget(null);
                            setIsPaymentInOpen(true);
                        }}
                        onOpenTranscript={handleOpenTranscript}
                        onPreviewInvoice={handlePreview}
                    />
                ) : (
                    <>



                {/* Top Metrics Strip */}
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mb-3 divide-x divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                        <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{formatCurrency(outstandingTotal)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                        <div className="h-7 w-7 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overdue</p>
                            <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 leading-tight">{formatCurrency(overdueTotal)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2.5 flex-1">
                        <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Paid this Month</p>
                            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">{formatCurrency(paidThisMonth)}</p>
                        </div>
                    </div>
                </div>

                {/* Data Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 border-t-0 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full">
                            {['all', 'paid', 'partial', 'pending', 'overdue'].map((status) => (
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="text-slate-400 hover:text-slate-600 p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Sort Invoices">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <DropdownMenuItem onClick={() => setSortBy('date-desc')} className={`cursor-pointer py-2 ${sortBy === 'date-desc' ? 'font-bold text-primary' : ''}`}>
                                    Date: Newest First
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('date-asc')} className={`cursor-pointer py-2 ${sortBy === 'date-asc' ? 'font-bold text-primary' : ''}`}>
                                    Date: Oldest First
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('amount-desc')} className={`cursor-pointer py-2 ${sortBy === 'amount-desc' ? 'font-bold text-primary' : ''}`}>
                                    Amount: High to Low
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy('amount-asc')} className={`cursor-pointer py-2 ${sortBy === 'amount-asc' ? 'font-bold text-primary' : ''}`}>
                                    Amount: Low to High
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div 
                        className="overflow-auto flex-1 min-h-0 w-full"
                        ref={tableContainerRef}
                    >
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
                                    <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No invoices matching your criteria.</td></tr>
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
                                        <tr key={invoice.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{invoice.invoice_number}</p>
                                                    {((invoice as any).document_type === 'receipt' || invoice.invoice_number?.startsWith('REC-')) && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 uppercase tracking-wider">
                                                            Receipt
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{invoice.items?.length || 0} items</p>
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
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Due: {formatDateSafe(invoice.due_date, "MMM dd")}</div>
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
                                                            handleOpenRecordPayment(invoice);
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
                                                            handleOpenTranscript(invoice);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:scale-105 transition-transform"
                                                        title="Paid — Click to view Payment Ledger"
                                                    >
                                                        Paid
                                                    </button>
                                                ) : invoice.status === 'partial' || (currentPaid > 0 && currentPaid < invoice.total_amount) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenRecordPayment(invoice);
                                                        }}
                                                        className="flex flex-col items-center gap-0.5 hover:scale-105 transition-transform cursor-pointer mx-auto"
                                                        title="Click to Receive Payment"
                                                    >
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">Partial</span>
                                                    </button>
                                                ) : invoice.status === 'overdue' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenRecordPayment(invoice);
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
                                                            handleOpenRecordPayment(invoice);
                                                        }}
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:scale-105 transition-transform"
                                                        title="Pending — Click to Receive Payment"
                                                    >
                                                        Pending
                                                    </button>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Draft</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity">
                                                    {balDue > 0 && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenRecordPayment(invoice);
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
                                                            handleOpenTranscript(invoice);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                                                        title="Payment Transcript / Ledger"
                                                    >
                                                        <Receipt className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePreview(invoice); }}
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
                                                                    onClick={() => handleOpenRecordPayment(invoice)}
                                                                    className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                                                                >
                                                                    <ReceiptIndianRupee className="w-4 h-4 mr-2 text-emerald-500" />
                                                                    Receive Payment
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                onClick={() => handleOpenTranscript(invoice)}
                                                                className="cursor-pointer"
                                                            >
                                                                <Receipt className="w-4 h-4 mr-2 text-slate-500" />
                                                                Payment Transcript / Ledger
                                                            </DropdownMenuItem>
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
                                                            {invoice.customer_gstin && invoice.customer_gstin.length === 15 && (
                                                                <DropdownMenuItem onClick={() => handleGenerateEInvoice(invoice)} className="cursor-pointer py-2">
                                                                    <Download className="w-4 h-4 mr-2 text-blue-500" />
                                                                    E-Invoice JSON
                                                                </DropdownMenuItem>
                                                            )}
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

                <CreateInvoiceDialog
                    open={isCreateOpen}
                    onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) setEditingInvoice(null);
                    }}
                    invoiceToEdit={editingInvoice}
                    salesSettings={settings}
                />

                {/* Universal Payment In (Receipt) Dialog */}
                <UniversalPaymentDialog
                    open={isPaymentInOpen || !!paymentTarget}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsPaymentInOpen(false);
                            setPaymentTarget(null);
                        }
                    }}
                    mode="payment_in"
                    initialBill={paymentTarget}
                />

                {/* CA Bill Payment Transcript / Ledger Audit Dialog */}
                <BillPaymentTranscriptDialog
                    open={!!transcriptTarget}
                    onOpenChange={(open) => !open && setTranscriptTarget(null)}
                    bill={transcriptTarget}
                    onOpenRecordPayment={(target) => setPaymentTarget(target)}
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

                            {/* Item-Wise Tax Setting */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Item-Wise Tax</p>
                                        {settings.enableItemWiseTax && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">Active</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Specify individual tax rates per line item (e.g. 5%, 12%, 18%, 28%) on each invoice instead of a single global tax rate.
                                    </p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.enableItemWiseTax}
                                    onClick={() => updateSetting("enableItemWiseTax", !settings.enableItemWiseTax)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.enableItemWiseTax ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableItemWiseTax ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* Show Product Tax % on Bill */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Product Tax % on Bill</p>
                                        {settings.showItemTaxRateOnBill && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">Active</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Display individual product tax / GST percentage (e.g. 5%, 12%, 18%) as a column on bills, invoices, and print receipts. Turn off if you don't want tax rates on items.
                                    </p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.showItemTaxRateOnBill}
                                    onClick={() => {
                                        const nextVal = !settings.showItemTaxRateOnBill;
                                        updateSetting("showItemTaxRateOnBill", nextVal);
                                        if (nextVal && !settings.enableItemWiseTax) {
                                            updateSetting("enableItemWiseTax", true);
                                        }
                                    }}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.showItemTaxRateOnBill ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.showItemTaxRateOnBill ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
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

                            {/* Enable Product HSN Codes */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Enable HSN Codes</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Display and manage HSN codes for products and items on invoices.</p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.enableHsnCode}
                                    onClick={() => updateSetting("enableHsnCode", !settings.enableHsnCode)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.enableHsnCode ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableHsnCode ? "translate-x-5" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            {/* Enable Quick Billing Mode */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default to Quick Invoicing</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Simplify invoice creation by showing only essential fields (Customer, Product, Amount) by default.</p>
                                </div>
                                <button
                                    type="button" role="switch" aria-checked={settings.enableQuickBilling}
                                    onClick={() => updateSetting("enableQuickBilling", !settings.enableQuickBilling)}
                                    className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                        settings.enableQuickBilling ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableQuickBilling ? "translate-x-5" : "translate-x-0.5"}`} />
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