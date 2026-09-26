import React from "react";
import { Database, Printer, FileSpreadsheet, Smartphone, ShieldCheck, Zap } from "lucide-react";

export const TrustBar: React.FC = () => {
  const benefits = [
    {
      icon: Database,
      title: "Works 100% Offline & Online",
      description: "Keep creating invoices and recording sales without stopping even if your internet drops. All data is saved safely on your device and syncs to cloud automatically.",
    },
    {
      icon: Printer,
      title: "Invoices & Receipts in Any Format",
      description: "Generate professional A4/A5 PDF invoices for B2B clients, or print instant 2-inch and 3-inch thermal receipts on any USB or Bluetooth printer.",
    },
    {
      icon: Smartphone,
      title: "Send Invoices via WhatsApp & Email",
      description: "Deliver digital invoices and receipts directly to your customer's WhatsApp or email in one click, complete with instant online payment links.",
    },
    {
      icon: FileSpreadsheet,
      title: "Automated Tax & Financial Reports",
      description: "Accurate tax calculations and clear profit margins. Download monthly sales and tax summaries with one click to share directly with your accountant.",
    },
    {
      icon: Zap,
      title: "Smart Inventory & Barcode Tracking",
      description: "Real-time stock counts that update instantly with every sale, customizable low-stock alerts, and built-in barcode label printing.",
    },
    {
      icon: ShieldCheck,
      title: "Customer & Supplier Balances",
      description: "Maintain transparent customer credit ledgers, track vendor payables, and send automated polite balance reminders in seconds.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-background border-b border-border/50">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
            Everything Your Business Needs to Grow &amp; Stay in Control
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Built for retail stores, wholesalers, service companies, and growing brands who demand fast, dependable, and simple business management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1.5">{benefit.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
