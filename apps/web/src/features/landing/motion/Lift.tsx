import React, { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { DUR, EASE_DRAW } from "./tokens";

interface LiftProps {
  children: React.ReactNode;
  /** Degrees of tilt at the far edge. */
  tilt?: number;
  /** Pixels of counter-scroll travel, which is what reads as depth. */
  parallax?: number;
  className?: string;
}

/**
 * The `lift` move: the product shot behaves like an object on a counter.
 *
 * Two inputs, both continuous rather than triggered. The pointer tips the
 * machine a degree or two — enough that the lid catches a different angle, not
 * enough to turn the screen into a toy. Scroll moves it against the page, which
 * is the thing that actually sells depth: a layer that travels at a different
 * rate than the text beside it reads as nearer the viewer.
 *
 * Both are springs, so the shot settles instead of snapping, and nothing here
 * touches layout — `rotateX`, `rotateY` and `y` only.
 */
export const Lift: React.FC<LiftProps> = ({
  children,
  tilt = 2.4,
  parallax = 26,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Low stiffness, high damping: a heavy object, not a spring toy.
  const rotateY = useSpring(useTransform(px, [-1, 1], [-tilt, tilt]), {
    stiffness: 110,
    damping: 22,
  });
  const rotateX = useSpring(useTransform(py, [-1, 1], [tilt, -tilt]), {
    stiffness: 110,
    damping: 22,
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [parallax, -parallax]),
    { stiffness: 90, damping: 26 }
  );

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      // The perspective lives on the wrapper so the child's own transforms
      // compose against it rather than flattening.
      style={{ perspective: 1400 }}
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const box = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - (box.left + box.width / 2)) / (box.width / 2));
        py.set((e.clientY - (box.top + box.height / 2)) / (box.height / 2));
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {/*
        Two layers on purpose. The outer one owns the one-shot arrival, the
        inner one owns the continuous scroll and pointer transforms. Animating
        `y` as a prop on the same element whose `style.y` is a motion value
        would have the animation win and the parallax silently stop.
      */}
      <motion.div
        initial={{ opacity: 0, y: 56, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: DUR.lift, ease: EASE_DRAW }}
      >
        <motion.div className="lp-lift" style={{ rotateX, rotateY, y }}>
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
};
