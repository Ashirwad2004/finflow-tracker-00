import React from "react";
import { useReducedMotion } from "framer-motion";
import { Reveal, RuleDraw } from "@/features/landing/motion";

/**
 * The trades RupeeBill is actually used in. Deliberately not fake customer
 * logos — real trade categories are honest and do the same job of telling a
 * visitor "this is for a shop like mine".
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
  "Sweets & bakery",
  "Mobile recharge & DTH",
  "Grocery wholesale",
  "Gift & toys",
];

/** The list runs in two rows at different speeds, split down the middle. */
const ROW_ONE = TRADES.slice(0, 7);
const ROW_TWO = TRADES.slice(7);

/*
 * How many copies of the list the track carries.
 *
 * The animation travels exactly -50%, so the track has to be an even number of
 * identical copies for the seam to be invisible: after the shift, copy
 * `COPIES/2 + 1` is sitting exactly where copy 1 started.
 *
 * Two copies is the usual recipe and it was the bug. Seven trades come to
 * roughly 1500px, so with two copies the track is ~3000px and the animation
 * ends with its right edge only ~1500px from the left of the viewport — on any
 * display wider than that, the last third of the loop was a blank band where
 * the register simply ran out. Six copies means the viewport can be up to three
 * list-widths (~4500px) before that can happen, which covers every real screen
 * including 4K at 100%.
 */
const COPIES = 6;

interface TradeRowProps {
  items: string[];
  seconds: number;
  reverse?: boolean;
  /** When motion is turned down, one copy and no animation. */
  reduced?: boolean;
}

const TradeRow: React.FC<TradeRowProps> = ({
  items,
  seconds,
  reverse,
  reduced,
}) => (
  <div className="lp-marquee-hold lp-marquee-mask overflow-hidden">
    <div
      className={`lp-marquee ${reverse ? "lp-marquee-reverse" : ""}`}
      style={{ ["--lp-marquee-duration" as string]: `${seconds}s` }}
    >
      {/*
        Every copy after the first is hidden from the accessibility tree, so the
        trades are announced once; with motion turned down only the real one is
        rendered at all, or the list would simply appear six times over.
      */}
      {Array.from({ length: reduced ? 1 : COPIES }, (_, copy) => (
        <ul
          key={copy}
          aria-hidden={copy > 0 ? "true" : undefined}
          className="flex shrink-0 items-center"
        >
          {items.map((trade) => (
            <li
              key={trade}
              className="flex items-center gap-6 whitespace-nowrap px-6 text-sm font-semibold text-[hsl(var(--lp-ink))]"
            >
              {trade}
              {/* A ruled tick between entries, the way a register separates
                  columns. Not a middle dot. */}
              <span
                aria-hidden="true"
                className="h-3.5 w-px bg-[hsl(var(--lp-rule-strong))]"
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);

/**
 * The trade register, running.
 *
 * This was a static ruled grid, and it is a marquee again on purpose: a line
 * that moves gets read, and a shop owner scanning for their own trade needs the
 * list to catch their eye before they scroll past a band of small grey text.
 * Two rows at different speeds and opposite directions keeps it from reading as
 * one sliding banner.
 *
 * What makes it usable rather than annoying: it stops dead on hover and on
 * keyboard focus, the edges are masked so nothing is half-cut at the boundary,
 * and under `prefers-reduced-motion` the rows stop and wrap into a plain
 * readable list instead of freezing mid-scroll.
 */
export const TrustBand: React.FC = () => {
  const reduced = useReducedMotion();

  return (
    <section
      aria-label="Trades using RupeeBill"
      className="overflow-hidden border-y border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-paper-sunk))] py-7"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* The band names itself and rules itself off before the register
            starts running underneath, same as every section heading. */}
        <Reveal as="p" move="set" className="lp-label pb-3 text-muted-foreground">
          Counters running on RupeeBill
        </Reveal>
        <RuleDraw weight="hair" delay={0.12} />
      </div>

      {/* Full-bleed, outside the container: the rows have to be able to leave
          the page for the loop to look continuous. */}
      <div className={reduced ? "space-y-1 px-4 pt-4 sm:px-6 lg:px-8" : "space-y-2 pt-4"}>
        <TradeRow items={ROW_ONE} seconds={44} reduced={!!reduced} />
        <TradeRow items={ROW_TWO} seconds={58} reverse reduced={!!reduced} />
      </div>
    </section>
  );
};
