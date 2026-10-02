import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import {
    Users,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    Download,
    FileSpreadsheet,
    FileText,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
import { sqliteService } from "@/core/offline/sqliteService";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useToast } from "@/core/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import {
    exportPartiesToExcel,
    exportPartiesToPDF,
    exportPartyStatementToExcel,
    exportPartyStatementToPDF,
} from "@/utils/exportParties";
import { parsePaymentNotes } from "@/features/sales/utils/paymentTranscript";

import { CreateInvoiceDialog } from "@/features/sales/components/CreateInvoiceDialog";
import { RecordPurchaseDialog } from "@/features/purchases/components/RecordPurchaseDialog";
import { UniversalPaymentDialog } from "@/features/payments/components/UniversalPaymentDialog";
import { PaymentReceiptModal, PaymentReceiptDetails } from "@/features/payments/components/PaymentReceiptModal";

import { Party, SettlementTarget, SettlementType } from "../types";
import {
    computePartyLedgerMap,
    computeDirectorySummary,
    computeActivePartyTransactions,
} from "../lib/partyLedgerCalculations";
import {
    PartyMasterSidebar,
    PartyDetailHeader,
    PartyTransactionsLedger,
    PartySettlementDialog,
    PartyDialog,
    PartyImportExportDialog,
} from "../components";

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

    // Settlement / Payment Dialog State
    const [settlementTarget, setSettlementTarget] = useState<SettlementTarget | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [paymentNotes, setPaymentNotes] = useState<string>("");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    // Universal Multi-Bill Settlement & Advance Voucher Dialog States
    const [isUniversalPaymentOpen, setIsUniversalPaymentOpen] = useState(false);
    const [universalPaymentType, setUniversalPaymentType] = useState<"in" | "out">("in");
    const [universalPaymentBillId, setUniversalPaymentBillId] = useState<string | undefined>(undefined);

    // View Voucher / Receipt Details Modal
    const [selectedVoucherForView, setSelectedVoucherForView] = useState<PaymentReceiptDetails | null>(null);
    const [isViewVoucherOpen, setIsViewVoucherOpen] = useState(false);

    // Delete Alert States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [partyToDelete, setPartyToDelete] = useState<Party | null>(null);

    // Fetch Business Profile
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
        initialData: () => queryClient.getQueryData<any>(["profile", user?.id]) || undefined,
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
                    .eq("user_id", user.id)
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
        initialData: () => queryClient.getQueryData<Party[]>(["parties", user?.id]) || undefined,
        enabled: !!user
    });

    // Fetch Sales
    const { data: sales = [] } = useQuery({
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
        initialData: () => queryClient.getQueryData<any[]>(["sales", user?.id]) || undefined,
        enabled: !!user
    });

    // Fetch Purchases
    const { data: purchases = [] } = useQuery({
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
        initialData: () => queryClient.getQueryData<any[]>(["purchases", user?.id]) || undefined,
        enabled: !!user
    });

    // Pre-indexed linear calculation of metrics
    const partyLedgerMap = useMemo(() => {
        return computePartyLedgerMap(parties, sales, purchases);
    }, [parties, sales, purchases]);

    // High-level aggregate totals
    const directorySummary = useMemo(() => {
        return computeDirectorySummary(partyLedgerMap, parties.length);
    }, [partyLedgerMap, parties.length]);

    // Filter parties based on search input and category filter
    const filteredParties = useMemo(() => {
        return parties.filter(party => {
            const matchesSearch =
                party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (party.phone && party.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (party.email && party.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (party.gst_number && party.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!matchesSearch) return false;

            if (filterType === "All Types") return true;
            if (filterType === "Customer") return party.type === "customer" || party.type === "both";
            if (filterType === "Vendor") return party.type === "vendor" || party.type === "both";
            if (filterType === "Both") return party.type === "both";

            return true;
        });
    }, [parties, searchTerm, filterType]);

    // Keep active party selection in sync
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
        return computeActivePartyTransactions(activeParty, activePartyMetrics, activeTab);
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

    // Open Universal Multi-Bill Settlement or Advance Payment Dialog
    const handleOpenUniversalPayment = (type: "in" | "out", billId?: string) => {
        setUniversalPaymentType(type);
        setUniversalPaymentBillId(billId);
        setIsUniversalPaymentOpen(true);
    };

    // Open Payment Receipt / Voucher Modal
    const handleViewPartyVoucher = (txn: any) => {
        const raw = txn.raw;
        if (!raw) return;
        const isReceipt = txn.docType === 'receipt';
        const notesParsed = parsePaymentNotes(raw.notes);
        const voucher: PaymentReceiptDetails = {
            voucherNumber: raw.invoice_number || raw.bill_number || (isReceipt ? 'REC-001' : 'PMT-001'),
            date: raw.date || raw.created_at,
            type: isReceipt ? 'receipt' : 'payment',
            partyName: activeParty?.name || raw.customer_name || raw.vendor_name || 'Party',
            partyPhone: activeParty?.phone || raw.customer_phone || undefined,
            partyGstin: activeParty?.gst_number || undefined,
            amount: Number(raw.total_amount) || Number(raw.amount_paid) || 0,
            paymentMethod: raw.payment_method || 'cash',
            referenceNumber: notesParsed.referenceNumber,
            notes: notesParsed.notes,
            partyCurrentBalance: activePartyMetrics ? (isReceipt ? activePartyMetrics.receivable : activePartyMetrics.payable) : undefined,
            businessDetails: profile ? {
                name: (profile as any).business_name,
                address: (profile as any).business_address,
                phone: (profile as any).business_phone,
                gst: (profile as any).gst_number,
                logo_url: (profile as any).business_logo
            } : undefined
        };
        setSelectedVoucherForView(voucher);
        setIsViewVoucherOpen(true);
    };

    // Unified Settlement recording
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

    const handleQuickPartyPayment = (type: "in" | "out") => {
        if (!activePartyMetrics) return;

        if (type === "in") {
            if (activePartyMetrics.receivable <= 0) return;
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
        } else {
            if (activePartyMetrics.payable <= 0) return;
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
        const party = activeParty || parties.find((p: any) => 
            (invoice.party_id && p.id === invoice.party_id) || 
            (p.name && p.name.trim().toLowerCase() === (invoice.customer_name || '').trim().toLowerCase())
        );
        const ledger = party ? partyLedgerMap.get(party.id) : null;
        const curDue = Number(invoice.balance_due != null ? invoice.balance_due : Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)));
        const partyTotalDue = ledger ? (ledger.receivable - ledger.payable) : (Number(party?.opening_balance || 0) + curDue);
        const prevBal = partyTotalDue - curDue;

        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date || invoice.created_at,
            due_date: invoice.due_date,
            status: invoice.status,
            amount_paid: Number(invoice.amount_paid ?? (invoice.status === "paid" ? invoice.total_amount : 0)),
            balance_due: curDue,
            payment_method: invoice.payment_method,
            previous_balance: prevBal,
            total_due_balance: partyTotalDue,
            party_pending_balance: partyTotalDue,
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
            subtotal: invoice.subtotal ?? invoice.total_amount,
            discount_amount: invoice.discount_amount ?? 0,
            tax_amount: invoice.tax_amount ?? 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate ?? 0,
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
        }, { action: 'download', showPartyPendingBalance: true, showPartyPreviousBalance: true });
    };

    const handlePreviewInvoicePDF = async (invoice: any) => {
        const party = activeParty || parties.find((p: any) => 
            (invoice.party_id && p.id === invoice.party_id) || 
            (p.name && p.name.trim().toLowerCase() === (invoice.customer_name || '').trim().toLowerCase())
        );
        const ledger = party ? partyLedgerMap.get(party.id) : null;
        const curDue = Number(invoice.balance_due != null ? invoice.balance_due : Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)));
        const partyTotalDue = ledger ? (ledger.receivable - ledger.payable) : (Number(party?.opening_balance || 0) + curDue);
        const prevBal = partyTotalDue - curDue;

        const url = await generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date || invoice.created_at,
            due_date: invoice.due_date,
            status: invoice.status,
            amount_paid: Number(invoice.amount_paid ?? (invoice.status === "paid" ? invoice.total_amount : 0)),
            balance_due: curDue,
            payment_method: invoice.payment_method,
            previous_balance: prevBal,
            total_due_balance: partyTotalDue,
            party_pending_balance: partyTotalDue,
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
            subtotal: invoice.subtotal ?? invoice.total_amount,
            discount_amount: invoice.discount_amount ?? 0,
            tax_amount: invoice.tax_amount ?? 0,
            total_amount: invoice.total_amount,
            tax_rate: invoice.tax_rate ?? 0,
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
        }, { action: 'preview', showPartyPendingBalance: true, showPartyPreviousBalance: true });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    const handleDownloadPurchasePDF = (purchase: any) => {
        const curDue = Number(purchase.balance_due != null ? purchase.balance_due : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0)));
        generateInvoicePDF({
            invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date || purchase.created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: Number(purchase.amount_paid ?? (purchase.status === "paid" ? purchase.total_amount : 0)),
            balance_due: curDue,
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
            subtotal: purchase.subtotal ?? purchase.total_amount,
            discount_amount: purchase.discount_amount ?? 0,
            tax_amount: purchase.tax_amount ?? 0,
            total_amount: purchase.total_amount,
            tax_rate: purchase.tax_rate ?? 0,
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
        const curDue = Number(purchase.balance_due != null ? purchase.balance_due : Math.max(0, Number(purchase.total_amount || 0) - Number(purchase.amount_paid || 0)));
        const url = await generateInvoicePDF({
            invoice_number: purchase.bill_number || `BILL-${purchase.id.substring(0, 6).toUpperCase()}`,
            date: purchase.date || purchase.created_at,
            due_date: purchase.due_date,
            status: purchase.status,
            amount_paid: Number(purchase.amount_paid ?? (purchase.status === "paid" ? purchase.total_amount : 0)),
            balance_due: curDue,
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
            subtotal: purchase.subtotal ?? purchase.total_amount,
            discount_amount: purchase.discount_amount ?? 0,
            tax_amount: purchase.tax_amount ?? 0,
            total_amount: purchase.total_amount,
            tax_rate: purchase.tax_rate ?? 0,
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
                    {/* LEFT PANEL: Master Directory List */}
                    <PartyMasterSidebar
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterType={filterType}
                        setFilterType={(val) => setFilterType(val as any)}
                        isLoading={isLoadingParties}
                        filteredParties={filteredParties}
                        selectedPartyId={selectedPartyId}
                        partyLedgerMap={partyLedgerMap}
                        onPartySelect={handlePartySelect}
                        onAddClick={handleAddClick}
                        onOpenImportExport={() => setIsImportExportOpen(true)}
                        formatCurrency={formatCurrency}
                        showMobileDetail={showMobileDetail}
                    />

                    {/* RIGHT PANEL: Master-Detail Active Party View & Statement */}
                    <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0 ${
                        showMobileDetail ? "flex" : "hidden md:flex"
                    }`}>
                        {activeParty && activePartyMetrics ? (
                            <>
                                <PartyDetailHeader
                                    activeParty={activeParty}
                                    activePartyMetrics={activePartyMetrics}
                                    onBackToList={() => setShowMobileDetail(false)}
                                    onOpenPayment={handleQuickPartyPayment}
                                    onCreateInvoice={handleCreateInvoiceForParty}
                                    onCreatePurchase={handleCreatePurchaseForParty}
                                    onExportExcelStatement={handleExportSinglePartyExcel}
                                    onExportPDFStatement={handleExportSinglePartyPDF}
                                    onNavigateLedger={(partyName) => navigate(`/reports?tab=ledger&party=${encodeURIComponent(partyName)}`)}
                                    onEditParty={handleEditClick}
                                    onDeleteParty={handleDeleteClick}
                                    formatCurrency={formatCurrency}
                                />
                                <PartyTransactionsLedger
                                    activeParty={activeParty}
                                    activePartyMetrics={activePartyMetrics}
                                    activePartyTransactions={activePartyTransactions}
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                    formatCurrency={formatCurrency}
                                    onCreateInvoiceForParty={handleCreateInvoiceForParty}
                                    onEditClick={handleEditClick}
                                    onOpenUniversalPayment={handleOpenUniversalPayment}
                                    onViewPartyVoucher={handleViewPartyVoucher}
                                    onPreviewInvoicePDF={handlePreviewInvoicePDF}
                                    onDownloadInvoicePDF={handleDownloadInvoicePDF}
                                    onPreviewPurchasePDF={handlePreviewPurchasePDF}
                                    onDownloadPurchasePDF={handleDownloadPurchasePDF}
                                />
                            </>
                        ) : (
                            <PartyTransactionsLedger
                                activeParty={null}
                                activePartyMetrics={{
                                    partySales: [],
                                    partyPurchases: [],
                                    totalSalesAmount: 0,
                                    totalSalesPaid: 0,
                                    salesBalanceDue: 0,
                                    totalPurchasesAmount: 0,
                                    totalPurchasesPaid: 0,
                                    purchasesBalanceDue: 0,
                                    receivable: 0,
                                    payable: 0,
                                    totalRecords: 0
                                }}
                                activePartyTransactions={[]}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                formatCurrency={formatCurrency}
                                onCreateInvoiceForParty={handleCreateInvoiceForParty}
                                onEditClick={handleEditClick}
                                onOpenUniversalPayment={handleOpenUniversalPayment}
                                onViewPartyVoucher={handleViewPartyVoucher}
                                onPreviewInvoicePDF={handlePreviewInvoicePDF}
                                onDownloadInvoicePDF={handleDownloadInvoicePDF}
                                onPreviewPurchasePDF={handlePreviewPurchasePDF}
                                onDownloadPurchasePDF={handleDownloadPurchasePDF}
                            />
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

                {/* Quick Settlement Dialog */}
                <PartySettlementDialog
                    settlementTarget={settlementTarget}
                    onClose={() => setSettlementTarget(null)}
                    paymentAmount={paymentAmount}
                    setPaymentAmount={setPaymentAmount}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    paymentDate={paymentDate}
                    setPaymentDate={setPaymentDate}
                    paymentNotes={paymentNotes}
                    setPaymentNotes={setPaymentNotes}
                    isSubmittingPayment={isSubmittingPayment}
                    onSaveSettlement={handleSaveSettlement}
                    formatCurrency={formatCurrency}
                />

                {/* Enterprise Multi-Bill Settlement & Advance Voucher Dialog */}
                <UniversalPaymentDialog
                    open={isUniversalPaymentOpen}
                    onOpenChange={setIsUniversalPaymentOpen}
                    mode={universalPaymentType === "in" ? "payment_in" : "payment_out"}
                    initialType={universalPaymentType}
                    initialPartyId={activeParty?.id}
                    initialBillId={universalPaymentBillId}
                    onSuccess={() => {
                        if (user?.id) {
                            queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
                            queryClient.invalidateQueries({ queryKey: ["purchases", user.id] });
                            queryClient.invalidateQueries({ queryKey: ["parties", user.id] });
                        }
                    }}
                />

                {/* View Voucher / Receipt Details Modal */}
                <PaymentReceiptModal
                    open={isViewVoucherOpen}
                    onOpenChange={setIsViewVoucherOpen}
                    receiptData={selectedVoucherForView}
                    voucher={selectedVoucherForView}
                />

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