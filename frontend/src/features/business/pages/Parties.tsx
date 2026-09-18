import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import {
    Plus,
    Users,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    FileText,
    Download,
    Eye,
    ReceiptIndianRupee,
    Phone,
    Mail,
    MapPin,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    ArrowLeft,
    Share2,
    Calendar,
    FileSpreadsheet,
    Building2,
    ExternalLink,
    X
} from "lucide-react";
import {
    exportPartiesToExcel,
    exportPartiesToPDF,
    exportPartyStatementToExcel,
    exportPartyStatementToPDF
} from "@/utils/exportParties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/core/hooks/use-toast";
import { PartyDialog } from "../components/PartyDialog";
import { PartyImportExportDialog } from "../components/PartyImportExportDialog";
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import { RecordPurchaseDialog } from "../components/RecordPurchaseDialog";
import { TableLoadingRows } from "@/components/shared/PageStates";

export type SettlementType = "sale" | "purchase";

export interface SettlementTarget {
    type: SettlementType;
    record: any;
    partyName: string;
    docNumber: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
}

export interface Party {
    id: string;
    user_id: string;
    type: "customer" | "vendor" | "both";
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    gst_number: string | null;
    opening_balance?: number;
    opening_balance_type?: "to_receive" | "to_pay";
    created_at: string;
    updated_at?: string;
}

const getPartiesTable = () => (supabase as any).from("parties");

const buildPartyUpdatePayload = (updatedParty: Partial<Party>): Record<string, any> => {
    const updatePayload: Record<string, any> = {};
    if (updatedParty.name !== undefined) updatePayload.name = updatedParty.name;
    if (updatedParty.type !== undefined) updatePayload.type = updatedParty.type;
    if (updatedParty.phone !== undefined) updatePayload.phone = updatedParty.phone;
    if (updatedParty.email !== undefined) updatePayload.email = updatedParty.email;
    if (updatedParty.address !== undefined) updatePayload.address = updatedParty.address;
    if (updatedParty.gst_number !== undefined) updatePayload.gst_number = updatedParty.gst_number;
    if (updatedParty.opening_balance !== undefined) updatePayload.opening_balance = Number(updatedParty.opening_balance) || 0;
    if (updatedParty.opening_balance_type !== undefined) updatePayload.opening_balance_type = updatedParty.opening_balance_type;
    return updatePayload;
};

const PartiesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"All Types" | "Customer" | "Vendor" | "Both">("All Types");
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const [showMobileDetail, setShowMobileDetail] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "sales" | "purchases">("all");

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isImportExportOpen, setIsImportExportOpen] = useState(false);

    // Create Invoice / Purchase for Party State
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
    const [partyForNewInvoice, setPartyForNewInvoice] = useState<Party | null>(null);
    const [isRecordPurchaseOpen, setIsRecordPurchaseOpen] = useState(false);
    const [partyForNewPurchase, setPartyForNewPurchase] = useState<Party | null>(null);

    // Settlement / Payment Dialog State (Unified for Sales Collections & Purchase Settlements)
    const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    // Delete Alert States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

    // Fetch Business Profile (for invoice printing)
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
                console.warn("[Parties] Profile fetch failed offline, falling back to cache:", e);
            }
            const cached = queryClient.getQueryData<any>(["profile", user.id]);
            if (cached) return cached;
            return await sqliteService.getById<any>(user.id);
        },
        enabled: !!user
    });

    // Fetch Parties with Offline Fallback
    const { data: parties = [], isLoading: isLoadingParties } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await getPartiesTable()
                    .select("*")
                    .order("name");
                if (!error && data) return data as Party[];
            } catch (e) {
                console.warn("[Parties] Parties fetch failed offline, falling back to cache:", e);
            }
            const cached = queryClient.getQueryData<Party[]>(["parties", user.id]);
            if (cached && cached.length > 0) return cached;
            const localData = await sqliteService.getAll<Party>("parties", user.id);
            return localData || [];
        },
        enabled: !!user
    });

    // Fetch Sales (Invoices) for Customer Ledger with Offline Fallback
    const { data: sales = [], isLoading: isLoadingSales } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sales")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });
                if (!error && data) return data || [];
            } catch (e) {
                console.warn("[Parties] Sales fetch failed offline, falling back to cache:", e);
            }
            const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
            if (cached && cached.length > 0) return cached;
            const localData = await sqliteService.getAll<any>("sales", user.id);
            return localData || [];
        },
        enabled: !!user
    });

    // Fetch Purchases for Vendor Ledger with Offline Fallback
    const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchases")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });
                if (!error && data) return data || [];
            } catch (e) {
                console.warn("[Parties] Purchases fetch failed offline, falling back to cache:", e);
            }
            const cached = queryClient.getQueryData<any[]>(["purchases", user.id]);
            if (cached && cached.length > 0) return cached;
            const localData = await sqliteService.getAll<any>("purchases", user.id);
            return localData || [];
        },
        enabled: !!user
    });

    // Calculate metrics for each party
    const partyLedgerMap = useMemo(() => {
        const map = new Map<string, {
            partySales: any[];
            partyPurchases: any[];
            totalSalesAmount: number;
            totalSalesPaid: number;
            salesBalanceDue: number;
            totalPurchasesAmount: number;
            totalPurchasesPaid: number;
            purchasesBalanceDue: number;
            receivable: number;
            payable: number;
            totalRecords: number;
        }>();

        for (const party of parties) {
            const pName = (party.name || "").trim().toLowerCase();

            const partySales = sales.filter((s: any) =>
                (s.party_id && s.party_id === party.id) ||
                (s.customer_name && s.customer_name.trim().toLowerCase() === pName)
            );

            const partyPurchases = purchases.filter((p: any) =>
                (p.party_id && p.party_id === party.id) ||
                (p.vendor_name && p.vendor_name.trim().toLowerCase() === pName)
            );

            let totalSalesAmount = 0;
            let totalSalesPaid = 0;
            let salesBalanceDue = 0;

            partySales.forEach((s: any) => {
                const total = Number(s.total_amount) || 0;
                const paid = Number(s.amount_paid != null ? s.amount_paid : (s.status === 'paid' ? total : 0));
                const due = Number(s.balance_due != null ? s.balance_due : Math.max(0, total - paid));
                const docType = (s.document_type || 'invoice').toLowerCase();

                if (docType === 'receipt') {
                    // Standalone Payment In reduces receivable
                    salesBalanceDue = Math.max(0, salesBalanceDue - (total || paid));
                } else if (docType === 'credit_note') {
                    salesBalanceDue = Math.max(0, salesBalanceDue - total);
                } else if (docType === 'debit_note') {
                    totalSalesAmount += total;
                    salesBalanceDue += total;
                } else {
                    totalSalesAmount += total;
                    totalSalesPaid += paid;
                    salesBalanceDue += due;
                }
            });

            let totalPurchasesAmount = 0;
            let totalPurchasesPaid = 0;
            let purchasesBalanceDue = 0;

            partyPurchases.forEach((p: any) => {
                const total = Number(p.total_amount) || 0;
                const paid = Number(p.amount_paid != null ? p.amount_paid : (p.status === 'paid' ? total : 0));
                const due = Number(p.balance_due != null ? p.balance_due : Math.max(0, total - paid));
                const docType = (p.document_type || 'bill').toLowerCase();

                if (docType === 'payment') {
                    // Standalone Payment Out reduces payable
                    purchasesBalanceDue = Math.max(0, purchasesBalanceDue - (total || paid));
                } else if (docType === 'debit_note') {
                    purchasesBalanceDue = Math.max(0, purchasesBalanceDue - total);
                } else if (docType === 'credit_note') {
                    totalPurchasesAmount += total;
                    purchasesBalanceDue += total;
                } else {
                    totalPurchasesAmount += total;
                    totalPurchasesPaid += paid;
                    purchasesBalanceDue += due;
                }
            });

            const openingBal = Number(party.opening_balance) || 0;
            const isOpeningReceivable = party.opening_balance_type
                ? party.opening_balance_type === 'to_receive'
                : party.type !== 'vendor';
            const receivable = salesBalanceDue + (isOpeningReceivable ? openingBal : 0);
            const payable = purchasesBalanceDue + (!isOpeningReceivable ? openingBal : 0);

            map.set(party.id, {
                partySales,
                partyPurchases,
                totalSalesAmount,
                totalSalesPaid,
                salesBalanceDue,
                totalPurchasesAmount,
                totalPurchasesPaid,
                purchasesBalanceDue,
                receivable,
                payable,
                totalRecords: partySales.length + partyPurchases.length + (openingBal > 0 ? 1 : 0)
            });
        }

        return map;
    }, [parties, sales, purchases]);

    // Top Summary Statistics
    const directorySummary = useMemo(() => {
        let totalReceivables = 0;
        let totalPayables = 0;
        let settledCount = 0;

        for (const party of parties) {
            const metrics = partyLedgerMap.get(party.id);
            if (!metrics) continue;

            totalReceivables += metrics.receivable;
            totalPayables += metrics.payable;

            if (metrics.receivable === 0 && metrics.payable === 0) {
                settledCount++;
            }
        }

        return {
            totalParties: parties.length,
            totalReceivables,
            totalPayables,
            settledCount
        };
    }, [parties, partyLedgerMap]);

    // Filtered Parties
    const filteredParties = useMemo(() => {
        return parties.filter(party => {
            const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (party.phone && party.phone.includes(searchTerm)) ||
                (party.type && party.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (party.gst_number && party.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));

            let matchesType = true;
            if (filterType === "Customer") matchesType = party.type === "customer";
            else if (filterType === "Vendor") matchesType = party.type === "vendor";
            else if (filterType === "Both") matchesType = party.type === "both";

            return matchesSearch && matchesType;
        });
    }, [parties, searchTerm, filterType]);

    // Keep active selection in sync
    useEffect(() => {
        if (filteredParties.length > 0) {
            if (!selectedPartyId || !filteredParties.some(p => p.id === selectedPartyId)) {
                setSelectedPartyId(filteredParties[0].id);
            }
        } else {
            setSelectedPartyId(null);
        }
    }, [filteredParties, selectedPartyId]);

    const activeParty = useMemo(() => {
        return parties.find(p => p.id === selectedPartyId) || null;
    }, [parties, selectedPartyId]);

    const activePartyMetrics = useMemo(() => {
        if (!activeParty) return null;
        return partyLedgerMap.get(activeParty.id) || null;
    }, [activeParty, partyLedgerMap]);

    // Unified transactions for active party
    const activePartyTransactions = useMemo(() => {
        if (!activePartyMetrics || !activeParty) return [];
        const list: any[] = [];

        activePartyMetrics.partySales.forEach((s: any) => {
            const currentPaid = Number(s.amount_paid || (s.status === 'paid' ? s.total_amount : 0));
            const balDue = Number(s.balance_due != null ? s.balance_due : (s.status === 'paid' ? 0 : Math.max(0, (Number(s.total_amount) || 0) - currentPaid)));
            list.push({
                id: s.id,
                docType: 'sale',
                docNumber: s.invoice_number || 'INV',
                date: s.date || s.created_at,
                total: Number(s.total_amount) || 0,
                paid: currentPaid,
                balanceDue: balDue,
                status: s.status,
                raw: s
            });
        });

        activePartyMetrics.partyPurchases.forEach((p: any) => {
            const currentPaid = Number(p.amount_paid || (p.status === 'paid' ? p.total_amount : 0));
            const balDue = Number(p.balance_due != null ? p.balance_due : (p.status === 'paid' ? 0 : Math.max(0, (Number(p.total_amount) || 0) - currentPaid)));
            list.push({
                id: p.id,
                docType: 'purchase',
                docNumber: p.bill_number || 'BILL',
                date: p.date || p.created_at,
                total: Number(p.total_amount) || 0,
                paid: currentPaid,
                balanceDue: balDue,
                status: p.status,
                raw: p
            });
        });

        const openBal = Number(activeParty.opening_balance) || 0;
        if (openBal > 0) {
            const isOpeningReceivable = activeParty.opening_balance_type
                ? activeParty.opening_balance_type === 'to_receive'
                : activeParty.type !== 'vendor';
            list.push({
                id: 'opening-balance-' + activeParty.id,
                docType: 'opening_balance',
                docNumber: 'OPENING',
                date: activeParty.created_at,
                total: openBal,
                paid: 0,
                balanceDue: openBal,
                status: isOpeningReceivable ? 'to_receive' : 'to_pay',
                isReceivable: isOpeningReceivable,
                raw: null
            });
        }

        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (activeTab === "sales") return list.filter(t => t.docType === 'sale' || (t.docType === 'opening_balance' && t.isReceivable));
        if (activeTab === "purchases") return list.filter(t => t.docType === 'purchase' || (t.docType === 'opening_balance' && !t.isReceivable));
        return list;
    }, [activeParty, activePartyMetrics, activeTab]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (newParty: Partial<Party>) => {
            if (!newParty.name) throw new Error("Party name is required");

            const currentUser = user;
            if (!currentUser) throw new Error("User not authenticated");

            const cachedParties: Party[] = queryClient.getQueryData(["parties", currentUser.id]) || [];
            const exists = cachedParties.some(p => p.name.toLowerCase() === newParty.name!.toLowerCase());

            if (exists) {
                throw new Error(`A party with the name "${newParty.name}" already exists.`);
            }

            const partyId = uuidv4();
            const partyPayload = {
                id: partyId,
                user_id: currentUser.id,
                name: newParty.name,
                type: newParty.type || "customer",
                phone: newParty.phone || null,
                email: newParty.email || null,
                address: newParty.address || null,
                gst_number: newParty.gst_number || null,
                opening_balance: Number(newParty.opening_balance) || 0,
                opening_balance_type: newParty.opening_balance_type || (newParty.type === 'vendor' ? 'to_pay' : 'to_receive'),
                created_at: new Date().toISOString()
            } as Party;

            const { error } = await offlineMutate({
                table: "parties",
                action: "insert",
                recordId: partyId,
                payload: partyPayload,
                userId: currentUser.id
            });
            if (error) throw error;
            return partyPayload;
        },
        onSuccess: (data) => {
            if (user?.id) {
                queryClient.setQueryData(["parties", user.id], (old: any) => {
                    const sorted = old ? [...old, data] : [data];
                    return sorted.sort((a: any, b: any) => a.name.localeCompare(b.name));
                });
            }

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["parties"] });
                queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
                queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            }
            setSelectedPartyId(data.id);
            toast({ title: "Party created successfully" });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error creating party", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (updatedParty: Partial<Party>) => {
            if (!selectedParty?.id) {
                throw new Error("No party selected for update");
            }

            const currentUser = user;
            if (!currentUser) throw new Error("User not authenticated");

            if (updatedParty.name && updatedParty.name !== selectedParty.name) {
                const cachedParties: Party[] = queryClient.getQueryData(["parties", currentUser.id]) || [];
                const exists = cachedParties.some(p => p.name.toLowerCase() === updatedParty.name!.toLowerCase());

                if (exists) {
                    throw new Error(`A party with the name "${updatedParty.name}" already exists.`);
                }
            }

            const updatePayload = buildPartyUpdatePayload(updatedParty);

            const { error } = await offlineMutate({
                table: "parties",
                action: "update",
                recordId: selectedParty.id,
                payload: updatePayload,
                userId: currentUser.id
            });
            if (error) throw error;
            return { id: selectedParty.id, ...updatedParty };
        },
        onSuccess: (data) => {
            if (user?.id) {
                queryClient.setQueryData(["parties", user.id], (old: any) => {
                    return old ? old.map((p: any) => p.id === data.id ? { ...p, ...data } : p).sort((a: any, b: any) => a.name.localeCompare(b.name)) : [];
                });
            }

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["parties"] });
                queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
                queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            }
            toast({ title: "Party updated successfully" });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error updating party", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const currentUser = user;
            if (!currentUser) throw new Error("User not authenticated");

            const currentPartyToDelete = parties.find(p => p.id === id);
            if (currentPartyToDelete) {
                const deletedItem = {
                    ...currentPartyToDelete,
                    type: "party",
                    party_type: currentPartyToDelete.type,
                    deleted_at: new Date().toISOString()
                };
                delete (deletedItem as any).type;
                deletedItem.type = "party";

                const key = `recently_deleted_parties_${currentUser.id}`;
                const existingStr = localStorage.getItem(key);
                const existing = existingStr ? JSON.parse(existingStr) : [];
                localStorage.setItem(key, JSON.stringify([deletedItem, ...existing]));
            }

            const { error } = await offlineMutate({
                table: "parties",
                action: "delete",
                recordId: id,
                userId: currentUser.id
            });
            if (error) throw error;
        },
        onSuccess: (_data, id) => {
            if (user?.id) {
                queryClient.setQueryData(["parties", user.id], (old: any) => {
                    return old ? old.filter((p: any) => p.id !== id) : [];
                });
            }

            if (selectedPartyId === id) {
                const remaining = parties.filter(p => p.id !== id);
                setSelectedPartyId(remaining.length > 0 ? remaining[0].id : null);
            }

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["parties"] });
                queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
                queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            }
            toast({ title: "Party deleted successfully" });
            setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
            toast({ title: "Error deleting party", description: error.message, variant: "destructive" });
        }
    });

    // Unified Settlement recording inside Party Statement (Receive Collections & Pay Bills)
    const handleOpenSettlement = (item: any, type: SettlementType) => {
        const isSale = type === "sale";
        const currentPaid = Number(item.amount_paid || (item.status === 'paid' ? item.total_amount : 0));
        const total = Number(item.total_amount) || 0;
        const balDue = Number(item.balance_due != null ? item.balance_due : (item.status === 'paid' ? 0 : Math.max(0, total - currentPaid)));
        const docNumber = isSale ? (item.invoice_number || 'INV') : (item.bill_number || 'BILL');
        const partyName = isSale ? (item.customer_name || activeParty?.name || "Customer") : (item.vendor_name || activeParty?.name || "Vendor");

        setSettlementTarget({
            type,
            record: item,
            partyName,
            docNumber,
            totalAmount: total,
            amountPaid: currentPaid,
            balanceDue: balDue
        });
        setPaymentAmount(balDue > 0 ? String(balDue) : String(total));
        setPaymentMethod("cash");
        setPaymentNotes("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
    };

    // Fast Header Action: Instant Receive Payment from active customer
    const handleQuickReceivePartyPayment = () => {
        if (!activePartyMetrics || activePartyMetrics.receivable <= 0) return;
        const pendingSales = activePartyMetrics.partySales
            .filter((s: any) => {
                const paid = Number(s.amount_paid || (s.status === 'paid' ? s.total_amount : 0));
                const due = Number(s.balance_due != null ? s.balance_due : (s.status === 'paid' ? 0 : Math.max(0, (Number(s.total_amount) || 0) - paid)));
                return due > 0;
            })
            .sort((a: any, b: any) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

        if (pendingSales.length > 0) {
            handleOpenSettlement(pendingSales[0], "sale");
        } else {
            toast({
                title: "Opening Balance Receivable",
                description: `This party has an opening receivable balance of ${formatCurrency(activePartyMetrics.receivable)}. Record an invoice or ledger adjustment to settle.`
            });
        }
    };

    // Fast Header Action: Instant Pay Vendor for active supplier
    const handleQuickPayVendor = () => {
        if (!activePartyMetrics || activePartyMetrics.payable <= 0) return;
        const pendingPurchases = activePartyMetrics.partyPurchases
            .filter((p: any) => {
                const paid = Number(p.amount_paid || (p.status === 'paid' ? p.total_amount : 0));
                const due = Number(p.balance_due != null ? p.balance_due : (p.status === 'paid' ? 0 : Math.max(0, (Number(p.total_amount) || 0) - paid)));
                return due > 0;
            })
            .sort((a: any, b: any) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

        if (pendingPurchases.length > 0) {
            handleOpenSettlement(pendingPurchases[0], "purchase");
        } else {
            toast({
                title: "Opening Balance Payable",
                description: `This vendor has an opening payable balance of ${formatCurrency(activePartyMetrics.payable)}. Record a purchase bill to settle.`
            });
        }
    };

    const handleSaveSettlement = async () => {
        if (!settlementTarget || !user?.id) return;
        const addAmount = Number(paymentAmount) || 0;
        if (addAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter an amount greater than 0.", variant: "destructive" });
            return;
        }

        const { type, record, docNumber, partyName, totalAmount } = settlementTarget;
        const isSale = type === "sale";
        const currentPaid = Number(record.amount_paid || 0);
        const newAmountPaid = Math.min(totalAmount, Math.round((currentPaid + addAmount) * 100) / 100);
        const newBalanceDue = Math.max(0, Math.round((totalAmount - newAmountPaid) * 100) / 100);
        const newStatus: 'paid' | 'partial' = newBalanceDue <= 0 ? 'paid' : 'partial';

        setIsSubmittingPayment(true);
        try {
            const actionVerb = isSale ? "Received" : "Paid";
            const auditNote = `${actionVerb} ${formatCurrency(addAmount)} via ${paymentMethod} on ${paymentDate}${paymentNotes ? `: ${paymentNotes}` : ""}`;
            const mergedNotes = record.notes ? `${record.notes} | ${auditNote}` : auditNote;

            const table = isSale ? "sales" : "purchases";
            const updatePayload: any = {
                ...record,
                amount_paid: newAmountPaid,
                balance_due: newBalanceDue,
                status: newStatus,
                notes: mergedNotes
            };

            if (isSale) {
                updatePayload.payment_method = paymentMethod || "cash";
            }

            const { error } = await offlineMutate({
                table,
                action: "update",
                recordId: record.id,
                payload: updatePayload,
                userId: user.id
            });

            if (error) throw error;

            const queryKey = isSale ? ["sales", user.id] : ["purchases", user.id];
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return [];
                return old.map((item: any) => item.id === record.id ? { ...item, ...updatePayload } : item);
            });

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey });
                queryClient.invalidateQueries({ queryKey: ["parties"] });
                if (isSale) queryClient.invalidateQueries({ queryKey: ["invoice-parties"] });
                else queryClient.invalidateQueries({ queryKey: ["purchase-parties"] });
            }

            toast({
                title: isSale ? "Payment Received" : "Payment Recorded",
                description: newStatus === 'paid'
                    ? `${isSale ? 'Invoice' : 'Bill'} ${docNumber} is now fully settled.`
                    : `Recorded ${formatCurrency(addAmount)} ${isSale ? 'from' : 'to'} ${partyName}. Remaining balance is ${formatCurrency(newBalanceDue)}.`
            });

            setSettlementTarget(null);
        } catch (err: any) {
            console.error("Error saving settlement:", err);
            toast({ title: "Settlement Error", description: err?.message || "Failed to record transaction.", variant: "destructive" });
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    // Handlers
    const handleAddClick = () => {
        setSelectedParty(null);
        setIsEditing(false);
        setIsDialogOpen(true);
    };

    const handleEditClick = (party: Party) => {
        setSelectedParty(party);
        setIsEditing(true);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (party: Party) => {
        setPartyToDelete(party);
        setIsDeleteDialogOpen(true);
    };

    const handlePartySelect = (partyId: string) => {
        setSelectedPartyId(partyId);
        setShowMobileDetail(true);
    };

    const handleCreateInvoiceForParty = (party: Party) => {
        setPartyForNewInvoice(party);
        setIsCreateInvoiceOpen(true);
    };

    const handleCreatePurchaseForParty = (party: Party) => {
        setPartyForNewPurchase(party);
        setIsRecordPurchaseOpen(true);
    };

    const handleSaveParty = (partyData: Partial<Party>) => {
        if (isEditing) {
            updateMutation.mutate(partyData);
        } else {
            createMutation.mutate(partyData);
        }
    };

    const confirmDelete = () => {
        if (partyToDelete) {
            deleteMutation.mutate(partyToDelete.id);
        }
    };

    const handleDownloadInvoicePDF = (invoice: any) => {
        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date || invoice.created_at,
            due_date: invoice.due_date,
            status: invoice.status,
            amount_paid: invoice.amount_paid,
            balance_due: invoice.balance_due,
            payment_method: invoice.payment_method,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: (invoice.items || []).map((item: any) => ({
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
            irn: invoice.irn,
            eway_bill_number: invoice.eway_bill_number,
            qr_code: invoice.qr_code,
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

    const handlePreviewInvoicePDF = async (invoice: any) => {
        const url = await generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date || invoice.created_at,
            due_date: invoice.due_date,
            status: invoice.status,
            amount_paid: invoice.amount_paid,
            balance_due: invoice.balance_due,
            payment_method: invoice.payment_method,
            customer_name: invoice.customer_name,
            customer_phone: invoice.customer_phone,
            customer_email: invoice.customer_email,
            customer_gstin: invoice.customer_gstin,
            items: (invoice.items || []).map((item: any) => ({
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
            irn: invoice.irn,
            eway_bill_number: invoice.eway_bill_number,
            qr_code: invoice.qr_code,
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

    const handleDownloadPurchasePDF = (purchase: any) => {
        generateInvoicePDF({
            invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date || purchase.created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: purchase.amount_paid,
            balance_due: purchase.balance_due,
            payment_method: "cash",
            customer_name: purchase.vendor_name || activeParty?.name || "Vendor",
            customer_phone: purchase.vendor_phone || activeParty?.phone,
            customer_email: purchase.vendor_email || activeParty?.email,
            customer_gstin: purchase.vendor_gstin || activeParty?.gst_number,
            items: (purchase.items || []).map((item: any) => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
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

    const handlePreviewPurchasePDF = async (purchase: any) => {
        const url = await generateInvoicePDF({
            invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date || purchase.created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: purchase.amount_paid,
            balance_due: purchase.balance_due,
            payment_method: "cash",
            customer_name: purchase.vendor_name || activeParty?.name || "Vendor",
            customer_phone: purchase.vendor_phone || activeParty?.phone,
            customer_email: purchase.vendor_email || activeParty?.email,
            customer_gstin: purchase.vendor_gstin || activeParty?.gst_number,
            items: (purchase.items || []).map((item: any) => ({
                description: item.description || item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.total ?? item.amount ?? (item.quantity * item.price),
                hsn_code: item.hsn_code,
                unit: item.unit,
            })),
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

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase() || 'NA';
    };

    // Party Export Handlers
    const handleExportPartiesExcel = () => {
        try {
            const listToExport = filteredParties.length > 0 ? filteredParties : parties;
            if (listToExport.length === 0) {
                toast({ title: "No Parties", description: "There are no parties available to export.", variant: "destructive" });
                return;
            }
            exportPartiesToExcel(
                listToExport,
                partyLedgerMap,
                profile ? {
                    name: (profile as any).business_name || (profile as any).display_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone || (profile as any).phone,
                    gst: (profile as any).gst_number
                } : undefined,
                filterType !== "All Types" ? filterType : undefined
            );
            toast({ title: "Excel Export Complete", description: `Exported ${listToExport.length} parties to Excel.` });
        } catch (err: any) {
            console.error("Failed to export parties to Excel:", err);
            toast({ title: "Export Failed", description: err.message || "Failed to export Excel file.", variant: "destructive" });
        }
    };

    const handleExportPartiesPDF = () => {
        try {
            const listToExport = filteredParties.length > 0 ? filteredParties : parties;
            if (listToExport.length === 0) {
                toast({ title: "No Parties", description: "There are no parties available to export.", variant: "destructive" });
                return;
            }
            exportPartiesToPDF(
                listToExport,
                partyLedgerMap,
                profile ? {
                    name: (profile as any).business_name || (profile as any).display_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone || (profile as any).phone,
                    gst: (profile as any).gst_number
                } : undefined,
                filterType !== "All Types" ? filterType : undefined
            );
            toast({ title: "PDF Export Complete", description: `Exported ${listToExport.length} parties to PDF.` });
        } catch (err: any) {
            console.error("Failed to export parties to PDF:", err);
            toast({ title: "Export Failed", description: err.message || "Failed to export PDF file.", variant: "destructive" });
        }
    };

    const handleExportSinglePartyExcel = (party: Party) => {
        try {
            const metrics = partyLedgerMap.get(party.id);
            if (!metrics) {
                toast({ title: "No Data", description: "Party transaction metrics not found.", variant: "destructive" });
                return;
            }
            exportPartyStatementToExcel(
                party,
                metrics,
                profile ? {
                    name: (profile as any).business_name || (profile as any).display_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone || (profile as any).phone,
                    gst: (profile as any).gst_number
                } : undefined
            );
            toast({ title: "Statement Exported", description: `Exported ${party.name}'s statement to Excel.` });
        } catch (err: any) {
            console.error("Failed to export party statement to Excel:", err);
            toast({ title: "Export Failed", description: err.message || "Failed to export statement.", variant: "destructive" });
        }
    };

    const handleExportSinglePartyPDF = (party: Party) => {
        try {
            const metrics = partyLedgerMap.get(party.id);
            if (!metrics) {
                toast({ title: "No Data", description: "Party transaction metrics not found.", variant: "destructive" });
                return;
            }
            exportPartyStatementToPDF(
                party,
                metrics,
                profile ? {
                    name: (profile as any).business_name || (profile as any).display_name,
                    address: (profile as any).business_address,
                    phone: (profile as any).business_phone || (profile as any).phone,
                    gst: (profile as any).gst_number
                } : undefined
            );
            toast({ title: "Statement Exported", description: `Exported ${party.name}'s statement to PDF.` });
        } catch (err: any) {
            console.error("Failed to export party statement to PDF:", err);
            toast({ title: "Export Failed", description: err.message || "Failed to export statement.", variant: "destructive" });
        }
    };

    return (
        <AppLayout>
            <div className="h-full flex flex-col p-2.5 sm:p-3 md:p-4 text-slate-900 dark:text-slate-100 font-display overflow-hidden">
                
                {/* Top Control Bar & KPI Strip */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                        <div className="flex items-center space-x-2">
                            <Users className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Parties & Ledger</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs mt-0.5">
                            Customer and vendor accounts, balances, and transaction history in one unified view.
                        </p>
                    </div>

                    {/* Summary KPI Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
                            <span className="text-slate-500">Parties:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{directorySummary.totalParties}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-700 dark:text-amber-300">To Collect:</span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">{formatCurrency(directorySummary.totalReceivables)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span className="text-rose-700 dark:text-rose-300">To Pay:</span>
                            <span className="font-bold text-rose-700 dark:text-rose-300">{formatCurrency(directorySummary.totalPayables)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsImportExportOpen(true)}
                                className="h-8 px-2.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Import or Export Parties via Excel / CSV"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">Import / Export</span>
                                <span className="sm:hidden">Excel</span>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 border-slate-200 dark:border-slate-700"
                                    >
                                        <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                        <span>Export</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                    <DropdownMenuItem onClick={handleExportPartiesExcel} className="cursor-pointer flex items-center gap-2.5 py-2 text-xs">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        <span>Export All (Excel)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportPartiesPDF} className="cursor-pointer flex items-center gap-2.5 py-2 text-xs">
                                        <FileText className="w-4 h-4 text-rose-600" />
                                        <span>Export All (PDF)</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={handleAddClick}
                                size="sm"
                                className="h-8 px-3 text-xs font-bold shadow-sm bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Party</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Master-Detail Split Screen Container */}
                <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 pt-3 overflow-hidden">
                    
                    {/* LEFT PANEL: Master Directory List (Optimized width for 100% zoom) */}
                    <div className={`w-full md:w-64 lg:w-72 xl:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                        
                        {/* Search & Category Tabs */}
                        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                <Input
                                    placeholder="Search name, phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 h-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-lg">
                                {(["All Types", "Customer", "Vendor", "Both"] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`flex-1 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all text-center ${
                                            filterType === type
                                                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        {type === "All Types" ? "All" : type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Parties Scrollable List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
                            {isLoadingParties ? (
                                <div className="p-3 space-y-2.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="animate-pulse flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                                            <div className="flex-1 space-y-1">
                                                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredParties.length === 0 ? (
                                <div className="p-6 text-center flex flex-col items-center justify-center">
                                    <Users className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700" />
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No parties found</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Try a different search, add a party or import from Excel.</p>
                                    <div className="flex items-center gap-2 mt-2.5">
                                        <Button
                                            size="sm"
                                            onClick={handleAddClick}
                                            className="text-xs h-7 bg-primary text-white"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add Party
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setIsImportExportOpen(true)}
                                            className="text-xs h-7 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                        >
                                            <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-600" /> Import
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                filteredParties.map((party) => {
                                    const metrics = partyLedgerMap.get(party.id);
                                    const isSelected = party.id === selectedPartyId;
                                    const receivable = metrics?.receivable || 0;
                                    const payable = metrics?.payable || 0;

                                    return (
                                        <div
                                            key={party.id}
                                            onClick={() => handlePartySelect(party.id)}
                                            className={`p-2.5 transition-all cursor-pointer flex items-center justify-between gap-2.5 border-l-3 ${
                                                isSelected
                                                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-primary shadow-xs"
                                                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                    party.type === 'customer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' :
                                                    party.type === 'vendor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                    'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                }`}>
                                                    {getInitials(party.name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                                            {party.name}
                                                        </span>
                                                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                                                            party.type === 'customer' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                                                            party.type === 'vendor' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                                                            'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                                                        }`}>
                                                            {party.type}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                        {party.phone || party.gst_number || `${metrics?.totalRecords || 0} records`}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Balance Tag */}
                                            <div className="text-right shrink-0">
                                                {receivable > 0 ? (
                                                    <div>
                                                        <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 block">
                                                            {formatCurrency(receivable)}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">
                                                            To Collect
                                                        </span>
                                                    </div>
                                                ) : payable > 0 ? (
                                                    <div>
                                                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 block">
                                                            {formatCurrency(payable)}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">
                                                            To Pay
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                                                        Settled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Complete Party Details & Ledger (Visible on One Screen without 100% zoom clipping!) */}
                    <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-0 ${!showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
                        {activeParty && activePartyMetrics ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Party Header Banner - Clean Professional Layout with Zero Overlap */}
                                <div className="p-3 sm:p-3.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
                                    {/* Top Row: Identity & Clean Button Group */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Mobile Back Arrow */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowMobileDetail(false)}
                                                className="md:hidden h-8 w-8 p-0 shrink-0"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                            </Button>

                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                                                activeParty.type === 'customer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' :
                                                activeParty.type === 'vendor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                            }`}>
                                                {getInitials(activeParty.name)}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                                        {activeParty.name}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                                                        activeParty.type === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
                                                        activeParty.type === 'vendor' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' :
                                                        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                                                    }`}>
                                                        {activeParty.type}
                                                    </span>

                                                    {activePartyMetrics.receivable > activePartyMetrics.payable ? (
                                                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 shrink-0">
                                                            To Collect: {formatCurrency(activePartyMetrics.receivable - activePartyMetrics.payable)}
                                                        </span>
                                                    ) : activePartyMetrics.payable > activePartyMetrics.receivable ? (
                                                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 shrink-0">
                                                            To Pay: {formatCurrency(activePartyMetrics.payable - activePartyMetrics.receivable)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                                                            Settled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons (Clean & Proportional - Never Overflowing) */}
                                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                            {/* Settlement Button */}
                                            {activePartyMetrics.receivable > 0 && (
                                                <Button
                                                    size="sm"
                                                    onClick={handleQuickReceivePartyPayment}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                                                    title={`Receive Payment from ${activeParty.name}`}
                                                >
                                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                                    <span>Receive Money</span>
                                                </Button>
                                            )}

                                            {activePartyMetrics.payable > 0 && (
                                                <Button
                                                    size="sm"
                                                    onClick={handleQuickPayVendor}
                                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                                                    title={`Pay Vendor ${activeParty.name}`}
                                                >
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                    <span>Pay Vendor</span>
                                                </Button>
                                            )}

                                            {/* Primary New Document */}
                                            {activeParty.type !== 'vendor' ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCreateInvoiceForParty(activeParty)}
                                                    className="bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>New Invoice</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCreatePurchaseForParty(activeParty)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs h-8 px-2.5 flex items-center gap-1"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>New Purchase</span>
                                                </Button>
                                            )}

                                            {/* Statement Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs font-semibold flex items-center gap-1">
                                                        <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                                        <span>Statement</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                                    <DropdownMenuItem onClick={() => handleExportSinglePartyExcel(activeParty)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                        <span>Excel Statement (.xlsx)</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleExportSinglePartyPDF(activeParty)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                                        <FileText className="w-4 h-4 text-rose-600" />
                                                        <span>PDF Statement (.pdf)</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Detailed Ledger Direct Link */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => navigate(`/reports?tab=detailed-ledger&party=${encodeURIComponent(activeParty.name)}`)}
                                                className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                                title="View verified CA detailed ledger"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Ledger</span>
                                            </Button>

                                            {/* More Menu for Edit, Secondary Actions, Delete */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="More options">
                                                        <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 shadow-lg text-xs">
                                                    {activeParty.type === 'both' && (
                                                        <DropdownMenuItem onClick={() => handleCreatePurchaseForParty(activeParty)} className="cursor-pointer py-2">
                                                            <Plus className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                                            <span>New Purchase Bill</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleEditClick(activeParty)} className="cursor-pointer py-2">
                                                        <Edit className="w-3.5 h-3.5 mr-2 text-slate-600" />
                                                        <span>Edit Party</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(activeParty)} className="cursor-pointer py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                                                        <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                                        <span>Delete Party</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Sub-Bar: Clean Contact Chips & Opening Balance */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                        {activeParty.phone && (
                                            <a
                                                href={`tel:${activeParty.phone}`}
                                                className="flex items-center gap-1 hover:text-primary transition-colors text-[11px]"
                                                title="Call party"
                                            >
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                <span>{activeParty.phone}</span>
                                            </a>
                                        )}
                                        {activeParty.email && (
                                            <a
                                                href={`mailto:${activeParty.email}`}
                                                className="flex items-center gap-1 hover:text-primary transition-colors text-[11px]"
                                                title="Email party"
                                            >
                                                <Mail className="w-3 h-3 text-slate-400" />
                                                <span className="truncate max-w-[150px]">{activeParty.email}</span>
                                            </a>
                                        )}
                                        {activeParty.gst_number && (
                                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                GSTIN: {activeParty.gst_number}
                                            </span>
                                        )}
                                        {activeParty.opening_balance !== undefined && Number(activeParty.opening_balance) > 0 && (
                                            <span className={`inline-flex items-center gap-1 font-mono px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                                (activeParty.opening_balance_type ? activeParty.opening_balance_type === 'to_receive' : activeParty.type !== 'vendor')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                                            }`}>
                                                Opening: {formatCurrency(Number(activeParty.opening_balance))} ({(activeParty.opening_balance_type ? activeParty.opening_balance_type === 'to_receive' : activeParty.type !== 'vendor') ? 'To Receive / Dr' : 'To Pay / Cr'})
                                            </span>
                                        )}
                                        {activeParty.address && (
                                            <span className="flex items-center gap-1 text-slate-500 text-[11px]" title={activeParty.address}>
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[180px] sm:max-w-[240px]">{activeParty.address}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

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

                                {/* Transaction History & Ledger Table (All on same screen with zero clipping) */}
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
                                                    onClick={() => handleCreateInvoiceForParty(activeParty)}
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
                                                                                : isSale
                                                                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                                        }`}>
                                                                            {isOpening ? 'Opening' : isSale ? 'Sale' : 'Purchase'}
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
                                                                                    onClick={() => handleEditClick(activeParty)}
                                                                                    className="h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1"
                                                                                    title="Edit party opening balance"
                                                                                >
                                                                                    <Edit className="w-3 h-3" />
                                                                                    <span>Edit</span>
                                                                                </Button>
                                                                            )}

                                                                            {/* Quick Settlement Button */}
                                                                            {!isOpening && isSale && txn.balanceDue > 0 && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={() => handleOpenSettlement(txn.raw, "sale")}
                                                                                    className="h-6 sm:h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-[11px] font-bold shadow-xs flex items-center gap-0.5"
                                                                                    title={`Receive payment from ${activeParty?.name || 'Customer'}`}
                                                                                >
                                                                                    <ArrowDownLeft className="w-3 h-3" />
                                                                                    <span>Receive</span>
                                                                                </Button>
                                                                            )}

                                                                            {!isOpening && !isSale && txn.balanceDue > 0 && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    onClick={() => handleOpenSettlement(txn.raw, "purchase")}
                                                                                    className="h-6 sm:h-7 px-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] sm:text-[11px] font-bold shadow-xs flex items-center gap-0.5"
                                                                                    title={`Pay vendor ${activeParty?.name || 'Supplier'}`}
                                                                                >
                                                                                    <ArrowUpRight className="w-3 h-3" />
                                                                                    <span>Pay</span>
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
                                                                                        <DropdownMenuItem
                                                                                            onClick={() => isSale ? handlePreviewInvoicePDF(txn.raw) : handlePreviewPurchasePDF(txn.raw)}
                                                                                            className="cursor-pointer py-1.5"
                                                                                        >
                                                                                            <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                                                            <span>View PDF</span>
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuItem
                                                                                            onClick={() => isSale ? handleDownloadInvoicePDF(txn.raw) : handleDownloadPurchasePDF(txn.raw)}
                                                                                            className="cursor-pointer py-1.5"
                                                                                        >
                                                                                            <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                                                                            <span>Download</span>
                                                                                        </DropdownMenuItem>
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
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">No Party Selected</h4>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Select a party from the left directory list to view their complete contact details, financial statement, and transaction history on this screen.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create / Edit Party Dialog */}
                <PartyDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSave={handleSaveParty}
                    party={selectedParty}
                    isEditing={isEditing}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                />

                {/* Create Invoice Dialog (Pre-populated for Party) */}
                <CreateInvoiceDialog
                    open={isCreateInvoiceOpen}
                    onOpenChange={setIsCreateInvoiceOpen}
                    initialParty={partyForNewInvoice}
                />

                {/* Create Purchase Dialog (Pre-populated for Party) */}
                <RecordPurchaseDialog
                    open={isRecordPurchaseOpen}
                    onOpenChange={setIsRecordPurchaseOpen}
                    initialParty={partyForNewPurchase}
                />

                {/* Party Import / Export Dialog */}
                <PartyImportExportDialog
                    open={isImportExportOpen}
                    onClose={() => setIsImportExportOpen(false)}
                    userId={user?.id || ""}
                    existingParties={parties}
                    partyLedgerMap={partyLedgerMap}
                    profile={profile}
                />

                {/* Unified Settlement Dialog (Receive Collections for Sales & Record Payments for Purchases) */}
                <Dialog open={!!settlementTarget} onOpenChange={(open) => { if (!open) setSettlementTarget(null); }}>
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
                                            onClick={() => setSettlementTarget(null)}
                                            disabled={isSubmittingPayment}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSaveSettlement}
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

                {/* Delete Confirmation Alert */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Party</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to completely delete <strong>{partyToDelete?.name}</strong> from your directory?
                                This directory action will <strong className="text-foreground">not</strong> delete your underlying sales or purchase invoices.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
};

export default PartiesPage;