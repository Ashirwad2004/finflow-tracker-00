import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SectionHeading } from "./shared/SectionHeading";
import {
  EASE_DRAW,
  Pull,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/features/landing/motion";
import { 
  Store, 
  Shirt, 
  Cpu, 
  Truck, 
  Briefcase, 
  Coffee,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const BusinessTypes: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState<number>(0);
  const reduced = useReducedMotion();

  const industries = [
    {
      id: "retail",
      icon: Store,
      name: "Retail & Supermarkets",
      tagline: "High-speed counter billing with barcode & thermal slips",
      features: [
        "Rapid barcode scan with any standard USB/Bluetooth handheld scanner",
        "Instant 2-inch and 3-inch thermal receipts with UPI payment QR codes",
        "Loose item pricing by weight (kg/grams) and custom loose pack units",
        "Never drops when internet cuts off — bills save locally on device"
      ],
      sampleBill: "Organic Honey 500g, Basmati Rice 5kg, Pure Cow Ghee 1L",
      metric: "Under 2-Second Checkout"
    },
    {
      id: "wholesale",
      icon: Truck,
      name: "Wholesale & Distributors",
      tagline: "Party credit ledgers, transport challans & bulk pricing tiers",
      features: [
        "Special B2B wholesale rates per customer category",
        "Customer credit limit controls & automated WhatsApp ledger statements",
        "Delivery challans & transportation terms printed with GST tax invoices",
        "Track vendor payables and purchase invoices in one click"
      ],
      sampleBill: "50x Cartons Premium Wheat (Party Rate Applied)",
      metric: "Clear Udhar Tracking"
    },
    {
      id: "garments",
      icon: Shirt,
      name: "Apparel & Boutiques",
      tagline: "Size, color, fabric variants & custom barcode price tags",
      features: [
        "Multi-variant SKU management (e.g. Size M, L, XL / Colors Navy, Olive)",
        "Built-in barcode label printer for custom garment price hangtags",
        "Exchange handling, return credit notes & festive discount coupons",
        "Customer loyalty numbers for festival greeting broadcasts"
      ],
      sampleBill: "Cotton Linen Shirt (Size L, Sky Blue) + Denim Jeans",
      metric: "Automated SKU Tags"
    },
    {
      id: "electronics",
      icon: Cpu,
      name: "Electronics & Hardware",
      tagline: "Serial number, IMEI & warranty tracking with GST breakdown",
      features: [
        "IMEI & serial number recording on every customer bill for warranty proof",
        "Itemized HSN codes (e.g. 8471, 8517) with auto 18% / 28% GST split",
        "Quotation and estimate creation for contract installations",
        "Low-stock alerts for critical components and accessories"
      ],
      sampleBill: "5G Smartphone (IMEI: 864912049...) + 65W GaN Charger",
      metric: "Serial Warranty Proof"
    },
    {
      id: "cafe",
      icon: Coffee,
      name: "Cafes & Food Counters",
      tagline: "Touch point-of-sale, split payments & rapid table slips",
      features: [
        "Visual touch-grid billing for quick beverage and food items",
        "Split payment acceptance (Cash + UPI QR + Card on single bill)",
        "Daily counter daybook balancing cash in drawer vs UPI settlements",
        "Digital receipt sent directly to customer WhatsApp without paper waste"
      ],
      sampleBill: "2x Cappuccino + 1x Grilled Cheese Sandwich",
      metric: "Zero Paper Waste"
    },
    {
      id: "services",
      icon: Briefcase,
      name: "Services & Agencies",
      tagline: "Professional client invoices, milestone billing & digital payments",
      features: [
        "Clean, corporate A4 PDF invoices with business logo and bank details",
        "Track milestone advance payments, balance pending, and TDS deductions",
        "Deliver professional bills via WhatsApp & Email in one click",
        "Download formatted financial summaries for your chartered accountant"
      ],
      sampleBill: "Brand Identity Design & Commercial Web Deployment",
      metric: "Same-Day Settlements"
    },
  ];

  const current = industries[selectedIndustry];

  return (
    <section className="py-20 sm:py-28 bg-background border-b border-border/50 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          label="Trades"
          figure="6 setups"
          title="Pick your trade, see your setup"
          description="A showroom, a supermarket, a distribution network, a workshop and a service agency each bill differently. Choose yours to see how it is configured."
          className="mb-12"
        />


        {/*
          The trade selector. Left-aligned with the rest of the page — these
          were centred, which broke the one column the whole page is built on.

          The ink fill does not fade out of one chip and into another: a single
          filled block slides between them, because that is what actually
          happened when you clicked. `layoutId` is doing the work.
        */}
        <Stagger
          as="div"
          className="mb-10 flex flex-wrap gap-2"
          step={0.045}
        >
          {industries.map((ind, i) => {
            const Icon = ind.icon;
            const isSelected = selectedIndustry === i;
            return (
              <StaggerItem key={ind.id} as="div" className="relative">
                <button
                  onClick={() => setSelectedIndustry(i)}
                  aria-pressed={isSelected}
                  className={`group relative isolate flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    isSelected
                      ? "border-violet-500/30 text-white shadow-sm"
                      : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      aria-hidden="true"
                      layoutId={reduced ? undefined : "lp-trade-chip"}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm -z-10"
                      transition={{ duration: 0.35, ease: EASE_DRAW }}
                    />
                  )}
                  <Icon className={`h-4 w-4 transition-colors ${isSelected ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span>{ind.name}</span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>

        {/*
          The selected trade's setup.

          Keyed on the selection so the whole panel is replaced rather than
          re-rendered in place: the outgoing setup leaves and the incoming one
          arrives, which is what makes the switch legible as a switch. `mode`
          is "wait" so the two never overlap and the panel never doubles in
          height mid-swap.
        */}
        <Reveal move="lift" className="relative border border-[hsl(var(--lp-rule-strong))] bg-card p-6 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
              initial={reduced ? undefined : { opacity: 0, y: 16 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.34, ease: EASE_DRAW }}
            >
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-[hsl(var(--lp-rule-strong))] text-[hsl(var(--lp-ink))] flex items-center justify-center">
                  <current.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">{current.name}</h3>
                  <p className="text-xs text-[hsl(var(--lp-red))] font-semibold">{current.tagline}</p>
                </div>
              </div>

              {/* The four things this trade's setup does, ticking off in
                  order each time the trade changes. */}
              <Stagger as="div" className="space-y-3 pt-2" step={0.06} delay={0.08}>
                {current.features.map((feat, idx) => (
                  <StaggerItem
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-foreground sm:text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--lp-green))]" />
                    <span>{feat}</span>
                  </StaggerItem>
                ))}
              </Stagger>

              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Pull>
                  <Button
                    onClick={() => navigate("/auth")}
                    className="lp-btn h-11 rounded-none px-6 text-xs"
                  >
                    Start billing for {current.name.split(" ")[0]}
                  </Button>
                </Pull>
                <span className="text-[11px] text-muted-foreground text-center sm:text-left">
                  Free, with no card and no invoice limit
                </span>
              </div>
            </div>

            {/* Right Interactive Visual Pill */}
            <div className="lg:col-span-5 bg-muted/40 border border-[hsl(var(--lp-rule))] p-5 space-y-4">
              <div className="flex justify-between items-center text-xs pb-3 border-b border-border/60">
                <span className="font-bold text-foreground">Simulated Trade Order</span>
                <span className="font-mono text-[10px] text-[hsl(var(--lp-green))] font-bold bg-[hsl(var(--lp-green)/0.1)] px-2 py-0.5 rounded">
                  {current.metric}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-muted-foreground text-[11px]">Recent Customer Ticket:</div>
                <div className="p-3  bg-card border border-border/80 font-mono text-xs text-foreground font-semibold">
                  {current.sampleBill}
                </div>
              </div>

              <div className="space-y-1 lp-total bg-[hsl(var(--lp-paper-sunk))] p-3 text-xs">
                <div className="font-bold text-[hsl(var(--lp-red))]">
                  Already set up for this trade
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pre-configured defaults for this industry. You do not need to spend hours configuring tax categories or receipt templates.
                </p>
              </div>
            </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
};

