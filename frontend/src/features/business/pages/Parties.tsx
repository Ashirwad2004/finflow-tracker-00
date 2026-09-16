import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { offlineMutate } from "@/core/offline/apiService";
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
    Share2,
    Calendar,
    FileSpreadsheet
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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
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
import { CreateInvoiceDialog } from "../components/CreateInvoiceDialog";
import { TableLoadingRows } from "@/components/shared/PageStates";

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
    created_at: string;
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
    return updatePayload;
};

const PartiesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { formatCurrency } = useCurrency();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<"All Types" | "Customer" | "Vendor" | "Both">("All Types");

    // Dialog & Sheet States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Ledger / Details Sheet State
    const [selectedPartyForSheet, setSelectedPartyForSheet] = useState<Party | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Create Invoice for Party State
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
    const [partyForNewInvoice, setPartyForNewInvoice] = useState<Party | null>(null);

    // Record Payment Dialog State
    const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);
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

    // Fetch Parties
    const { data: parties = [], isLoading: isLoadingParties } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            const { data, error } = await getPartiesTable()
                .select("*")
                .order("name");

            if (error) throw error;
            return data as Party[];
        },
        enabled: !!user
    });

    // Fetch Sales (Invoices) for Customer Ledger
    const { data: sales = [], isLoading: isLoadingSales } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("sales")
                .select("*")
                .eq("user_id", user?.id || "")
                .order("date", { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // Fetch Purchases for Vendor Ledger
    const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("purchases")
                .select("*")
                .eq("user_id", user?.id || "")
                .order("date", { ascending: false });

            if (error) throw error;
            return data || [];
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
                (p.vendor_name && p.vendor_name.trim().toLowerCase() === pName)
            );

            const totalSalesAmount = partySales.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
            const totalSalesPaid = partySales.reduce((sum: number, s: any) => {
                if (s.status === 'paid') return sum + (Number(s.total_amount) || 0);
                return sum + (Number(s.amount_paid) || 0);
            }, 0);
            const salesBalanceDue = partySales.reduce((sum: number, s: any) => {
                if (s.status === 'paid') return sum;
                return sum + (Number(s.balance_due != null ? s.balance_due : (Number(s.total_amount) || 0) - (Number(s.amount_paid) || 0)));
            }, 0);

            const totalPurchasesAmount = partyPurchases.reduce((sum: number, p: any) => sum + (Number(p.total_amount) || 0), 0);
            const totalPurchasesPaid = partyPurchases.reduce((sum: number, p: any) => {
                if (p.status === 'paid') return sum + (Number(p.total_amount) || 0);
                return sum + (Number(p.amount_paid) || 0);
            }, 0);
            const purchasesBalanceDue = partyPurchases.reduce((sum: number, p: any) => {
                if (p.status === 'paid') return sum;
                return sum + (Number(p.balance_due != null ? p.balance_due : (Number(p.total_amount) || 0) - (Number(p.amount_paid) || 0)));
            }, 0);

            const openingBal = Number(party.opening_balance) || 0;
            const receivable = salesBalanceDue + (party.type !== 'vendor' ? openingBal : 0);
            const payable = purchasesBalanceDue + (party.type === 'vendor' ? openingBal : 0);

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
                totalRecords: partySales.length + partyPurchases.length
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

            if (selectedPartyForSheet && selectedPartyForSheet.id === data.id) {
                setSelectedPartyForSheet((prev: any) => ({ ...prev, ...data }));
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

            if (selectedPartyForSheet && selectedPartyForSheet.id === id) {
                setIsSheetOpen(false);
                setSelectedPartyForSheet(null);
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

    // Payment recording inside Party Statement
    const handleOpenPaymentForInvoice = (inv: any) => {
        const currentPaid = Number(inv.amount_paid || 0);
        const balDue = Number(inv.balance_due != null ? inv.balance_due : Math.max(0, inv.total_amount - currentPaid));
        setPaymentInvoice(inv);
        setPaymentAmount(balDue > 0 ? String(balDue) : String(inv.total_amount));
        setPaymentMethod("cash");
        setPaymentNotes("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
    };

    const handleSaveInvoicePayment = async () => {
        if (!paymentInvoice || !user?.id) return;
        const addAmount = Number(paymentAmount) || 0;
        if (addAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a payment amount greater than 0.", variant: "destructive" });
            return;
        }

        const currentPaid = Number(paymentInvoice.amount_paid || 0);
        const newAmountPaid = Math.min(paymentInvoice.total_amount, currentPaid + addAmount);
        const newBalanceDue = Math.max(0, Math.round((paymentInvoice.total_amount - newAmountPaid) * 100) / 100);
        const newStatus: 'paid' | 'partial' = newBalanceDue <= 0 ? 'paid' : 'partial';

        setIsSubmittingPayment(true);
        try {
            const updatePayload = {
                ...paymentInvoice,
                amount_paid: newAmountPaid,
                balance_due: newBalanceDue,
                status: newStatus,
                payment_method: paymentMethod || "cash",
                notes: paymentNotes
                    ? `${paymentInvoice.notes ? paymentInvoice.notes + " | " : ""}Paid ${formatCurrency(addAmount)} via ${paymentMethod} on ${paymentDate}: ${paymentNotes}`
                    : paymentInvoice.notes || null
            };

            const { error } = await offlineMutate({
                table: "sales",
                action: "update",
                recordId: paymentInvoice.id,
                payload: updatePayload,
                userId: user.id
            });

            if (error) throw error;

            queryClient.setQueryData(["sales", user.id], (old: any) => {
                if (!old) return [];
                return old.map((inv: any) => inv.id === paymentInvoice.id ? { ...inv, ...updatePayload } : inv);
            });

            if (navigator.onLine) {
                queryClient.invalidateQueries({ queryKey: ["sales", user.id] });
                queryClient.invalidateQueries({ queryKey: ["parties"] });
            }

            toast({
                title: "Payment Recorded",
                description: newStatus === 'paid'
                    ? `Invoice ${paymentInvoice.invoice_number} is now fully settled.`
                    : `Recorded ${formatCurrency(addAmount)}. Balance remaining is ${formatCurrency(newBalanceDue)}.`
            });

            setPaymentInvoice(null);
        } catch (err: any) {
            console.error("Error saving payment:", err);
            toast({ title: "Payment Error", description: err?.message || "Failed to record payment.", variant: "destructive" });
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

    const handlePartyRowClick = (party: Party) => {
        setSelectedPartyForSheet(party);
        setIsSheetOpen(true);
    };

    const handleCreateInvoiceForParty = (party: Party) => {
        setPartyForNewInvoice(party);
        setIsCreateInvoiceOpen(true);
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

    // Filtered Parties
    const filteredParties = parties.filter(party => {
        const matchesSearch = party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (party.phone && party.phone.includes(searchTerm)) ||
            (party.type && party.type.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesType = true;
        if (filterType === "Customer") matchesType = party.type === "customer";
        else if (filterType === "Vendor") matchesType = party.type === "vendor";
        else if (filterType === "Both") matchesType = party.type === "both";

        return matchesSearch && matchesType;
    });

    const getInitials = (name: string) => {
        return name.substring(0, 2).toUpperCase() || 'NA';
    };

    // Active metrics for the currently viewed sheet party
    const currentSheetMetrics = selectedPartyForSheet ? partyLedgerMap.get(selectedPartyForSheet.id) : null;

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
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in text-slate-900 dark:text-slate-100 font-display">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <Users className="text-primary w-8 h-8" />
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Parties & Ledger</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Manage customer & vendor accounts, track outstanding balances, and inspect complete transaction records.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-1.5 shadow-xs font-semibold h-10 px-3.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                >
                                    <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    <span>Export</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                <DropdownMenuItem onClick={handleExportPartiesExcel} className="cursor-pointer flex items-center gap-2.5 py-2">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium text-xs">Export Excel (.xlsx)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPartiesPDF} className="cursor-pointer flex items-center gap-2.5 py-2">
                                    <FileText className="w-4 h-4 text-rose-600" />
                                    <span className="font-medium text-xs">Export PDF (.pdf)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            onClick={handleAddClick}
                            className="flex items-center space-x-2 shadow-sm font-bold bg-primary hover:bg-primary/90 text-white h-10"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add New Party
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Parties</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{directorySummary.totalParties}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">To Collect (Receivable)</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                {formatCurrency(directorySummary.totalReceivables)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">To Pay (Payable)</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                {formatCurrency(directorySummary.totalPayables)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Fully Settled</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{directorySummary.settledCount}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search by party name, phone, or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-semibold px-4 h-11 focus:ring-1 focus:ring-primary/50 text-slate-700 dark:text-slate-300"
                            title="Filter by party type"
                            aria-label="Filter by party type"
                        >
                            <option>All Types</option>
                            <option>Customer</option>
                            <option>Vendor</option>
                            <option>Both</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Party Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ID / GSTIN</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding Balance</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoadingParties || isLoadingSales || isLoadingPurchases ? (
                                    <TableLoadingRows cols={6} rows={5} />
                                ) : filteredParties.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                                            <Users className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                                            <p className="text-sm font-medium">No parties found in your directory</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParties.map((party) => {
                                        const metrics = partyLedgerMap.get(party.id);
                                        const receivable = metrics?.receivable || 0;
                                        const payable = metrics?.payable || 0;
                                        const totalRecords = metrics?.totalRecords || 0;

                                        return (
                                            <tr
                                                key={party.id}
                                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                                                onClick={() => handlePartyRowClick(party)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                                                            ${party.type === 'customer' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
                                                                party.type === 'vendor' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                                    'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}
                                                        `}>
                                                            {getInitials(party.name)}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 dark:text-white line-clamp-1" title={party.name}>
                                                                {party.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">
                                                                {totalRecords} transaction{totalRecords !== 1 ? 's' : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                        ${party.type === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                                                            party.type === 'vendor' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50' :
                                                                'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'}
                                                    `}>
                                                        {party.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        {party.phone || <span className="text-slate-400">No phone</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {party.email || <span className="text-slate-400">No email</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[11px] font-medium text-slate-500">
                                                    {party.gst_number || <span className="text-slate-400 italic">N/A</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {party.type !== 'vendor' ? (
                                                        receivable > 0 ? (
                                                            <div>
                                                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                                    {formatCurrency(receivable)}
                                                                </span>
                                                                <span className="block text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
                                                                    To Collect
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(0)}
                                                                </span>
                                                                <span className="block text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                                                                    Settled
                                                                </span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        payable > 0 ? (
                                                            <div>
                                                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                                    {formatCurrency(payable)}
                                                                </span>
                                                                <span className="block text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
                                                                    To Pay
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {formatCurrency(0)}
                                                                </span>
                                                                <span className="block text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
                                                                    Settled
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handlePartyRowClick(party)}
                                                            className="text-xs font-semibold text-primary hover:text-primary/80"
                                                        >
                                                            Ledger <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded"
                                                                    title="More options"
                                                                    aria-label="More options"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                             <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuItem onClick={() => handleCreateInvoiceForParty(party)}>
                                                                    <Plus className="w-4 h-4 mr-2" /> New Invoice
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleEditClick(party)}>
                                                                    <Edit className="w-4 h-4 mr-2" /> Edit Party Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportSinglePartyExcel(party)}>
                                                                    <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Statement (.xlsx)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportSinglePartyPDF(party)}>
                                                                    <FileText className="w-4 h-4 mr-2 text-rose-600" /> Statement (.pdf)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeleteClick(party)}
                                                                    className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/30"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete Party
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Party Details & Statement Sheet */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-[760px] w-full p-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
                        {selectedPartyForSheet && currentSheetMetrics && (
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base shrink-0
                                                ${selectedPartyForSheet.type === 'customer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                                                    selectedPartyForSheet.type === 'vendor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'}
                                            `}>
                                                {getInitials(selectedPartyForSheet.name)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                                        {selectedPartyForSheet.name}
                                                    </h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                        ${selectedPartyForSheet.type === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            selectedPartyForSheet.type === 'vendor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                'bg-purple-50 text-purple-700 border-purple-200'}
                                                    `}>
                                                        {selectedPartyForSheet.type}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {selectedPartyForSheet.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-slate-400" /> {selectedPartyForSheet.phone}
                                                        </span>
                                                    )}
                                                    {selectedPartyForSheet.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3 text-slate-400" /> {selectedPartyForSheet.email}
                                                        </span>
                                                    )}
                                                    {selectedPartyForSheet.gst_number && (
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                                            GST: {selectedPartyForSheet.gst_number}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline" className="text-xs font-semibold flex items-center gap-1">
                                                        <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                                        <span>Export</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-lg">
                                                    <DropdownMenuItem onClick={() => handleExportSinglePartyExcel(selectedPartyForSheet)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                        <span>Statement (.xlsx)</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleExportSinglePartyPDF(selectedPartyForSheet)} className="cursor-pointer flex items-center gap-2 py-2 text-xs">
                                                        <FileText className="w-4 h-4 text-rose-600" />
                                                        <span>Statement (.pdf)</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditClick(selectedPartyForSheet)}
                                                className="text-xs font-semibold"
                                            >
                                                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleCreateInvoiceForParty(selectedPartyForSheet)}
                                                className="bg-primary hover:bg-primary/90 text-white text-xs font-bold"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Balance Summary Cards */}
                                    <div className="grid grid-cols-3 gap-3 mt-5">
                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                                                {formatCurrency(currentSheetMetrics.totalSalesAmount)}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Total Collected</p>
                                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                {formatCurrency(currentSheetMetrics.totalSalesPaid)}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Balance Due</p>
                                            <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                                                {formatCurrency(currentSheetMetrics.receivable)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Statement / Ledger Records */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            Transaction History & Invoices ({currentSheetMetrics.partySales.length})
                                        </h4>
                                    </div>

                                    {currentSheetMetrics.partySales.length === 0 ? (
                                        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                                            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No invoices recorded yet</p>
                                            <p className="text-xs text-slate-400 mt-1 mb-4">Any sales made to this customer will automatically appear here with live balance tracking.</p>
                                            <Button
                                                size="sm"
                                                onClick={() => handleCreateInvoiceForParty(selectedPartyForSheet)}
                                                className="bg-primary text-white text-xs font-bold"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Invoice
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {currentSheetMetrics.partySales.map((inv: any) => {
                                                const currentPaid = Number(inv.amount_paid || (inv.status === 'paid' ? inv.total_amount : 0));
                                                const balDue = Number(inv.balance_due != null ? inv.balance_due : (inv.status === 'paid' ? 0 : Math.max(0, inv.total_amount - currentPaid)));
                                                const isFullyPaid = inv.status === 'paid' || balDue <= 0;
                                                const isPartial = inv.status === 'partial' || (currentPaid > 0 && balDue > 0);

                                                return (
                                                    <div
                                                        key={inv.id}
                                                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                                                    #{inv.invoice_number}
                                                                </span>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                                                    ${isFullyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                        isPartial ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                            'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'}
                                                                `}>
                                                                    {inv.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" /> {inv.date ? (isNaN(new Date(inv.date).getTime()) ? inv.date : format(new Date(inv.date), "dd MMM yyyy")) : (inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy") : "-")}
                                                                </span>
                                                                {inv.items && (
                                                                    <span>
                                                                        • {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                                                            <div className="text-right">
                                                                <div className="text-sm font-black text-slate-900 dark:text-white">
                                                                    {formatCurrency(inv.total_amount)}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                                    Paid: <span className="font-semibold text-emerald-600">{formatCurrency(currentPaid)}</span>
                                                                    {balDue > 0 && (
                                                                        <span className="ml-2 text-amber-600 font-semibold">
                                                                            Due: {formatCurrency(balDue)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                {balDue > 0 && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleOpenPaymentForInvoice(inv)}
                                                                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                                                    >
                                                                        <ReceiptIndianRupee className="w-3.5 h-3.5 mr-1" /> Pay
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handlePreviewInvoicePDF(inv)}
                                                                    className="h-8 w-8 p-0"
                                                                    title="Preview PDF"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleDownloadInvoicePDF(inv)}
                                                                    className="h-8 w-8 p-0"
                                                                    title="Download PDF"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

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

                {/* Record Payment Dialog for an Invoice */}
                <Dialog open={!!paymentInvoice} onOpenChange={(open) => { if (!open) setPaymentInvoice(null); }}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ReceiptIndianRupee className="w-5 h-5 text-emerald-600" />
                                Record Invoice Payment
                            </DialogTitle>
                            <DialogDescription>
                                Add a payment towards invoice <strong className="text-foreground">{paymentInvoice?.invoice_number}</strong> for {selectedPartyForSheet?.name}.
                            </DialogDescription>
                        </DialogHeader>

                        {paymentInvoice && (() => {
                            const currentPaid = Number(paymentInvoice.amount_paid || 0);
                            const currentBal = Number(paymentInvoice.balance_due != null ? paymentInvoice.balance_due : Math.max(0, paymentInvoice.total_amount - currentPaid));
                            const enteredAmount = Number(paymentAmount) || 0;
                            const projectedBal = Math.max(0, Math.round((currentBal - enteredAmount) * 100) / 100);
                            const isFullyPaid = enteredAmount >= currentBal;

                            return (
                                <div className="space-y-4 py-2">
                                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{formatCurrency(paymentInvoice.total_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paid</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(currentPaid)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Due</p>
                                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(currentBal)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Amount</label>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentAmount(String(currentBal))}
                                                className="text-xs font-semibold text-primary hover:underline"
                                            >
                                                Pay Full Due ({formatCurrency(currentBal)})
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
                                            <span>Remaining Balance:</span>
                                            <span className={`font-semibold ${projectedBal === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {formatCurrency(projectedBal)} {isFullyPaid ? '(Settled)' : '(Partial)'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Method</label>
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
                                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Date</label>
                                            <input
                                                type="date"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reference / Notes</label>
                                        <input
                                            type="text"
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            placeholder="e.g. UPI txn ID, Cheque #, or note"
                                            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={() => setPaymentInvoice(null)}
                                disabled={isSubmittingPayment}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveInvoicePayment}
                                disabled={isSubmittingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isSubmittingPayment ? "Recording..." : "Save Payment"}
                            </Button>
                        </DialogFooter>
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