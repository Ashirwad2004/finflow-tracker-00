import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { sqliteService } from "@/core/offline/sqliteService";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Search,
    Download,
    FileText,
    FileSpreadsheet,
    CalendarIcon,
    ArrowRightLeft,
    PlusCircle,
    MessageCircle,
    Phone,
    MapPin,
    Mail,
    Building,
    CheckCircle2,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowUpDown,
    Filter
} from "lucide-react";

import { exportDetailedPartyPDF } from "@/utils/exportDetailedPartyPDF";
import { exportDetailedPartyCSV } from "@/utils/exportDetailedPartyCSV";
import { parsePaymentTranscript } from "@/features/business/utils/paymentTranscript";
import { UniversalPaymentDialog } from "@/features/business/components/UniversalPaymentDialog";
import { cn } from "@/core/lib/utils";

export interface LedgerTransaction {
    id: string;
    date: string;
    type: 'sale' | 'purchase' | 'payment_received' | 'payment_made' | 'credit_note' | 'debit_note' | 'opening_balance';
    amount: number;
    amount_paid?: number;
    balance_due?: number;
    status?: string;
    ref: string;
    debit: number;
    credit: number;
    runningBalance: number;
    notes?: string;
    payment_method?: string;
    voucher_number?: string;
}

export const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    if (typeof d === 'string') {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, day] = s.split('-').map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
            const [day, m, y] = s.split(/[-/]/).map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date() : dt;
};

export interface DetailedPartyReportProps {
    initialPartyName?: string | null;
    initialPartyId?: string | null;
}

export const DetailedPartyReport = ({ initialPartyName, initialPartyId }: DetailedPartyReportProps) => {
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [selectedParty, setSelectedParty] = useState<string>("all");
    const [partySearch, setPartySearch] = useState<string>("");
    const [viewOrder, setViewOrder] = useState<"chronological" | "reverse">("chronological");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });

    // Payment Dialog state
    const [paymentModal, setPaymentModal] = useState<{
        open: boolean;
        mode: "payment_in" | "payment_out";
        partyId?: string;
    }>({
        open: false,
        mode: "payment_in"
    });

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
                console.warn("[DetailedPartyReport] Profile fetch failed offline:", e);
            }
            return (await sqliteService.getById<any>(user.id)) || null;
        },
        enabled: !!user
    });

    // Fetch Parties Directory with Offline Fallback
    const { data: partiesDirectory = [], isLoading: partiesLoading } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("parties")
                    .select("id, name, phone, email, address, gst_number, type, opening_balance, opening_balance_type, created_at")
                    .eq("user_id", user.id)
                    .order("name");
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[DetailedPartyReport] Parties fetch failed offline:", e);
            }
            const cached = queryClient.getQueryData<any[]>(["parties", user.id]);
            if (cached && cached.length > 0) return cached;
            return (await sqliteService.getAll<any>("parties", user.id)) || [];
        },
        enabled: !!user
    });

    // Fetch all sales (with notes and document_type for transcript parsing)
    const { data: sales = [], isLoading: salesLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("sales")
                    .select("id, customer_name, customer_phone, customer_email, customer_gstin, party_id, total_amount, amount_paid, balance_due, status, date, created_at, invoice_number, payment_method, document_type, notes, items")
                    .eq("user_id", user.id)
                    .neq("status", "draft")
                    .order("date", { ascending: false });
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[DetailedPartyReport] Sales fetch failed offline:", e);
            }
            const cached = queryClient.getQueryData<any[]>(["sales", user.id]);
            if (cached && cached.length > 0) return cached;
            return (await sqliteService.getAll<any>("sales", user.id)) || [];
        },
        enabled: !!user
    });

    // Fetch all purchases (with notes and document_type for transcript parsing)
    const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            try {
                const { data, error } = await (supabase as any)
                    .from("purchases")
                    .select("id, vendor_name, vendor_phone, vendor_email, vendor_gstin, party_id, total_amount, amount_paid, balance_due, status, date, created_at, bill_number, payment_method, document_type, notes, items")
                    .eq("user_id", user.id)
                    .order("date", { ascending: false });
                if (!error && data) return data as any[];
            } catch (e) {
                console.warn("[DetailedPartyReport] Purchases fetch failed offline:", e);
            }
            const cached = queryClient.getQueryData<any[]>(["purchases", user.id]);
            if (cached && cached.length > 0) return cached;
            return (await sqliteService.getAll<any>("purchases", user.id)) || [];
        },
        enabled: !!user
    });

    // Extract unified unique parties across Directory, Sales, and Purchases
    const uniqueParties = useMemo(() => {
        interface PartyOption {
            id?: string;
            name: string;
            type: "customer" | "vendor" | "both";
            phone?: string;
            gst?: string;
        }

        const map = new Map<string, PartyOption>();

        // 1. From Parties directory
        partiesDirectory.forEach((p: any) => {
            const name = (p.name || "").trim();
            if (!name) return;
            const norm = name.toLowerCase();
            map.set(norm, {
                id: p.id,
                name,
                type: p.type || "customer",
                phone: p.phone || undefined,
                gst: p.gst_number || undefined
            });
        });

        // 2. From Sales
        sales.forEach((s: any) => {
            const name = (s.customer_name || "").trim();
            if (!name) return;
            const norm = name.toLowerCase();
            if (!map.has(norm)) {
                map.set(norm, {
                    id: s.party_id || undefined,
                    name,
                    type: "customer",
                    phone: s.customer_phone || undefined,
                    gst: s.customer_gstin || undefined
                });
            } else {
                const existing = map.get(norm)!;
                if (!existing.id && s.party_id) existing.id = s.party_id;
                if (!existing.phone && s.customer_phone) existing.phone = s.customer_phone;
            }
        });

        // 3. From Purchases
        purchases.forEach((p: any) => {
            const name = (p.vendor_name || "").trim();
            if (!name) return;
            const norm = name.toLowerCase();
            if (!map.has(norm)) {
                map.set(norm, {
                    id: p.party_id || undefined,
                    name,
                    type: "vendor",
                    phone: p.vendor_phone || undefined,
                    gst: p.vendor_gstin || undefined
                });
            } else {
                const existing = map.get(norm)!;
                if (existing.type === "customer") existing.type = "both";
                if (!existing.id && p.party_id) existing.id = p.party_id;
                if (!existing.phone && p.vendor_phone) existing.phone = p.vendor_phone;
            }
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [partiesDirectory, sales, purchases]);

    // Handle initial selection from props
    useEffect(() => {
        if (initialPartyName && initialPartyName !== "all") {
            setSelectedParty(initialPartyName.trim());
        } else if (initialPartyId) {
            const match = uniqueParties.find(p => p.id === initialPartyId);
            if (match) setSelectedParty(match.name);
        } else if (selectedParty === "all" && uniqueParties.length > 0) {
            // Default to first party so ledger is instantly visible
            setSelectedParty(uniqueParties[0].name);
        }
    }, [initialPartyName, initialPartyId, uniqueParties]);

    // Selected Party Master Record (if found)
    const activePartyRecord = useMemo(() => {
        if (!selectedParty || selectedParty === "all") return null;
        const normSelected = selectedParty.trim().toLowerCase();
        return partiesDirectory.find((p: any) =>
            p.name && p.name.trim().toLowerCase() === normSelected
        ) || uniqueParties.find(p => p.name.trim().toLowerCase() === normSelected) || null;
    }, [selectedParty, partiesDirectory, uniqueParties]);

    // Filtered Parties for quick-search
    const filteredPartyOptions = useMemo(() => {
        if (!partySearch.trim()) return uniqueParties;
        const q = partySearch.toLowerCase();
        return uniqueParties.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.phone && p.phone.includes(q)) ||
            (p.gst && p.gst.toLowerCase().includes(q))
        );
    }, [uniqueParties, partySearch]);

    // Build CA-Grade Double-Entry Chronological Ledger for Selected Party
    const { fullLedger, closingBalance, totalPeriodDebit, totalPeriodCredit, hasBroughtForward } = useMemo(() => {
        if (!selectedParty || selectedParty === "all") {
            return {
                fullLedger: [],
                closingBalance: 0,
                totalPeriodDebit: 0,
                totalPeriodCredit: 0,
                hasBroughtForward: false
            };
        }

        const normSelected = selectedParty.trim().toLowerCase();
        const partyId = activePartyRecord?.id;
        const rawTransactions: Omit<LedgerTransaction, 'runningBalance'>[] = [];

        // -------------------------------------------------------------
        // 1. OPENING BALANCE (Recorded in Parties Directory)
        // -------------------------------------------------------------
        const masterParty = partiesDirectory.find((p: any) =>
            (partyId && p.id === partyId) || (p.name && p.name.trim().toLowerCase() === normSelected)
        );

        if (masterParty && Number(masterParty.opening_balance) > 0) {
            const openBal = Number(masterParty.opening_balance);
            const isReceivable = masterParty.opening_balance_type
                ? masterParty.opening_balance_type === 'to_receive'
                : masterParty.type !== 'vendor';

            rawTransactions.push({
                id: `open-bal-${masterParty.id}`,
                date: masterParty.created_at || "2020-01-01T00:00:00.000Z",
                type: 'opening_balance',
                amount: openBal,
                amount_paid: 0,
                balance_due: openBal,
                status: isReceivable ? 'to_receive' : 'to_pay',
                ref: 'Opening Balance (Master Record)',
                debit: isReceivable ? openBal : 0,
                credit: !isReceivable ? openBal : 0,
                voucher_number: 'OPENING'
            });
        }

        // -------------------------------------------------------------
        // 2. PROCESS SALES (Receivables & Collections)
        // -------------------------------------------------------------
        sales.forEach((sale: any) => {
            const custName = (sale.customer_name || "").trim().toLowerCase();
            const isMatch = (partyId && sale.party_id && sale.party_id === partyId) || (custName === normSelected);
            if (!isMatch) return;

            const txDate = sale.date || sale.created_at || new Date().toISOString();
            const total = Number(sale.total_amount) || 0;
            const paid = sale.amount_paid != null ? Number(sale.amount_paid) : (sale.status === 'paid' ? total : 0);
            const due = sale.balance_due != null ? Number(sale.balance_due) : Math.max(0, total - paid);
            const docType = (sale.document_type || 'invoice').toLowerCase();

            if (docType === 'receipt') {
                // Standalone Receipt (Payment In without bill)
                // Pure Credit to customer account
                rawTransactions.push({
                    id: `sale-rcpt-standalone-${sale.id}`,
                    date: txDate,
                    type: 'payment_received',
                    amount: total || paid,
                    amount_paid: total || paid,
                    balance_due: 0,
                    status: 'paid',
                    ref: `Payment In / Receipt #${sale.invoice_number || 'REC'} (${sale.payment_method || 'Cash/Bank'})`,
                    debit: 0,
                    credit: total || paid,
                    notes: sale.notes,
                    payment_method: sale.payment_method,
                    voucher_number: sale.invoice_number
                });
            } else if (docType === 'credit_note') {
                // Customer Return / Credit Note (Reduces customer debt -> Credit)
                rawTransactions.push({
                    id: `sale-cn-${sale.id}`,
                    date: txDate,
                    type: 'credit_note',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: sale.status,
                    ref: `Sales Credit Note #${sale.invoice_number || 'CN'}`,
                    debit: 0,
                    credit: total,
                    notes: sale.notes,
                    voucher_number: sale.invoice_number
                });
            } else if (docType === 'debit_note') {
                // Customer Debit Note (Increases customer debt -> Debit)
                rawTransactions.push({
                    id: `sale-dn-${sale.id}`,
                    date: txDate,
                    type: 'debit_note',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: sale.status,
                    ref: `Sales Debit Note #${sale.invoice_number || 'DN'}`,
                    debit: total,
                    credit: 0,
                    notes: sale.notes,
                    voucher_number: sale.invoice_number
                });
            } else {
                // Standard Sales Invoice: DEBIT to Customer
                rawTransactions.push({
                    id: `sale-inv-${sale.id}`,
                    date: txDate,
                    type: 'sale',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: sale.status,
                    ref: `Sales Invoice #${sale.invoice_number || 'INV'}`,
                    debit: total,
                    credit: 0,
                    notes: sale.notes,
                    payment_method: sale.payment_method,
                    voucher_number: sale.invoice_number
                });

                // Extract payment transcript vouchers if any
                const { payments } = parsePaymentTranscript(sale.notes, {
                    total_amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: sale.status,
                    payment_method: sale.payment_method,
                    date: sale.date,
                    type: 'sale'
                });

                if (payments && payments.length > 0) {
                    payments.forEach((voucher: any, idx: number) => {
                        const vDate = voucher.date || txDate;
                        const vAmount = Number(voucher.amount) || 0;
                        if (vAmount > 0) {
                            const method = (voucher.payment_method || sale.payment_method || 'Cash').toUpperCase();
                            const refInfo = voucher.reference_number ? ` (Ref: ${voucher.reference_number})` : '';
                            rawTransactions.push({
                                id: `sale-pmt-vch-${sale.id}-${voucher.id || idx}`,
                                date: vDate,
                                type: 'payment_received',
                                amount: vAmount,
                                amount_paid: vAmount,
                                balance_due: 0,
                                status: 'paid',
                                ref: `Receipt #${voucher.voucher_number || sale.invoice_number} against #${sale.invoice_number || 'INV'} [${method}${refInfo}]`,
                                debit: 0,
                                credit: vAmount,
                                notes: voucher.notes,
                                payment_method: voucher.payment_method,
                                voucher_number: voucher.voucher_number
                            });
                        }
                    });
                } else if (paid > 0) {
                    // Fallback for invoice generated with upfront payment
                    rawTransactions.push({
                        id: `sale-pmt-init-${sale.id}`,
                        date: txDate,
                        type: 'payment_received',
                        amount: paid,
                        amount_paid: paid,
                        balance_due: 0,
                        status: 'paid',
                        ref: `Receipt against #${sale.invoice_number || 'INV'} (${sale.payment_method || 'Cash/Bank'})`,
                        debit: 0,
                        credit: paid,
                        payment_method: sale.payment_method,
                        voucher_number: sale.invoice_number
                    });
                }
            }
        });

        // -------------------------------------------------------------
        // 3. PROCESS PURCHASES (Payables & Disbursements)
        // -------------------------------------------------------------
        purchases.forEach((purchase: any) => {
            const vendName = (purchase.vendor_name || "").trim().toLowerCase();
            const isMatch = (partyId && purchase.party_id && purchase.party_id === partyId) || (vendName === normSelected);
            if (!isMatch) return;

            const txDate = purchase.date || purchase.created_at || new Date().toISOString();
            const total = Number(purchase.total_amount) || 0;
            const paid = purchase.amount_paid != null ? Number(purchase.amount_paid) : (purchase.status === 'paid' ? total : 0);
            const due = purchase.balance_due != null ? Number(purchase.balance_due) : Math.max(0, total - paid);
            const docType = (purchase.document_type || 'bill').toLowerCase();

            if (docType === 'payment') {
                // Standalone Payment Out
                // Pure Debit to supplier account (reduces payable)
                rawTransactions.push({
                    id: `pur-pmt-standalone-${purchase.id}`,
                    date: txDate,
                    type: 'payment_made',
                    amount: total || paid,
                    amount_paid: total || paid,
                    balance_due: 0,
                    status: 'paid',
                    ref: `Payment Out #${purchase.bill_number || 'PAY'} (${purchase.payment_method || 'Cash/Bank'})`,
                    debit: total || paid,
                    credit: 0,
                    notes: purchase.notes,
                    payment_method: purchase.payment_method,
                    voucher_number: purchase.bill_number
                });
            } else if (docType === 'debit_note') {
                // Purchase Debit Note: Return to vendor, decreases payable -> Debit
                rawTransactions.push({
                    id: `pur-dn-${purchase.id}`,
                    date: txDate,
                    type: 'debit_note',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: purchase.status,
                    ref: `Purchase Debit Note #${purchase.bill_number || 'DN'}`,
                    debit: total,
                    credit: 0,
                    notes: purchase.notes,
                    voucher_number: purchase.bill_number
                });
            } else if (docType === 'credit_note') {
                // Purchase Credit Note: Vendor credit note, increases payable -> Credit
                rawTransactions.push({
                    id: `pur-cn-${purchase.id}`,
                    date: txDate,
                    type: 'credit_note',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: purchase.status,
                    ref: `Purchase Credit Note #${purchase.bill_number || 'CN'}`,
                    debit: 0,
                    credit: total,
                    notes: purchase.notes,
                    voucher_number: purchase.bill_number
                });
            } else {
                // Standard Purchase Bill: CREDIT to Supplier
                rawTransactions.push({
                    id: `pur-bill-${purchase.id}`,
                    date: txDate,
                    type: 'purchase',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: purchase.status,
                    ref: `Purchase Bill #${purchase.bill_number || 'BILL'}`,
                    debit: 0,
                    credit: total,
                    notes: purchase.notes,
                    payment_method: purchase.payment_method,
                    voucher_number: purchase.bill_number
                });

                // Extract payment transcript vouchers if any
                const { payments } = parsePaymentTranscript(purchase.notes, {
                    total_amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: purchase.status,
                    payment_method: purchase.payment_method,
                    date: purchase.date,
                    type: 'purchase'
                });

                if (payments && payments.length > 0) {
                    payments.forEach((voucher: any, idx: number) => {
                        const vDate = voucher.date || txDate;
                        const vAmount = Number(voucher.amount) || 0;
                        if (vAmount > 0) {
                            const method = (voucher.payment_method || purchase.payment_method || 'Cash').toUpperCase();
                            const refInfo = voucher.reference_number ? ` (Ref: ${voucher.reference_number})` : '';
                            rawTransactions.push({
                                id: `pur-pmt-vch-${purchase.id}-${voucher.id || idx}`,
                                date: vDate,
                                type: 'payment_made',
                                amount: vAmount,
                                amount_paid: vAmount,
                                balance_due: 0,
                                status: 'paid',
                                ref: `Payment #${voucher.voucher_number || purchase.bill_number} against Bill #${purchase.bill_number || 'BILL'} [${method}${refInfo}]`,
                                debit: vAmount,
                                credit: 0,
                                notes: voucher.notes,
                                payment_method: voucher.payment_method,
                                voucher_number: voucher.voucher_number
                            });
                        }
                    });
                } else if (paid > 0) {
                    // Fallback for bill generated with upfront payment
                    rawTransactions.push({
                        id: `pur-pmt-init-${purchase.id}`,
                        date: txDate,
                        type: 'payment_made',
                        amount: paid,
                        amount_paid: paid,
                        balance_due: 0,
                        status: 'paid',
                        ref: `Payment against Bill #${purchase.bill_number || 'BILL'} (${purchase.payment_method || 'Cash/Bank'})`,
                        debit: paid,
                        credit: 0,
                        payment_method: purchase.payment_method,
                        voucher_number: purchase.bill_number
                    });
                }
            }
        });

        // -------------------------------------------------------------
        // 4. CHRONOLOGICAL SORTING (Standard CA Ledger Order)
        // -------------------------------------------------------------
        rawTransactions.sort((a, b) => {
            const timeA = parseSafeDate(a.date).getTime();
            const timeB = parseSafeDate(b.date).getTime();
            if (timeA !== timeB) return timeA - timeB;

            const priority = (t: string) => {
                if (t === 'opening_balance') return 0;
                if (t === 'sale' || t === 'purchase') return 1;
                if (t === 'debit_note' || t === 'credit_note') return 2;
                return 3; // Receipts and payments last on same date
            };
            return priority(a.type) - priority(b.type);
        });

        // -------------------------------------------------------------
        // 5. DATE RANGE FILTER WITH BALANCE BROUGHT FORWARD (b/f)
        // -------------------------------------------------------------
        let initialBroughtForward = 0;
        let filteredRaw: Omit<LedgerTransaction, 'runningBalance'>[] = [];
        let hasBF = false;

        if (dateRange.from) {
            hasBF = true;
            const startPeriod = startOfDay(dateRange.from).getTime();
            const endPeriod = dateRange.to ? endOfDay(dateRange.to).getTime() : Infinity;

            rawTransactions.forEach(tx => {
                const txTime = parseSafeDate(tx.date).getTime();
                if (txTime < startPeriod) {
                    initialBroughtForward += (tx.debit - tx.credit);
                } else if (txTime <= endPeriod) {
                    filteredRaw.push(tx);
                }
            });
        } else if (dateRange.to) {
            const endPeriod = endOfDay(dateRange.to).getTime();
            rawTransactions.forEach(tx => {
                const txTime = parseSafeDate(tx.date).getTime();
                if (txTime <= endPeriod) {
                    filteredRaw.push(tx);
                }
            });
        } else {
            filteredRaw = [...rawTransactions];
        }

        // -------------------------------------------------------------
        // 6. ACCUMULATE RUNNING BALANCE
        // -------------------------------------------------------------
        const ledgerList: LedgerTransaction[] = [];
        let currentBalance = 0;
        let periodDr = 0;
        let periodCr = 0;

        if (dateRange.from) {
            currentBalance = initialBroughtForward;
            ledgerList.push({
                id: 'opening-balance-bfwd',
                date: format(dateRange.from, 'yyyy-MM-dd'),
                type: 'opening_balance',
                amount: Math.abs(initialBroughtForward),
                ref: 'Opening Balance b/f (Prior Period)',
                debit: initialBroughtForward > 0 ? initialBroughtForward : 0,
                credit: initialBroughtForward < 0 ? Math.abs(initialBroughtForward) : 0,
                runningBalance: initialBroughtForward,
                status: 'cleared',
                voucher_number: 'B/FWD'
            });
        }

        filteredRaw.forEach(tx => {
            currentBalance += (tx.debit - tx.credit);
            periodDr += tx.debit;
            periodCr += tx.credit;
            ledgerList.push({
                ...tx,
                runningBalance: currentBalance
            });
        });

        return {
            fullLedger: ledgerList,
            closingBalance: currentBalance,
            totalPeriodDebit: periodDr,
            totalPeriodCredit: periodCr,
            hasBroughtForward: hasBF
        };
    }, [sales, purchases, partiesDirectory, selectedParty, dateRange, activePartyRecord]);

    // Rendered list according to user toggle (Chronological or Reverse)
    const displayLedger = useMemo(() => {
        if (viewOrder === "reverse") {
            return [...fullLedger].reverse();
        }
        return fullLedger;
    }, [fullLedger, viewOrder]);

    // Send WhatsApp Payment Reminder
    const sendWhatsAppReminder = () => {
        const phone = activePartyRecord?.phone;
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const bizName = (profile as any)?.business_name || "our office";
        const isDr = closingBalance > 0;

        const message = isDr
            ? `Dear ${selectedParty},\n\nThis is a friendly reminder from ${bizName} regarding your outstanding balance of ${formatCurrency(closingBalance)} as per your current ledger statement. Please arrange the payment at your earliest convenience.\n\nThank you!`
            : `Dear ${selectedParty},\n\nGreeting from ${bizName}. Your ledger statement currently shows a credit balance of ${formatCurrency(Math.abs(closingBalance))}.\n\nThank you!`;

        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    return (
        <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <ArrowRightLeft className="w-5 h-5 text-primary" />
                                Detailed Party Ledger
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Verified CA double-entry statement showing every invoice, payment voucher, and running balance.
                            </CardDescription>
                        </div>

                        {/* Top Action Quick Buttons */}
                        {selectedParty !== "all" && activePartyRecord && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setPaymentModal({ open: true, mode: "payment_in", partyId: activePartyRecord.id })}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-2.5 shadow-xs"
                                >
                                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                    Payment In (Receipt)
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setPaymentModal({ open: true, mode: "payment_out", partyId: activePartyRecord.id })}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8 px-2.5 shadow-xs"
                                >
                                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                    Payment Out
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Filter & Selector Controls */}
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                        {/* Party Selector with Search */}
                        <div className="w-full lg:w-80">
                            <Select value={selectedParty} onValueChange={setSelectedParty}>
                                <SelectTrigger className="w-full h-10 font-semibold bg-background border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Select a Customer or Vendor" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    <div className="p-2 border-b">
                                        <div className="flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 gap-1.5">
                                            <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Search party by name or phone..."
                                                value={partySearch}
                                                onChange={(e) => setPartySearch(e.target.value)}
                                                className="w-full bg-transparent text-xs outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <SelectItem value="all" className="font-semibold text-muted-foreground">-- Select a Party --</SelectItem>
                                    {filteredPartyOptions.map(p => (
                                        <SelectItem key={p.name} value={p.name} className="py-2">
                                            <div className="flex items-center justify-between w-full gap-2">
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{p.name}</span>
                                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                                    {p.type}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range Picker with Quick presets */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[230px] justify-start text-left font-normal bg-background h-10 text-xs border-slate-200 dark:border-slate-800",
                                            !dateRange.from && "text-muted-foreground"
                                        )}
                                        disabled={selectedParty === "all"}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "dd MMM yy")} - {format(dateRange.to, "dd MMM yy")}
                                                </>
                                            ) : (
                                                `From ${format(dateRange.from, "dd MMM yy")}`
                                            )
                                        ) : (
                                            <span>Filter by date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <div className="p-2 border-b flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                                        >
                                            This Month
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}
                                        >
                                            Last Month
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                                        >
                                            Last 90 Days
                                        </Button>
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={{ from: dateRange.from, to: dateRange.to }}
                                        onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>

                            {(dateRange.from || dateRange.to) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                                    className="h-10 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Reset Dates
                                </Button>
                            )}
                        </div>

                        {/* View Order Toggle & Export in single right cluster */}
                        <div className="flex items-center gap-2 ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewOrder(prev => prev === "chronological" ? "reverse" : "chronological")}
                                className="h-10 text-xs border-slate-200 dark:border-slate-800 gap-1.5"
                                title="Toggle Chronological / Latest first"
                                disabled={selectedParty === "all"}
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Order:</span>
                                <span className="font-semibold capitalize">{viewOrder === "chronological" ? "Oldest First (CA)" : "Latest First"}</span>
                            </Button>

                            {/* Export Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="default"
                                        className="h-10 text-xs font-semibold shadow-xs"
                                        disabled={selectedParty === "all" || fullLedger.length === 0}
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Export Ledger
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 text-xs">
                                    <DropdownMenuItem
                                        className="cursor-pointer py-2 text-xs"
                                        onClick={() => exportDetailedPartyPDF(
                                            fullLedger,
                                            selectedParty,
                                            dateRange,
                                            profile ? {
                                                name: (profile as any).business_name,
                                                address: (profile as any).business_address,
                                                phone: (profile as any).business_phone,
                                                gst: (profile as any).gst_number
                                            } : undefined
                                        )}
                                    >
                                        <FileText className="w-4 h-4 mr-2 text-rose-500" />
                                        Download PDF Statement
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer py-2 text-xs"
                                        onClick={() => exportDetailedPartyCSV(
                                            fullLedger,
                                            selectedParty,
                                            dateRange,
                                            profile ? {
                                                name: (profile as any).business_name,
                                                address: (profile as any).business_address,
                                                phone: (profile as any).business_phone,
                                                gst: (profile as any).gst_number
                                            } : undefined
                                        )}
                                    >
                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                                        Download Excel (.xlsx)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {partiesLoading || salesLoading || purchasesLoading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse text-sm">
                            Loading verified ledger data...
                        </div>
                    ) : selectedParty === "all" ? (
                        <div className="text-center py-24 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-30 text-primary" />
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Party Selected</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                Select any customer or vendor above to generate their complete double-entry ledger statement.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Party Profile & Financial Position Strip */}
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {/* Party Master Card */}
                                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-1.5">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm">
                                                {selectedParty}
                                            </h3>
                                            <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
                                                {activePartyRecord?.type || "Party"}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                            {activePartyRecord?.phone && (
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span>{activePartyRecord.phone}</span>
                                                </div>
                                            )}
                                            {activePartyRecord?.gst && (
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span className="font-mono text-[11px]">GSTIN: {activePartyRecord.gst}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {activePartyRecord?.phone && closingBalance > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={sendWhatsAppReminder}
                                            className="mt-3 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold h-7 gap-1 w-full"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            WhatsApp Reminder
                                        </Button>
                                    )}
                                </div>

                                {/* Period Debit (Dr) Turnover */}
                                <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/60 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
                                        <span>Total Debit (Dr)</span>
                                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-300">
                                            {formatCurrency(totalPeriodDebit)}
                                        </div>
                                        <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                                            Invoiced / Disbursements
                                        </p>
                                    </div>
                                </div>

                                {/* Period Credit (Cr) Turnover */}
                                <div className="p-3.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        <span>Total Credit (Cr)</span>
                                        <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                                            {formatCurrency(totalPeriodCredit)}
                                        </div>
                                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                                            Collections / Purchase Bills
                                        </p>
                                    </div>
                                </div>

                                {/* Closing Net Balance */}
                                <div className={cn(
                                    "p-3.5 rounded-xl border flex flex-col justify-between",
                                    closingBalance > 0
                                        ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900"
                                        : closingBalance < 0
                                        ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                                        : "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                                )}>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className={cn(
                                            closingBalance > 0 ? "text-blue-800 dark:text-blue-300" :
                                            closingBalance < 0 ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"
                                        )}>
                                            {closingBalance > 0 ? "Net Receivable (Dr)" : closingBalance < 0 ? "Net Payable (Cr)" : "Settled (Nil)"}
                                        </span>
                                        {closingBalance === 0 ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        <div className={cn(
                                            "text-2xl font-black font-mono",
                                            closingBalance > 0 ? "text-blue-700 dark:text-blue-300" :
                                            closingBalance < 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
                                        )}>
                                            {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : ""}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {closingBalance > 0 ? "Party owes you money" : closingBalance < 0 ? "You owe money to party" : "Account fully reconciled"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Ledger Table */}
                            {fullLedger.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">No transactions found</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        There are no sales, purchases, or opening balances for this party in the selected date range.
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                                <TableRow>
                                                    <TableHead className="w-[110px] whitespace-nowrap">Date</TableHead>
                                                    <TableHead className="min-w-[240px]">Particulars / Reference</TableHead>
                                                    <TableHead className="w-[130px] whitespace-nowrap">Voucher Type</TableHead>
                                                    <TableHead className="text-right text-blue-700 dark:text-blue-400 font-bold w-[120px] whitespace-nowrap">Debit (Dr)</TableHead>
                                                    <TableHead className="text-right text-emerald-700 dark:text-emerald-400 font-bold w-[120px] whitespace-nowrap">Credit (Cr)</TableHead>
                                                    <TableHead className="text-right bg-slate-100/70 dark:bg-slate-800/70 font-bold w-[140px] whitespace-nowrap">Running Balance</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                                {displayLedger.map((tx) => {
                                                    const isBF = tx.id === 'opening-balance-bfwd';
                                                    const isOpeningMaster = tx.id.startsWith('open-bal-');
                                                    const isDrEntry = tx.debit > 0;
                                                    const isCrEntry = tx.credit > 0;

                                                    return (
                                                        <TableRow
                                                            key={tx.id}
                                                            className={cn(
                                                                "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                                                                (isBF || isOpeningMaster) && "bg-slate-50/60 dark:bg-slate-900/40 font-semibold"
                                                            )}
                                                        >
                                                            {/* Date */}
                                                            <TableCell className="font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                {format(parseSafeDate(tx.date), "dd MMM yyyy")}
                                                            </TableCell>

                                                            {/* Particulars & Reference */}
                                                            <TableCell>
                                                                <div className="space-y-0.5">
                                                                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                                        <span>{tx.ref}</span>
                                                                        {tx.balance_due != null && tx.balance_due > 0 && tx.type === 'sale' && (
                                                                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200">
                                                                                Due: {formatCurrency(tx.balance_due)}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {tx.notes && !tx.notes.includes("<!-- FINFLOW_PAYMENTS") && (
                                                                        <div className="text-[11px] text-muted-foreground truncate max-w-md">
                                                                            {tx.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            {/* Voucher Type Badge */}
                                                            <TableCell className="whitespace-nowrap">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-[10px] uppercase font-mono tracking-tight",
                                                                        tx.type === 'sale' ? "border-blue-200 text-blue-700 bg-blue-50/50 dark:bg-blue-950/30" :
                                                                        tx.type === 'purchase' ? "border-indigo-200 text-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30" :
                                                                        tx.type === 'payment_received' ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30" :
                                                                        tx.type === 'payment_made' ? "border-amber-200 text-amber-700 bg-amber-50/50 dark:bg-amber-950/30" :
                                                                        tx.type === 'credit_note' ? "border-rose-200 text-rose-700 bg-rose-50/50 dark:bg-rose-950/30" :
                                                                        tx.type === 'debit_note' ? "border-teal-200 text-teal-700 bg-teal-50/50 dark:bg-teal-950/30" :
                                                                        "border-slate-300 text-slate-700 bg-slate-100 dark:bg-slate-800"
                                                                    )}
                                                                >
                                                                    {tx.type.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>

                                                            {/* Debit (Dr) */}
                                                            <TableCell className="text-right font-mono font-medium text-blue-700 dark:text-blue-400">
                                                                {isDrEntry ? formatCurrency(tx.debit) : "-"}
                                                            </TableCell>

                                                            {/* Credit (Cr) */}
                                                            <TableCell className="text-right font-mono font-medium text-emerald-700 dark:text-emerald-400">
                                                                {isCrEntry ? formatCurrency(tx.credit) : "-"}
                                                            </TableCell>

                                                            {/* Running Balance */}
                                                            <TableCell className="text-right font-mono font-bold bg-slate-50/40 dark:bg-slate-900/40 border-l border-slate-200 dark:border-slate-800">
                                                                <span className={cn(
                                                                    tx.runningBalance > 0 ? "text-blue-700 dark:text-blue-400" :
                                                                    tx.runningBalance < 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600"
                                                                )}>
                                                                    {formatCurrency(Math.abs(tx.runningBalance))} {tx.runningBalance > 0 ? "Dr" : tx.runningBalance < 0 ? "Cr" : "Nil"}
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Final Summary Row */}
                                    <div className="bg-slate-100/90 dark:bg-slate-900/90 p-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold">
                                        <div className="text-slate-600 dark:text-slate-400">
                                            Total {displayLedger.length} transaction entries verified by CA double-entry rules.
                                        </div>
                                        <div className="flex items-center gap-4 font-mono">
                                            <div className="text-blue-700 dark:text-blue-400">
                                                Period Dr: {formatCurrency(totalPeriodDebit)}
                                            </div>
                                            <div className="text-emerald-700 dark:text-emerald-400">
                                                Period Cr: {formatCurrency(totalPeriodCredit)}
                                            </div>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded",
                                                closingBalance > 0 ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                                                closingBalance < 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800"
                                            )}>
                                                Closing: {formatCurrency(Math.abs(closingBalance))} {closingBalance > 0 ? "Dr" : closingBalance < 0 ? "Cr" : "Nil"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Universal Payment In / Out Dialog for instant settlements */}
            {paymentModal.open && (
                <UniversalPaymentDialog
                    open={paymentModal.open}
                    onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, open }))}
                    mode={paymentModal.mode}
                    initialPartyId={paymentModal.partyId}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["sales"] });
                        queryClient.invalidateQueries({ queryKey: ["purchases"] });
                        queryClient.invalidateQueries({ queryKey: ["parties"] });
                    }}
                />
            )}
        </div>
    );
};
