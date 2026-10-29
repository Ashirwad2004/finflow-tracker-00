import React from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * The margin rule: how far through the page you are.
 *
 * A ledger already carries a rule down the margin of every page, so the
 * progress indicator is that rule filling in brass rather than a bar bolted to
 * the header. It sits directly under the sticky header, one pixel tall, and it
 * is the only fixed-position element on the page.
 *
 * Decorative in the accessibility sense — the information it carries is also
 * available from the scrollbar — so it is hidden from the tree rather than
 * announced as a progressbar that nobody can act on.
 */
export const ReadProgress: React.FC = () => {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Spring rather than raw progress: a trackpad produces jittery deltas, and an
  // unsmoothed rule flickers against the header hairline it sits on.
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 32,
    restDelta: 0.001,
  });

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      // Below the header and the mobile drawer (both `z-50`), above ordinary
      // page content. At `z-[60]` it drew a brass bar across the top edge of
      // the open drawer, which looked like a seam in the panel.
      className="lp-progress-rule pointer-events-none fixed inset-x-0 top-16 z-40 h-[2px]"
      style={{ scaleX }}
    />
  );
};
