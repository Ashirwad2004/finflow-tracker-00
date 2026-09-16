import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Download, FileText, FileSpreadsheet, CalendarIcon, ArrowRightLeft } from "lucide-react";

import { exportDetailedPartyPDF } from "@/utils/exportDetailedPartyPDF";
import { exportDetailedPartyCSV } from "@/utils/exportDetailedPartyCSV";
import { cn } from "@/core/lib/utils";

export interface LedgerTransaction {
    id: string;
    date: string;
    type: 'sale' | 'purchase' | 'payment_received' | 'payment_made';
    amount: number;
    amount_paid?: number;
    balance_due?: number;
    status?: string;
    ref: string;
    debit: number;
    credit: number;
    runningBalance: number;
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

export const DetailedPartyReport = () => {
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();

    const [selectedParty, setSelectedParty] = useState<string>("all");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });

    // Fetch Profile for Business Details (PDF Export)
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

    // Fetch all sales
    const { data: sales = [], isLoading: salesLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("sales")
                .select("id, customer_name, party_id, total_amount, amount_paid, balance_due, status, date, created_at, invoice_number, payment_method")
                .eq("user_id", user?.id || "")
                .neq("status", "draft");
            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch all purchases
    const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("purchases")
                .select("id, vendor_name, party_id, total_amount, amount_paid, balance_due, status, date, created_at, bill_number, payment_method")
                .eq("user_id", user?.id || "");
            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Extract all unique parties across Sales and Purchases
    const uniqueParties = useMemo(() => {
        const parties = new Set<string>();
        sales.forEach(s => s.customer_name && parties.add(s.customer_name.trim()));
        purchases.forEach(p => p.vendor_name && parties.add(p.vendor_name.trim()));
        return Array.from(parties).sort();
    }, [sales, purchases]);

    // Build Chronological Ledger for Selected Party with CA double-entry accounting
    const ledger = useMemo(() => {
        if (!selectedParty || selectedParty === "all") return [];

        let rawTransactions: Omit<LedgerTransaction, 'runningBalance'>[] = [];
        const normSelected = selectedParty.trim().toLowerCase();

        // Process Sales:
        // Invoice is a DEBIT to customer (increases receivable)
        // Cash/Bank Payment collected is a CREDIT (decreases receivable)
        sales.forEach(sale => {
            const custName = (sale.customer_name || "").trim().toLowerCase();
            if (custName === normSelected) {
                const txDate = sale.date || sale.created_at || new Date().toISOString();
                const total = Number(sale.total_amount) || 0;
                const paid = sale.amount_paid != null ? Number(sale.amount_paid) : (sale.status === 'paid' ? total : 0);
                const due = sale.balance_due != null ? Number(sale.balance_due) : Math.max(0, total - paid);

                // 1. Sales Invoice (Debit)
                rawTransactions.push({
                    id: `sale-inv-${sale.id}`,
                    date: txDate,
                    type: 'sale',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: sale.status,
                    ref: `Sales Invoice #${sale.invoice_number || "INV"}`,
                    debit: total,
                    credit: 0
                });

                // 2. Immediate Receipt / Payment entry if paid > 0 (Credit)
                if (paid > 0) {
                    rawTransactions.push({
                        id: `sale-rcpt-${sale.id}`,
                        date: txDate,
                        type: 'payment_received',
                        amount: paid,
                        amount_paid: paid,
                        balance_due: 0,
                        status: 'paid',
                        ref: `Receipt against #${sale.invoice_number || "INV"} (${sale.payment_method || 'Cash/Bank'})`,
                        debit: 0,
                        credit: paid
                    });
                }
            }
        });

        // Process Purchases:
        // Purchase Bill is a CREDIT to supplier (increases payable)
        // Payment made to supplier is a DEBIT (decreases payable)
        purchases.forEach(purchase => {
            const vendName = (purchase.vendor_name || "").trim().toLowerCase();
            if (vendName === normSelected) {
                const txDate = purchase.date || purchase.created_at || new Date().toISOString();
                const total = Number(purchase.total_amount) || 0;
                const paid = purchase.amount_paid != null ? Number(purchase.amount_paid) : (purchase.status === 'paid' ? total : 0);
                const due = purchase.balance_due != null ? Number(purchase.balance_due) : Math.max(0, total - paid);

                // 1. Purchase Bill (Credit)
                rawTransactions.push({
                    id: `pur-bill-${purchase.id}`,
                    date: txDate,
                    type: 'purchase',
                    amount: total,
                    amount_paid: paid,
                    balance_due: due,
                    status: purchase.status,
                    ref: `Purchase Bill #${purchase.bill_number || "BILL"}`,
                    debit: 0,
                    credit: total
                });

                // 2. Payment Made to Supplier (Debit)
                if (paid > 0) {
                    rawTransactions.push({
                        id: `pur-pmt-${purchase.id}`,
                        date: txDate,
                        type: 'payment_made',
                        amount: paid,
                        amount_paid: paid,
                        balance_due: 0,
                        status: 'paid',
                        ref: `Payment against Bill #${purchase.bill_number || "BILL"} (${purchase.payment_method || 'Cash/Bank'})`,
                        debit: paid,
                        credit: 0
                    });
                }
            }
        });

        // Sort chronologically (oldest to newest ensures correct running balance)
        rawTransactions.sort((a, b) => {
            const timeA = parseSafeDate(a.date).getTime();
            const timeB = parseSafeDate(b.date).getTime();
            if (timeA === timeB) {
                // Invoices before payments on the same date
                if (a.type === 'sale' && b.type === 'payment_received') return -1;
                if (a.type === 'payment_received' && b.type === 'sale') return 1;
                if (a.type === 'purchase' && b.type === 'payment_made') return -1;
                if (a.type === 'payment_made' && b.type === 'purchase') return 1;
            }
            return timeA - timeB;
        });

        // Calculate running balance: Net Balance = Cumulative Debit - Cumulative Credit
        // Positive (> 0): Dr (Debit Balance = Party owes us / Receivable)
        // Negative (< 0): Cr (Credit Balance = We owe party / Payable)
        let currentBalance = 0;
        const fullLedger: LedgerTransaction[] = rawTransactions.map(tx => {
            currentBalance += (tx.debit - tx.credit);
            return {
                ...tx,
                runningBalance: currentBalance
            };
        });

        // Filter viewable portion based on Date Range
        if (dateRange.from || dateRange.to) {
            return fullLedger.filter(tx => {
                const txDate = parseSafeDate(tx.date);
                if (dateRange.from && dateRange.to) {
                    return isWithinInterval(txDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
                }
                if (dateRange.from) return txDate >= startOfDay(dateRange.from);
                if (dateRange.to) return txDate <= endOfDay(dateRange.to);
                return true;
            });
        }

        // Return reversed clone so latest transaction shows first
        return [...fullLedger].reverse();
    }, [sales, purchases, selectedParty, dateRange]);


    const renderSummary = () => {
        if (!ledger || ledger.length === 0) return null;

        // Final balance is the balance of the MOST RECENT transaction (which is at index 0 because we reversed it)
        // Wait, if date filtered, we want the most recent item IN the filter, but strictly speaking the 'Running Balance' 
        // inherently represents the total state. 
        const latestTx = ledger[0];
        const isOwed = latestTx.runningBalance >= 0;

        return (
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Card className="flex-1 bg-muted/30">
                    <CardHeader className="py-3 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Transactions Listed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ledger.length}</div>
                    </CardContent>
                </Card>
                <Card className={cn("flex-[2] transition-colors border",
                    isOwed ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                        : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                )}>
                    <CardHeader className="py-3 pb-2 flex flex-row items-center justify-between">
                        <CardTitle className={cn("text-sm font-bold", isOwed ? "text-blue-800 dark:text-blue-300" : "text-red-800 dark:text-red-300")}>
                            {isOwed ? "Net Credit (They owe you)" : "Net Debt (You owe them)"}
                        </CardTitle>
                        <ArrowRightLeft className={cn("w-4 h-4", isOwed ? "text-blue-500" : "text-red-500")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold", isOwed ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400")}>
                            {formatCurrency(Math.abs(latestTx.runningBalance))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-4 border-b space-y-4">
                    <div>
                        <CardTitle>Detailed Party Ledger</CardTitle>
                        <CardDescription>View a targeted chronological ledger of all transactions for a specific party.</CardDescription>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                        {/* Party Selector */}
                        <div className="w-full lg:w-72">
                            <Select value={selectedParty} onValueChange={setSelectedParty}>
                                <SelectTrigger className="w-full h-10 font-medium bg-background">
                                    <SelectValue placeholder="Select a Customer or Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">-- Select a Party --</SelectItem>
                                    {uniqueParties.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Filter */}
                        <div className="flex flex-row items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] justify-start text-left font-normal bg-background h-10",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                        disabled={selectedParty === "all"}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Filter by date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
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
                                <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: undefined, to: undefined })} className="text-muted-foreground hover:text-foreground">
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Export Dropdown */}
                        <div className="ml-auto w-full lg:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="default" className="w-full h-10 shadow-sm" disabled={selectedParty === "all" || ledger.length === 0}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Export Ledger
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => exportDetailedPartyPDF(ledger, selectedParty, dateRange, profile ? {
                                        name: (profile as any).business_name,
                                        address: (profile as any).business_address,
                                        phone: (profile as any).business_phone,
                                        gst: (profile as any).gst_number
                                    } : undefined)}>
                                        <FileText className="w-4 h-4 mr-2 text-red-500" />
                                        Download Ledger (PDF)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportDetailedPartyCSV(ledger, selectedParty, dateRange, profile ? {
                                        name: (profile as any).business_name,
                                        address: (profile as any).business_address,
                                        phone: (profile as any).business_phone,
                                        gst: (profile as any).gst_number
                                    } : undefined)}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                        Download Ledger (Excel)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                    {(salesLoading || purchasesLoading) ? (
                        <div className="text-center py-16 text-muted-foreground animate-pulse">Loading ledgers...</div>
                    ) : selectedParty === "all" ? (
                        <div className="text-center py-24 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <ArrowRightLeft className="w-10 h-10 mx-auto mb-4 opacity-20" />
                            <p className="font-medium text-foreground/80">No Party Selected</p>
                            <p className="text-sm">Please select a customer or vendor from the dropdown above to view their detailed transactional ledger.</p>
                        </div>
                    ) : ledger.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <p className="font-medium text-foreground/80">No Records Found</p>
                            <p className="text-sm">There are no transactions for {selectedParty} in this date range.</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {renderSummary()}

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/70">
                                        <TableRow>
                                            <TableHead className="w-[120px]">Date</TableHead>
                                            <TableHead>Particulars / Reference</TableHead>
                                            <TableHead className="text-right text-blue-700 dark:text-blue-400 font-bold">Debit (Dr)</TableHead>
                                            <TableHead className="text-right text-emerald-700 dark:text-emerald-400 font-bold">Credit (Cr)</TableHead>
                                            <TableHead className="text-right bg-muted font-bold">Running Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.map((tx) => (
                                            <TableRow key={tx.id} className="hover:bg-accent/40 transition-colors">
                                                <TableCell className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {format(parseSafeDate(tx.date), "dd MMM yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{tx.ref}</span>
                                                        <Badge variant="outline" className={cn("text-[10px] uppercase",
                                                            (tx.type === 'sale' || tx.type === 'payment_made') 
                                                                ? "border-blue-200 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30" 
                                                                : "border-emerald-200 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30")}>
                                                            {tx.type.replace('_', ' ')}
                                                        </Badge>
                                                        {tx.balance_due != null && tx.balance_due > 0 && (
                                                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200">
                                                                Due: {formatCurrency(tx.balance_due)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">
                                                    {tx.debit > 0 ? formatCurrency(tx.debit) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-500">
                                                    {tx.credit > 0 ? formatCurrency(tx.credit) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold bg-muted/30 border-l">
                                                    <span className={cn(
                                                        tx.runningBalance > 0 ? "text-blue-600 dark:text-blue-400" :
                                                            tx.runningBalance < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                                                    )}>
                                                        {formatCurrency(Math.abs(tx.runningBalance))} {tx.runningBalance > 0 ? "Dr" : tx.runningBalance < 0 ? "Cr" : "Nil"}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
