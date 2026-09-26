import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Sparkles, ArrowRight, Gift, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingPreviewProps {
  onSelectPlan?: (planId: "starter" | "pro" | "business") => void;
  onBookDemo: () => void;
}

export const PricingPreview: React.FC<PricingPreviewProps> = ({ onBookDemo }) => {
  const navigate = useNavigate();

  const allInOneFeatures = [
    "Unlimited invoices, estimates & POS transactions",
    "Works 100% offline — never stops when internet drops",
    "Share professional PDFs via WhatsApp & Email with payment links",
    "Customer & vendor ledgers with automated reminders",
    "Real-time inventory tracking & low stock alerts",
    "Custom barcode label generator & SKU tags",
    "Multi-format printing (A4, A5, and 2\" / 3\" thermal slips)",
    "1-click tax breakdowns & sales reports for your accountant",
    "Free online storefront & digital product catalog",
    "Multi-device access on PC, Mac, tablet, or smartphone"
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-background border-b border-border/50">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
            <Gift className="w-3.5 h-3.5" /> 100% Free Platform
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Free Everything. Every Single Feature Included.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            No per-invoice charges. Zero transaction fees. No hidden fees. Start, manage, and scale your business with zero upfront cost.
          </p>
        </div>

        {/* Free Plan Showcase Card */}
        <div className="max-w-2xl mx-auto rounded-3xl border-2 border-emerald-500/40 bg-card p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-1">
                FREE EVERYTHING · FOREVER
              </span>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">
                RupeeBill All-in-One
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Full access to professional invoicing, thermal POS counter, real-time inventory, customer ledgers, and online storefront.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-4xl sm:text-5xl font-black text-foreground">
                  ₹0
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground font-semibold">/ Free Forever</span>
              </div>
              <span className="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mt-1">
                No Credit Card Required
              </span>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-8 text-xs sm:text-sm">
            {allInOneFeatures.map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{feat}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="flex-1 font-bold shadow-md shadow-primary/20 text-sm h-12 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Start 100% Free Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/pricing")}
              className="flex-1 font-semibold text-sm h-12 border-border hover:bg-muted"
            >
              View License Amounts &amp; Terms <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="text-center mt-4 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 100% Free to Use · Instant Setup · Export All Business Data to Excel Anytime
          </div>
        </div>

        {/* Commercial Licensing Callout Box */}
        <div className="mt-8 max-w-2xl mx-auto rounded-2xl bg-muted/40 border border-border/70 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
              <span>Looking for Official Commercial License &amp; Dedicated Bills?</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              We offer a 6-month commercial license (₹299) with official verified software bills, AI receipt OCR, and priority support.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/pricing")}
            className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0"
          >
            See Pricing &amp; Terms <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Demo & Support Callout */}
        <div className="text-center mt-6 space-y-2 text-xs text-muted-foreground">
          <div>
            Need custom multi-store rollouts or employee cashier permissions?{" "}
            <button
              onClick={onBookDemo}
              className="text-foreground font-semibold underline underline-offset-4 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              Speak with our business rollout team (Free Consultation)
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px]">
            <span>Support &amp; Queries:</span>
            <a href="tel:8102545007" className="font-bold text-foreground hover:underline">📞 +91 8102545007</a>
            <span>•</span>
            <a href="https://wa.me/918102545007" target="_blank" rel="noopener noreferrer" className="font-bold text-[#25D366] hover:underline">💬 WhatsApp</a>
            <span>•</span>
            <a href="mailto:supportrupeebill@gmail.com" className="font-bold text-primary hover:underline">✉️ supportrupeebill@gmail.com</a>
          </div>
        </div>

      </div>
    </section>
  );
};
