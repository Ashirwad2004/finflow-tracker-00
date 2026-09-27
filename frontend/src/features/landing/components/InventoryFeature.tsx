import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Barcode, AlertTriangle, FileSpreadsheet, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const InventoryFeature: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="inventory" className="py-20 sm:py-28 bg-muted/20 border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Visual UI Mockup */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Live Stock Counter &amp; Barcode Stickers</span>
                </div>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded">
                  Stock Auto-Deducts on Sale
                </span>
              </div>

              {/* Inventory Table Preview */}
              <div className="space-y-2 text-xs">
                {[
                  { name: "Organic Honey 500g", sku: "HON-500", stock: 34, unit: "Jars", status: "In Stock", alert: false },
                  { name: "Pure Cow Ghee 1L", sku: "GHE-001", stock: 4, unit: "Tins", status: "Low Stock Alert", alert: true },
                  { name: "Almonds California 250g", sku: "ALM-250", stock: 14, unit: "Packs", status: "In Stock", alert: false },
                  { name: "Whole Wheat Atta 10kg", sku: "ATT-010", stock: 2, unit: "Bags", status: "Order from Supplier", alert: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      item.alert
                        ? "border-amber-500/30 bg-amber-500/5 text-foreground"
                        : "border-border bg-muted/30 text-foreground"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Code: {item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {item.stock} {item.unit}
                      </div>
                      <div
                        className={`text-[10px] font-medium ${
                          item.alert ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barcode Studio Box */}
              <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Barcode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Print Price &amp; Barcode Stickers</div>
                    <div className="text-[10px] text-muted-foreground">Print on sticky sticker paper rolls for your products</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-primary underline cursor-pointer">
                  Print Stickers
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative & Bullets */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Package className="w-3.5 h-3.5" /> Inventory &amp; Stock Control
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.2]">
              Always know exactly what stock you have on hand
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed">
              Whether managing a physical retail storefront, a wholesale distribution warehouse, or an online store, your stock levels stay synchronized in real time.
            </p>

            <ul className="space-y-3.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Print Custom Barcode &amp; SKU Labels:</strong> Generate and print barcode price stickers, SKU tags, and product labels in standard formats with zero hassle.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Real-Time Multi-Channel Sync:</strong> Every time you issue an invoice, scan an item at checkout, or receive an online order, stock counts deduct automatically.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Import Your Price List from Excel:</strong> Upload thousands of items, purchase costs, selling prices, and categories from any spreadsheet in 30 seconds.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Automated Low Stock Warnings:</strong> Receive instant visual alerts before fast-moving inventory finishes so you can reorder from suppliers without delay.
                </span>
              </li>
            </ul>

            <div className="pt-4">
              <Button
                onClick={() => navigate("/auth")}
                className="font-semibold shadow-sm"
              >
                Manage Stock Free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
