import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  FileText, 
  Printer, 
  Smartphone, 
  Star, 
  Check, 
  ShieldCheck, 
  Monitor, 
  Download, 
  QrCode, 
  Barcode, 
  CheckCircle2,
  Zap,
  Building2,
  Share2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RealRupeeBillDashboard } from "@/features/landing/components/RealRupeeBillDashboard";

interface HeroProps {
  onBookDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();
  const [deviceTab, setDeviceTab] = useState<"dashboard" | "pos" | "mobile">("dashboard");
  const [activeBillStyle, setActiveBillStyle] = useState<"thermal" | "gst">("thermal");

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-background via-muted/15 to-background border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Trust Pill Banner */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <span className="text-sm">🇮🇳</span>
            <span>India's Most Practical GST Billing, POS &amp; Inventory Software</span>
            <span className="text-border mx-0.5">•</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-300">100% Free Forever</span>
          </div>
        </div>

        {/* Main Headline (All Types of Businesses) */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.12]">
            GST Billing Software, Invoicing &amp; Inventory App for All Types of Businesses
          </h1>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
            Built for retail counters, wholesale distributors, manufacturers, supermarkets &amp; service enterprises. Create GST-compliant bills in 5 seconds, print on any 2" &amp; 3" thermal printer, track multi-godown stock, and collect payments faster with UPI QR codes on WhatsApp. Works 100% offline without internet.
          </p>
        </div>

        {/* Download & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-2xl mx-auto mb-8">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto h-13 px-8 text-base font-bold shadow-md shadow-primary/20 hover:scale-[1.01] transition-transform bg-primary text-primary-foreground"
          >
            Start Billing 100% Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            size="lg"
            onClick={onBookDemo}
            className="w-full sm:w-auto h-13 px-7 text-base font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-0 shadow-md shadow-red-500/20 hover:scale-[1.01] transition-transform"
          >
            <Star className="mr-2 h-4 w-4 fill-white text-white" /> Book Free Live Demo
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollToSection("features")}
            className="w-full sm:w-auto h-13 px-6 text-base font-semibold border-border hover:bg-muted"
          >
            See All Features ↓
          </Button>
        </div>

        {/* Merchant Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground pb-10 border-b border-border/50 max-w-4xl mx-auto">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span><strong>15,000+</strong> Indian Retailers &amp; Wholesalers</span>
          </span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Works 100% Offline (Zero Downtime)</span>
          </span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Thermal 2" &amp; 3" USB/Bluetooth Ready</span>
          </span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>1-Click GSTR-1 &amp; Tally/Excel Export</span>
          </span>
        </div>

        {/* ======================================================== */}
        {/* REAL SOFTWARE PRODUCT SHOWCASE (DUAL-DEVICE VIEW) */}
        {/* ======================================================== */}
        <div className="mt-10 max-w-6xl mx-auto">
          {/* Top Device Switcher Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live Software View:
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ● Live Counter Terminal (Active)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex p-1 rounded-xl bg-muted border border-border text-xs">
                <button
                  onClick={() => setDeviceTab("dashboard")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    deviceTab === "dashboard"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-primary" />
                  <span>Business Dashboard (Pro)</span>
                </button>
                <button
                  onClick={() => setDeviceTab("pos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    deviceTab === "pos"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-amber-500" />
                  <span>Retail POS Counter</span>
                </button>
                <button
                  onClick={() => setDeviceTab("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    deviceTab === "mobile"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Exact Real RupeeBill Dashboard (Replicating user's application screenshot) */}
          {deviceTab === "dashboard" && (
            <div className="transition-all animate-in fade-in duration-200">
              <RealRupeeBillDashboard />
            </div>
          )}

          {/* 2. Retail POS Counter Terminal Mockup */}
          {deviceTab === "pos" && (
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
                  <span className="bg-card px-2 py-1 rounded border border-border">Thermal: EPSON TM-T82 (Ready)</span>
                </div>
              </div>

              {/* Active Bill Counter Form */}
              <div className="p-4 sm:p-6 bg-background grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left 8-Cols: Active Invoice Form */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Customer & Invoice Meta Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/80 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Customer / Party Name</label>
                      <div className="font-bold text-foreground mt-0.5">Ramesh Sharma (Regular)</div>
                      <div className="text-[10px] text-muted-foreground">Ph: +91 98201 23456</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Invoice Number &amp; Date</label>
                      <div className="font-mono font-bold text-foreground mt-0.5">INV-2026-1048</div>
                      <div className="text-[10px] text-muted-foreground">Today, 05:42 PM</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Billing Mode</label>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">GST Tax Invoice (B2C)</div>
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
                            <span className="block text-[10px] font-normal text-muted-foreground font-mono">Batch: B-2026/08</span>
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
                            <span className="block text-[10px] font-normal text-muted-foreground font-mono">Batch: G-8941</span>
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
                            <span className="block text-[10px] font-normal text-muted-foreground font-mono">Batch: ALM-09</span>
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
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Settlement Channel</label>
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
                      onClick={() => navigate("/auth")}
                    >
                      <Printer className="w-4 h-4 mr-2" /> Save &amp; Print Bill [F12]
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full font-bold text-xs h-9 border-border"
                      onClick={() => setDeviceTab("mobile")}
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Dispatch via WhatsApp
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Mobile WhatsApp View */}
          {deviceTab === "mobile" && (
            <div className="max-w-md mx-auto rounded-3xl border-4 border-slate-800 bg-[#0b141a] text-slate-100 shadow-2xl overflow-hidden transition-all animate-in fade-in duration-200">
              {/* Android Phone Top Status */}
              <div className="bg-[#202c33] px-4 py-2 flex justify-between items-center text-[10px] text-slate-300 font-mono">
                <span>05:42 PM</span>
                <span className="flex items-center gap-1.5">
                  <span>5G 📶</span>
                  <span>🔋 94%</span>
                </span>
              </div>

              {/* WhatsApp Chat Bar */}
              <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                    SG
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>Shree Ganesh Supermarket</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] flex items-center justify-center text-white">✓</span>
                    </div>
                    <div className="text-[10px] text-emerald-400">Verified WhatsApp Business Account</div>
                  </div>
                </div>
              </div>

              {/* Chat Message Bubble */}
              <div className="p-4 space-y-3 bg-[#0b141a] min-h-[380px] flex flex-col justify-end">
                <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-sm max-w-[95%] space-y-2.5 shadow-md">
                  <p className="text-xs leading-relaxed">
                    Namaste <strong>Ramesh ji</strong>! 🙏 Thank you for shopping at Shree Ganesh Supermarket. Here is your digital tax invoice:
                  </p>

                  {/* PDF File Tile */}
                  <div className="bg-[#025144] p-3 rounded-lg flex items-center justify-between border border-emerald-600/40">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-red-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">Invoice_INV-1048.pdf</div>
                        <div className="text-[10px] text-slate-300">142 KB • GST Tax Invoice</div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-300" />
                  </div>

                  <div className="text-xs text-emerald-200 pt-1 border-t border-emerald-600/40 flex justify-between items-center">
                    <span>Grand Total:</span>
                    <span className="text-base font-black text-white">₹1,410.00</span>
                  </div>

                  {/* WhatsApp Interactive UPI Link Button */}
                  <div className="pt-1">
                    <div className="w-full py-2 bg-[#202c33] text-emerald-400 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700">
                      <span>Pay via UPI (GPay / PhonePe / Paytm)</span>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-300 text-right">05:42 PM ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Bar: Multi-Printer & OS Compatibility Strip */}
          <div className="mt-4 p-4 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Hardware &amp; Printer Ready:</span>
              <span>2" &amp; 3" Thermal Printers (Epson, TVS, NGX, Everycom)</span>
              <span className="text-border">•</span>
              <span>USB / Bluetooth Barcode Scanners</span>
            </div>
            <div className="flex items-center gap-3 font-semibold text-primary">
              <span className="cursor-pointer hover:underline" onClick={() => scrollToSection("comparison")}>
                Compare with Vyapar &amp; Excel →
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

