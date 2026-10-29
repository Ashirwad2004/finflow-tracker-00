import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE_DRAW } from "./tokens";

interface RuleDrawProps {
  /** Seconds before the pen starts. */
  delay?: number;
  /** `rule` is a hairline; `total` is the heavier red line under a sum. */
  weight?: "hair" | "rule" | "total";
  className?: string;
  /** Brass travelling along the line once it is drawn — marks the live line. */
  lit?: boolean;
}

const WEIGHTS = {
  hair: "h-px bg-[hsl(var(--lp-rule))]",
  rule: "h-px bg-[hsl(var(--lp-rule-strong))]",
  total: "h-[2px] bg-[hsl(var(--lp-red))]",
} as const;

/**
 * The `rule` move: a hairline draws itself across the page from the left.
 *
 * This is the page's structural unit. The ledger direction uses ruling where
 * most pages would use a card edge or a shadow, so a rule arriving is the
 * section's structure arriving — which is why it is the first thing to move in
 * every heading and the one piece of motion that never gets a decorative
 * variant.
 */
export const RuleDraw: React.FC<RuleDrawProps> = ({
  delay = 0,
  weight = "rule",
  className = "",
  lit = false,
}) => {
  const reduced = useReducedMotion();
  const classes = `${WEIGHTS[weight]} w-full ${lit ? "lp-rule-lit" : ""} ${className}`;

  if (reduced) {
    return <div aria-hidden="true" className={classes} />;
  }

  return (
    <motion.div
      aria-hidden="true"
      className={classes}
      style={{ transformOrigin: "left" }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.9 }}
      transition={{ duration: DUR.rule, ease: EASE_DRAW, delay }}
    />
  );
};
