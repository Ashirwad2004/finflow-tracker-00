import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Package,
  Users,
  Wallet,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  Barcode,
  Send,
  Download,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Check,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Clock,
  CreditCard,
  Building2,
  FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const VyaparFeatures: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"billing" | "inventory" | "khata" | "daybook" | "reports">("billing");

  // Tab 1 Sub-view: Thermal receipt vs A4 Tax invoice
  const [billingFormat, setBillingFormat] = useState<"thermal" | "a4">("thermal");
  const [isPrinting, setIsPrinting] = useState(false);

  // Tab 2 Sub-filter: Inventory view filter
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low" | "expiring">("all");

  // Tab 3 Sub-view: Customer Ledger vs WhatsApp Reminder
  const [khataView, setKhataView] = useState<"statement" | "whatsapp">("statement");

  // Tab 5 Sub-view: GSTR-1 vs GSTR-3B
  const [taxReportType, setTaxReportType] = useState<"gstr1" | "gstr3b">("gstr1");

  // Synchronize with URL hash or navbar clicks
  React.useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes("billing") || hash.includes("preview") || hash.includes("pos")) {
        setActiveTab("billing");
      } else if (hash.includes("inventory") || hash.includes("stock")) {
        setActiveTab("inventory");
      } else if (hash.includes("parties") || hash.includes("khata") || hash.includes("ledger")) {
        setActiveTab("khata");
      } else if (hash.includes("daybook") || hash.includes("cash")) {
        setActiveTab("daybook");
      } else if (hash.includes("reports") || hash.includes("gst")) {
        setActiveTab("reports");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const tabList = [
    {
      id: "billing" as const,
      icon: FileText,
      title: "GST Invoicing & Billing",
      badge: "Fastest POS",
      desc: "5-second counter billing, thermal receipt printing, auto-tax split & WhatsApp dispatch.",
    },
    {
      id: "inventory" as const,
      icon: Package,
      title: "Inventory & Stock",
      badge: "Real-Time",
      desc: "Live godown stock, low inventory alerts, barcode label printing & expiry tracking.",
    },
    {
      id: "khata" as const,
      icon: Users,
      title: "Party Khata & Ledgers",
      badge: "Automated",
      desc: "Customer udhar balances, vendor payables & polite WhatsApp reminders with UPI.",
    },
    {
      id: "daybook" as const,
      icon: Wallet,
      title: "Cash, Bank & Daybook",
      badge: "Reconciled",
      desc: "Counter drawer cash verification, UPI settlement tracking & daily profit margin.",
    },
    {
      id: "reports" as const,
      icon: FileSpreadsheet,
      title: "CA & Tax Reports",
      badge: "1-Click CA",
      desc: "GSTR-1, GSTR-3B summaries, Profit & Loss statement & Tally/Excel export.",
    },
  ];

  const handleSimulatePrint = () => {
    setIsPrinting(true);
    toast({
      title: "🖨️ Printing Test Receipt...",
      description: "ESC/POS print signal sent to 80mm Thermal Printer (TVS RP-3200).",
    });
    setTimeout(() => {
      setIsPrinting(false);
      toast({
        title: "✓ Receipt Printed Successfully",
        description: "Auto-cutter triggered. Bill #INV-1048 completed.",
      });
    }, 1200);
  };

  const handleSendWhatsAppReminder = () => {
    toast({
      title: "📲 WhatsApp Reminder Sent!",
      description: "Payment link with UPI QR dispatched to Priya Verma (+91 98201 XXXXX).",
    });
  };

  const handleExportCA = (format: string) => {
    toast({
      title: `📊 Exporting ${format} Report`,
      description: "GSTR report formatted and downloaded. Ready for your Chartered Accountant.",
    });
  };

  const handleCloseDaybook = () => {
    toast({
      title: "✓ Daybook Closed Successfully",
      description: "Counter drawer tallied. Daily sales summary sent to owner WhatsApp.",
    });
  };

  return (
    <section id="features" className="py-16 sm:py-24 bg-background border-b border-border/60 relative">
      {/* Scroll Anchors for Navbar Links */}
      <div id="preview" className="absolute -top-20" />
      <div id="billing" className="absolute -top-20" />
      <div id="inventory" className="absolute -top-20" />
      <div id="parties" className="absolute -top-20" />
      <div id="reports" className="absolute -top-20" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Business Toolkit</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-4">
            Everything Your Business Needs to Run Smoothly
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Built from the ground up for <span className="font-semibold text-foreground">all types of businesses</span> — retailers, wholesalers, distributors, manufacturers, and service enterprises across India. Replaces slow manual paper registers, complicated Excel formulas, and expensive legacy software.
          </p>
        </div>

        {/* Vyapar-Style Horizontal Segmented Tab Navigation */}
        <div className="flex justify-center mb-8 sm:mb-12 px-1">
          <div className="w-full max-w-5xl p-1.5 sm:p-2 bg-muted/70 dark:bg-muted/40 backdrop-blur-md rounded-2xl border border-border/80 shadow-inner overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max justify-start md:justify-center">
              {tabList.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                      isSelected
                        ? "bg-background text-foreground shadow-md border border-border/80 text-primary scale-[1.01]"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{tab.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feature Display Workspace Container */}
        <div className="rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden p-6 sm:p-8 lg:p-10 relative">
          {/* Top Subtle Primary Gradient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* TAB 1: GST INVOICING & BILLING */}
          {activeTab === "billing" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
              {/* Left Column: Feature Highlights */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <Printer className="w-3.5 h-3.5" /> High-Speed POS Counter • Under 5-Sec Billing
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Fast Counter Billing &amp; Instant GST Invoicing
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ring up customers in seconds with barcode scanner guns or touch search. Automatically split CGST, SGST, and IGST by HSN code, apply custom trade discounts, and print directly to thermal slip or A4 laser printers.
                  </p>

                  {/* Quick Highlight Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">⚡ Under 5s</div>
                      <div className="text-[9px] text-muted-foreground">Checkout Speed</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">🖨️ 2" &amp; 3"</div>
                      <div className="text-[9px] text-muted-foreground">Thermal Support</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📱 WhatsApp</div>
                      <div className="text-[9px] text-muted-foreground">Direct PDF Send</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">🛡️ 100% Offline</div>
                      <div className="text-[9px] text-muted-foreground">Zero Downtime</div>
                    </div>
                  </div>

                  {/* Detailed Feature List */}
                  <div className="space-y-2.5 pt-2">
                    {[
                      "Works with any standard USB & Bluetooth 58mm / 80mm thermal receipt printer",
                      "Automatic CGST, SGST & IGST tax computation with HSN code auto-lookup",
                      "Instant WhatsApp dispatch with clickable UPI payment link in 1 tap",
                      "Runs 100% offline — continue billing customers even when internet drops",
                      "Custom branding: Add your shop logo, terms & conditions, bank details & UPI QR",
                    ].map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
                  <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-11 px-6 shadow-md shadow-primary/20">
                    Try POS Billing Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSimulatePrint}
                    disabled={isPrinting}
                    className="font-bold text-xs sm:text-sm h-11 px-4 border-border"
                  >
                    <Printer className="w-4 h-4 mr-2 text-emerald-500" />
                    {isPrinting ? "Printing Receipt..." : "Simulate Print"}
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
                      RupeeBill POS Terminal #01
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ESC/POS Connected
                    </span>
                  </div>
                </div>

                {/* Sub-Format Switcher Inside Preview */}
                <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Preview Output Format:</span>
                  <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setBillingFormat("thermal")}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        billingFormat === "thermal"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      3" Thermal Slip (80mm)
                    </button>
                    <button
                      onClick={() => setBillingFormat("a4")}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        billingFormat === "a4"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      A4 GST Tax Invoice
                    </button>
                  </div>
                </div>

                {/* Mockup Canvas */}
                <div className="p-4 sm:p-6 flex-1 flex items-center justify-center bg-zinc-100/60 dark:bg-zinc-950/60 overflow-y-auto">
                  {billingFormat === "thermal" ? (
                    /* Authentic Physical Thermal Receipt */
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs p-5 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3 relative transition-all">
                      {/* Top Paper Tear Line */}
                      <div className="absolute -top-1 left-2 right-2 border-t-2 border-dotted border-zinc-300 dark:border-zinc-700" />

                      <div className="text-center pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                        <div className="font-black text-sm uppercase tracking-wider text-zinc-950 dark:text-white">
                          SHREE GANESH SUPERMARKET
                        </div>
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Shop 4, MG Road, Mumbai 400001
                        </div>
                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                          GSTIN: 27AABCU9603R1ZM • FSSAI: 115210
                        </div>
                        <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                          TAX INVOICE #INV-1048 • 26-SEP-2026 18:24
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                        <div className="flex justify-between font-black text-zinc-800 dark:text-zinc-200 pb-0.5">
                          <span>Item</span>
                          <span>Qty x Rate</span>
                          <span>Total</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="truncate max-w-[130px]">Organic Honey 500g</span>
                          <span className="text-zinc-600 dark:text-zinc-400">2 x 240.00</span>
                          <span className="font-bold">₹480.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="truncate max-w-[130px]">Pure Cow Ghee 1L</span>
                          <span className="text-zinc-600 dark:text-zinc-400">1 x 650.00</span>
                          <span className="font-bold">₹650.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="truncate max-w-[130px]">Almonds 250g</span>
                          <span className="text-zinc-600 dark:text-zinc-400">1 x 280.00</span>
                          <span className="font-bold">₹280.00</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                          <span>Taxable Value:</span>
                          <span>₹1,250.42</span>
                        </div>
                        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                          <span>CGST (6%) + SGST (6%):</span>
                          <span>₹159.58</span>
                        </div>
                        <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white">
                          <span>GRAND TOTAL:</span>
                          <span>₹1,410.00</span>
                        </div>
                      </div>

                      <div className="text-center pt-1 space-y-1.5">
                        <div className="w-14 h-14 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 mx-auto rounded flex items-center justify-center p-1 shadow-inner">
                          <QrCode className="w-10 h-10 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <div className="text-[9px] text-zinc-500 font-sans">Scan QR to pay via UPI (GPay/PhonePe)</div>
                        <div className="text-[10px] font-bold tracking-widest text-zinc-800 dark:text-zinc-200">
                          THANK YOU FOR YOUR VISIT
                        </div>
                      </div>

                      {/* Barcode visual */}
                      <div className="pt-1 text-center border-t border-dashed border-zinc-300 dark:border-zinc-700">
                        <div className="text-[13px] tracking-widest font-mono text-zinc-500 select-none">
                          ||| | |||| | ||| || ||||| | ||
                        </div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">INV-1048-2609</div>
                      </div>
                    </div>
                  ) : (
                    /* A4 GST Invoice Preview */
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs p-5 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex justify-between items-start pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                          <div className="text-xs font-black uppercase text-primary">TAX INVOICE</div>
                          <div className="font-bold text-sm text-foreground">SHREE GANESH SUPERMARKET</div>
                          <div className="text-[10px] text-zinc-500">GSTIN: 27AABCU9603R1ZM</div>
                        </div>
                        <div className="text-right text-[10px]">
                          <div className="font-bold text-foreground">Invoice #: INV-2026-1048</div>
                          <div className="text-zinc-500">Date: 26-Sep-2026</div>
                          <div className="text-emerald-600 font-bold">PAID (UPI)</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
                        <div>
                          <span className="font-bold text-zinc-500">Billed To:</span>
                          <div className="font-bold text-foreground">Walk-in Customer</div>
                          <div className="text-zinc-500">POS Counter Billing</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-zinc-500">Place of Supply:</span>
                          <div className="font-bold text-foreground">Maharashtra (27)</div>
                          <div className="text-zinc-500">Reverse Charge: No</div>
                        </div>
                      </div>

                      <div className="border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden text-[10px]">
                        <div className="bg-zinc-100 dark:bg-zinc-800 font-bold p-1.5 grid grid-cols-12 text-zinc-600 dark:text-zinc-300">
                          <span className="col-span-5">Item</span>
                          <span className="col-span-2 text-center">HSN</span>
                          <span className="col-span-2 text-right">Qty</span>
                          <span className="col-span-3 text-right">Amount</span>
                        </div>
                        <div className="p-1.5 grid grid-cols-12 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="col-span-5 font-medium truncate">Organic Honey 500g</span>
                          <span className="col-span-2 text-center text-zinc-500">0409</span>
                          <span className="col-span-2 text-right">2 pcs</span>
                          <span className="col-span-3 text-right font-bold">₹480.00</span>
                        </div>
                        <div className="p-1.5 grid grid-cols-12 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="col-span-5 font-medium truncate">Pure Cow Ghee 1L</span>
                          <span className="col-span-2 text-center text-zinc-500">0405</span>
                          <span className="col-span-2 text-right">1 tin</span>
                          <span className="col-span-3 text-right font-bold">₹650.00</span>
                        </div>
                        <div className="p-1.5 grid grid-cols-12 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="col-span-5 font-medium truncate">California Almonds 250g</span>
                          <span className="col-span-2 text-center text-zinc-500">0802</span>
                          <span className="col-span-2 text-right">1 pk</span>
                          <span className="col-span-3 text-right font-bold">₹280.00</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800 font-bold text-xs">
                        <span>Total Invoice Value:</span>
                        <span className="text-primary font-black text-sm">₹1,410.00</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mockup Action Footer */}
                <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Auto-print on Enter key enabled
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={handleSimulatePrint} className="h-7 text-xs font-bold">
                      <Printer className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Print
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleSendWhatsAppReminder} className="h-7 text-xs font-bold text-[#25D366]">
                      <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY & STOCK */}
          {activeTab === "inventory" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
              {/* Left Column: Feature Highlights */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                    <Package className="w-3.5 h-3.5" /> Godown &amp; Multi-Store Control • Zero Discrepancy
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Real-Time Stock, Godown Batches &amp; Barcodes
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Never run out of high-selling products or lose working capital in dead inventory. Stock counts automatically deduct with every counter bill, generate automated low-stock warnings, and let you print custom barcode labels.
                  </p>

                  {/* Quick Highlight Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📦 Live Sync</div>
                      <div className="text-[9px] text-muted-foreground">Every Sale &amp; Return</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">⚠️ Smart Alert</div>
                      <div className="text-[9px] text-muted-foreground">Low-Stock Warnings</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">🏷️ Barcode Gun</div>
                      <div className="text-[9px] text-muted-foreground">Print Custom Labels</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📅 Expiry Guard</div>
                      <div className="text-[9px] text-muted-foreground">Batch &amp; Date Guard</div>
                    </div>
                  </div>

                  {/* Detailed Feature List */}
                  <div className="space-y-2.5 pt-2">
                    {[
                      "Real-time stock deduction the exact split second a customer bill is generated",
                      "Automated low-inventory warning triggers before critical items go out of stock",
                      "Batch number, manufacturing & expiry date tracking to eliminate spoiled goods",
                      "Generate and print standard barcode stickers for unpackaged or wholesale items",
                      "Bulk 1-click import and export of 10,000+ items from Excel in under 30 seconds",
                    ].map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
                  <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-11 px-6 shadow-md shadow-primary/20">
                    Manage Inventory Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "🏷️ Barcode Scanner Test",
                        description: "Scanned 'GHEE-1L' -> Found Pure Desi Cow Ghee 1L (Stock: 3).",
                      });
                    }}
                    className="font-bold text-xs sm:text-sm h-11 px-4 border-border"
                  >
                    <Barcode className="w-4 h-4 mr-2 text-amber-500" /> Test Barcode Scan
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
                      RupeeBill Inventory Manager • Central Godown
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold border border-primary/20">
                    342 Active SKUs
                  </span>
                </div>

                {/* Sub-Filter Switcher */}
                <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Search className="w-3.5 h-3.5" />
                    <span className="font-medium">Filter Stock:</span>
                  </div>
                  <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setInventoryFilter("all")}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        inventoryFilter === "all"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All SKUs (342)
                    </button>
                    <button
                      onClick={() => setInventoryFilter("low")}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        inventoryFilter === "low"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Low Stock (8)
                    </button>
                    <button
                      onClick={() => setInventoryFilter("expiring")}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        inventoryFilter === "expiring"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Expiring Soon (3)
                    </button>
                  </div>
                </div>

                {/* Mockup Canvas */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-zinc-100/50 dark:bg-zinc-950/50">
                  <div className="space-y-2.5">
                    {[
                      {
                        name: "Pure Desi Cow Ghee 1L Tin",
                        sku: "GHEE-1L",
                        stock: "3 tins remaining",
                        minQty: "Reorder level: 10",
                        status: "Critical Low Stock",
                        statusColor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
                        progress: "w-[15%] bg-rose-500",
                        mrp: "₹650",
                        isLow: true,
                        isExpiring: false,
                      },
                      {
                        name: "Organic Forest Honey 500g",
                        sku: "HNY-500",
                        stock: "34 pcs",
                        minQty: "Batch #B-2024 • Exp: 18 days",
                        status: "Expiring Soon",
                        statusColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
                        progress: "w-[68%] bg-amber-500",
                        mrp: "₹240",
                        isLow: false,
                        isExpiring: true,
                      },
                      {
                        name: "California Whole Almonds 250g",
                        sku: "ALM-250",
                        stock: "14 packs",
                        minQty: "Reorder level: 5",
                        status: "Healthy Stock",
                        statusColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                        progress: "w-[85%] bg-emerald-500",
                        mrp: "₹280",
                        isLow: false,
                        isExpiring: false,
                      },
                      {
                        name: "Basmati Rice Rozana 5kg",
                        sku: "RICE-5K",
                        stock: "18 bags",
                        minQty: "Reorder level: 4",
                        status: "Healthy Stock",
                        statusColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                        progress: "w-[90%] bg-emerald-500",
                        mrp: "₹480",
                        isLow: false,
                        isExpiring: false,
                      },
                    ]
                      .filter((item) => {
                        if (inventoryFilter === "low") return item.isLow;
                        if (inventoryFilter === "expiring") return item.isExpiring;
                        return true;
                      })
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-card border border-border/80 shadow-sm flex flex-col gap-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-foreground text-xs sm:text-sm">{item.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                SKU: {item.sku} • MRP: {item.mrp} • {item.minQty}
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block border ${item.statusColor}`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                          {/* Stock Health Progress Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${item.progress}`} />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-foreground shrink-0">
                              {item.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Stock Valuation Footer Card */}
                  <div className="p-3.5 rounded-xl bg-background border border-border flex justify-between items-center text-xs shadow-sm">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Total Warehouse Valuation:</span>
                      <span className="text-base font-black text-foreground">₹4,82,650.00</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[11px]">Reorder Needed:</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">3 Urgent SKUs</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Action Footer */}
                <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Barcode Scanner: Honeywell 1950G (USB Active)
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      toast({
                        title: "📦 Stock Adjusted",
                        description: "+10 units of Pure Cow Ghee added to godown stock.",
                      });
                    }}
                    className="h-7 text-xs font-bold text-primary"
                  >
                    + Quick Add Stock
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KHATA & PARTY LEDGER */}
          {activeTab === "khata" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
              {/* Left Column: Feature Highlights */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
                    <Users className="w-3.5 h-3.5" /> Customer &amp; Vendor Udhar Khata • 3x Faster Collections
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Customer Udhar Ledgers &amp; Instant WhatsApp Reminders
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Maintain accurate customer balances (Dr/Cr) and vendor payables in one secure place. Stop awkward phone calls — send automated, polite balance reminders with direct UPI payment links in one tap.
                  </p>

                  {/* Quick Highlight Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📒 Auto Dr/Cr</div>
                      <div className="text-[9px] text-muted-foreground">Double-Entry Khata</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">💬 WhatsApp</div>
                      <div className="text-[9px] text-muted-foreground">Polite Reminders</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📲 UPI Link</div>
                      <div className="text-[9px] text-muted-foreground">1-Tap Payment</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📑 Ledger PDF</div>
                      <div className="text-[9px] text-muted-foreground">Share Full History</div>
                    </div>
                  </div>

                  {/* Detailed Feature List */}
                  <div className="space-y-2.5 pt-2">
                    {[
                      "Complete customer ledger statement in standard Bahi Khata (Dr/Cr) format",
                      "Automated polite WhatsApp payment reminder with instant UPI QR & collect link",
                      "Track supplier and vendor payables so you never miss purchase credit deadlines",
                      "Set custom credit limits and grace periods per customer to prevent bad debt",
                      "Download customer balance statements as PDF to easily resolve ledger disputes",
                    ].map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
                  <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-11 px-6 shadow-md shadow-primary/20">
                    Track Customer Dues Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendWhatsAppReminder}
                    className="font-bold text-xs sm:text-sm h-11 px-4 border-border text-[#25D366] hover:text-[#20bd5a]"
                  >
                    <Send className="w-4 h-4 mr-2" /> Send Test Reminder
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
                      RupeeBill Party Ledger • Account #KH-4892
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/20">
                    ₹34,800 Total Receivables
                  </span>
                </div>

                {/* Sub-View Switcher */}
                <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">Party: Priya Verma (Green Leaf)</span>
                  </div>
                  <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setKhataView("statement")}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        khataView === "statement"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Customer Ledger
                    </button>
                    <button
                      onClick={() => setKhataView("whatsapp")}
                      className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                        khataView === "whatsapp"
                          ? "bg-[#25D366]/20 text-[#25D366] shadow-sm font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      WhatsApp Reminder
                    </button>
                  </div>
                </div>

                {/* Mockup Canvas */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-zinc-100/50 dark:bg-zinc-950/50">
                  {khataView === "statement" ? (
                    <div className="space-y-3">
                      {/* Customer Profile Card */}
                      <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-foreground text-sm">Priya Verma (Green Leaf Interiors)</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            GSTIN: 27BBMPS4821M1Z5 • Phone: +91 98201 XXXXX
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                            Overdue 12 Days
                          </span>
                          <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                            ₹14,250.00 Dr
                          </div>
                        </div>
                      </div>

                      {/* Transaction Ledger Table */}
                      <div className="border border-border/80 rounded-xl overflow-hidden bg-card text-xs">
                        <div className="bg-muted/70 p-2 font-bold grid grid-cols-12 text-muted-foreground text-[11px] border-b border-border">
                          <span className="col-span-3">Date</span>
                          <span className="col-span-4">Particulars</span>
                          <span className="col-span-2 text-right">Debit</span>
                          <span className="col-span-3 text-right">Balance</span>
                        </div>
                        <div className="divide-y divide-border/60 text-[11px]">
                          <div className="p-2 grid grid-cols-12 items-center">
                            <span className="col-span-3 text-muted-foreground font-mono">20-Sep-2026</span>
                            <span className="col-span-4 font-medium">Opening Balance</span>
                            <span className="col-span-2 text-right font-mono">₹0.00</span>
                            <span className="col-span-3 text-right font-mono">₹0.00</span>
                          </div>
                          <div className="p-2 grid grid-cols-12 items-center bg-rose-500/5">
                            <span className="col-span-3 text-muted-foreground font-mono">22-Sep-2026</span>
                            <span className="col-span-4 font-bold text-foreground">Sale Inv #1032</span>
                            <span className="col-span-2 text-right font-mono text-rose-600 font-bold">+₹18,500</span>
                            <span className="col-span-3 text-right font-mono font-bold text-rose-600">₹18,500 Dr</span>
                          </div>
                          <div className="p-2 grid grid-cols-12 items-center bg-emerald-500/5">
                            <span className="col-span-3 text-muted-foreground font-mono">24-Sep-2026</span>
                            <span className="col-span-4 font-medium text-emerald-600 dark:text-emerald-400">
                              Payment (PhonePe)
                            </span>
                            <span className="col-span-2 text-right font-mono text-emerald-600">-₹4,250</span>
                            <span className="col-span-3 text-right font-mono font-bold text-rose-600">₹14,250 Dr</span>
                          </div>
                        </div>
                      </div>

                      {/* Credit Limit Indicator */}
                      <div className="p-3 rounded-xl bg-background border border-border text-xs flex justify-between items-center">
                        <span className="text-muted-foreground text-[11px]">
                          Approved Credit Limit: ₹25,000 (57% Utilized)
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            toast({
                              title: "📑 Statement Downloaded",
                              description: "Priya Verma ledger PDF downloaded for sharing.",
                            });
                          }}
                          className="h-7 text-xs font-bold text-primary"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> PDF Statement
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* WhatsApp Reminder Simulation */
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                          <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs">
                            SG
                          </div>
                          <div>
                            <div className="font-bold text-emerald-950 dark:text-emerald-100">
                              Shree Ganesh Supermarket (Verified Business)
                            </div>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                              Automated Udhar Recovery Engine
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Message Bubble */}
                        <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-lg border border-emerald-200 dark:border-zinc-800 shadow-sm space-y-2 text-xs">
                          <p className="leading-relaxed">
                            Namaste Priya ji 🙏
                          </p>
                          <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                            A gentle reminder from <strong>Shree Ganesh Supermarket</strong>. Your account has an outstanding balance of <span className="font-bold text-rose-600 dark:text-rose-400">₹14,250.00</span> for Invoice #1032.
                          </p>
                          <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono">
                            <div>🏦 Payee: Shree Ganesh Supermarket</div>
                            <div>💳 UPI ID: store@hdfcbank</div>
                            <div>⚡ Amount Due: ₹14,250.00</div>
                          </div>
                          <p className="text-[10px] text-zinc-400">
                            Click below to settle directly via GPay / PhonePe / Paytm:
                          </p>
                        </div>

                        <Button
                          onClick={handleSendWhatsAppReminder}
                          className="w-full text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-emerald-500/20"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" /> Send Reminder to Customer (+91 98201 XXXXX)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mockup Action Footer */}
                <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Automatic reminders 3 days before due date
                  </span>
                  <Button size="sm" variant="ghost" onClick={handleSendWhatsAppReminder} className="h-7 text-xs font-bold text-[#25D366]">
                    <Send className="w-3.5 h-3.5 mr-1" /> Quick WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DAYBOOK & CASHFLOW */}
          {activeTab === "daybook" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
              {/* Left Column: Feature Highlights */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
                    <Wallet className="w-3.5 h-3.5" /> Evening Cash Tally &amp; Reconciliation • Zero Shortage
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Counter Cash Drawer, UPI &amp; Daily Net Profit
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Know your exact financial health every single evening. Reconcile physical currency notes in the counter drawer against software bills, verify instant UPI bank credits, and track net profits after subtracting shop expenses.
                  </p>

                  {/* Quick Highlight Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">💵 Cash Tally</div>
                      <div className="text-[9px] text-muted-foreground">Drawer Denominations</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">🏦 UPI Split</div>
                      <div className="text-[9px] text-muted-foreground">Direct Bank Settled</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📉 Petty Expense</div>
                      <div className="text-[9px] text-muted-foreground">Tea, Rent, Packing</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
                      <div className="text-[11px] font-bold text-foreground">📊 Net Profit</div>
                      <div className="text-[9px] text-muted-foreground">Real-time Margin %</div>
                    </div>
                  </div>

                  {/* Detailed Feature List */}
                  <div className="space-y-2.5 pt-2">
                    {[
                      "Daily cashier cash-in-drawer tally with currency note denomination counter",
                      "Separate automatic breakdown for UPI, Debit/Credit Card & Cash collections",
                      "Record petty shop expenses (electricity, tea, local transport, staff daily wages)",
                      "Real-time gross and net profit margin calculations on every single transaction",
                      "1-tap daybook closing summary sent directly to business owner's personal WhatsApp",
                    ].map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
                  <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-11 px-6 shadow-md shadow-primary/20">
                    See Daybook Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseDaybook}
                    className="font-bold text-xs sm:text-sm h-11 px-4 border-border text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Close Daybook &amp; WhatsApp
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
                      RupeeBill Daily Daybook • Terminal Counter #01
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                    ✓ Drawer Balanced (₹0.00)
                  </span>
                </div>

                {/* Sub-Header */}
                <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Session: Cashier Rahul Sharma</span>
                  <span className="font-mono text-xs font-bold text-foreground">Today: 26-Sep-2026</span>
                </div>

                {/* Mockup Canvas */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-zinc-100/50 dark:bg-zinc-950/50">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-card border border-border shadow-sm">
                      <div className="text-muted-foreground text-[11px]">Today's Gross Sales</div>
                      <div className="text-xl font-black text-foreground mt-0.5">₹18,450.00</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                        32 Bills Completed
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border shadow-sm">
                      <div className="text-muted-foreground text-[11px]">Net Profit Margin</div>
                      <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹4,312.00</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        23.4% Real Margin
                      </div>
                    </div>
                  </div>

                  {/* Cash Drawer Currency Denomination Tally */}
                  <div className="p-3 rounded-xl bg-card border border-border space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1.5 border-b border-border/60">
                      <span className="font-bold text-foreground text-[11px]">
                        💵 Physical Cash Drawer Tally (Denominations):
                      </span>
                      <span className="font-mono font-bold text-emerald-600">Matched 100%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                      <div className="p-1.5 rounded bg-muted/60 text-center">
                        <span className="text-muted-foreground">₹500 × 10</span>
                        <div className="font-bold text-foreground">₹5,000</div>
                      </div>
                      <div className="p-1.5 rounded bg-muted/60 text-center">
                        <span className="text-muted-foreground">₹200 × 6</span>
                        <div className="font-bold text-foreground">₹1,200</div>
                      </div>
                      <div className="p-1.5 rounded bg-muted/60 text-center">
                        <span className="text-muted-foreground">₹100 × 10</span>
                        <div className="font-bold text-foreground">₹1,000</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-muted-foreground">Total Cash in Drawer:</span>
                      <span className="font-mono font-black text-foreground">₹7,200.00</span>
                    </div>
                  </div>

                  {/* Payment Mode & Expenses Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border/80 flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">📲 UPI / QR Settlements (Bank):</span>
                      <span className="font-mono font-bold text-primary">₹11,250.00 (61%)</span>
                    </div>
                    <div className="p-2 rounded-lg bg-card border border-border/80 flex justify-between items-center">
                      <span className="text-muted-foreground text-[11px]">📉 Petty Expenses (Tea, Packing):</span>
                      <span className="font-mono font-bold text-rose-600">-₹450.00</span>
                    </div>
                  </div>
                </div>

                {/* Mockup Action Footer */}
                <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Drawer Shortage: ₹0.00 (Perfect Match)
                  </span>
                  <Button size="sm" variant="ghost" onClick={handleCloseDaybook} className="h-7 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End Day
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CA & TAX FILING REPORTS */}
          {activeTab === "reports" && (
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
                  <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-11 px-6 shadow-md shadow-primary/20">
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
          )}

        </div>

        {/* Bottom Section Reassurance Bar */}
        <div className="mt-10 sm:mt-12 p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-foreground">
                100% Free Forever for Invoicing, POS &amp; Inventory Management
              </div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">
                No credit card required. Works across Windows PC, Mac, tablets, and Android smartphones.
              </div>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")} className="font-bold text-xs sm:text-sm h-10 px-5 shrink-0">
            Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

      </div>
    </section>
  );
};
