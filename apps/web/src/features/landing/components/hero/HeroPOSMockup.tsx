import React from "react";
import {
  FileText,
  Printer,
  Barcode,
  Building2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroPOSMockupProps {
  onSavePrint: () => void;
  onDispatchWhatsApp: () => void;
}

export const HeroPOSMockup: React.FC<HeroPOSMockupProps> = ({
  onSavePrint,
  onDispatchWhatsApp,
}) => {
  return (
    <div className="rounded-2xl border-2 border-border/80 bg-card shadow-2xl overflow-hidden text-left transition-all animate-in fade-in duration-200">
      {/* Windows Window Header */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          </div>
          <span className="font-semibold text-xs tracking-wide text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            RupeeBill POS v3.4 — Dadar West Supermarket (GSTIN: 27AABCU9603R1ZM)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
            OFFLINE ENGINE: READY (OPFS)
          </span>
          <span className="hidden sm:inline">User: Cashier #1 (Admin)</span>
        </div>
      </div>

      {/* Realistic Windows App Ribbon Bar (Like Vyapar/Tally) */}
      <div className="bg-muted/70 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
          <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground font-bold shadow-xs flex items-center gap-1 cursor-pointer">
            <FileText className="w-3.5 h-3.5" /> + New Sale [F1]
          </span>
          <span className="px-2.5 py-1 rounded-md bg-background border border-border hover:bg-muted font-medium text-foreground cursor-pointer">
            + Purchase [F2]
          </span>
          <span className="px-2.5 py-1 rounded-md bg-background border border-border hover:bg-muted font-medium text-foreground cursor-pointer">
            Item Master [F3]
          </span>
          <span className="px-2.5 py-1 rounded-md bg-background border border-border hover:bg-muted font-medium text-foreground cursor-pointer">
            Customer Khata [F4]
          </span>
          <span className="px-2.5 py-1 rounded-md bg-background border border-border hover:bg-muted font-medium text-foreground cursor-pointer">
            Daybook [F5]
          </span>
          <span className="px-2.5 py-1 rounded-md bg-background border border-border hover:bg-muted font-medium text-foreground cursor-pointer hidden md:inline">
            GSTR-1 Reports [F6]
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
          <span className="bg-card px-2 py-1 rounded border border-border">
            Thermal: EPSON TM-T82 (Ready)
          </span>
        </div>
      </div>

      {/* Active Bill Counter Form */}
      <div className="p-4 sm:p-6 bg-background grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8-Cols: Active Invoice Form */}
        <div className="lg:col-span-8 space-y-4">
          {/* Customer & Invoice Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/80 text-xs">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Customer / Party Name
              </label>
              <div className="font-bold text-foreground mt-0.5">
                Ramesh Sharma (Regular)
              </div>
              <div className="text-[10px] text-muted-foreground">Ph: +91 98201 23456</div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Invoice Number &amp; Date
              </label>
              <div className="font-mono font-bold text-foreground mt-0.5">
                INV-2026-1048
              </div>
              <div className="text-[10px] text-muted-foreground">Today, 05:42 PM</div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Billing Mode
              </label>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                GST Tax Invoice (B2C)
              </div>
              <div className="text-[10px] text-muted-foreground">POS Counter #1</div>
            </div>
          </div>

          {/* Barcode Fast Entry Bar */}
          <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-primary/40 bg-card">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5" /> SCAN
            </span>
            <input
              readOnly
              value="8901030382918 — Scanning Active (Gun Plugged In)"
              className="w-full text-xs font-mono bg-transparent text-foreground focus:outline-none"
            />
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap bg-emerald-500/10 px-2 py-0.5 rounded">
              Auto Item Add Active
            </span>
          </div>

          {/* Itemized Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/70 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="p-2.5"># Item Description</th>
                  <th className="p-2.5 text-center">HSN</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-right">GST</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                <tr>
                  <td className="p-2.5 font-bold text-foreground">
                    Organic Forest Honey 500g
                    <span className="block text-[10px] font-normal text-muted-foreground font-mono">
                      Batch: B-2026/08
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono text-muted-foreground">0409</td>
                  <td className="p-2.5 text-center font-bold">2 pcs</td>
                  <td className="p-2.5 text-right">₹240.00</td>
                  <td className="p-2.5 text-right text-muted-foreground">18%</td>
                  <td className="p-2.5 text-right font-black text-foreground">₹480.00</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-foreground">
                    Pure Desi Cow Ghee 1L Tin
                    <span className="block text-[10px] font-normal text-muted-foreground font-mono">
                      Batch: G-8941
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono text-muted-foreground">0405</td>
                  <td className="p-2.5 text-center font-bold">1 tin</td>
                  <td className="p-2.5 text-right">₹650.00</td>
                  <td className="p-2.5 text-right text-muted-foreground">12%</td>
                  <td className="p-2.5 text-right font-black text-foreground">₹650.00</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-foreground">
                    California Whole Almonds 250g
                    <span className="block text-[10px] font-normal text-muted-foreground font-mono">
                      Batch: ALM-09
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-mono text-muted-foreground">0802</td>
                  <td className="p-2.5 text-center font-bold">1 pack</td>
                  <td className="p-2.5 text-right">₹280.00</td>
                  <td className="p-2.5 text-right text-muted-foreground">5%</td>
                  <td className="p-2.5 text-right font-black text-foreground">₹280.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Keyboard Shortcuts Strip */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="font-mono"><strong>F12:</strong> Print Receipt</span>
            <span className="font-mono"><strong>Ctrl+P:</strong> Print A4</span>
            <span className="font-mono"><strong>Ctrl+W:</strong> Send WhatsApp</span>
            <span className="font-mono"><strong>Esc:</strong> Clear Bill</span>
          </div>
        </div>

        {/* Right 4-Cols: Payment, Calculation & Output */}
        <div className="lg:col-span-4 border border-border rounded-xl p-4 bg-muted/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-foreground pb-2 border-b border-border">
              Bill Calculation &amp; Tax Split
            </div>

            <div className="space-y-2 py-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Count:</span>
                <span className="font-semibold text-foreground">3 Items (4 Qty)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable Value:</span>
                <span>₹1,250.42</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST + SGST (Auto Split):</span>
                <span>₹159.58</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Round Off:</span>
                <span>₹0.00</span>
              </div>

              <div className="pt-2 border-t-2 border-border flex justify-between items-baseline">
                <span className="text-sm font-black text-foreground">Net Payable:</span>
                <span className="text-2xl font-black text-primary">₹1,410.00</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Settlement Channel
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold text-center">
                <span className="p-1.5 rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-xs">
                  UPI QR
                </span>
                <span className="p-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted cursor-pointer">
                  Cash
                </span>
                <span className="p-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted cursor-pointer">
                  Udhar
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Button
              className="w-full font-black text-sm h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={onSavePrint}
            >
              <Printer className="w-4 h-4 mr-2" /> Save &amp; Print Bill [F12]
            </Button>
            <Button
              variant="outline"
              className="w-full font-bold text-xs h-9 border-border"
              onClick={onDispatchWhatsApp}
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Dispatch via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
