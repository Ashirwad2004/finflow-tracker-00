import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  CheckCircle2,
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const DaybookTabPanel: React.FC = () => {
  const navigate = useNavigate();

  const handleCloseDaybook = () => {
    toast({
      title: "✓ Daybook Closed Successfully",
      description: "Counter drawer tallied. Daily sales summary sent to owner WhatsApp.",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
      {/* Left Column: Feature Highlights */}
      <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
            <Wallet className="w-3.5 h-3.5" /> Evening Cash Tally &amp; Reconciliation • Zero Shortage
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Counter Cash Drawer, UPI &amp; Daily Net Profit
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Know your exact financial health every single evening. Reconcile physical currency notes in the counter drawer against software bills, verify instant UPI bank credits, and track net profits after subtracting shop expenses.
          </p>

          {/* Quick Highlight Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">💵 Cash Tally</div>
              <div className="text-[9px] text-muted-foreground">Drawer Denominations</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">🏦 UPI Split</div>
              <div className="text-[9px] text-muted-foreground">Direct Bank Settled</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📉 Petty Expense</div>
              <div className="text-[9px] text-muted-foreground">Tea, Rent, Packing</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📊 Net Profit</div>
              <div className="text-[9px] text-muted-foreground">Real-time Margin %</div>
            </div>
          </div>

          {/* Detailed Feature List */}
          <div className="space-y-2.5 pt-2">
            {[
              "Daily cashier cash-in-drawer tally with currency note denomination counter",
              "Separate automatic breakdown for UPI, Debit/Credit Card & Cash collections",
              "Record petty shop expenses (electricity, tea, local transport, staff daily wages)",
              "Real-time gross and net profit margin calculations on every single transaction",
              "1-tap daybook closing summary sent directly to business owner's personal WhatsApp",
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
            Open a daybook
          </Button>
          <Button
            variant="outline"
            onClick={handleCloseDaybook}
            className="font-bold text-xs sm:text-sm h-11 px-4 border-border text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Close Daybook &amp; WhatsApp
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
              RupeeBill Daily Daybook • Terminal Counter #01
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
            ✓ Drawer Balanced (₹0.00)
          </span>
        </div>

        {/* Sub-Header */}
        <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Session: Cashier Rahul Sharma</span>
          <span className="font-mono text-xs font-bold text-foreground">Today: 26-Sep-2026</span>
        </div>

        {/* Mockup Canvas */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-zinc-100/50 dark:bg-zinc-950/50">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-muted-foreground text-[11px]">Today&apos;s Gross Sales</div>
              <div className="text-xl font-black text-foreground mt-0.5">₹18,450.00</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                32 Bills Completed
              </div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm">
              <div className="text-muted-foreground text-[11px]">Net Profit Margin</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹4,312.00</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                23.4% Real Margin
              </div>
            </div>
          </div>

          {/* Cash Drawer Currency Denomination Tally */}
          <div className="p-3 rounded-xl bg-card border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-border/60">
              <span className="font-bold text-foreground text-[11px]">
                💵 Physical Cash Drawer Tally (Denominations):
              </span>
              <span className="font-mono font-bold text-emerald-600">Matched 100%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="p-1.5 rounded bg-muted/60 text-center">
                <span className="text-muted-foreground">₹500 × 10</span>
                <div className="font-bold text-foreground">₹5,000</div>
              </div>
              <div className="p-1.5 rounded bg-muted/60 text-center">
                <span className="text-muted-foreground">₹200 × 6</span>
                <div className="font-bold text-foreground">₹1,200</div>
              </div>
              <div className="p-1.5 rounded bg-muted/60 text-center">
                <span className="text-muted-foreground">₹100 × 10</span>
                <div className="font-bold text-foreground">₹1,000</div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px]">
              <span className="text-muted-foreground">Total Cash in Drawer:</span>
              <span className="font-mono font-black text-foreground">₹7,200.00</span>
            </div>
          </div>

          {/* Payment Mode & Expenses Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded-lg bg-card border border-border/80 flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">📲 UPI / QR Settlements (Bank):</span>
              <span className="font-mono font-bold text-primary">₹11,250.00 (61%)</span>
            </div>
            <div className="p-2 rounded-lg bg-card border border-border/80 flex justify-between items-center">
              <span className="text-muted-foreground text-[11px]">📉 Petty Expenses (Tea, Packing):</span>
              <span className="font-mono font-bold text-rose-600">-₹450.00</span>
            </div>
          </div>
        </div>

        {/* Mockup Action Footer */}
        <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px]">
            Drawer Shortage: ₹0.00 (Perfect Match)
          </span>
          <Button size="sm" variant="ghost" onClick={handleCloseDaybook} className="h-7 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End Day
          </Button>
        </div>
      </div>
    </div>
  );
};
