import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const ReportsTabPanel: React.FC = () => {
  const navigate = useNavigate();
  const [taxReportType, setTaxReportType] = useState<"gstr1" | "gstr3b">("gstr1");

  const handleExportCA = (format: string) => {
    toast({
      title: `📊 Exporting ${format} Report`,
      description: "GSTR report formatted and downloaded. Ready for your Chartered Accountant.",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
      {/* Left Column: Feature Highlights */}
      <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Chartered Accountant &amp; GST Ready • 1-Click Exports
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            GSTR-1, GSTR-3B &amp; CA-Ready Excel Exports
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Never spend stressful weekends compiling bills during tax filing season. Generate complete GSTR-1, GSTR-3B, Profit &amp; Loss, and Balance Sheet reports with one click and export them directly to your CA in Microsoft Excel format.
          </p>

          {/* Quick Highlight Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📑 GSTR-1</div>
              <div className="text-[9px] text-muted-foreground">B2B, B2C &amp; HSN</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">⚖️ GSTR-3B</div>
              <div className="text-[9px] text-muted-foreground">ITC Calculation</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📊 P&amp;L Sheet</div>
              <div className="text-[9px] text-muted-foreground">Annual Balance</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📥 Excel / Tally</div>
              <div className="text-[9px] text-muted-foreground">1-Click Export</div>
            </div>
          </div>

          {/* Detailed Feature List */}
          <div className="space-y-2.5 pt-2">
            {[
              "Monthly GSTR-1 sales breakdown with automated B2B, B2C and HSN summary tables",
              "GSTR-3B tax offset calculation factoring in available Input Tax Credit (ITC)",
              "Complete Profit & Loss statement and Balance Sheet compliant with Indian Accounting Standards",
              "1-click export to Microsoft Excel (.xlsx), Tally Prime XML, and GST Portal JSON format",
              "100% compliant with latest Indian GST laws, e-invoicing limits & QR code mandates",
            ].map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
          <Button onClick={() => navigate("/auth?mode=signup")} className="font-bold text-xs sm:text-sm h-11 px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md shadow-orange-500/25 border-0">
            Export Tax Reports Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportCA("Excel (.xlsx)")}
            className="font-bold text-xs sm:text-sm h-11 px-4 border-border"
          >
            <Download className="w-4 h-4 mr-2 text-emerald-500" /> Download CA Excel
          </Button>
        </div>
      </div>

      {/* Right Column: Realistic Native Software Mockup Window */}
      <div className="lg:col-span-6 flex flex-col rounded-2xl border border-border/80 bg-muted/30 overflow-hidden shadow-lg">
        {/* Mockup Window Titlebar */}
        <div className="px-4 py-3 bg-muted/80 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-xs font-bold text-foreground font-mono ml-2">
              RupeeBill GST Compliance Suite • Filing Month: Sep 2026
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
            GST Portal Validated
          </span>
        </div>

        {/* Sub-Format Switcher */}
        <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Report Schedule:</span>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setTaxReportType("gstr1")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                taxReportType === "gstr1"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GSTR-1 (Outward Sales)
            </button>
            <button
              onClick={() => setTaxReportType("gstr3b")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                taxReportType === "gstr3b"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GSTR-3B (Tax Due &amp; ITC)
            </button>
          </div>
        </div>

        {/* Mockup Canvas */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-zinc-100/50 dark:bg-zinc-950/50">
          {taxReportType === "gstr1" ? (
            <div className="space-y-3">
              <div className="border border-border rounded-xl overflow-hidden bg-card text-xs shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border text-[11px]">
                    <tr>
                      <th className="p-2.5">GST Slab</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">CGST</th>
                      <th className="p-2.5 text-right">SGST</th>
                      <th className="p-2.5 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold">GST 5%</td>
                      <td className="p-2.5 text-right font-mono">₹48,250</td>
                      <td className="p-2.5 text-right font-mono">₹1,206.25</td>
                      <td className="p-2.5 text-right font-mono">₹1,206.25</td>
                      <td className="p-2.5 text-right font-black">₹2,412.50</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">GST 12%</td>
                      <td className="p-2.5 text-right font-mono">₹24,100</td>
                      <td className="p-2.5 text-right font-mono">₹1,446.00</td>
                      <td className="p-2.5 text-right font-mono">₹1,446.00</td>
                      <td className="p-2.5 text-right font-black">₹2,892.00</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">GST 18%</td>
                      <td className="p-2.5 text-right font-mono">₹82,600</td>
                      <td className="p-2.5 text-right font-mono">₹7,434.00</td>
                      <td className="p-2.5 text-right font-mono">₹7,434.00</td>
                      <td className="p-2.5 text-right font-black">₹14,868.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border flex justify-between items-center text-xs shadow-sm">
                <span className="text-muted-foreground text-[11px]">Total Output Tax Collected:</span>
                <span className="text-base font-black text-foreground">₹20,172.50</span>
              </div>
            </div>
          ) : (
            /* GSTR-3B Summary */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="font-bold text-foreground">Tax Liability &amp; ITC Net Off:</span>
                  <span className="text-emerald-600 font-bold font-mono">Eligible for ITC</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Output Tax on Sales:</span>
                    <span className="font-mono font-bold text-foreground">₹20,172.50</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Input Tax Credit (ITC on Purchases):</span>
                    <span className="font-mono font-bold text-emerald-600">-₹8,450.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-xs">
                    <span>Net Cash Tax Payable (Electronic Cash Ledger):</span>
                    <span className="font-mono font-black text-base text-primary">₹11,722.50</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-200">
                ✓ Challan auto-generated. Direct link to pay via GST Portal NetBanking.
              </div>
            </div>
          )}

          {/* 3 Export Formats Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCA("Excel (.xlsx)")}
              className="text-[11px] font-bold border-border h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCA("Tally Prime XML")}
              className="text-[11px] font-bold border-border h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-blue-600" /> Tally XML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCA("GST Portal JSON")}
              className="text-[11px] font-bold border-border h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-purple-600" /> GST JSON
            </Button>
          </div>
        </div>

        {/* Mockup Action Footer */}
        <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px]">
            Schema v1.4 Validated for GST Offline Utility
          </span>
          <Button size="sm" variant="ghost" onClick={() => handleExportCA("Excel")} className="h-7 text-xs font-bold text-primary">
            <Download className="w-3.5 h-3.5 mr-1" /> Quick Export
          </Button>
        </div>
      </div>
    </div>
  );
};
