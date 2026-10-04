import React from "react";

/**
 * The trades RupeeBill is actually used in. Deliberately not fake customer
 * logos — real trade categories are honest and do the same job of telling a
 * visitor "this is for a shop like mine".
 *
 * Previously a marquee. A list that slides past on its own is motion nobody
 * asked for, and it made the trades harder to scan for your own; ruled columns
 * let someone find theirs at a glance and cost no animation.
 */
const TRADES = [
  "Kirana & supermarket",
  "Garments & footwear",
  "Electronics & mobile",
  "Auto spares",
  "Pharmacy & medical",
  "Hardware & paints",
  "Wholesale distribution",
  "Cafés & QSR",
  "Stationery & books",
  "Services & repair",
];

export const TrustBand: React.FC = () => {
  return (
    <section
      aria-label="Trades using RupeeBill"
      className="border-y border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-paper-sunk))]"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-y-0 py-8 lg:grid-cols-[13rem_1fr] lg:gap-x-10">
          <p className="lp-label pb-4 text-muted-foreground lg:pb-0 lg:pt-0.5">
            Counters running on RupeeBill
          </p>

          {/*
            Ruled columns, as a trade register. The vertical rules are the
            structure; nothing here needs a border or a pill around it.
          */}
          <ul className="lp-register">
            {TRADES.map((trade) => (
              <li
                key={trade}
                className="py-2 pr-4 text-sm font-semibold text-[hsl(var(--lp-ink))] sm:py-2.5"
              >
                {trade}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
