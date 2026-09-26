import React, { useState } from "react";
import { 
  Store, 
  Shirt, 
  Cpu, 
  Truck, 
  Briefcase, 
  Coffee,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const BusinessTypes: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIndustry, setSelectedIndustry] = useState<number>(0);

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
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Tailored for All Business Types
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            Built for Every Type of Business
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Whether you run a retail showroom, supermarket, wholesale distribution network, manufacturing unit, or service agency, RupeeBill scales with your operations.
          </p>
        </div>


        {/* Interactive Industry Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {industries.map((ind, i) => {
            const Icon = ind.icon;
            const isSelected = selectedIndustry === i;
            return (
              <button
                key={ind.id}
                onClick={() => setSelectedIndustry(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{ind.name}</span>
              </button>
            );
          })}
        </div>

        {/* Focused Active Industry Showcase Card */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <current.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground">{current.name}</h3>
                  <p className="text-xs text-primary font-semibold">{current.tagline}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {current.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={() => navigate("/auth")}
                  className="font-bold text-xs h-11 px-6 shadow-sm"
                >
                  Start Billing Free for {current.name.split(" ")[0]} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground text-center sm:text-left">
                  ⚡ 100% Free · No Credit Card Required · Ready in 60s
                </span>
              </div>
            </div>

            {/* Right Interactive Visual Pill */}
            <div className="lg:col-span-5 bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center text-xs pb-3 border-b border-border/60">
                <span className="font-bold text-foreground">Simulated Trade Order</span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                  {current.metric}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-muted-foreground text-[11px]">Recent Customer Ticket:</div>
                <div className="p-3 rounded-xl bg-card border border-border/80 font-mono text-xs text-foreground font-semibold">
                  {current.sampleBill}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs space-y-1">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> RupeeBill Advantage
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pre-configured defaults for this industry. You do not need to spend hours configuring tax categories or receipt templates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

