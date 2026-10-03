import React from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";

interface PricingPlanCardsProps {
  user: User | null;
}

export const PricingPlanCards: React.FC<PricingPlanCardsProps> = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-5xl mx-auto mb-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" /> Transparent Pricing &amp; Commercial Licensing
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Choose the Right Plan for Your Business
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
          Use RupeeBill 100% Free forever for everyday store operations, or activate the 6-Month Business Commercial License for official software purchase bills, AI receipt OCR, and priority support.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Free Forever Plan Card */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                100% Free Forever
              </span>
              <span className="text-xs text-muted-foreground font-medium">Starter &amp; Retail</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">RupeeBill Free Edition</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Everything you need to create invoices, ring up sales, track stock, and manage parties.
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2 pb-1 border-b border-border">
              <span className="text-4xl font-black text-foreground">₹0</span>
              <span className="text-xs text-muted-foreground font-semibold">/ Free Forever</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Zero Fees
              </span>
            </div>
            <ul className="space-y-2.5 text-xs text-foreground pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Unlimited Invoices, Quotations &amp; POS Billing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Works 100% Offline with Local OPFS Host-Disk Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Real-time Inventory Tracking &amp; Low Stock Alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Thermal (2&quot;/3&quot;) &amp; A4/A5 Print Studio</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Customer &amp; Supplier Balances Ledgers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Digital Online Storefront with Live Catalog</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Export all data to Excel anytime with zero lock-in</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            {user ? (
              <Button
                onClick={() => navigate("/business-dashboard")}
                variant="outline"
                className="w-full h-11 border-border font-bold text-xs rounded-xl hover:bg-muted"
              >
                Active Free Access (Go to Dashboard)
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                className="w-full h-11 border-border font-bold text-xs rounded-xl hover:bg-muted"
              >
                Start 100% Free <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Commercial Business License Plan Card */}
        <div className="rounded-3xl border-2 border-primary bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase">
            Commercial License
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                6-Month Commercial Plan
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">RupeeBill Business Pro</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Official commercial license with verified software purchase bill, AI OCR scanner, and priority cloud sync.
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 pt-2 pb-1 border-b border-border">
              <span className="text-4xl font-black text-foreground">₹299</span>
              <span className="text-xs text-muted-foreground font-semibold">/ 6 Months Flat</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ~₹49.80/mo (Zero Tax)
              </span>
            </div>
            <ul className="space-y-2.5 text-xs text-foreground pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span><strong>Everything in Free Plan included</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Official Verified Software Purchase Bill (PDF)</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Single-tenant commercial software license certificate</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>AI Receipt OCR Scanner &amp; Auto Expense Categorization</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Priority Multi-Device Cloud Backup &amp; Host-Disk Sync</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Multi-Role Staff &amp; Salesman Permissions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero Tax Surcharge · Zero Transaction Cuts · Instant Activation</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href="#checkout-section"
              className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              Proceed to License Purchase (₹299) <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
