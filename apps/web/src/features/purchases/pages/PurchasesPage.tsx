import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Search,
    FileText,
    Plus,
    ShoppingBag,
    Zap,
    ReceiptIndianRupee,
    ArrowUpRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";

import { RecordPurchaseDialog } from "../components/RecordPurchaseDialog";
import { UniversalPaymentDialog } from "@/features/payments/components/UniversalPaymentDialog";
import { PaymentOutRegister } from "@/features/payments/components/PaymentOutRegister";
import { BillPaymentTranscriptDialog } from "@/features/payments/components/BillPaymentTranscriptDialog";
import { PurchaseOrderRegister } from "../components/PurchaseOrderRegister";

import { Purchase } from "../types";
import { usePurchasesPageCalculations } from "../hooks/usePurchasesPageCalculations";
import { usePurchaseActions } from "../hooks/usePurchaseActions";
import { PurchasesMetricsStrip } from "../components/PurchasesMetricsStrip";
import {
    PurchasesTable,
    PurchaseFilterStatus,
    PurchaseSortOption,
} from "../components/PurchasesTable";

export default function PurchasesPage() {
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();

    const [isRecordOpen, setIsRecordOpen] = useState(false);
    const [startWithScanner, setStartWithScanner] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<PurchaseFilterStatus>('all');
    const [sortBy, setSortBy] = useState<PurchaseSortOption>('date-desc');
    const [editingPurchase, setEditingPurchase] = useState<any>(null);

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
                console.warn("[Purchases] Parties fetch fallback:", e);
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
                console.warn("[Purchases] Products fetch fallback:", e);
            }
            return (await sqliteService.getAll<any>("products", user.id)) || [];
        },
        initialData: () => queryClient.getQueryData<any[]>(["products", user?.id]) || undefined,
        enabled: !!user,
    });

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
        initialData: () => queryClient.getQueryData<Purchase[]>(["purchases", user?.id]) || undefined,
        enabled: !!user
    });

    // KPI Metrics calculation
    const { overdueTotal, outstandingTotal, spentThisMonth } = usePurchasesPageCalculations(purchases);

    // Document actions, printing, sharing, deletion
    const {
        paymentPurchase,
        setPaymentPurchase,
        transcriptPurchase,
        setTranscriptPurchase,
        isPaymentOutOpen,
        setIsPaymentOutOpen,
        handlePreview,
        handlePrint,
        handleDownload,
        handleShare,
        handleDelete,
        openRecordPayment,
        openTranscript,
    } = usePurchaseActions({
        profile,
        user,
        formatCurrency,
        queryClient,
    });

    const handleEdit = (purchase: Purchase) => {
        setEditingPurchase(purchase);
        setIsRecordOpen(true);
    };

    return (
        <AppLayout>
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Purchases & Bills</h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 dark:text-slate-400">Track and manage your vendor expenses, bills, and payables.</p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                        <div className="relative group w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 pl-9 pr-4 text-xs sm:text-sm rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-slate-100 shadow-2xs"
                                placeholder="Search purchases..."
                            />
                        </div>
                        <button
                            onClick={() => {
                                setEditingPurchase(null);
                                setStartWithScanner(true);
                                setIsRecordOpen(true);
                            }}
                            className="flex items-center justify-center whitespace-nowrap gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg shadow-2xs transition-all flex-1 sm:flex-initial"
                            title="1-Click AI Purchase Bill Scanner"
                        >
                            <Zap className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                            <span className="hidden sm:inline">⚡ Scan & Auto-Save</span>
                            <span className="sm:hidden">Scan Bill</span>
                        </button>

                        <button
                            onClick={() => {
                                setPaymentPurchase(null);
                                setIsPaymentOutOpen(true);
                            }}
                            className="flex items-center justify-center whitespace-nowrap gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all flex-1 sm:flex-initial"
                            title="Record Payment Out (With or Without Bill)"
                        >
                            <ReceiptIndianRupee className="w-3.5 h-3.5" />
                            <span>+ Payment Out</span>
                        </button>

                        <button
                            onClick={() => {
                                setEditingPurchase(null);
                                setStartWithScanner(false);
                                setIsRecordOpen(true);
                            }}
                            className="flex items-center justify-center whitespace-nowrap gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex-1 sm:flex-initial"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Record Purchase</span>
                        </button>
                    </div>
                </div>

                {/* FinFlow Tab Switcher */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit mb-4">
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
                        onOpenTranscript={openTranscript}
                        onPreviewPurchase={handlePreview}
                    />
                ) : (
                    <>
                        <PurchasesMetricsStrip
                            outstandingTotal={outstandingTotal}
                            overdueTotal={overdueTotal}
                            spentThisMonth={spentThisMonth}
                        />

                        <PurchasesTable
                            purchases={purchases}
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
                            onDelete={handleDelete}
                            onOpenRecordPayment={openRecordPayment}
                            onOpenTranscript={openTranscript}
                        />
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