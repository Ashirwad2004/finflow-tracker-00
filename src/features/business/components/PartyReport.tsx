import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Calculator, Download, FileText, FileSpreadsheet } from "lucide-react";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import { useState, useMemo } from "react";
import { exportPartyReportPDF, PartyReportItem } from "@/utils/exportPartyReportPDF";
import { exportPartyReportCSV } from "@/utils/exportPartyReportCSV";

export const PartyReport = () => {
    const { formatCurrency, currency } = useCurrency();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Profile for Business Details (used in PDF)
    const { data: profile } = useQuery({
        queryKey: ["profile", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user?.id)
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
            const { data, error } = await supabase
                .from("sales" as any)
                .select("customer_name, total_amount")
                .eq("user_id", user?.id);

            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Fetch all purchases
    const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("purchases" as any)
                .select("vendor_name, total_amount")
                .eq("user_id", user?.id);

            if (error) throw error;
            return data as any[];
        },
        enabled: !!user
    });

    // Aggregate Party Data
    const aggregatedData = useMemo(() => {
        const partyMap = new Map<string, PartyReportItem>();

        // Process Sales
        sales.forEach(sale => {
            const name = sale.customer_name?.trim();
            if (!name) return;

            // Standardize name (case-insensitive deduplication could be added here if needed, sticking to exact match for strict accounting)
            const normalizedName = name;

            if (!partyMap.has(normalizedName)) {
                partyMap.set(normalizedName, { name: normalizedName, totalSales: 0, totalPurchases: 0, netBalance: 0, salesCount: 0, purchasesCount: 0 });
            }
            const party = partyMap.get(normalizedName)!;
            party.totalSales += Number(sale.total_amount || 0);
            party.salesCount += 1;
            party.netBalance += Number(sale.total_amount || 0); // Sales increase net balance (money owed to you or paid to you)
        });

        // Process Purchases
        purchases.forEach(purchase => {
            const name = purchase.vendor_name?.trim();
            if (!name) return;

            const normalizedName = name;

            if (!partyMap.has(normalizedName)) {
                partyMap.set(normalizedName, { name: normalizedName, totalSales: 0, totalPurchases: 0, netBalance: 0, salesCount: 0, purchasesCount: 0 });
            }
            const party = partyMap.get(normalizedName)!;
            party.totalPurchases += Number(purchase.total_amount || 0);
            party.purchasesCount += 1;
            party.netBalance -= Number(purchase.total_amount || 0); // Purchases decrease net balance (money you owe or paid out)
        });

        const allParties = Array.from(partyMap.values());

        // Sort by Total Transaction Volume (Sales + Purchases) descends
        return allParties.sort((a, b) => (b.totalSales + b.totalPurchases) - (a.totalSales + a.totalPurchases));
    }, [sales, purchases]);

    const filteredData = aggregatedData.filter(party =>
        party.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOverallSales = aggregatedData.reduce((sum, party) => sum + party.totalSales, 0);
    const totalOverallPurchases = aggregatedData.reduce((sum, party) => sum + party.totalPurchases, 0);
    const netOverallBalance = totalOverallSales - totalOverallPurchases;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">Total Sales (All Parties)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(totalOverallSales)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Total Purchases (All Parties)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {formatCurrency(totalOverallPurchases)}
                        </div>
                    </CardContent>
                </Card>
                <Card className={netOverallBalance >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900" : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900"}>
                    <CardHeader className="py-4 flex flex-row items-center justify-between">
                        <CardTitle className={netOverallBalance >= 0 ? "text-sm font-medium text-blue-800 dark:text-blue-300" : "text-sm font-medium text-orange-800 dark:text-orange-300"}>
                            Net Balance
                        </CardTitle>
                        <Calculator className={netOverallBalance >= 0 ? "w-4 h-4 text-blue-500" : "w-4 h-4 text-orange-500"} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netOverallBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"}`}>
                            {formatCurrency(netOverallBalance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Party Insights</CardTitle>
                        <CardDescription>Comprehensive sales and purchase history per party</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Find a customer or vendor..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => exportPartyReportPDF(aggregatedData, profile ? {
                                    name: (profile as any).business_name,
                                    address: (profile as any).business_address,
                                    phone: (profile as any).business_phone,
                                    gst: (profile as any).gst_number
                                } : undefined)}>
                                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                                    Download as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportPartyReportCSV(aggregatedData)}>
                                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                    Download as CSV (Excel)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {(salesLoading || purchasesLoading) ? (
                        <div className="text-center py-12 text-muted-foreground animate-pulse">Aggregating records...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchTerm ? "No parties found matching your search." : "No business records available yet."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-semibold text-foreground">Party Name</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Total Sales</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Total Purchases</TableHead>
                                        <TableHead className="text-right font-semibold text-foreground">Net Balance ({currency.symbol})</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((party) => (
                                        <TableRow key={party.name} className="hover:bg-accent/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{party.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {party.salesCount} sale{party.salesCount !== 1 ? 's' : ''}, {party.purchasesCount} purchase{party.purchasesCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                                                {party.totalSales > 0 ? formatCurrency(party.totalSales) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right text-red-500 font-medium">
                                                {party.totalPurchases > 0 ? formatCurrency(party.totalPurchases) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant={party.netBalance > 0 ? "default" : party.netBalance < 0 ? "destructive" : "secondary"}
                                                    className={`ml-auto ${party.netBalance > 0 ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300' : ''}`}
                                                >
                                                    {party.netBalance === 0 ? "Settled" : formatCurrency(party.netBalance)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
