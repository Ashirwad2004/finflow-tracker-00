import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SectionHeading } from "./shared/SectionHeading";
import { EASE_DRAW, Pull, Reveal } from "@/features/landing/motion";

export const ComparisonTable: React.FC = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const comparisonRows = [
    {
      feature: "Billing Speed per Customer",
      paper: "5–10 mins (Manual handwriting & calculator)",
      excel: "2–3 mins (Risk of formula typos)",
      rupeebill: "5 seconds (Barcode gun & instant tax math)",
      highlight: true,
    },
    {
      feature: "GST & HSN Tax Computation",
      paper: "Manual tax math (High penalty risk)",
      excel: "Requires manual formula maintenance",
      rupeebill: "100% Automatic CGST, SGST & IGST split",
      highlight: false,
    },
    {
      feature: "Thermal Printer & Barcode Guns",
      paper: "Not possible",
      excel: "Requires complex drivers & VB macros",
      rupeebill: "Plug & Play for 2\" & 3\" Thermal (USB/Bluetooth)",
      highlight: true,
    },
    {
      feature: "WhatsApp Receipt with UPI QR",
      paper: "Not possible",
      excel: "Manual export, save PDF & attach",
      rupeebill: "1-Click direct WhatsApp share with UPI link",
      highlight: false,
    },
    {
      feature: "Offline Hardware Reliability",
      paper: "Risk of physical damage, water or fire",
      excel: "Risk of file corruption & accidental delete",
      rupeebill: "Host-Disk OPFS (Never stops when internet drops)",
      highlight: true,
    },
    {
      feature: "Customer Udhar Balance Reminders",
      paper: "Awkward phone calls, forgotten balances",
      excel: "Manual ledger typing, no reminders",
      rupeebill: "Automated polite WhatsApp reminders with UPI link",
      highlight: false,
    },
    {
      feature: "GSTR-1 & Daybook for Accountant",
      paper: "Days of manual counting at tax filing",
      excel: "Hours spent cleaning & formatting tables",
      rupeebill: "1-Click CA-ready Excel (.xlsx) spreadsheet",
      highlight: true,
    },
    {
      feature: "Setup Cost & Software Pricing",
      paper: "Recurring notebook & register expense",
      excel: "₹5,000+ MS Office license fee",
      rupeebill: "100% Free Forever (Zero hidden fees)",
      highlight: true,
    },
  ];

  return (
    <section id="comparison" className="py-16 sm:py-24 bg-muted/20 border-b border-border/60">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <SectionHeading
          label="Compared"
          figure="8 jobs"
          title="Paper khata, Excel, or this"
          description="The same eight jobs, done three ways. Honest about where a spreadsheet still holds up and where it quietly costs you money."
          className="mb-14"
        />

        {/* Comparison Table Container */}
        <Reveal
          move="lift"
          className="overflow-hidden border border-[hsl(var(--lp-rule-strong))] bg-card"
        >
          {/* Said out loud rather than leaving a cut-off column to be
              discovered. Inside the card, so the section's spacing above is
              unchanged on the widths where the table fits whole. */}
          <p className="border-b border-[hsl(var(--lp-rule))] bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground md:hidden">
            Swipe the table sideways to read all four columns.
          </p>

          {/* On a phone this is four columns of prose. Without a floor on the
              table's width it squeezed each one to about 80px and the
              `overflow-x-auto` never had anything to scroll, so the whole
              comparison was unreadable on the device most shop owners open the
              page on. The table now keeps a readable width and scrolls. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs sm:text-sm">
              {/* The header is ruled in before the rows are written under it,
                  which is the order the table is actually made in. It was the
                  one still part of a table whose every row moves. */}
              <thead>
                <motion.tr
                  className="border-b border-border"
                  initial={reduced ? undefined : { opacity: 0, y: -10 }}
                  whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.45, ease: EASE_DRAW }}
                >
                  <th className="p-4 sm:p-5 w-1/4 bg-muted/50 font-bold text-foreground">
                    Business Feature
                  </th>
                  <th className="p-4 sm:p-5 w-1/4 text-muted-foreground font-semibold bg-muted/30">
                    Traditional Paper Khata
                  </th>
                  <th className="p-4 sm:p-5 w-1/4 text-muted-foreground font-semibold bg-muted/30">
                    Manual Excel / Spreadsheets
                  </th>
                  <th className="p-4 sm:p-5 w-1/4 bg-primary/10 text-primary font-black border-l-2 border-primary/30">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 fill-primary" />
                      <span>RupeeBill (Free)</span>
                    </div>
                  </th>
                </motion.tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/*
                  The rows arrive top to bottom, one job at a time, which is
                  how the table is read. The stagger is short (45ms) because
                  eight rows at a comfortable individual pace would take long
                  enough to be irritating rather than legible.
                */}
                {comparisonRows.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    className={row.highlight ? "bg-muted/10" : ""}
                    initial={reduced ? undefined : { opacity: 0, x: -18 }}
                    whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{
                      duration: 0.5,
                      ease: EASE_DRAW,
                      delay: idx * 0.045,
                    }}
                  >
                    <td className="p-4 sm:p-5 font-bold text-foreground">
                      {row.feature}
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{row.paper}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{row.excel}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-foreground bg-primary/5 border-l-2 border-primary/30">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[hsl(var(--lp-green))] shrink-0 mt-0.5" />
                        <span className="text-[hsl(var(--lp-green))] font-semibold">{row.rupeebill}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Callout Strip */}
          <div className="p-6 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
              <ShieldCheck className="w-5 h-5 text-[hsl(var(--lp-green))] shrink-0" />
              <span>
                <strong>Zero Lock-In Guarantee:</strong> Export all your items, customers, and invoices to Excel anytime with 1 click.
              </span>
            </div>
            <Pull className="shrink-0">
              <Button
                onClick={() => navigate("/auth")}
                className="lp-btn h-11 shrink-0 rounded-none px-7 text-xs sm:text-sm"
              >
                Switch to RupeeBill
              </Button>
            </Pull>
          </div>
        </Reveal>

      </div>
    </section>
  );
};
