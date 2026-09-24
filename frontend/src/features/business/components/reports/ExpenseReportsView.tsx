import React, { useState, useMemo } from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet,
  TrendingDown,
  PieChart,
  Download,
  Printer,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { downloadReportCSV, printAccountingReport } from "../../utils/exportReportUtils";

export const ExpenseReportsView: React.FC<{ accounting: ReturnType<typeof useAccountingData> }> = ({
  accounting,
}) => {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "direct" | "indirect">("all");

  const { filteredExpenses, profitAndLoss, profile, activeDateRange } = accounting;

  const directCategories = ["freight", "packaging", "raw materials", "labor", "carriage inward", "production"];

  // Enrich expenses with Direct vs Indirect classification
  const enrichedExpenses = useMemo(() => {
    return filteredExpenses.map((e: any) => {
      const cat = (e.categories?.name || e.category || "General / Miscellaneous").trim();
      const isDirect = directCategories.some((dc) => cat.toLowerCase().includes(dc));
      return {
        id: e.id,
        date: (e.date || e.created_at || "").slice(0, 10),
        title: e.title || e.description || "Expense",
        category: cat,
        amount: Number(e.amount || 0),
        paymentMode: e.payment_method || "Cash",
        type: isDirect ? "Direct Expense" : "Indirect Expense",
        isDirect,
      };
    });
  }, [filteredExpenses]);

  // Category Aggregates
  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; count: number; isDirect: boolean }>();
    let totalAll = 0;

    enrichedExpenses.forEach((e) => {
      totalAll += e.amount;
      if (!map.has(e.category)) {
        map.set(e.category, { name: e.category, amount: 0, count: 0, isDirect: e.isDirect });
      }
      const entry = map.get(e.category)!;
      entry.amount += e.amount;
      entry.count++;
    });

    return Array.from(map.values())
      .map((cat) => ({
        ...cat,
        percentage: totalAll > 0 ? (cat.amount / totalAll) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [enrichedExpenses]);

  const totalDirect = useMemo(
    () => enrichedExpenses.filter((e) => e.isDirect).reduce((s, e) => s + e.amount, 0),
    [enrichedExpenses]
  );
  const totalIndirect = useMemo(
    () => enrichedExpenses.filter((e) => !e.isDirect).reduce((s, e) => s + e.amount, 0),
    [enrichedExpenses]
  );
  const totalAllExpenses = totalDirect + totalIndirect;

  const businessInfo = {
    name: profile?.business_name || "My Business",
    gstin: profile?.gstin || "URP",
    period: `${activeDateRange.from.toLocaleDateString("en-IN")} - ${activeDateRange.to.toLocaleDateString("en-IN")}`,
  };

  const handleExportCSV = () => {
    downloadReportCSV(
      enrichedExpenses,
      [
        { header: "Date", accessor: (e) => e.date },
        { header: "Description / Title", accessor: (e) => e.title },
        { header: "Expense Category", accessor: (e) => e.category },
        { header: "Classification", accessor: (e) => e.type },
        { header: "Payment Mode", accessor: (e) => e.paymentMode },
        { header: "Amount (₹)", accessor: (e) => e.amount },
      ],
      "Business_Expenses_Report",
      businessInfo
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Direct & Indirect Expense Ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            Categorized according to Indian CA principles (Cost of Goods vs Operating Overheads)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => printAccountingReport("EXPENSE_REPORT")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Business Expenses</p>
            <h3 className="text-xl font-bold tracking-tight">{formatCurrency(totalAllExpenses)}</h3>
            <p className="text-[11px] text-muted-foreground">{enrichedExpenses.length} expense entries</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-amber-50/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-amber-700">Direct Expenses (Part of COGS)</p>
            <h3 className="text-xl font-bold tracking-tight text-amber-700">
              {formatCurrency(totalDirect)}
            </h3>
            <p className="text-[11px] text-muted-foreground">Freight, raw materials & packaging</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-purple-50/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-purple-700">Indirect Expenses (Operating Overheads)</p>
            <h3 className="text-xl font-bold tracking-tight text-purple-700">
              {formatCurrency(totalIndirect)}
            </h3>
            <p className="text-[11px] text-muted-foreground">Rent, salaries, marketing & administration</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Progress Bars */}
      <Card className="border shadow-xs">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Category-Wise Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {categoryStats.slice(0, 6).map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-2">
                  {cat.name}
                  <Badge variant="outline" className="text-[9px]">
                    {cat.isDirect ? "Direct" : "Indirect"}
                  </Badge>
                </span>
                <span className="font-medium text-muted-foreground">
                  {formatCurrency(cat.amount)} ({cat.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    cat.isDirect ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                />
              </div>
            </div>
          ))}
          {categoryStats.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No expense categories to show</p>
          )}
        </CardContent>
      </Card>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search description, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
            className="h-8 text-xs"
          >
            All Types
          </Button>
          <Button
            variant={typeFilter === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("direct")}
            className="h-8 text-xs"
          >
            Direct Only
          </Button>
          <Button
            variant={typeFilter === "indirect" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("indirect")}
            className="h-8 text-xs"
          >
            Indirect Only
          </Button>
        </div>
      </div>

      {/* Expense Entries Table */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold w-28">Date</TableHead>
                <TableHead className="text-xs font-bold">Particulars / Description</TableHead>
                <TableHead className="text-xs font-bold">Category</TableHead>
                <TableHead className="text-xs font-bold text-center">Type</TableHead>
                <TableHead className="text-xs font-bold">Payment Mode</TableHead>
                <TableHead className="text-xs font-bold text-right w-36">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {enrichedExpenses
                .filter((e) => {
                  if (typeFilter === "direct" && !e.isDirect) return false;
                  if (typeFilter === "indirect" && e.isDirect) return false;
                  if (!searchTerm) return true;
                  const q = searchTerm.toLowerCase();
                  return e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
                })
                .map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium whitespace-nowrap">{e.date}</TableCell>
                    <TableCell className="font-semibold text-foreground">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          e.isDirect
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : "bg-purple-50 text-purple-700 border-purple-300"
                        }`}
                      >
                        {e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.paymentMode}</TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {formatCurrency(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              {enrichedExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No business expenses found for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
