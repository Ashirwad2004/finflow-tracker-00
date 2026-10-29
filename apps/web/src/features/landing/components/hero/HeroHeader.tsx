import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DUR, EASE_DRAW, Pull, SetType, Tally } from "@/features/landing/motion";
import { HeroBillFlow } from "./HeroBillFlow";

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
  /*
   * Every figure here is a property of the product, checkable by opening it.
   * The first row used to read "Shops billing daily — 15,000+", which was a
   * usage count nobody can stand behind on a product that launched this month,
   * and an inflated install base on a live Indian consumer product is an
   * advertising problem as much as a trust one. A limit of "None" makes the
   * same point and is simply true.
   */
  { label: "Monthly invoice limit", value: "None" },
  { label: "Average time to a bill", value: "5 sec" },
  { label: "Billing with the internet down", value: "Works", green: true },
  { label: "Cost, forever", value: "₹0", rule: true },
];

/**
 * The page-load sequence, in seconds. One timeline, written down, because the
 * whole point of this hero is that the beats land in a deliberate order and
 * nine scattered delay props cannot be reasoned about.
 *
 * The order is the order a ledger page gets made: the rule is drawn, the entry
 * is named, the words are written, the actions are offered, the stamp goes on,
 * and the figures are totalled last.
 */
const BEAT = {
  entryRule: 0.1,
  entryLabel: 0.22,
  headline: 0.34,
  headlineTwo: 0.62,
  body: 0.95,
  actions: 1.1,
  stamp: 1.3,
  flow: 1.4,
  figures: 1.15,
} as const;

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  onStartFree,
  onBookDemo,
  onSeeFeatures,
}) => {
  const reduced = useReducedMotion();

  /** The load-sequence wrapper. Absolute delays, from the timeline above. */
  const at = (t: number, y = 14) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.62, ease: EASE_DRAW, delay: t },
        };

  return (
    <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
      {/* ------------------------------------------------- headline column */}
      <div>
        <div className="flex items-baseline justify-between gap-6 pb-2.5">
          <motion.span className="lp-entry-label" {...at(BEAT.entryLabel, 0)}>
            Billing software for Indian counters
          </motion.span>
          <motion.span
            className="lp-figure shrink-0 text-sm font-semibold text-muted-foreground"
            {...at(BEAT.entryLabel + 0.08, 0)}
          >
            Free, all of it
          </motion.span>
        </div>

        {/* The first rule on the page draws itself. Everything above sets on
            top of it, so this line arriving is the page starting. */}
        <motion.div
          aria-hidden="true"
          className="h-px w-full origin-left bg-[hsl(var(--lp-rule-strong))]"
          initial={reduced ? undefined : { scaleX: 0 }}
          animate={reduced ? undefined : { scaleX: 1 }}
          transition={{ duration: DUR.rule, ease: EASE_DRAW, delay: BEAT.entryRule }}
        />

        {/*
          Two lines, set separately rather than as one balanced block. The
          claim is in the first line and the objection it answers — that this
          needs new hardware — is in the second, so they should land as two
          statements, a third of a second apart.
        */}
        <h1 className="lp-display mt-7 text-[2.3rem] text-[hsl(var(--lp-ink))] sm:text-[3.4rem] lg:text-[4.1rem]">
          <SetType as="span" trigger="load" delay={BEAT.headline} className="block">
            GST bills in five seconds,
          </SetType>
          {/* Same weight and colour as the first line. Dimming or tinting the
              second half would be the one-phrase-accent treatment this page
              already decided against; the third of a second between them is
              what carries the hierarchy. */}
          <SetType
            as="span"
            trigger="load"
            delay={BEAT.headlineTwo}
            className="block"
          >
            on the counter PC you already have.
          </SetType>
        </h1>

        <motion.p
          className="lp-prose mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
          {...at(BEAT.body)}
        >
          Scan, bill, and print to any 2&quot; or 3&quot; thermal printer. Send
          the same bill on WhatsApp with a UPI QR on it. Keep selling when the
          market internet drops, and hand your CA a GSTR-1 export at the end of
          the month.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          {...at(BEAT.actions)}
        >
          <Pull className="w-full sm:w-auto">
            <Button
              size="lg"
              onClick={onStartFree}
              className="lp-btn h-[3.25rem] w-full rounded-none px-8 text-base sm:w-auto"
            >
              Start billing
            </Button>
          </Pull>

          <Pull className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              onClick={onBookDemo}
              className="lp-btn-accent h-[3.25rem] w-full rounded-none px-7 text-base sm:w-auto"
            >
              Book a live demo
            </Button>
          </Pull>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span
            className={reduced ? "lp-stamp" : "lp-stamp lp-stamp-in"}
            style={{ ["--lp-delay" as string]: `${BEAT.stamp * 1000}ms` }}
          >
            Free forever
          </span>
          <motion.p className="text-sm text-muted-foreground" {...at(BEAT.stamp + 0.1, 0)}>
            No card, no trial clock.{" "}
            <button
              onClick={onSeeFeatures}
              className="lp-link text-[hsl(var(--lp-ink))]"
            >
              See everything it does
            </button>
          </motion.p>
        </div>

        {/* The claim in the headline, demonstrated. */}
        <motion.div className="mt-9" {...at(BEAT.flow)}>
          <HeroBillFlow />
        </motion.div>
      </div>

      {/* --------------------------------------------------- figures column */}
      <div className="lp-figures-col">
        <dl>
          {LEDGER_ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.label}
              className={`flex items-baseline justify-between gap-4 py-3.5 ${
                entry.rule
                  ? "lp-total lp-rule-lit mt-1 pt-4"
                  : "border-b border-[hsl(var(--lp-rule))]"
              }`}
              {...at(BEAT.figures + i * 0.09, 10)}
            >
              <dt className="text-sm text-muted-foreground">{entry.label}</dt>
              <dd
                className={`lp-figure shrink-0 ${
                  entry.rule
                    ? "lp-shout text-[2.75rem] text-[hsl(var(--lp-ink))]"
                    : "text-xl font-bold"
                } ${
                  entry.green
                    ? "text-[hsl(var(--lp-green))]"
                    : entry.rule
                      ? ""
                      : "text-[hsl(var(--lp-ink))]"
                }`}
              >
                {/* The figures total themselves last, in the order you would
                    add them up. `Works` has no number in it and is printed. */}
                <Tally
                  value={entry.value}
                  delay={0.15 + i * 0.1}
                  duration={DUR.tally}
                />
              </dd>
            </motion.div>
          ))}
        </dl>

        <motion.p
          className="mt-4 text-xs leading-relaxed text-muted-foreground"
          {...at(BEAT.figures + 0.45, 0)}
        >
          Invoicing, POS, inventory and party khata are free with no invoice
          limit. Nothing here expires.
        </motion.p>
      </div>
    </div>
  );
};
