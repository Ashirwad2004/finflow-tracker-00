import React from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Download, TrendingUp, CheckCircle2, ArrowRight, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ReportsFeature: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="reports" className="py-20 sm:py-28 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Reports Preview Card */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Daily Daybook &amp; Tax Summary</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2.5">
                  <Download className="h-3 w-3" /> Download Excel
                </Button>
              </div>

              {/* Tax Summary Table */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-4 p-2 font-bold bg-muted/50 rounded-lg text-muted-foreground text-[11px]">
                  <span>TAX SLAB</span>
                  <span className="text-right">SALES</span>
                  <span className="text-right">TAX (GST)</span>
                  <span className="text-right">TOTAL</span>
                </div>
                {[
                  { slab: "GST 0% (Tax-Free)", taxable: "₹12,400", tax: "₹0.00", total: "₹12,400" },
                  { slab: "GST 5% Standard", taxable: "₹48,250", tax: "₹2,412.50", total: "₹50,662.50" },
                  { slab: "GST 12% Goods", taxable: "₹24,100", tax: "₹2,892.00", total: "₹26,992.00" },
                  { slab: "GST 18% General", taxable: "₹82,600", tax: "₹14,868.00", total: "₹97,468.00" },
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 p-2.5 rounded-lg border border-border/60 bg-background text-foreground">
                    <span className="font-medium truncate">{row.slab}</span>
                    <span className="text-right font-mono">{row.taxable}</span>
                    <span className="text-right font-mono text-emerald-600 dark:text-emerald-400">{row.tax}</span>
                    <span className="text-right font-mono font-bold">{row.total}</span>
                  </div>
                ))}
              </div>

              {/* Net Profit Summary Strip */}
              <div className="p-3.5 rounded-xl border border-border bg-primary/5 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estimated Net Profit Today</div>
                  <div className="text-lg font-bold text-primary mt-0.5">₹34,180.00 (23.4% Margin)</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">After cost of goods sold</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Accounts Reconciled</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> Analytics &amp; Financial Reports
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.2]">
              Real-time financial reports and tax summaries in 1 click
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed">
              No more late nights with calculators and paper receipts. RupeeBill aggregates your total revenue, gross margins, operating expenses, and tax liabilities automatically.
            </p>

            <ul className="space-y-3.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Accountant-Ready Tax Reports:</strong> Export clean Excel spreadsheets with tax breakdowns and sales summaries to email directly to your accountant.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Real-Time Profit &amp; Margin Visibility:</strong> Know exactly how much profit you made today after subtracting product purchase costs and expenses.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Cash &amp; Digital Reconciliation:</strong> Easily reconcile drawer cash, card receipts, and bank transfers before closing out each business day.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Track Business Expenses:</strong> Record rent, utilities, delivery fees, and salaries to understand your true bottom-line profitability.
                </span>
              </li>
            </ul>

            <div className="pt-4">
              <Button
                onClick={() => navigate("/auth")}
                className="font-semibold shadow-sm"
              >
                View Financial Reports Free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
