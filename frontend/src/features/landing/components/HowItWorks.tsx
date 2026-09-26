import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Store, 
  Scan, 
  BarChart3, 
  CheckCircle2, 
  FileSpreadsheet, 
  Printer, 
  Smartphone, 
  Download,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: "01",
      icon: Store,
      badgeText: "2-Minute Setup",
      title: "Add Store & Bulk Import Items",
      description:
        "Enter your shop name, add GSTIN & UPI details, and upload your inventory from Excel or Tally in seconds. Or start adding products on the fly.",
      features: [
        "Instant Excel / CSV catalog upload",
        "Custom GST rates & HSN code auto-detection",
        "Works immediately on counter PC, tablet or phone",
      ],
      preview: (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left space-y-2 mt-4 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1.5 border-b border-border/50">
            <span className="flex items-center gap-1.5 font-sans font-bold text-foreground">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Catalog Import
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">Ready</span>
          </div>
          <div className="bg-background rounded-lg p-2 border border-border/60 text-[11px] flex justify-between items-center font-sans">
            <span className="truncate max-w-[140px] text-foreground font-medium">kirana_stock_march.xlsx</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
              342 Items Added
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      icon: Scan,
      badgeText: "3-Second Counter Billing",
      title: "Scan Barcodes & Dispatch Bills",
      description:
        "Ring up customer orders in seconds with barcode scanner guns or touch keys. Print thermal slips or send PDF invoices via WhatsApp instantly.",
      features: [
        "2-inch & 3-inch thermal printer plug & play",
        "Direct WhatsApp receipt with UPI payment link",
        "Never stops during market internet cutoffs",
      ],
      preview: (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left space-y-2 mt-4 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1.5 border-b border-border/50 font-sans">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Printer className="w-3.5 h-3.5 text-amber-500" /> Counter #1 Output
            </span>
            <span className="text-[10px] text-muted-foreground">Bill #1048</span>
          </div>
          <div className="bg-background rounded-lg p-2 border border-border/60 text-[11px] flex justify-between items-center font-sans">
            <span className="text-foreground font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp PDF
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Dispatched ⚡
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      icon: BarChart3,
      badgeText: "Daily Reconciliation",
      title: "Review Daybook & Export for CA",
      description:
        "Track daily counter cash, UPI collections, and pending customer udhar. At tax season, export 1-click GSTR-1 & P&L spreadsheets for your accountant.",
      features: [
        "Live cash drawer balance verification",
        "Automated polite WhatsApp udhar reminders",
        "1-click GSTR-1, GSTR-3B & Excel daybook export",
      ],
      preview: (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left space-y-2 mt-4 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1.5 border-b border-border/50 font-sans">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> Today's Daybook
            </span>
            <span className="text-primary font-bold">₹18,450.00</span>
          </div>
          <div className="bg-background rounded-lg p-2 border border-border/60 text-[11px] flex justify-between items-center font-sans">
            <span className="text-foreground font-medium flex items-center gap-1">
              <Download className="w-3 h-3 text-muted-foreground" /> GSTR-1 Summary
            </span>
            <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
              CA Export Ready
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Simple Merchant Onboarding
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Up and Running in 3 Practical Steps
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Zero technical setup, IT consultants, or complicated training required. Start billing customers and tracking inventory in under 2 minutes.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative p-6 sm:p-7 rounded-3xl border border-border bg-card shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-3xl font-black text-muted-foreground/25">
                    {step.number}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {step.badgeText}
                  </span>
                </div>

                <h3 className="text-lg font-black text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Tactile Mini Preview */}
                {step.preview}
              </div>

              {/* Bullet Points */}
              <div className="pt-5 mt-5 border-t border-border/60 space-y-2">
                {step.features.map((feat, fIdx) => (
                  <div key={fIdx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick CTA */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="font-bold shadow-md shadow-primary/20 px-8 text-sm h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Billing Free in 2 Minutes <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-2.5">
            100% Free · No credit card required · Instant web &amp; mobile access
          </p>
        </div>
      </div>
    </section>
  );
};

