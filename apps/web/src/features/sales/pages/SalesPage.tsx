import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    MoreHorizontal,
    FileText,
    Plus,
    Settings2,
    MessageCircle,
    Mail,
    ReceiptIndianRupee,
    ArrowDownLeft,
    ShoppingBag,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useSalesSettings } from "@/core/hooks/use-sales-settings";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import { UniversalPaymentDialog } from "@/features/payments/components/UniversalPaymentDialog";
import { PaymentInRegister } from "@/features/payments/components/PaymentInRegister";
import { SalesOrderRegister } from "../components/SalesOrderRegister";
import { BillPaymentTranscriptDialog } from "@/features/payments/components/BillPaymentTranscriptDialog";
import { SendWhatsAppDialog } from "@/features/whatsapp/components/SendWhatsAppDialog";
import { BulkWhatsAppReminderDialog } from "@/features/whatsapp/components/BulkWhatsAppReminderDialog";

import { Sale } from "../types";
import { useSalesCalculations } from "../hooks/useSalesCalculations";
import { useSalesActions } from "../hooks/useSalesActions";
import { SalesMetricsStrip } from "../components/SalesMetricsStrip";
import { SalesTable, FilterStatus, SortOption } from "../components/SalesTable";
import { SalesSettingsDialog } from "../components/SalesSettingsDialog";

export default function SalesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>('date-desc');

    const navigate = useNavigate();
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
        initialData: () => queryClient.getQueryData(["profile", user?.id]) || undefined,
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
        initialData: () => queryClient.getQueryData<any[]>(["parties", user?.id]) || undefined,
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
                console.warn("[Sales] Products fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("products", user.id)) || [];
        },
        initialData: () => queryClient.getQueryData<any[]>(["products", user?.id]) || undefined,
        enabled: !!user,
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
        initialData: () => queryClient.getQueryData<Sale[]>(["sales", user?.id]) || undefined,
        enabled: !!user
    });

    // Single-pass calculations for KPI summaries
    const { outstandingTotal, overdueTotal, paidThisMonth } = useSalesCalculations(invoices);

    // Document actions, printing, sharing, WhatsApp, deletion
    const {
        paymentTarget,
        setPaymentTarget,
        transcriptTarget,
        setTranscriptTarget,
        isPaymentInOpen,
        setIsPaymentInOpen,
        whatsappInvoice,
        setWhatsappInvoice,
        whatsappPdfBase64,
        isBulkWhatsAppOpen,
        setIsBulkWhatsAppOpen,
        handleOpenRecordPayment,
        handleOpenTranscript,
        handlePreview,
        handlePrint,
        handleDownload,
        handleShare,
        handleOpenWhatsApp,
        handleGenerateEInvoice,
        handleBulkWhatsApp,
        handleBulkEmail,
        handleDelete,
    } = useSalesActions({
        invoices,
        parties,
        profile,
        settings,
        user,
        formatCurrency,
        queryClient,
    });

    const handleEdit = (invoice: Sale) => {
        setEditingInvoice(invoice);
        setIsCreateOpen(true);
    };

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
                                <DropdownMenuContent align="end" className="w-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <DropdownMenuItem onClick={handleBulkWhatsApp} className="cursor-pointer py-2 font-medium">
                                        <MessageCircle className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> Send WhatsApp to Overdue
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleBulkEmail} className="cursor-pointer py-2">
                                        <Mail className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Send Emails to Overdue
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

                {/* FinFlow Tab Switcher */}
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
                    </button>
                </div>

                {activeTab === "sales-order" ? (
                    <SalesOrderRegister
                        userId={user?.id || ""}
                        parties={parties}
                        products={products}
                    />
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
                        <SalesMetricsStrip
                            outstandingTotal={outstandingTotal}
                            overdueTotal={overdueTotal}
                            paidThisMonth={paidThisMonth}
                        />

                        <SalesTable
                            invoices={invoices}
                            isLoading={isLoading}
                            searchTerm={searchTerm}
                            filterStatus={filterStatus}
                            setFilterStatus={setFilterStatus}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            onEdit={handleEdit}
                            onPrint={handlePrint}
                            onPreview={handlePreview}
                            onDownload={handleDownload}
                            onShare={handleShare}
                            onWhatsApp={handleOpenWhatsApp}
                            onGenerateEInvoice={handleGenerateEInvoice}
                            onDelete={handleDelete}
                            onOpenRecordPayment={handleOpenRecordPayment}
                            onOpenTranscript={handleOpenTranscript}
                        />
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
                    onSuccess={(_newInv) => {
                        // Handled natively by InvoicePreview inside CreateInvoiceDialog
                    }}
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

                {/* WhatsApp Invoice Dialog */}
                {whatsappInvoice && (
                    <SendWhatsAppDialog
                        open={!!whatsappInvoice}
                        onOpenChange={(open) => !open && setWhatsappInvoice(null)}
                        messageType="invoice"
                        recipientName={whatsappInvoice.customer_name}
                        recipientPhone={whatsappInvoice.customer_phone || ""}
                        attachmentName={`Invoice_${whatsappInvoice.invoice_number}.pdf`}
                        attachmentBase64={whatsappPdfBase64}
                        metadata={{
                            invoice_id: whatsappInvoice.id,
                            invoice_number: whatsappInvoice.invoice_number,
                            total_amount: Number(whatsappInvoice.total_amount || 0),
                            amount_paid: Number(whatsappInvoice.amount_paid || 0),
                            balance_due: Number(whatsappInvoice.balance_due != null ? whatsappInvoice.balance_due : Math.max(0, Number(whatsappInvoice.total_amount) - Number(whatsappInvoice.amount_paid || 0))),
                            due_date: whatsappInvoice.due_date || undefined,
                        }}
                    />
                )}

                {/* Bulk WhatsApp Reminders Dialog */}
                <BulkWhatsAppReminderDialog
                    open={isBulkWhatsAppOpen}
                    onOpenChange={setIsBulkWhatsAppOpen}
                    invoices={invoices.filter((inv) => inv.status === 'overdue')}
                    currencySymbol="₹"
                    onOpenSettings={() => navigate("/settings?tab=whatsapp")}
                />

                {/* Sales Settings Dialog */}
                <SalesSettingsDialog
                    open={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    settings={settings}
                    updateSetting={updateSetting}
                    resetSettings={resetSettings}
                />
            </div>
        </AppLayout>
    );
}