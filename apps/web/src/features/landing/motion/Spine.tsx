import React from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

interface SpineProps {
  /** The element the spine runs down, so its progress can be measured. */
  target: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * A vertical rule that draws itself as you read down the thing it belongs to.
 *
 * The only scroll-scrubbed element on the page, and the only one that should be:
 * a timeline's spine is a measure of how far through the sequence you are, so
 * tying it to scroll position rather than to a trigger makes it say something
 * true. Everything else fires once and finishes, because content that keeps
 * moving while you read it is just noise.
 *
 * Scaled from the top on the Y axis, so it costs no layout and no repaint.
 */
export const Spine: React.FC<SpineProps> = ({ target, className = "" }) => {
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target,
    // Starts drawing when the list's top reaches three-quarters up the
    // viewport and completes when its bottom passes the same line, so the rule
    // is in step with the step you are actually looking at.
    offset: ["start 0.75", "end 0.55"],
  });

  const scaleY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  if (reduced) {
    return <div aria-hidden="true" className={className} />;
  }

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ scaleY, transformOrigin: "top" }}
    />
  );
};
