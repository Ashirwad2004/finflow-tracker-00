import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_DRAW } from "@/features/landing/motion";

/**
 * The four beats of a counter sale, with the second they land on. These are the
 * headline's claim broken into its parts, so the strip is evidence for the
 * number above it rather than an animated ornament.
 */
const BEATS = [
  { at: "0.0s", act: "Barcode gun reads the item", detail: "Rate, tax and stock come with it" },
  { at: "1.2s", act: "Bill totals itself", detail: "CGST and SGST split, round-off applied" },
  { at: "3.4s", act: "Thermal printer cuts the receipt", detail: "Any 2\" or 3\" head, no driver setup" },
  { at: "5.0s", act: "WhatsApp copy leaves with a UPI QR", detail: "Customer pays off the same bill" },
] as const;

const HOLD_MS = 2200;

/**
 * The bill being made, on a loop.
 *
 * This is the page's one looping animation, and it is here because the product's
 * central claim is a duration. A shop owner cannot evaluate "five seconds" from
 * the words; they can evaluate it from watching the four things that happen
 * inside it, at the pace they happen. The brass rule under the strip is the
 * clock running, so the loop is legible as a loop rather than as a glitch.
 *
 * It advances on a timer rather than on scroll: the timing *is* the content, so
 * it must not be scrubbed by how fast somebody is scrolling.
 */
export const HeroBillFlow: React.FC = () => {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(
      () => setI((prev) => (prev + 1) % BEATS.length),
      HOLD_MS
    );
    return () => window.clearInterval(t);
  }, [reduced]);

  // With motion turned down the strip becomes what it is really describing: an
  // ordered list of the four steps, all visible at once.
  if (reduced) {
    return (
      <ol className="divide-y divide-[hsl(var(--lp-rule))] border-y border-[hsl(var(--lp-rule))]">
        {BEATS.map((b) => (
          <li key={b.at} className="flex items-baseline gap-4 py-2.5">
            <span className="lp-figure w-12 shrink-0 text-xs font-bold text-[hsl(var(--lp-brass))]">
              {b.at}
            </span>
            <span className="text-sm font-semibold text-[hsl(var(--lp-ink))]">
              {b.act}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  const beat = BEATS[i];

  return (
    <div className="border-y border-[hsl(var(--lp-rule))] py-3">
      <div className="flex items-start gap-4">
        {/* The clock. Tabular so the column does not shift between beats. */}
        <span className="lp-figure w-12 shrink-0 pt-0.5 text-xs font-bold text-[hsl(var(--lp-brass))]">
          {beat.at}
        </span>

        {/* Fixed height, because a strip that changes height on every beat
            would push the product shot below it up and down forever. */}
        <div className="relative min-h-[2.75rem] flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.42, ease: EASE_DRAW }}
            >
              <p className="text-sm font-semibold leading-snug text-[hsl(var(--lp-ink))]">
                {beat.act}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {beat.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Which beat of four, as a ruled tally rather than dots. */}
        <div
          aria-hidden="true"
          className="hidden shrink-0 items-end gap-1 pt-1.5 sm:flex"
        >
          {BEATS.map((b, n) => (
            <motion.span
              key={b.at}
              className="block w-4 bg-[hsl(var(--lp-brass))]"
              animate={{ height: n === i ? 11 : 4, opacity: n === i ? 1 : 0.3 }}
              transition={{ duration: 0.35, ease: EASE_DRAW }}
            />
          ))}
        </div>
      </div>

      {/* The clock running, under the strip. */}
      <div className="mt-2.5 h-px w-full bg-[hsl(var(--lp-rule))]">
        <motion.div
          key={i}
          className="h-px bg-[hsl(var(--lp-brass-lit))]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
};
