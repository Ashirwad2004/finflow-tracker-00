import React from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Accepted for call-site compatibility; no longer drives a stagger. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}

/**
 * Intentionally does not animate.
 *
 * A fade-and-slide-up on every section, staggered, was the page's dominant
 * motion and it fought the ledger structure — rules that slide into place stop
 * reading as ruling. The page now spends its motion budget on one orchestrated
 * moment in the hero (see `.lp-rule-draw` in landing.css), and everything else
 * is still until a person acts on it.
 *
 * Kept as a pass-through wrapper so section markup and layout classes are
 * unchanged, rather than editing a dozen call sites to delete an element.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  as: Tag = "div",
}) => {
  return <Tag className={className}>{children}</Tag>;
};
