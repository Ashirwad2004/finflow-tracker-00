import React, { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { IN_VIEW_LATE } from "./tokens";

interface TallyProps {
  /**
   * The finished value exactly as it should read — `15,000+`, `₹0`, `5 sec`,
   * `98%`. The first run of digits in it is what counts up; everything around
   * it is kept verbatim.
   */
  value: string;
  /** Seconds the count takes. */
  duration?: number;
  /** Seconds to wait after the figure is on screen. */
  delay?: number;
  className?: string;
}

/** Splits `₹1,24,500+` into `₹`, `1,24,500`, `+`. */
function partition(value: string) {
  const match = value.match(/[\d][\d,.\s]*/);
  if (!match || match.index === undefined) return null;
  const digits = match[0].trimEnd();
  const start = match.index;
  return {
    before: value.slice(0, start),
    digits,
    after: value.slice(start + digits.length),
  };
}

/**
 * The `tally` move: a figure counts up to its total the way a sum is added.
 *
 * Every figure on this page already sits in a tabular-numeral column, which is
 * what makes counting usable here — the glyphs are the same width at every step,
 * so the column does not shudder while the number climbs, and nothing to the
 * right of it reflows.
 *
 * Grouping is reproduced from the written value rather than imposed: `15,000`
 * counts in thousands, `1,24,500` counts in the Indian lakh grouping, and a
 * value with no separators gets none. The product is for Indian counters, so
 * guessing wrong here would be visible.
 */
export const Tally: React.FC<TallyProps> = ({
  value,
  duration = 1.25,
  delay = 0,
  className = "",
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, IN_VIEW_LATE);
  const reduced = useReducedMotion();
  const parts = partition(value);
  const target = parts ? Number(parts.digits.replace(/[,\s]/g, "")) : NaN;
  const countable = parts !== null && Number.isFinite(target) && target > 0;

  const [shown, setShown] = useState(countable ? 0 : target);

  // Whether the written value groups its digits at all. When it does, the
  // grouping is Indian — `1,24,500`, not `124,500`. Below a lakh the two are
  // identical, so this is only ever visible where it has to be right.
  const grouped = parts?.digits.includes(",") ?? false;

  // How many decimal places the written value shows, held constant for every
  // step. Without this, `₹1.8L` would round to `2` and `98.5%` to `99` — the
  // count would land on a different number than the one that was written.
  const decimals = parts?.digits.includes(".")
    ? parts.digits.split(".")[1].length
    : 0;

  useEffect(() => {
    if (!countable || !inView || reduced) return;

    let frame = 0;
    let startedAt = 0;

    const step = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = (now - startedAt) / 1000 - delay;

      if (elapsed < 0) {
        frame = requestAnimationFrame(step);
        return;
      }

      const t = Math.min(elapsed / duration, 1);
      // Expo-out, matched to the rest of the page: the sum races, then lands.
      const eased = 1 - Math.pow(2, -10 * t);
      setShown(target * (t === 1 ? 1 : eased));

      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [countable, inView, reduced, target, duration, delay]);

  // Nothing numeric to count, or motion is turned down: print the value.
  if (!countable || reduced) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  const printed = grouped
    ? shown.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : shown.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {parts.before}
      {/* The live digits are announced once, finished, rather than on every
          frame — a screen reader should hear the total, not the counting. */}
      <span aria-hidden="true">{printed}</span>
      <span className="sr-only">{parts.digits}</span>
      {parts.after}
    </span>
  );
};
