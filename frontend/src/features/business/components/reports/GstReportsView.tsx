import React, { useState } from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Printer,
  Scale,
  Percent,
  Calendar,
  Building,
  CheckCircle2,
} from "lucide-react";
import { downloadReportCSV, printAccountingReport } from "../../utils/exportReportUtils";
import { GstReportsHub } from "../GstReportsHub";

export const GstReportsView: React.FC<{ accounting: ReturnType<typeof useAccountingData> }> = ({
  accounting,
}) => {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<"hub" | "slabs" | "gstr9">("hub");

  const { gstSlabReport, filteredSales, filteredPurchases, profile, activeDateRange } = accounting;

  const businessInfo = {
    name: profile?.business_name || "My Business",
    gstin: profile?.gstin || "URP",
    period: `${activeDateRange.from.toLocaleDateString("en-IN")} - ${activeDateRange.to.toLocaleDateString("en-IN")}`,
  };

  // GSTR-9 Annual Calculation
  const totalOutwardTurnover = filteredSales.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const totalB2B = filteredSales
    .filter((x) => !!x.customer_gstin && x.customer_gstin.length === 15)
    .reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const totalB2C = totalOutwardTurnover - totalB2B;
  const totalOutputTax = filteredSales.reduce((s, x) => s + Number(x.tax_amount || x.gst_amount || 0), 0);

  const totalInwardPurchases = filteredPurchases.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const totalItc = filteredPurchases.reduce(
    (s, x) => s + Number(x.cgst || 0) + Number(x.sgst || 0) + Number(x.igst || 0),
    0
  );
  const netGstPayable = Math.max(0, totalOutputTax - totalItc);

  const handleExportSlabsCSV = () => {
    downloadReportCSV(
      gstSlabReport,
      [
        { header: "GST Slab Rate (%)", accessor: (s) => `${s.rate}%` },
        { header: "Taxable Turnover (₹)", accessor: (s) => s.taxableValue },
        { header: "CGST (₹)", accessor: (s) => s.cgst },
        { header: "SGST (₹)", accessor: (s) => s.sgst },
        { header: "IGST (₹)", accessor: (s) => s.igst },
        { header: "Total Tax (₹)", accessor: (s) => s.totalTax },
        { header: "Invoices Count", accessor: (s) => s.invoiceCount },
      ],
      "GST_Slab_Wise_Analysis",
      businessInfo
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "hub" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("hub")}
            className="text-xs h-8 gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            GSTR-1, 2B & 3B Hub
          </Button>
          <Button
            variant={activeTab === "slabs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("slabs")}
            className="text-xs h-8 gap-1.5"
          >
            <Percent className="w-3.5 h-3.5" />
            GST Slab-Wise Analysis (0-28%)
          </Button>
          <Button
            variant={activeTab === "gstr9" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("gstr9")}
            className="text-xs h-8 gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            GSTR-9 / 9A Annual Return
          </Button>
        </div>

        {activeTab === "slabs" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSlabsCSV}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Export Slabs CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => printAccountingReport("GST_SLAB_ANALYSIS")}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </Button>
          </div>
        )}
      </div>

      {/* 1. GSTR-1, 2B, 3B Existing Complete Hub */}
      {activeTab === "hub" && (
        <div className="animate-in fade-in duration-200">
          <GstReportsHub />
        </div>
      )}

      {/* 2. GST SLAB-WISE DETAILED REPORT */}
      {activeTab === "slabs" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                GST Slab-Wise Tax Analysis (0%, 5%, 12%, 18%, 28%)
              </CardTitle>
              <CardDescription className="text-xs">
                Taxable turnover and output GST collection broken down across official Indian tax brackets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold w-28">GST Slab Rate</TableHead>
                    <TableHead className="text-xs font-bold text-right">Taxable Turnover (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">CGST (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">SGST (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">IGST (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-right">Total GST (₹)</TableHead>
                    <TableHead className="text-xs font-bold text-center w-28">Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {gstSlabReport.map((slab) => (
                    <TableRow key={slab.rate} className="hover:bg-muted/20">
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-xs">
                          {slab.rate}% GST
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(slab.taxableValue)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(slab.cgst)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(slab.sgst)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(slab.igst)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(slab.totalTax)}
                      </TableCell>
                      <TableCell className="text-center font-medium">{slab.invoiceCount}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30 border-t-2 border-primary">
                    <TableCell className="pl-4">TOTALS</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(gstSlabReport.reduce((s, x) => s + x.taxableValue, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(gstSlabReport.reduce((s, x) => s + x.cgst, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(gstSlabReport.reduce((s, x) => s + x.sgst, 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(gstSlabReport.reduce((s, x) => s + x.igst, 0))}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(gstSlabReport.reduce((s, x) => s + x.totalTax, 0))}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {gstSlabReport.reduce((s, x) => s + x.invoiceCount, 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. GSTR-9 / 9A ANNUAL RETURN SUMMARY */}
      {activeTab === "gstr9" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Consolidated Outward Turnover</p>
                <h3 className="text-xl font-bold tracking-tight">{formatCurrency(totalOutwardTurnover)}</h3>
                <p className="text-[11px] text-muted-foreground">
                  B2B: {formatCurrency(totalB2B)} | B2C: {formatCurrency(totalB2C)}
                </p>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Output Tax Liability</p>
                <h3 className="text-xl font-bold tracking-tight text-primary">
                  {formatCurrency(totalOutputTax)}
                </h3>
                <p className="text-[11px] text-muted-foreground">CGST + SGST + IGST on sales</p>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Input Tax Credit (ITC) Availed</p>
                <h3 className="text-xl font-bold tracking-tight text-emerald-600">
                  {formatCurrency(totalItc)}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Purchases Total: {formatCurrency(totalInwardPurchases)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    GSTR-9 / 9A Annual Statutory Return
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consolidated annual reconciliation of supplies, tax paid, and ITC availed under GST Law
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  GSTIN: {profile?.gstin || "URP"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">GSTR-9 Table Reference & Description</TableHead>
                    <TableHead className="text-xs font-bold text-right w-48">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={2}>PART II: DETAILS OF OUTWARD SUPPLIES DECLARED</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 4A: Supplies made to registered persons (B2B)</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalB2B)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 4B: Supplies made to unregistered persons (B2C)</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalB2C)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/10">
                    <TableCell className="pl-4">Total Turnover from Outward Supplies (Table 4N)</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(totalOutwardTurnover)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={2}>PART III: DETAILS OF INPUT TAX CREDIT (ITC)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 6A: Total amount of input tax credit availed via GSTR-3B</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(totalItc)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 7A: Ineligible / Reversed ITC</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(0)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/20 font-semibold">
                    <TableCell colSpan={2}>PART IV: TAX PAID & SET OFF</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 9: Total Output Tax Payable</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalOutputTax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Table 9: Paid through Input Tax Credit (ITC)</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatCurrency(Math.min(totalOutputTax, totalItc))}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-primary/10 border-t-2 border-primary">
                    <TableCell className="pl-4">Net Cash Tax Payable / Discharged</TableCell>
                    <TableCell className="text-right font-bold text-base text-primary">
                      {formatCurrency(netGstPayable)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
