import React, { useMemo } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { DUR, EASE_DRAW, IN_VIEW, STAGGER } from "./tokens";

interface SetTypeProps {
  /** The line to set. Plain text — this move works on words, not on markup. */
  children: string;
  /**
   * `load` runs once on mount, for the hero. `view` waits until the heading
   * scrolls in, which is every other heading on the page.
   */
  trigger?: "load" | "view";
  /** Seconds before the first word moves. */
  delay?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
}

/**
 * The `set` move: a line of type rises into place one word at a time, each word
 * clipped by its own line box.
 *
 * This is the page's signature move, and it is not a fade-up. A fade-up slides a
 * finished block of text; this reveals the words from behind the baseline in
 * reading order, which is what writing looks like. Because each word carries its
 * own clip, the line still wraps and rebalances normally at any width — which is
 * why the mask is per word rather than per line.
 *
 * The clip box crops descenders, so each word pads its own bottom by 0.14em and
 * pulls the same amount back off its margin; the text metrics do not change.
 */
export const SetType: React.FC<SetTypeProps> = ({
  children,
  trigger = "view",
  delay = 0,
  className = "",
  as = "span",
}) => {
  const reduced = useReducedMotion();
  const words = useMemo(() => children.split(/\s+/).filter(Boolean), [children]);

  const Tag = motion[as] as typeof motion.span;

  // With reduced motion the words are simply there. Still split into spans so
  // the DOM and the line breaks are identical either way.
  if (reduced) {
    return React.createElement(as, { className }, children);
  }

  const container: Variants = {
    hidden: {},
    shown: {
      transition: {
        delayChildren: delay,
        staggerChildren: STAGGER.word,
      },
    },
  };

  const word: Variants = {
    hidden: { y: "108%", skewY: 2.5, opacity: 0 },
    shown: {
      y: "0%",
      skewY: 0,
      opacity: 1,
      transition: { duration: DUR.set, ease: EASE_DRAW },
    },
  };

  return (
    <Tag
      className={className}
      variants={container}
      initial="hidden"
      {...(trigger === "load"
        ? { animate: "shown" }
        : { whileInView: "shown", viewport: IN_VIEW })}
    >
      {words.map((w, i) => (
        <React.Fragment key={`${w}-${i}`}>
          <span
            // The clip box. `inline-block` so it participates in wrapping; the
            // padding/margin pair gives descenders room without moving the
            // baseline.
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
              paddingBottom: "0.14em",
              marginBottom: "-0.14em",
            }}
          >
            <motion.span
              variants={word}
              style={{ display: "inline-block", willChange: "transform" }}
            >
              {w}
            </motion.span>
          </span>
          {/* A real space, outside the clip box, so the line still wraps
              here. A non-breaking space inside the box would turn the whole
              headline into one unbreakable word. */}
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
};
