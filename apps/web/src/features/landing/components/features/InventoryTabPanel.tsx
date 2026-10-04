import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  CheckCircle2,
  Barcode,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const InventoryTabPanel: React.FC = () => {
  const navigate = useNavigate();
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low" | "expiring">("all");

  return (
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
          <Button onClick={() => navigate("/auth?mode=signup")} className="lp-btn rounded-none h-11 px-6 text-xs sm:text-sm">
            Track your stock
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
      <div className="lp-product lg:col-span-6 flex flex-col rounded-2xl border border-border bg-muted/30 overflow-hidden">
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
  );
};
