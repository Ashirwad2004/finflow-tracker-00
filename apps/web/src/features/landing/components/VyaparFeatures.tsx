import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Package,
  Users,
  Wallet,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./shared/SectionHeading";
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
    <section id="features" className="relative border-b border-[hsl(var(--lp-rule))] bg-background py-16 sm:py-24">
      {/* Scroll Anchors for Navbar Links */}
      <div id="preview" className="absolute -top-20" />
      <div id="billing" className="absolute -top-20" />
      <div id="inventory" className="absolute -top-20" />
      <div id="parties" className="absolute -top-20" />
      <div id="reports" className="absolute -top-20" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Left-aligned, to break the centred rhythm of the hero above. */}
        <SectionHeading
          label="The whole toolkit"
          figure="5 modules"
          title="Five jobs your shop does every day, in one place"
          description="Retailers, wholesalers, distributors, manufacturers and service firms run all of it here, replacing the paper register, the Excel sheet nobody else can open, and software that charges per invoice."
          className="mb-10 sm:mb-12"
        />

        {/* Horizontal Segmented Tab Navigation */}
        <FeatureTabBar
          tabs={tabList}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Feature Display Workspace Container */}
        <div className="relative overflow-hidden border border-[hsl(var(--lp-rule-strong))] bg-card p-6 sm:p-8 lg:p-10">
          {/* Hairline accent along the top edge of the workspace. */}

          {activeTab === "billing" && <BillingTabPanel />}
          {activeTab === "inventory" && <InventoryTabPanel />}
          {activeTab === "khata" && <KhataTabPanel />}
          {activeTab === "daybook" && <DaybookTabPanel />}
          {activeTab === "reports" && <ReportsTabPanel />}
        </div>

        {/* Bottom Section Reassurance Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--lp-rule))] pt-7 text-center sm:mt-12 sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center  bg-[hsl(var(--lp-green)/0.1)] text-[hsl(var(--lp-green))]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                Invoicing, POS and inventory are free forever
              </div>
              <div className="text-xs text-muted-foreground">
                No credit card. Runs on a Windows counter PC, Mac, tablet or
                Android phone.
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate("/auth?mode=signup")}
            className="lp-btn rounded-none h-11 shrink-0 px-6 text-sm"
          >
            Create free account
          </Button>
        </div>
      </div>
    </section>
  );
};
