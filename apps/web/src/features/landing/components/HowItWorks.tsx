import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Scan,
  BarChart3,
  Check,
  FileSpreadsheet,
  Printer,
  Smartphone,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./shared/SectionHeading";

/**
 * The step previews show what the product actually puts on screen at that
 * moment, so the monospace file name and the ruled total line are the real
 * artifact rather than a styling flourish.
 */
const STEPS = [
  {
    number: "01",
    icon: Store,
    stage: "Setup, about two minutes",
    title: "Add your shop and import your item list",
    description:
      "Enter your shop name, GSTIN and UPI details, then upload your inventory from Excel or Tally. Or start adding products as you sell them.",
    features: [
      "Excel and CSV catalogue upload",
      "Custom GST rates with HSN code detection",
      "Works straight away on a counter PC, tablet or phone",
    ],
    preview: (
      <div className="border border-[hsl(var(--lp-rule))] bg-muted/40 p-3 text-left">
        <div className="flex items-center justify-between border-b border-[hsl(var(--lp-rule))] pb-2 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[hsl(var(--lp-green))]" />
            Catalogue import
          </span>
          <span className="font-semibold text-[hsl(var(--lp-green))]">Ready</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
          <span className="truncate font-mono text-foreground">
            kirana_stock_march.xlsx
          </span>
          <span className="lp-figure shrink-0 font-bold text-[hsl(var(--lp-ink))]">
            342 items
          </span>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    icon: Scan,
    stage: "At the counter, about five seconds",
    title: "Scan, bill, and send it out",
    description:
      "Ring up an order with a scanner gun or touch keys. Print a thermal slip, or send the PDF invoice on WhatsApp with a UPI QR on it.",
    features: [
      "2-inch and 3-inch thermal printers, plug and play",
      "WhatsApp receipt with a UPI payment link",
      "Keeps billing when the market internet cuts out",
    ],
    preview: (
      <div className="border border-[hsl(var(--lp-rule))] bg-muted/40 p-3 text-left">
        <div className="flex items-center justify-between border-b border-[hsl(var(--lp-rule))] pb-2 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            Counter 1 output
          </span>
          <span className="lp-figure font-mono text-muted-foreground">
            Bill #1048
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Smartphone className="h-3.5 w-3.5 text-[hsl(var(--lp-green))]" />
            WhatsApp PDF
          </span>
          <span className="shrink-0 font-bold text-[hsl(var(--lp-green))]">
            Sent
          </span>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    icon: BarChart3,
    stage: "End of day, and end of month",
    title: "Check the daybook, export for your CA",
    description:
      "Track the day's counter cash, UPI collections and pending udhar. At filing time, export GSTR-1 and a P&L your accountant can open.",
    features: [
      "Cash drawer balance you can verify against the till",
      "WhatsApp udhar reminders that stay polite",
      "GSTR-1, GSTR-3B and an Excel daybook in one click",
    ],
    preview: (
      <div className="border border-[hsl(var(--lp-rule))] bg-muted/40 p-3 text-left">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            Today&apos;s daybook
          </span>
        </div>
        {/* The red rule under a total, as it is ruled in a ledger. */}
        <div className="lp-total mt-2 flex items-baseline justify-between gap-3 pt-2">
          <span className="text-[11px] text-muted-foreground">Collected</span>
          <span className="lp-figure text-base font-extrabold text-[hsl(var(--lp-ink))]">
            &#8377;18,450.00
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[hsl(var(--lp-rule))] pt-2 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Download className="h-3 w-3 text-muted-foreground" />
            GSTR-1 summary
          </span>
          <span className="shrink-0 font-bold text-[hsl(var(--lp-green))]">
            Ready to export
          </span>
        </div>
      </div>
    ),
  },
];

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      id="how-it-works"
      className="border-b border-[hsl(var(--lp-rule))] bg-muted/20 py-20 sm:py-28"
    >
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Getting started"
          figure="Under 2 minutes"
          title="Open the shutter and start billing"
          description="No IT consultant, no training week, no setup fee. Three steps, each one needing the one before it."
          className="mb-14"
        />

        {/*
          A numbered timeline on one spine. The numbers stay because this
          genuinely is a sequence; three interchangeable cards side by side
          would say the opposite.
        */}
        <ol className="relative">
          <div
            aria-hidden="true"
            className="absolute bottom-16 left-7 top-6 hidden w-px bg-[hsl(var(--lp-rule-strong))] lg:block"
          />

          {STEPS.map((step) => (
            <li
              key={step.number}
              className="relative border-t border-[hsl(var(--lp-rule))] py-8 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <div className="flex shrink-0 items-center gap-4 lg:w-14 lg:flex-col lg:items-start">
                  <span className="lp-figure relative z-10 flex h-14 w-14 shrink-0 items-center justify-center border border-[hsl(var(--lp-rule-strong))] bg-background text-base font-bold text-[hsl(var(--lp-ink))]">
                    {step.number}
                  </span>
                  <step.icon
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground lg:mt-3"
                  />
                </div>

                <div className="grid flex-1 gap-7 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-10">
                  <div>
                    <div className="lp-entry">
                      <span className="lp-entry-label">{step.title}</span>
                      <span className="lp-figure shrink-0 text-xs text-muted-foreground">
                        {step.stage}
                      </span>
                    </div>

                    <p className="lp-prose mt-4 max-w-[54ch] text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>

                    <ul className="mt-5 space-y-2">
                      {step.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--lp-green))]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:pt-1">{step.preview}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 border-t border-[hsl(var(--lp-rule-strong))] pt-8">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="lp-btn h-12 rounded-none px-8 text-sm"
          >
            Start billing
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Free forever, with no card. Runs on web, Windows and Android.
          </p>
        </div>
      </div>
    </section>
  );
};
