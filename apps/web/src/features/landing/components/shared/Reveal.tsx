import React from "react";
import { Reveal as MotionReveal } from "@/features/landing/motion";

interface RevealProps {
  children: React.ReactNode;
  /** Seconds before this block moves. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}

/**
 * Kept as the call-site-compatible wrapper around the motion system's `Reveal`.
 *
 * This used to be a deliberate no-op: the page spent its whole motion budget on
 * one orchestrated moment in the hero and held still everywhere else. The brief
 * changed — the page is now meant to be led by motion throughout — so this
 * forwards to the `set` move in ../../motion, which is scroll-triggered, fires
 * once, and switches itself off under `prefers-reduced-motion`.
 *
 * New code should import from `@/features/landing/motion` directly and pick a
 * named move. This exists so nothing that already imports it needs an edit.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  className = "",
  as = "div",
}) => (
  <MotionReveal as={as} move="set" delay={delay} className={className}>
    {children}
  </MotionReveal>
);
