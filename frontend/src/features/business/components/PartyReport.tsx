import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    Search, Download, FileText, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
    Scale, AlertTriangle, MessageCircle, Filter, Eye
} from "lucide-react";
import { exportPartyReportPDF, PartyReportItem } from "@/utils/exportPartyReportPDF";
import { exportPartyReportCSV } from "@/utils/exportPartyReportCSV";
import { TableLoadingRows } from "@/components/shared/PageStates";

interface EnrichedPartyItem extends PartyReportItem {
    receivable: number;
    payable: number;
    phone?: string;
    type?: 'customer' | 'vendor' | 'both';
    overdueDaysMax: number;
    ageCategory: 'current' | '31-60' | '61-90' | '90+';
}

export const PartyReport = ({ onSelectPartyForLedger }: { onSelectPartyForLedger?: (partyName: string) => void }) => {
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | "customer" | "vendor">("all");
    const [balanceFilter, setBalanceFilter] = useState<"all" | "active" | "receivable" | "payable">("all");

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
        enabled: !!user
    });

    // Fetch Parties Directory
    const { data: partiesDirectory = [] } = useQuery({
        queryKey: ["parties", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("parties")
                .select("id, name, phone, type, opening_balance, opening_balance_type")
                .eq("user_id", user?.id || "");
            if (error) return [];
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch all sales (with real payment & balance tracking)
    const { data: sales = [], isLoading: salesLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("sales")
                .select("id, customer_name, total_amount, amount_paid, balance_due, status, date, customer_phone")
                .eq("user_id", user?.id || "")
                .neq("status", "draft");
            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch all purchases (with real payment & balance tracking)
    const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("purchases")
                .select("id, vendor_name, total_amount, amount_paid, balance_due, status, date")
                .eq("user_id", user?.id || "");
            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // CA-Compliant Ledger Aggregation
    const aggregatedData = useMemo(() => {
        const partyMap = new Map<string, EnrichedPartyItem>();
        const now = new Date();

        // Initialize from parties directory if available
        partiesDirectory.forEach((p: any) => {
            const name = (p.name || "").trim();
            if (!name) return;
            const norm = name.toLowerCase();
            const openBal = Number(p.opening_balance) || 0;
            const isOpeningReceivable = p.opening_balance_type
                ? p.opening_balance_type === 'to_receive'
                : p.type !== 'vendor';

            partyMap.set(norm, {
                name,
                phone: p.phone || undefined,
                type: p.type === 'vendor' ? 'vendor' : p.type === 'both' ? 'both' : 'customer',
                totalSales: 0,
                totalPurchases: 0,
                receivable: isOpeningReceivable ? openBal : 0,
                payable: !isOpeningReceivable ? openBal : 0,
                netBalance: 0,
                salesCount: 0,
                purchasesCount: 0,
                overdueDaysMax: 0,
                ageCategory: 'current'
            });
        });

        // Process Sales (Receivables)
        sales.forEach(sale => {
            const name = sale.customer_name?.trim();
            if (!name) return;
            const norm = name.toLowerCase();

            if (!partyMap.has(norm)) {
                partyMap.set(norm, {
                    name,
                    phone: sale.customer_phone || undefined,
                    type: 'customer',
                    totalSales: 0,
                    totalPurchases: 0,
                    receivable: 0,
                    payable: 0,
                    netBalance: 0,
                    salesCount: 0,
                    purchasesCount: 0,
                    overdueDaysMax: 0,
                    ageCategory: 'current'
                });
            }

            const p = partyMap.get(norm)!;
            const total = Number(sale.total_amount) || 0;
            const paid = sale.amount_paid != null ? Number(sale.amount_paid) : (sale.status === 'paid' ? total : 0);
            const due = sale.balance_due != null ? Number(sale.balance_due) : Math.max(0, total - paid);

            p.totalSales += total;
            p.salesCount += 1;
            p.receivable += due;

            if (due > 0 && sale.date) {
                const saleDate = new Date(sale.date);
                if (!isNaN(saleDate.getTime())) {
                    const days = Math.max(0, differenceInDays(now, saleDate));
                    if (days > p.overdueDaysMax) {
                        p.overdueDaysMax = days;
                        if (days > 90) p.ageCategory = '90+';
                        else if (days > 60 && p.ageCategory !== '90+') p.ageCategory = '61-90';
                        else if (days > 30 && p.ageCategory !== '90+' && p.ageCategory !== '61-90') p.ageCategory = '31-60';
                    }
                }
            }
        });

        // Process Purchases (Payables)
        purchases.forEach(purchase => {
            const name = purchase.vendor_name?.trim();
            if (!name) return;
            const norm = name.toLowerCase();

            if (!partyMap.has(norm)) {
                partyMap.set(norm, {
                    name,
                    type: 'vendor',
                    totalSales: 0,
                    totalPurchases: 0,
                    receivable: 0,
                    payable: 0,
                    netBalance: 0,
                    salesCount: 0,
                    purchasesCount: 0,
                    overdueDaysMax: 0,
                    ageCategory: 'current'
                });
            } else {
                const p = partyMap.get(norm)!;
                if (p.type === 'customer' && p.salesCount > 0) {
                    p.type = 'both';
                }
            }

            const p = partyMap.get(norm)!;
            const total = Number(purchase.total_amount) || 0;
            const paid = purchase.amount_paid != null ? Number(purchase.amount_paid) : (purchase.status === 'paid' ? total : 0);
            const due = purchase.balance_due != null ? Number(purchase.balance_due) : Math.max(0, total - paid);

            p.totalPurchases += total;
            p.purchasesCount += 1;
            p.payable += due;
        });

        // Finalize Net Position for each party:
        // Net Balance = Receivable (Dr) - Payable (Cr)
        // > 0: Party owes us (Debtor)
        // < 0: We owe party (Creditor)
        // === 0: Settled
        partyMap.forEach(p => {
            p.netBalance = p.receivable - p.payable;
        });

        const list = Array.from(partyMap.values());
        // Sort primarily by active pending exposure (Receivable + Payable), then by turnover
        return list.sort((a, b) => {
            const expA = a.receivable + a.payable;
            const expB = b.receivable + b.payable;
            if (expB !== expA) return expB - expA;
            return (b.totalSales + b.totalPurchases) - (a.totalSales + a.totalPurchases);
        });
    }, [sales, purchases, partiesDirectory]);

    // Apply Filter & Search
    const filteredData = useMemo(() => {
        return aggregatedData.filter(p => {
            // Search match
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.phone && p.phone.includes(searchTerm));
            if (!matchSearch) return false;

            // Type filter
            if (typeFilter === "customer" && p.type === "vendor") return false;
            if (typeFilter === "vendor" && p.type === "customer") return false;

            // Balance filter
            if (balanceFilter === "active" && p.receivable === 0 && p.payable === 0) return false;
            if (balanceFilter === "receivable" && p.receivable <= 0) return false;
            if (balanceFilter === "payable" && p.payable <= 0) return false;

            return true;
        });
    }, [aggregatedData, searchTerm, typeFilter, balanceFilter]);

    // Totals for Executive KPI Cards
    const totalReceivables = useMemo(() => aggregatedData.reduce((sum, p) => sum + p.receivable, 0), [aggregatedData]);
    const totalPayables = useMemo(() => aggregatedData.reduce((sum, p) => sum + p.payable, 0), [aggregatedData]);
    const netWorkingCapital = totalReceivables - totalPayables;
    const totalOverdueDebtors = useMemo(() => aggregatedData.filter(p => p.receivable > 0 && p.overdueDaysMax > 30).length, [aggregatedData]);

    const sendWhatsAppReminder = (party: EnrichedPartyItem) => {
        if (!party.phone) {
            alert(`No phone number found for ${party.name}. Please add one in Parties Directory.`);
            return;
        }
        const cleanPhone = party.phone.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(
            `Dear ${party.name}, this is a gentle reminder from ${profile?.business_name || "our accounts department"} regarding your outstanding balance of ${formatCurrency(party.receivable)}. Please arrange for payment at your earliest convenience. Thank you!`
        );
        window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
    };

    return (
        <div className="space-y-6">
            {/* Executive CA Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Accounts Receivable (Debtors)</p>
                            <ArrowUpRight className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                            {formatCurrency(totalReceivables)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Money to collect from customers
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Accounts Payable (Creditors)</p>
                            <ArrowDownRight className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                            {formatCurrency(totalPayables)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Money to pay to vendors / suppliers
                        </p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${netWorkingCapital >= 0 ? "border-l-emerald-600" : "border-l-rose-500"}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Net Working Position</p>
                            <Scale className={`w-4 h-4 ${netWorkingCapital >= 0 ? "text-emerald-600" : "text-rose-500"}`} />
                        </div>
                        <p className={`text-2xl font-bold mt-1 ${netWorkingCapital >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                            {formatCurrency(Math.abs(netWorkingCapital))} {netWorkingCapital >= 0 ? "(Surplus)" : "(Deficit)"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {netWorkingCapital >= 0 ? "Receivables exceed payables" : "Payables exceed receivables"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Overdue Debtors (&gt;30 Days)</p>
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                            {totalOverdueDebtors} Parties
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Requires follow-up / collection
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Party Table Card */}
            <Card className="overflow-hidden">
                <CardHeader className="pb-4 border-b bg-card">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                Party Ledger & Balance Summary
                                <Badge variant="outline" className="text-xs font-semibold">
                                    {filteredData.length} of {aggregatedData.length} parties
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Verified accounts receivable, accounts payable, and net Dr/Cr balances
                            </CardDescription>
                        </div>

                        {/* Search & Quick Filter Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search party or phone..."
                                    className="pl-8 h-8 text-xs"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue placeholder="Party Type" />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="customer">Customers</SelectItem>
                                    <SelectItem value="vendor">Vendors</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={balanceFilter} onValueChange={(v: any) => setBalanceFilter(v)}>
                                <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue placeholder="Balance Status" />
                                </SelectTrigger>
                                <SelectContent className="text-xs">
                                    <SelectItem value="all">All Balances</SelectItem>
                                    <SelectItem value="active">Due Only (Active)</SelectItem>
                                    <SelectItem value="receivable">To Receive (Dr)</SelectItem>
                                    <SelectItem value="payable">To Pay (Cr)</SelectItem>
                                </SelectContent>
                            </Select>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                        <Download className="w-3.5 h-3.5" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                    <DropdownMenuItem 
                                        className="text-xs"
                                        onClick={() => exportPartyReportPDF(filteredData, profile ? {
                                            name: (profile as any).business_name,
                                            address: (profile as any).business_address,
                                            phone: (profile as any).business_phone,
                                            gst: (profile as any).gst_number
                                        } : undefined)}
                                    >
                                        <FileText className="w-3.5 h-3.5 mr-2 text-rose-500" />
                                        Export Statement (PDF)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        className="text-xs"
                                        onClick={() => exportPartyReportCSV(filteredData, profile ? {
                                            name: (profile as any).business_name,
                                            address: (profile as any).business_address,
                                            phone: (profile as any).business_phone,
                                            gst: (profile as any).gst_number
                                        } : undefined)}
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                        Export Statement (Excel)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {(salesLoading || purchasesLoading) ? (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Party Details</TableHead>
                                    <TableHead className="text-right">Sales Volume</TableHead>
                                    <TableHead className="text-right">To Receive (Dr)</TableHead>
                                    <TableHead className="text-right">To Pay (Cr)</TableHead>
                                    <TableHead className="text-right">Net Position</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableLoadingRows cols={6} rows={6} />
                            </TableBody>
                        </Table>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground text-xs space-y-1">
                            <p className="font-semibold text-foreground">No parties found</p>
                            <p>Try adjusting your search query or filter criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/60 text-xs font-bold">
                                    <TableRow>
                                        <TableHead className="py-3">Party Name & Contact</TableHead>
                                        <TableHead className="py-3 text-center">Type</TableHead>
                                        <TableHead className="py-3 text-right">Turnover Volume</TableHead>
                                        <TableHead className="py-3 text-right text-blue-700 dark:text-blue-400">To Receive (Dr)</TableHead>
                                        <TableHead className="py-3 text-right text-amber-700 dark:text-amber-400">To Pay (Cr)</TableHead>
                                        <TableHead className="py-3 text-right font-extrabold">Net Position</TableHead>
                                        <TableHead className="py-3 text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-xs">
                                    {filteredData.map((party) => {
                                        const isDr = party.netBalance > 0;
                                        const isCr = party.netBalance < 0;
                                        const isSettled = party.netBalance === 0;

                                        return (
                                            <TableRow key={party.name} className="hover:bg-accent/40 transition-colors">
                                                <TableCell className="font-medium py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                            {party.name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                                            {party.phone && <span>📞 {party.phone}</span>}
                                                            <span>•</span>
                                                            <span>{party.salesCount} sale{party.salesCount !== 1 ? 's' : ''}, {party.purchasesCount} purchase{party.purchasesCount !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center py-3">
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {party.type || "customer"}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell className="text-right py-3 font-mono">
                                                    <div>{formatCurrency(party.totalSales + party.totalPurchases)}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        S: {formatCurrency(party.totalSales)} | P: {formatCurrency(party.totalPurchases)}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right py-3 font-mono font-semibold">
                                                    {party.receivable > 0 ? (
                                                        <div className="text-blue-700 dark:text-blue-400">
                                                            <div>{formatCurrency(party.receivable)}</div>
                                                            {party.overdueDaysMax > 30 && (
                                                                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-sans">
                                                                    {party.overdueDaysMax}d overdue
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right py-3 font-mono font-semibold">
                                                    {party.payable > 0 ? (
                                                        <div className="text-amber-700 dark:text-amber-400">
                                                            {formatCurrency(party.payable)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right py-3 font-mono font-bold">
                                                    {isSettled ? (
                                                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Settled (Nil)
                                                        </Badge>
                                                    ) : isDr ? (
                                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-mono">
                                                            +{formatCurrency(party.netBalance)} Dr
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-mono">
                                                            -{formatCurrency(Math.abs(party.netBalance))} Cr
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center py-3">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {party.receivable > 0 && party.phone && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[11px] gap-1"
                                                                onClick={() => sendWhatsAppReminder(party)}
                                                                title="Send WhatsApp payment reminder"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                                Remind
                                                            </Button>
                                                        )}
                                                        {onSelectPartyForLedger && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                                                onClick={() => onSelectPartyForLedger(party.name)}
                                                                title="View full ledger"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                Ledger
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};