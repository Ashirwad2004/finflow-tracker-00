import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Package,
  Users,
  Wallet,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FeatureTabId,
  TabItem,
  FeatureTabBar,
  BillingTabPanel,
  InventoryTabPanel,
  KhataTabPanel,
  DaybookTabPanel,
  ReportsTabPanel,
} from "./features";

export const VyaparFeatures: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FeatureTabId>("billing");

  // Synchronize with URL hash or navbar clicks
  useEffect(() => {
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

  const tabList: TabItem[] = [
    {
      id: "billing",
      icon: FileText,
      title: "GST Invoicing & Billing",
      badge: "Fastest POS",
      desc: "5-second counter billing, thermal receipt printing, auto-tax split & WhatsApp dispatch.",
    },
    {
      id: "inventory",
      icon: Package,
      title: "Inventory & Stock",
      badge: "Real-Time",
      desc: "Live godown stock, low inventory alerts, barcode label printing & expiry tracking.",
    },
    {
      id: "khata",
      icon: Users,
      title: "Party Khata & Ledgers",
      badge: "Automated",
      desc: "Customer udhar balances, vendor payables & polite WhatsApp reminders with UPI.",
    },
    {
      id: "daybook",
      icon: Wallet,
      title: "Cash, Bank & Daybook",
      badge: "Reconciled",
      desc: "Counter drawer cash verification, UPI settlement tracking & daily profit margin.",
    },
    {
      id: "reports",
      icon: FileSpreadsheet,
      title: "CA & Tax Reports",
      badge: "1-Click CA",
      desc: "GSTR-1, GSTR-3B summaries, Profit & Loss statement & Tally/Excel export.",
    },
  ];

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

        {/* Horizontal Segmented Tab Navigation */}
        <FeatureTabBar
          tabs={tabList}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Feature Display Workspace Container */}
        <div className="rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden p-6 sm:p-8 lg:p-10 relative">
          {/* Top Subtle Primary Gradient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {activeTab === "billing" && <BillingTabPanel />}
          {activeTab === "inventory" && <InventoryTabPanel />}
          {activeTab === "khata" && <KhataTabPanel />}
          {activeTab === "daybook" && <DaybookTabPanel />}
          {activeTab === "reports" && <ReportsTabPanel />}
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
          <Button onClick={() => navigate("/auth?mode=signup")} className="font-bold text-xs sm:text-sm h-10 px-5 shrink-0 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md shadow-orange-500/25 border-0">
            Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
