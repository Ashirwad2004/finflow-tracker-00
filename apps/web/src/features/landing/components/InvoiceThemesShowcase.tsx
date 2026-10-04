import React, { useState } from "react";
import { SectionHeading } from "./shared/SectionHeading";
import {
  FileText,
  Printer,
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  Layers,
  Copy,
  Check,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  RealA4ModernBlue,
  RealA4ClassicTally,
  RealA4VibrantGradient,
} from "./invoices";

type FormatId = "a4gst" | "thermal80" | "whatsapp" | "thermal58";
type A4ThemeId = "modern-blue" | "classic-tally" | "vibrant-gradient";

interface A4ThemeMeta {
  id: A4ThemeId;
  name: string;
  tagline: string;
  desc: string;
  badge: string;
  accentBorder: string;
}

const A4_THEMES: A4ThemeMeta[] = [
  {
    id: "modern-blue",
    name: "Detailed GST Blue",
    tagline: "Retail & Wholesale Standard",
    desc: "Complete HSN, MRP, Batch, Exp Date, Dual Ledger Balance & Sky Blue Ribbon",
    badge: "Wholesale & Retail",
    accentBorder: "border-sky-500",
  },
  {
    id: "classic-tally",
    name: "Classic Tally B2B",
    tagline: "Corporate & CA Accounting",
    desc: "Crisp Double-Quadrant (Bill-To / Ship-To), Continuous Vertical Ledger Grid",
    badge: "Tally / Corporate",
    accentBorder: "border-slate-800 dark:border-slate-400",
  },
  {
    id: "vibrant-gradient",
    name: "Startup Brand Gradient",
    tagline: "High-Impact Modern Identity",
    desc: "Vibrant Header with Custom Brand Logo, Status Stamp & Rounded Payment Pills",
    badge: "Modern Identity",
    accentBorder: "border-purple-500",
  },
];

export const InvoiceThemesShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<FormatId>("a4gst");
  const [selectedA4Theme, setSelectedA4Theme] = useState<A4ThemeId>("modern-blue");
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [isSimulatingPrint, setIsSimulatingPrint] = useState(false);

  const formats = [
    {
      id: "a4gst" as const,
      icon: FileText,
      name: "A4 GST Tax Invoices",
      desc: "3 Real Auditor-Approved Themes for B2B & Wholesale",
      highlight: "3 Themes Included",
    },
    {
      id: "thermal80" as const,
      icon: Printer,
      name: "3\" Thermal Slip (80mm)",
      desc: "Instant 5-sec counter billing for POS & supermarkets",
      highlight: "ESC/POS Ready",
    },
    {
      id: "whatsapp" as const,
      icon: Smartphone,
      name: "WhatsApp Digital PDF",
      desc: "Paperless PDF dispatch with instant UPI pay button",
      highlight: "1-Tap Share",
    },
    {
      id: "thermal58" as const,
      icon: Printer,
      name: "2\" Portable Slip (58mm)",
      desc: "Pocket Bluetooth printer slip for van & field delivery",
      highlight: "Bluetooth",
    },
  ];

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("8102545007@ybl");
    setIsCopiedUpi(true);
    toast({
      title: "✓ UPI VPA Copied!",
      description: "8102545007@ybl copied to clipboard.",
    });
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  const handleSimulatePrint = () => {
    setIsSimulatingPrint(true);
    toast({
      title: "🖨️ Simulating High-Resolution Print...",
      description: `Rendering Satyam Hardware INV-00202609218 in ${
        selectedA4Theme === "modern-blue"
          ? "Detailed GST Blue"
          : selectedA4Theme === "classic-tally"
          ? "Classic Tally B2B"
          : "Startup Brand Gradient"
      } format (A4 • 300 DPI vector).`,
    });
    setTimeout(() => {
      setIsSimulatingPrint(false);
      toast({
        title: "✓ Invoice Print Ready",
        description: "Official tax invoice generated with verified GSTIN, UPI QR & signature.",
      });
    }, 1000);
  };

  return (
    <section id="invoice-themes" className="py-20 sm:py-32 bg-background border-b border-border/60 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-violet-600/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <SectionHeading
          label="Invoice formats"
          figure="4 formats"
          title="The bill your customer actually gets"
          description="Every A4 tax invoice and thermal slip below is rendered by the same engine that runs in the product. Nothing here is a mockup."
          className="mb-12"
        />

        {/* Primary Hardware / Format Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = selectedFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? "border-[hsl(var(--lp-red))] bg-card ring-1 ring-[hsl(var(--lp-red)/0.25)]"
                    : "bg-muted/20 border-border hover:bg-muted/50 hover:border-border/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSelected ? "bg-[hsl(var(--lp-ink))] text-[hsl(var(--lp-paper))]" : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isSelected ? "border-[hsl(var(--lp-ink)/0.3)] bg-[hsl(var(--lp-ink)/0.08)] text-[hsl(var(--lp-ink))]" : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {fmt.highlight}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-foreground">{fmt.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{fmt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Bill Visualizer Showcase Canvas */}
        <div className="lp-product p-4 sm:p-8 lg:p-10 border border-[hsl(var(--lp-rule))] bg-muted/15 flex flex-col items-center min-h-[600px]">
          
          {/* ========================================================
              1. A4 GST TAX INVOICE (3 REAL THEMES SHOWCASE)
             ======================================================== */}
          {selectedFormat === "a4gst" && (
            <div className="w-full flex flex-col items-center space-y-6">
              
              {/* Interactive Theme Switcher Bar */}
              <div className="w-full max-w-3xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[hsl(var(--lp-red))]" />
                    <span className="lp-label text-foreground">
                      Select A4 Invoice Template:
                    </span>
                  </div>
                  
                  {/* Action Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyUpi}
                      className="h-8 text-xs font-bold gap-1.5 border-border bg-background"
                      title="Copy Merchant UPI ID"
                    >
                      {isCopiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>UPI: 8102545007@ybl</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSimulatePrint}
                      disabled={isSimulatingPrint}
                      className="h-8 text-xs font-bold gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isSimulatingPrint ? "Simulating..." : "Test Print"}</span>
                    </Button>
                  </div>
                </div>

                {/* 3 Theme Switcher Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  {A4_THEMES.map((th) => {
                    const isThSelected = selectedA4Theme === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setSelectedA4Theme(th.id)}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isThSelected
                            ? `bg-card ${th.accentBorder} shadow-md ring-2 ring-primary/20`
                            : "bg-background/80 border-border/80 hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="lp-label text-[11px] text-muted-foreground">
                              {th.badge}
                            </span>
                            {isThSelected && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--lp-green))]" />
                            )}
                          </div>
                          <div className="font-extrabold text-xs text-foreground">{th.name}</div>
                          <div className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{th.tagline}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Physical A4 Sheet Container */}
              <div className="w-full flex justify-center py-2 px-1 overflow-x-auto">
                <div className="w-full max-w-[680px] min-w-[340px] transition-all">
                  <AnimatePresence mode="wait">
                    {selectedA4Theme === "modern-blue" && (
                      <motion.div
                        key="modern-blue"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <RealA4ModernBlue />
                      </motion.div>
                    )}

                    {selectedA4Theme === "classic-tally" && (
                      <motion.div
                        key="classic-tally"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <RealA4ClassicTally />
                      </motion.div>
                    )}

                    {selectedA4Theme === "vibrant-gradient" && (
                      <motion.div
                        key="vibrant-gradient"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <RealA4VibrantGradient />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Top 1% UI Highlights Grid Below Invoice */}
              <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60">
                <div className="p-3 rounded-xl bg-card border border-border/80 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>GST Audit Ready</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    CGST, SGST, IGST and HSN code auto-computed to exact paise.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
                    <QrCode className="w-4 h-4 text-indigo-500" />
                    <span>Instant UPI QR</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Dynamic Bharat QR embedded with ₹3,411.92 auto-fill.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Prior Due Tracking</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Carries forward customer ledger balance automatically on bills.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/80 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
                    <CheckCircle2 className="w-4 h-4 text-rose-500" />
                    <span>Digital Signature</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Authorized signatory &amp; shop seal built-in for legal validity.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================
              2. 3-INCH THERMAL SLIP (80MM COUNTER POS)
             ======================================================== */}
          {selectedFormat === "thermal80" && (
            <div className="w-full max-w-sm bg-white text-slate-900 font-mono text-xs p-6 shadow-2xl border border-slate-200 rounded-sm space-y-3 transition-all animate-in fade-in duration-200">
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                <div className="font-black text-sm uppercase tracking-wide">
                  SATYAM HARDWARE &amp; MATERIAL
                </div>
                <div className="text-[10px] text-slate-600">jmm, Uttar Pradesh</div>
                <div className="text-[10px] text-slate-600">GSTIN: 09AAACH7409R1ZZ • Ph: 7011988701</div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>BILL: #INV-00202609218</span>
                  <span>29-SEP-2026 09:16 AM</span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold pb-1 border-b border-slate-200">
                  <span>ITEM</span>
                  <span>QTY x RATE</span>
                  <span>TOTAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">11111</span>
                  <span>1 x 80.00</span>
                  <span className="font-bold">₹80.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">343</span>
                  <span>1 x 2,222.00</span>
                  <span className="font-bold">₹2,222.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate max-w-[130px]">4343434</span>
                  <span>1 x 1,109.92</span>
                  <span className="font-bold">₹1,109.92</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between text-slate-600">
                  <span>Total Qty:</span>
                  <span>3 pcs</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sub Total:</span>
                  <span>₹3,411.92</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-900">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹3,411.92</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Current Balance Due:</span>
                  <span className="font-bold text-rose-600">₹3,411.92</span>
                </div>
                <div className="text-[10px] text-amber-700 font-bold">
                  MODE: PENDING (KHATA ENTRY)
                </div>
              </div>

              <div className="text-center pt-1 space-y-1">
                <div className="w-16 h-16 bg-slate-100 border border-slate-300 mx-auto rounded flex items-center justify-center p-1">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div className="text-[9px] text-slate-500">Scan QR to pay via UPI (8102545007@ybl)</div>
                <div className="font-black text-[10px] tracking-widest text-slate-800 uppercase">
                  THANK YOU • VISIT AGAIN
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              3. WHATSAPP DIGITAL PDF DISPATCH
             ======================================================== */}
          {selectedFormat === "whatsapp" && (
            <div className="w-full max-w-md bg-[#0b141a] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all animate-in fade-in duration-200">
              <div className="bg-[#202c33] p-3.5 flex items-center justify-between border-b border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm">
                    SH
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>Satyam Hardware &amp; material</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] flex items-center justify-center text-white">✓</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Official Business Account • GSTIN: 09AAACH7409R1ZZ</div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 bg-[#0b141a]">
                <div className="bg-[#005c4b] text-white p-3.5 rounded-xl rounded-tl-sm max-w-[95%] space-y-2.5 shadow-md">
                  <p className="text-xs leading-relaxed">
                    Namaste <strong>test pending balance</strong>! 🙏 Thank you for your business with Satyam Hardware &amp; material. Here is your official GST tax invoice:
                  </p>

                  <div className="bg-[#025144] p-3 rounded-lg flex items-center justify-between border border-emerald-600/30">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">INV-00202609218.pdf</div>
                        <div className="text-[10px] text-slate-300">142 KB • A4 GST Tax Invoice</div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-300" />
                  </div>

                  <div className="text-xs text-emerald-200 pt-1 border-t border-emerald-600/40 flex justify-between items-center">
                    <span>Invoice Amount:</span>
                    <span className="text-sm font-black text-white">₹3,411.92</span>
                  </div>

                  <div className="pt-1">
                    <div className="w-full py-2 bg-[#202c33] text-emerald-400 rounded-lg text-center font-bold text-xs border border-slate-700">
                      Pay via UPI: 8102545007@ybl (GPay/PhonePe)
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-300 text-right">09:16 AM ✓✓</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              4. 2-INCH PORTABLE SLIP (58MM BLUETOOTH)
             ======================================================== */}
          {selectedFormat === "thermal58" && (
            <div className="w-full max-w-xs bg-white text-slate-900 font-mono text-[11px] p-4 shadow-2xl border border-slate-200 rounded-sm space-y-2 text-center transition-all animate-in fade-in duration-200">
              <div className="pb-2 border-b border-dashed border-slate-400">
                <div className="font-black text-xs uppercase">SATYAM HARDWARE</div>
                <div className="text-[9px] text-slate-600">jmm • Ph: 7011988701</div>
                <div className="text-[9px] text-slate-600">GST: 09AAACH7409R1ZZ</div>
              </div>

              <div className="space-y-1 text-left text-[10px] py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>11111 (1x)</span>
                  <span className="font-bold">₹80.00</span>
                </div>
                <div className="flex justify-between">
                  <span>343 (1x)</span>
                  <span className="font-bold">₹2,222.00</span>
                </div>
                <div className="flex justify-between">
                  <span>4343434 (1x)</span>
                  <span className="font-bold">₹1,109.92</span>
                </div>
              </div>

              <div className="flex justify-between font-black text-xs py-1 border-b border-dashed border-slate-400">
                <span>TOTAL:</span>
                <span>₹3,411.92</span>
              </div>

              <div className="text-[9px] text-slate-500 pt-1">
                UPI: 8102545007@ybl • THANK YOU!
              </div>
            </div>
          )}

        </div>

        {/* Quick CTA */}
        <div className="text-center mt-10">
          <Button
            size="lg"
            onClick={() => navigate("/auth?mode=signup")}
            className="lp-btn h-12 rounded-none px-8 text-sm"
          >
            Start printing GST bills
          </Button>
        </div>

      </div>
    </section>
  );
};
