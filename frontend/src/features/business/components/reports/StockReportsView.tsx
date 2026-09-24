import React, { useState } from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Boxes,
  TrendingUp,
  PackageAlert,
  Download,
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { downloadReportCSV, printAccountingReport } from "../../utils/exportReportUtils";

export const StockReportsView: React.FC<{ accounting: ReturnType<typeof useAccountingData> }> = ({
  accounting,
}) => {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<"summary" | "item_pnl" | "movement">("summary");
  const [searchTerm, setSearchTerm] = useState("");

  const { stockSummary, itemWiseProfit, profile, activeDateRange } = accounting;

  const businessInfo = {
    name: profile?.business_name || "My Business",
    gstin: profile?.gstin || "URP",
    period: `${activeDateRange.from.toLocaleDateString("en-IN")} - ${activeDateRange.to.toLocaleDateString("en-IN")}`,
  };

  const handleExportCSV = () => {
    if (activeTab === "summary") {
      downloadReportCSV(
        stockSummary.items,
        [
          { header: "Product Name", accessor: (i) => i.name },
          { header: "SKU / Barcode", accessor: (i) => i.sku },
          { header: "HSN Code", accessor: (i) => i.hsn },
          { header: "Category", accessor: (i) => i.category },
          { header: "Current Stock", accessor: (i) => i.currentStock },
          { header: "Cost Price (₹)", accessor: (i) => i.costPrice },
          { header: "Selling Price (₹)", accessor: (i) => i.sellingPrice },
          { header: "Total Cost Valuation (₹)", accessor: (i) => i.totalCost },
          { header: "Total Retail Valuation (₹)", accessor: (i) => i.totalRetail },
          { header: "Margin (%)", accessor: (i) => i.marginPct.toFixed(1) },
          { header: "Status", accessor: (i) => i.status },
        ],
        "Stock_Valuation_Summary",
        businessInfo
      );
    } else {
      downloadReportCSV(
        itemWiseProfit,
        [
          { header: "Product / Item Name", accessor: (i) => i.name },
          { header: "Units Sold", accessor: (i) => i.unitsSold },
          { header: "Total Revenue (₹)", accessor: (i) => i.revenue },
          { header: "Total Cost (₹)", accessor: (i) => i.cost },
          { header: "Gross Profit (₹)", accessor: (i) => i.profit },
          { header: "Gross Margin (%)", accessor: (i) => i.marginPct.toFixed(2) },
        ],
        "Item_Wise_Profit_Loss",
        businessInfo
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs & Export */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "summary" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("summary")}
            className="text-xs h-8 gap-1.5"
          >
            <Boxes className="w-3.5 h-3.5" />
            Stock Valuation Summary
          </Button>
          <Button
            variant={activeTab === "item_pnl" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("item_pnl")}
            className="text-xs h-8 gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Item-Wise Profit & Loss
          </Button>
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
            onClick={() => printAccountingReport("STOCK_VALUATION")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Stock Units</p>
            <h3 className="text-xl font-bold tracking-tight">{stockSummary.totalStockQty}</h3>
            <p className="text-[11px] text-muted-foreground">{stockSummary.totalProducts} distinct catalog items</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Inventory Cost (AS-2)</p>
            <h3 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {formatCurrency(stockSummary.totalCostValuation)}
            </h3>
            <p className="text-[11px] text-muted-foreground">Cost valuation basis</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Retail Value</p>
            <h3 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stockSummary.totalRetailValuation)}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Profit potential: {formatCurrency(stockSummary.potentialGrossProfit)}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Low Stock Warnings</p>
            <h3
              className={`text-xl font-bold tracking-tight ${
                stockSummary.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {stockSummary.lowStockCount}
            </h3>
            <p className="text-[11px] text-muted-foreground">Items below reorder threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* 1. STOCK VALUATION SUMMARY TABLE */}
      {activeTab === "summary" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search product name, SKU, HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Item Name</TableHead>
                    <TableHead className="text-xs font-bold">SKU / HSN</TableHead>
                    <TableHead className="text-xs font-bold text-center">Category</TableHead>
                    <TableHead className="text-xs font-bold text-right">In Stock</TableHead>
                    <TableHead className="text-xs font-bold text-right">Cost (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Selling Price (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Stock Valuation (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Retail Value (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {stockSummary.items
                    .filter((item) => {
                      if (!searchTerm) return true;
                      const q = searchTerm.toLowerCase();
                      return (
                        item.name.toLowerCase().includes(q) ||
                        item.sku.toLowerCase().includes(q) ||
                        item.hsn.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="font-semibold text-foreground">{item.name}</TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {item.sku} {item.hsn !== "-" && `/ HSN ${item.hsn}`}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">{item.currentStock}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.costPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {formatCurrency(item.totalCost)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(item.totalRetail)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              item.status === "In Stock"
                                ? "outline"
                                : item.status === "Low Stock"
                                ? "secondary"
                                : "destructive"
                            }
                            className={`text-[10px] ${
                              item.status === "In Stock"
                                ? "text-emerald-600 border-emerald-300"
                                : item.status === "Low Stock"
                                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                : ""
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  {stockSummary.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No inventory products found in your catalog
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. ITEM-WISE PROFIT & LOSS */}
      {activeTab === "item_pnl" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Item-Wise Profit & Loss Statement
              </CardTitle>
              <CardDescription className="text-xs">
                Revenue generated, cost of goods sold, and gross margins itemized by product
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Item Name</TableHead>
                    <TableHead className="text-xs font-bold text-right">Units Sold</TableHead>
                    <TableHead className="text-xs font-bold text-right">Revenue (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Cost of Goods (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Gross Profit (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Gross Margin (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {itemWiseProfit.map((it) => (
                    <TableRow key={it.name} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">{it.name}</TableCell>
                      <TableCell className="text-right font-medium">{it.unitsSold}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(it.revenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(it.cost)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          it.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(it.profit)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          it.marginPct >= 20 ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {it.marginPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {itemWiseProfit.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No sales item data recorded for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
