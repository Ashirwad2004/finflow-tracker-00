import React from "react";
import { Check, X, AlertTriangle, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const ComparisonTable: React.FC = () => {
  const navigate = useNavigate();

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
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            Why Upgrade?
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mt-3 mb-4">
            Why 15,000+ Businesses of All Types Switched to RupeeBill
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Still using paper bahi khata or slow Excel spreadsheets? See how switching to RupeeBill speeds up your operations, saves hours of accounting, and prevents revenue loss.
          </p>

        </div>

        {/* Comparison Table Container */}
        <div className="rounded-3xl border-2 border-border/80 bg-card shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className={row.highlight ? "bg-muted/10" : ""}>
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
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{row.rupeebill}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Callout Strip */}
          <div className="p-6 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                <strong>Zero Lock-In Guarantee:</strong> Export all your items, customers, and invoices to Excel anytime with 1 click.
              </span>
            </div>
            <Button
              onClick={() => navigate("/auth")}
              className="font-bold text-xs sm:text-sm h-11 px-7 bg-primary text-primary-foreground shrink-0 shadow-sm"
            >
              Switch to RupeeBill 100% Free <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
};
