import React from "react";
import { useAccountingData } from "../../hooks/useAccountingData";
import { useCurrency } from "@/core/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Wallet,
  Clock,
  Printer,
  Scale,
} from "lucide-react";
import { printAccountingReport } from "../../utils/exportReportUtils";

export const BusinessHealthView: React.FC<{ accounting: ReturnType<typeof useAccountingData> }> = ({
  accounting,
}) => {
  const { formatCurrency } = useCurrency();
  const { financialHealth, balanceSheet, profitAndLoss, profile } = accounting;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Business Financial Health & Solvency Cockpit
          </h2>
          <p className="text-xs text-muted-foreground">
            Chartered Accountant audit of working capital, liquidity ratios, and debt exposure
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => printAccountingReport("BUSINESS_HEALTH")}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / PDF Audit
        </Button>
      </div>

      {/* Primary Health Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Working Capital */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Net Working Capital</p>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  financialHealth.workingCapital >= 0
                    ? "text-emerald-600 border-emerald-300"
                    : "text-rose-600 border-rose-300"
                }`}
              >
                {financialHealth.workingCapital >= 0 ? "Surplus" : "Deficit"}
              </Badge>
            </div>
            <h3
              className={`text-xl font-bold tracking-tight ${
                financialHealth.workingCapital >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(financialHealth.workingCapital)}
            </h3>
            <p className="text-[11px] text-muted-foreground">Current Assets - Current Liabilities</p>
          </CardContent>
        </Card>

        {/* Current Ratio */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Current Ratio</p>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  financialHealth.currentRatio >= 1.33
                    ? "text-emerald-600 border-emerald-300"
                    : "text-amber-600 border-amber-300"
                }`}
              >
                {financialHealth.currentRatio >= 1.33 ? "Healthy (>1.33)" : "Low Liquidity"}
              </Badge>
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {financialHealth.currentRatio.toFixed(2)} : 1
            </h3>
            <p className="text-[11px] text-muted-foreground">Bank benchmark norm: 1.33 : 1</p>
          </CardContent>
        </Card>

        {/* Quick Ratio */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Quick / Acid-Test Ratio</p>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  financialHealth.quickRatio >= 1.0
                    ? "text-emerald-600 border-emerald-300"
                    : "text-amber-600 border-amber-300"
                }`}
              >
                {financialHealth.quickRatio >= 1.0 ? "Optimum (>=1)" : "Caution"}
              </Badge>
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {financialHealth.quickRatio.toFixed(2)} : 1
            </h3>
            <p className="text-[11px] text-muted-foreground">Excludes inventory (Immediate liquidity)</p>
          </CardContent>
        </Card>

        {/* Cash Runway */}
        <Card className="border shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Cash Runway</p>
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                Operating
              </Badge>
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {financialHealth.cashRunwayMonths.toFixed(1)} Months
            </h3>
            <p className="text-[11px] text-muted-foreground">Based on current monthly overheads</p>
          </CardContent>
        </Card>
      </div>

      {/* CA Audit Interpretation Matrix */}
      <Card className="border shadow-xs">
        <CardHeader className="bg-muted/30 border-b pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Chartered Accountant Financial Diagnostic Report
          </CardTitle>
          <CardDescription className="text-xs">
            Professional commentary on solvency, debt exposure, and working capital optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Liquidity Audit */}
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-foreground">Liquidity & Cash Flow Health</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your liquid cash and bank reserves stand at{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(financialHealth.cashAvailable)}
                </span>
                . With a current ratio of{" "}
                <span className="font-semibold text-foreground">
                  {financialHealth.currentRatio.toFixed(2)}
                </span>
                , short-term debt servicing obligations are{" "}
                {financialHealth.currentRatio >= 1.2
                  ? "adequately cushioned by trade receivables and liquid reserves."
                  : "strained; consider accelerating collections or negotiating supplier credit periods."}
              </p>
            </div>

            {/* Solvency & Leverage */}
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-foreground">Debt & Capital Structure</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Debt-to-Equity ratio is{" "}
                <span className="font-semibold text-foreground">
                  {financialHealth.debtToEquity.toFixed(2)}
                </span>
                . Total business obligations (Sundry Creditors and Borrowings) equal{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(balanceSheet.totalLiabilities)}
                </span>{" "}
                backed by{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(balanceSheet.totalEquity)}
                </span>{" "}
                in proprietary equity.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
