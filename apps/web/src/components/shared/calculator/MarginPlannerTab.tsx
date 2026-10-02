import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/core/lib/utils";
import { formatINR } from "./calculatorUtils";

export const MarginPlannerTab: React.FC = () => {
  const [costPriceStr, setCostPriceStr] = useState<string>("5000");
  const [marginType, setMarginType] = useState<"margin" | "markup">("margin");
  const [profitPctStr, setProfitPctStr] = useState<string>("20");
  const [marginGstRate, setMarginGstRate] = useState<number>(18);

  const marginResults = useMemo(() => {
    const cost = Math.max(0, parseFloat(costPriceStr) || 0);
    const pct = Math.max(0, parseFloat(profitPctStr) || 0);

    let sellingPricePreTax = 0;
    let profitAmount = 0;

    if (marginType === "margin") {
      if (pct >= 100) {
        sellingPricePreTax = cost * 2;
        profitAmount = cost;
      } else {
        sellingPricePreTax = cost / (1 - pct / 100);
        profitAmount = sellingPricePreTax - cost;
      }
    } else {
      profitAmount = cost * (pct / 100);
      sellingPricePreTax = cost + profitAmount;
    }

    const gstAmount = sellingPricePreTax * (marginGstRate / 100);
    const finalMrp = sellingPricePreTax + gstAmount;

    const actualMarginPct = sellingPricePreTax > 0 ? (profitAmount / sellingPricePreTax) * 100 : 0;
    const actualMarkupPct = cost > 0 ? (profitAmount / cost) * 100 : 0;

    return {
      cost,
      profitAmount,
      sellingPricePreTax,
      gstAmount,
      finalMrp,
      actualMarginPct,
      actualMarkupPct,
    };
  }, [costPriceStr, profitPctStr, marginType, marginGstRate]);

  return (
    <div className="space-y-4 mt-3">
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cost Price of Goods / Purchase (COGS)
          </Label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            INR (₹)
          </span>
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-xl font-bold text-muted-foreground">₹</span>
          <Input
            type="number"
            min="0"
            value={costPriceStr}
            onChange={(e) => setCostPriceStr(e.target.value)}
            placeholder="Cost Price"
            className="pl-8 text-2xl font-bold h-13 rounded-xl"
          />
        </div>
      </div>

      {/* Margin vs Markup Selector */}
      <div className="p-3 bg-muted/20 border border-border/50 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMarginType("margin")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-bold transition-all",
                marginType === "margin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Profit Margin %
            </button>
            <button
              type="button"
              onClick={() => setMarginType("markup")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-bold transition-all",
                marginType === "markup" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Cost Markup %
            </button>
          </div>
          <div className="flex items-center gap-1.5 w-24">
            <Input
              type="number"
              min="0"
              max="100"
              value={profitPctStr}
              onChange={(e) => setProfitPctStr(e.target.value)}
              className="h-8 text-sm font-bold text-right"
            />
            <span className="text-xs font-bold text-muted-foreground">%</span>
          </div>
        </div>

        {/* GST Slab for Selling Price */}
        <div className="pt-2 border-t border-border/40">
          <Label className="text-[11px] font-bold text-muted-foreground mb-1.5 block">
            Output GST Rate on Sale
          </Label>
          <div className="grid grid-cols-5 gap-1">
            {[0, 5, 12, 18, 28].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setMarginGstRate(rate)}
                className={cn(
                  "py-1.5 text-xs font-bold rounded-lg border text-center transition-all",
                  marginGstRate === rate
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border/60 hover:bg-muted"
                )}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Computation Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Pricing Strategy Breakdown
          </span>
          <span className="text-xs text-emerald-400 font-mono font-bold">
            Margin: {marginResults.actualMarginPct.toFixed(1)}% | Markup: {marginResults.actualMarkupPct.toFixed(1)}%
          </span>
        </div>

        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400">Cost Price (COGS):</span>
            <span className="font-mono text-slate-200">{formatINR(marginResults.cost)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-emerald-400 font-semibold">
            <span>Profit Target ({marginType === "margin" ? "Margin" : "Markup"}):</span>
            <span className="font-mono">+{formatINR(marginResults.profitAmount)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-slate-300 border-t border-slate-800/80 pt-1.5">
            <span>Selling Price (Pre-Tax):</span>
            <span className="font-mono font-bold">{formatINR(marginResults.sellingPricePreTax)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-blue-400">
            <span>GST ({marginGstRate}%):</span>
            <span className="font-mono">+{formatINR(marginResults.gstAmount)}</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between mt-2">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Recommended MRP</p>
            <p className="text-[10px] text-slate-400">Customer Invoice Inclusive of GST</p>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatINR(marginResults.finalMrp)}
          </span>
        </div>
      </div>
    </div>
  );
};
