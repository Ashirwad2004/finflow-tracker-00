import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Send, CheckCircle2, AlertCircle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PaymentsFeature: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="parties" className="py-20 sm:py-28 bg-background border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" /> Customer &amp; Supplier Accounts
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.2]">
              Track receivables, payables, and collect payments on time
            </h2>

            <p className="text-base text-muted-foreground leading-relaxed">
              Eliminate lost ledgers, scattered spreadsheets, and awkward follow-ups. Keep a transparent record of all customer credit, supplier purchases, and payment histories in one place.
            </p>

            <ul className="space-y-3.5 pt-2 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>1-Click Payment Reminders:</strong> Send polite, automated payment reminders via WhatsApp or email with exact balances and instant digital payment links.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Clear Aging Analysis &amp; Due Dates:</strong> Easily see outstanding balances older than 30 or 60 days to prioritize follow-ups and keep cashflow steady.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Vendor &amp; Supplier Ledger:</strong> Keep track of wholesale purchases bought on credit and verify payments made, ensuring you never overpay suppliers.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Custom Credit Limits:</strong> Set credit limits for clients and retail customers so your staff knows when to request settlement before issuing new orders.
                </span>
              </li>
            </ul>

            <div className="pt-4">
              <Button
                onClick={() => navigate("/auth")}
                className="font-semibold shadow-sm"
              >
                Manage Customer Balances Free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Column: Ledger UI Mockup */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4">
              {/* Header Balance Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-emerald-500/5">
                  <div className="text-[11px] text-muted-foreground font-medium">To Receive (Customer Accounts)</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹42,850</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Across 18 active clients</div>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-amber-500/5">
                  <div className="text-[11px] text-muted-foreground font-medium">To Pay (Vendor Payables)</div>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">₹18,200</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Across 4 suppliers</div>
                </div>
              </div>

              {/* Customer Accounts Breakdown */}
              <div className="space-y-2 text-xs">
                {[
                  { name: "Rahul S. (Apex Enterprises)", due: "₹8,400", days: "24 days", overdue: false },
                  { name: "Priya V. (Green Leaf Studio)", due: "₹14,250", days: "48 days overdue", overdue: true },
                  { name: "Anand M. (Global Logistics)", due: "₹5,600", days: "7 days", overdue: false },
                ].map((party, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{party.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span className={party.overdue ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                          {party.days}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-foreground">{party.due}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Send className="h-3 w-3" /> Reminder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* WhatsApp Message Preview Banner */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground flex items-start gap-2.5">
                <Send className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Automated Balance Reminder:</span>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    &ldquo;Dear Priya, your outstanding balance with Evergreen Solutions is ₹14,250. Click here to view your statement and pay securely.&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
