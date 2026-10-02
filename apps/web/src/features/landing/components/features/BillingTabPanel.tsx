import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Printer,
  CheckCircle2,
  ArrowRight,
  Send,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const BillingTabPanel: React.FC = () => {
  const navigate = useNavigate();
  const [billingFormat, setBillingFormat] = useState<"thermal" | "a4">("thermal");
  const [isPrinting, setIsPrinting] = useState(false);

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

  return (
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
              <div className="text-[11px] font-bold text-foreground">🖨️ 2&quot; &amp; 3&quot;</div>
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
          <Button onClick={() => navigate("/auth?mode=signup")} className="font-bold text-xs sm:text-sm h-11 px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md shadow-orange-500/25 border-0">
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
              3&quot; Thermal Slip (80mm)
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
  );
};
