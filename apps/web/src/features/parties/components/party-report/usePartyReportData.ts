import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { differenceInDays } from "date-fns";
import { sqliteService } from "@/core/offline/sqliteService";
import { useWhatsAppStatus } from "@/features/whatsapp/hooks/useWhatsApp";
import { EnrichedPartyItem } from "./types";

export function usePartyReportData() {
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "customer" | "vendor">("all");
    const [balanceFilter, setBalanceFilter] = useState<"all" | "active" | "receivable" | "payable">("all");
    const [activeReminderParty, setActiveReminderParty] = useState<EnrichedPartyItem | null>(null);
    const { data: connStatus } = useWhatsAppStatus();

    // Fetch Profile
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
        enabled: !!user,
    });

    // Fetch Parties Directory with Offline Fallback
    const { data: partiesDirectory = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("parties")
                    .select("id, name, phone, type, opening_balance, opening_balance_type")
                    .eq("user_id", user.id);
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[PartyReport] Parties fetch failed offline:", e);
            }
            return (await sqliteService.getAll<any>("parties", user.id)) || [];
        },
        enabled: !!user,
    });

    // Fetch all sales (with real payment, document_type & party_id tracking)
    const { data: sales = [], isLoading: salesLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sales")
                    .select("id, customer_name, total_amount, amount_paid, balance_due, status, date, customer_phone, document_type, party_id")
                    .eq("user_id", user.id)
                    .neq("status", "draft");
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[PartyReport] Sales fetch failed offline:", e);
            }
            return (await sqliteService.getAll<any>("sales", user.id)) || [];
        },
        enabled: !!user,
    });

    // Fetch all purchases (with real payment, document_type & party_id tracking)
    const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchases")
                    .select("id, vendor_name, total_amount, amount_paid, balance_due, status, date, document_type, party_id")
                    .eq("user_id", user.id);
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[PartyReport] Purchases fetch failed offline:", e);
            }
            return (await sqliteService.getAll<any>("purchases", user.id)) || [];
        },
        enabled: !!user,
    });

    // CA-Compliant Ledger Aggregation
    const aggregatedData = useMemo(() => {
        const partyMap = new Map<string, EnrichedPartyItem>();
        const idToNorm = new Map<string, string>();
        const now = new Date();

        // Initialize from parties directory if available
        partiesDirectory.forEach((p: any) => {
            const name = (p.name || "").trim();
            if (!name) return;
            const norm = name.toLowerCase();
            if (p.id) idToNorm.set(p.id, norm);

            const openBal = Number(p.opening_balance) || 0;
            const isOpeningReceivable = p.opening_balance_type
                ? p.opening_balance_type === "to_receive"
                : p.type !== "vendor";

            partyMap.set(norm, {
                name,
                phone: p.phone || undefined,
                type: p.type === "vendor" ? "vendor" : p.type === "both" ? "both" : "customer",
                totalSales: 0,
                totalPurchases: 0,
                receivable: isOpeningReceivable ? openBal : 0,
                payable: !isOpeningReceivable ? openBal : 0,
                netBalance: 0,
                salesCount: 0,
                purchasesCount: 0,
                overdueDaysMax: 0,
                ageCategory: "current",
            });
        });

        // Process Sales (Receivables)
        sales.forEach((sale: any) => {
            const rawName = (sale.customer_name || "").trim();
            let norm = rawName.toLowerCase();
            if (sale.party_id && idToNorm.has(sale.party_id)) {
                norm = idToNorm.get(sale.party_id)!;
            }
            if (!norm) return;

            if (!partyMap.has(norm)) {
                partyMap.set(norm, {
                    name: rawName || norm,
                    phone: sale.customer_phone || undefined,
                    type: "customer",
                    totalSales: 0,
                    totalPurchases: 0,
                    receivable: 0,
                    payable: 0,
                    netBalance: 0,
                    salesCount: 0,
                    purchasesCount: 0,
                    overdueDaysMax: 0,
                    ageCategory: "current",
                });
            }

            const p = partyMap.get(norm)!;
            const total = Number(sale.total_amount) || 0;
            const paid = sale.amount_paid != null ? Number(sale.amount_paid) : (sale.status === "paid" ? total : 0);
            const due = sale.balance_due != null ? Number(sale.balance_due) : Math.max(0, total - paid);
            const docType = (sale.document_type || "invoice").toLowerCase();

            if (docType === "receipt") {
                const rcptAmt = total || paid;
                p.receivable = Math.max(0, p.receivable - rcptAmt);
            } else if (docType === "credit_note") {
                p.receivable = Math.max(0, p.receivable - total);
            } else if (docType === "debit_note") {
                p.receivable += total;
                p.totalSales += total;
            } else {
                p.totalSales += total;
                p.salesCount += 1;
                p.receivable += due;

                if (due > 0 && sale.date) {
                    const saleDate = new Date(sale.date);
                    if (!isNaN(saleDate.getTime())) {
                        const days = Math.max(0, differenceInDays(now, saleDate));
                        if (days > p.overdueDaysMax) {
                            p.overdueDaysMax = days;
                            if (days > 90) p.ageCategory = "90+";
                            else if (days > 60 && p.ageCategory !== "90+") p.ageCategory = "61-90";
                            else if (days > 30 && p.ageCategory !== "90+" && p.ageCategory !== "61-90") p.ageCategory = "31-60";
                        }
                    }
                }
            }
        });

        // Process Purchases (Payables)
        purchases.forEach((purchase: any) => {
            const rawName = (purchase.vendor_name || "").trim();
            let norm = rawName.toLowerCase();
            if (purchase.party_id && idToNorm.has(purchase.party_id)) {
                norm = idToNorm.get(purchase.party_id)!;
            }
            if (!norm) return;

            if (!partyMap.has(norm)) {
                partyMap.set(norm, {
                    name: rawName || norm,
                    type: "vendor",
                    totalSales: 0,
                    totalPurchases: 0,
                    receivable: 0,
                    payable: 0,
                    netBalance: 0,
                    salesCount: 0,
                    purchasesCount: 0,
                    overdueDaysMax: 0,
                    ageCategory: "current",
                });
            } else {
                const p = partyMap.get(norm)!;
                if (p.type === "customer" && p.salesCount > 0) {
                    p.type = "both";
                }
            }

            const p = partyMap.get(norm)!;
            const total = Number(purchase.total_amount) || 0;
            const paid = purchase.amount_paid != null ? Number(purchase.amount_paid) : (purchase.status === "paid" ? total : 0);
            const due = purchase.balance_due != null ? Number(purchase.balance_due) : Math.max(0, total - paid);
            const docType = (purchase.document_type || "bill").toLowerCase();

            if (docType === "payment") {
                const pmtAmt = total || paid;
                p.payable = Math.max(0, p.payable - pmtAmt);
            } else if (docType === "debit_note") {
                p.payable = Math.max(0, p.payable - total);
            } else if (docType === "credit_note") {
                p.payable += total;
                p.totalPurchases += total;
            } else {
                p.totalPurchases += total;
                p.purchasesCount += 1;
                p.payable += due;
            }
        });

        // Finalize Net Position for each party
        partyMap.forEach((p) => {
            p.netBalance = p.receivable - p.payable;
        });

        const list = Array.from(partyMap.values());
        return list.sort((a, b) => {
            const expA = a.receivable + a.payable;
            const expB = b.receivable + b.payable;
            if (expB !== expA) return expB - expA;
            return b.totalSales + b.totalPurchases - (a.totalSales + a.totalPurchases);
        });
    }, [sales, purchases, partiesDirectory]);

    // Apply Filter & Search
    const filteredData = useMemo(() => {
        return aggregatedData.filter((p) => {
            const matchSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.phone && p.phone.includes(searchTerm));
            if (!matchSearch) return false;

            if (typeFilter === "customer" && p.type === "vendor") return false;
            if (typeFilter === "vendor" && p.type === "customer") return false;

            if (balanceFilter === "active" && p.receivable === 0 && p.payable === 0) return false;
            if (balanceFilter === "receivable" && p.receivable <= 0) return false;
            if (balanceFilter === "payable" && p.payable <= 0) return false;

            return true;
        });
    }, [aggregatedData, searchTerm, typeFilter, balanceFilter]);

    // Totals for Executive KPI Cards
    const totalReceivables = useMemo(
        () => aggregatedData.reduce((sum, p) => sum + p.receivable, 0),
        [aggregatedData]
    );
    const totalPayables = useMemo(
        () => aggregatedData.reduce((sum, p) => sum + p.payable, 0),
        [aggregatedData]
    );
    const netWorkingCapital = totalReceivables - totalPayables;
    const totalOverdueDebtors = useMemo(
        () => aggregatedData.filter((p) => p.receivable > 0 && p.overdueDaysMax > 30).length,
        [aggregatedData]
    );

    const sendWhatsAppReminder = (party: EnrichedPartyItem) => {
        if (!party.phone) {
            alert(`No phone number found for ${party.name}. Please add one in Parties Directory.`);
            return;
        }

        if (connStatus?.status === "connected") {
            setActiveReminderParty(party);
            return;
        }

        const cleanPhone = party.phone.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(
            `Dear ${party.name}, this is a gentle reminder from ${
                (profile as any)?.business_name || "our accounts department"
            } regarding your outstanding balance of ${formatCurrency(
                party.receivable
            )}. Please arrange for payment at your earliest convenience. Thank you!`
        );
        window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
    };

    return {
        formatCurrency,
        currency,
        profile,
        searchTerm,
        setSearchTerm,
        typeFilter,
        setTypeFilter,
        balanceFilter,
        setBalanceFilter,
        activeReminderParty,
        setActiveReminderParty,
        salesLoading,
        purchasesLoading,
        aggregatedData,
        filteredData,
        totalReceivables,
        totalPayables,
        netWorkingCapital,
        totalOverdueDebtors,
        sendWhatsAppReminder,
    };
}
