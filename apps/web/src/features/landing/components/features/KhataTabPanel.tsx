import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  ArrowRight,
  Send,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/core/hooks/use-toast";

export const KhataTabPanel: React.FC = () => {
  const navigate = useNavigate();
  const [khataView, setKhataView] = useState<"statement" | "whatsapp">("statement");

  const handleSendWhatsAppReminder = () => {
    toast({
      title: "📲 WhatsApp Reminder Sent!",
      description: "Payment link with UPI QR dispatched to Priya Verma (+91 98201 XXXXX).",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch min-h-[500px]">
      {/* Left Column: Feature Highlights */}
      <div className="lg:col-span-6 flex flex-col justify-between space-y-6 text-left">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20">
            <Users className="w-3.5 h-3.5" /> Customer &amp; Vendor Udhar Khata • 3x Faster Collections
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Customer Udhar Ledgers &amp; Instant WhatsApp Reminders
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Maintain accurate customer balances (Dr/Cr) and vendor payables in one secure place. Stop awkward phone calls — send automated, polite balance reminders with direct UPI payment links in one tap.
          </p>

          {/* Quick Highlight Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📒 Auto Dr/Cr</div>
              <div className="text-[9px] text-muted-foreground">Double-Entry Khata</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">💬 WhatsApp</div>
              <div className="text-[9px] text-muted-foreground">Polite Reminders</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📲 UPI Link</div>
              <div className="text-[9px] text-muted-foreground">1-Tap Payment</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/50 border border-border/70 text-center">
              <div className="text-[11px] font-bold text-foreground">📑 Ledger PDF</div>
              <div className="text-[9px] text-muted-foreground">Share Full History</div>
            </div>
          </div>

          {/* Detailed Feature List */}
          <div className="space-y-2.5 pt-2">
            {[
              "Complete customer ledger statement in standard Bahi Khata (Dr/Cr) format",
              "Automated polite WhatsApp payment reminder with instant UPI QR & collect link",
              "Track supplier and vendor payables so you never miss purchase credit deadlines",
              "Set custom credit limits and grace periods per customer to prevent bad debt",
              "Download customer balance statements as PDF to easily resolve ledger disputes",
            ].map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border/60 flex flex-wrap items-center gap-3">
          <Button onClick={() => navigate("/auth?mode=signup")} className="font-bold text-xs sm:text-sm h-11 px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-md shadow-orange-500/25 border-0">
            Track Customer Dues Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            onClick={handleSendWhatsAppReminder}
            className="font-bold text-xs sm:text-sm h-11 px-4 border-border text-[#25D366] hover:text-[#20bd5a]"
          >
            <Send className="w-4 h-4 mr-2" /> Send Test Reminder
          </Button>
        </div>
      </div>

      {/* Right Column: Realistic Native Software Mockup Window */}
      <div className="lg:col-span-6 flex flex-col rounded-2xl border border-border/80 bg-muted/30 overflow-hidden shadow-lg">
        {/* Mockup Window Titlebar */}
        <div className="px-4 py-3 bg-muted/80 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-xs font-bold text-foreground font-mono ml-2">
              RupeeBill Party Ledger • Account #KH-4892
            </span>
          </div>
          <span className="text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/20">
            ₹34,800 Total Receivables
          </span>
        </div>

        {/* Sub-View Switcher */}
        <div className="p-3 bg-background/50 border-b border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">Party: Priya Verma (Green Leaf)</span>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setKhataView("statement")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                khataView === "statement"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Customer Ledger
            </button>
            <button
              onClick={() => setKhataView("whatsapp")}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                khataView === "whatsapp"
                  ? "bg-[#25D366]/20 text-[#25D366] shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              WhatsApp Reminder
            </button>
          </div>
        </div>

        {/* Mockup Canvas */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-zinc-100/50 dark:bg-zinc-950/50">
          {khataView === "statement" ? (
            <div className="space-y-3">
              {/* Customer Profile Card */}
              <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-foreground text-sm">Priya Verma (Green Leaf Interiors)</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    GSTIN: 27BBMPS4821M1Z5 • Phone: +91 98201 XXXXX
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    Overdue 12 Days
                  </span>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    ₹14,250.00 Dr
                  </div>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="border border-border/80 rounded-xl overflow-hidden bg-card text-xs">
                <div className="bg-muted/70 p-2 font-bold grid grid-cols-12 text-muted-foreground text-[11px] border-b border-border">
                  <span className="col-span-3">Date</span>
                  <span className="col-span-4">Particulars</span>
                  <span className="col-span-2 text-right">Debit</span>
                  <span className="col-span-3 text-right">Balance</span>
                </div>
                <div className="divide-y divide-border/60 text-[11px]">
                  <div className="p-2 grid grid-cols-12 items-center">
                    <span className="col-span-3 text-muted-foreground font-mono">20-Sep-2026</span>
                    <span className="col-span-4 font-medium">Opening Balance</span>
                    <span className="col-span-2 text-right font-mono">₹0.00</span>
                    <span className="col-span-3 text-right font-mono">₹0.00</span>
                  </div>
                  <div className="p-2 grid grid-cols-12 items-center bg-rose-500/5">
                    <span className="col-span-3 text-muted-foreground font-mono">22-Sep-2026</span>
                    <span className="col-span-4 font-bold text-foreground">Sale Inv #1032</span>
                    <span className="col-span-2 text-right font-mono text-rose-600 font-bold">+₹18,500</span>
                    <span className="col-span-3 text-right font-mono font-bold text-rose-600">₹18,500 Dr</span>
                  </div>
                  <div className="p-2 grid grid-cols-12 items-center bg-emerald-500/5">
                    <span className="col-span-3 text-muted-foreground font-mono">24-Sep-2026</span>
                    <span className="col-span-4 font-medium text-emerald-600 dark:text-emerald-400">
                      Payment (PhonePe)
                    </span>
                    <span className="col-span-2 text-right font-mono text-emerald-600">-₹4,250</span>
                    <span className="col-span-3 text-right font-mono font-bold text-rose-600">₹14,250 Dr</span>
                  </div>
                </div>
              </div>

              {/* Credit Limit Indicator */}
              <div className="p-3 rounded-xl bg-background border border-border text-xs flex justify-between items-center">
                <span className="text-muted-foreground text-[11px]">
                  Approved Credit Limit: ₹25,000 (57% Utilized)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    toast({
                      title: "📑 Statement Downloaded",
                      description: "Priya Verma ledger PDF downloaded for sharing.",
                    });
                  }}
                  className="h-7 text-xs font-bold text-primary"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF Statement
                </Button>
              </div>
            </div>
          ) : (
            /* WhatsApp Reminder Simulation */
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs">
                    SG
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 dark:text-emerald-100">
                      Shree Ganesh Supermarket (Verified Business)
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                      Automated Udhar Recovery Engine
                    </div>
                  </div>
                </div>

                {/* WhatsApp Message Bubble */}
                <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3.5 rounded-lg border border-emerald-200 dark:border-zinc-800 shadow-sm space-y-2 text-xs">
                  <p className="leading-relaxed">
                    Namaste Priya ji 🙏
                  </p>
                  <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                    A gentle reminder from <strong>Shree Ganesh Supermarket</strong>. Your account has an outstanding balance of <span className="font-bold text-rose-600 dark:text-rose-400">₹14,250.00</span> for Invoice #1032.
                  </p>
                  <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono">
                    <div>🏦 Payee: Shree Ganesh Supermarket</div>
                    <div>💳 UPI ID: store@hdfcbank</div>
                    <div>⚡ Amount Due: ₹14,250.00</div>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Click below to settle directly via GPay / PhonePe / Paytm:
                  </p>
                </div>

                <Button
                  onClick={handleSendWhatsAppReminder}
                  className="w-full text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Send Reminder to Customer (+91 98201 XXXXX)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Mockup Action Footer */}
        <div className="px-4 py-2.5 bg-muted/60 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px]">
            Automatic reminders 3 days before due date
          </span>
          <Button size="sm" variant="ghost" onClick={handleSendWhatsAppReminder} className="h-7 text-xs font-bold text-[#25D366]">
            <Send className="w-3.5 h-3.5 mr-1" /> Quick WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};
