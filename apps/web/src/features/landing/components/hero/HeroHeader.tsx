import React from "react";
import { Button } from "@/components/ui/button";

interface HeroHeaderProps {
  onStartFree: () => void;
  onBookDemo: () => void;
  onSeeFeatures: () => void;
}

/**
 * The hero's right-hand column is a khata page: four entries, label left and
 * figure right, with the price ruled as the total. It is the most characteristic
 * object in this product's world, so it opens the page instead of a badge.
 *
 * `rule` marks the row that gets the red total rule above it — in a ledger the
 * total is the line that matters, and here the total is zero.
 */
const LEDGER_ENTRIES: {
  label: string;
  value: string;
  rule?: boolean;
  green?: boolean;
}[] = [
  { label: "Shops billing daily", value: "15,000+" },
  { label: "Average time to a bill", value: "5 sec" },
  { label: "Billing with the internet down", value: "Works", green: true },
  { label: "Cost, forever", value: "₹0", rule: true },
];

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  onStartFree,
  onBookDemo,
  onSeeFeatures,
}) => {
  return (
    <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
      {/* ------------------------------------------------- headline column */}
      <div>
        <div className="lp-entry lp-type-set" style={{ ["--lp-delay" as string]: "60ms" }}>
          <span className="lp-entry-label">
            Billing software for Indian counters
          </span>
          <span className="lp-figure shrink-0 text-sm font-semibold text-muted-foreground">
            Free, all of it
          </span>
        </div>

        <h1
          className="lp-display lp-type-set mt-7 text-[2.3rem] text-[hsl(var(--lp-ink))] sm:text-[3.4rem] lg:text-[4.1rem]"
          style={{ ["--lp-delay" as string]: "180ms" }}
        >
          GST bills in five seconds, on the counter PC you already have.
        </h1>

        <p
          className="lp-prose lp-type-set mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
          style={{ ["--lp-delay" as string]: "320ms" }}
        >
          Scan, bill, and print to any 2&quot; or 3&quot; thermal printer. Send
          the same bill on WhatsApp with a UPI QR on it. Keep selling when the
          market internet drops, and hand your CA a GSTR-1 export at the end of
          the month.
        </p>

        <div
          className="lp-type-set mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          style={{ ["--lp-delay" as string]: "420ms" }}
        >
          <Button
            size="lg"
            onClick={onStartFree}
            className="lp-btn h-[3.25rem] w-full rounded-none px-8 text-base sm:w-auto"
          >
            Start billing
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={onBookDemo}
            className="lp-btn-accent h-[3.25rem] w-full rounded-none px-7 text-base sm:w-auto"
          >
            Book a live demo
          </Button>
        </div>

        <div
          className="lp-type-set mt-6 flex flex-wrap items-center gap-x-4 gap-y-3"
          style={{ ["--lp-delay" as string]: "500ms" }}
        >
          <span className="lp-stamp">Free forever</span>
          <p className="text-sm text-muted-foreground">
            No card, no trial clock.{" "}
            <button
              onClick={onSeeFeatures}
              className="lp-link text-[hsl(var(--lp-ink))]"
            >
              See everything it does
            </button>
          </p>
        </div>
      </div>

      {/* --------------------------------------------------- figures column */}
      <div className="lp-figures-col">
        <dl
          className="lp-type-set"
          style={{ ["--lp-delay" as string]: "600ms" }}
        >
          {LEDGER_ENTRIES.map((entry) => (
            <div
              key={entry.label}
              className={`flex items-baseline justify-between gap-4 py-3.5 ${
                entry.rule
                  ? "lp-total mt-1 pt-4"
                  : "border-b border-[hsl(var(--lp-rule))]"
              }`}
            >
              <dt className="text-sm text-muted-foreground">{entry.label}</dt>
              <dd
                className={`lp-figure shrink-0 ${
                  entry.rule
                    ? "text-[2.25rem] font-extrabold leading-none text-[hsl(var(--lp-ink))]"
                    : "text-xl font-bold"
                } ${
                  entry.green
                    ? "text-[hsl(var(--lp-green))]"
                    : entry.rule
                      ? ""
                      : "text-[hsl(var(--lp-ink))]"
                }`}
              >
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Invoicing, POS, inventory and party khata are free with no invoice
          limit. Nothing here expires.
        </p>
      </div>
    </div>
  );
};
