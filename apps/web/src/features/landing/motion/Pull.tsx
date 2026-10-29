import React, { useCallback, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface PullProps {
  children: React.ReactNode;
  /** Maximum travel toward the pointer, in pixels. Keep it small. */
  travel?: number;
  className?: string;
}

/**
 * A control leans toward the pointer.
 *
 * The travel is deliberately tiny — 5px by default. Past about 8px a button
 * stops feeling responsive and starts feeling evasive, because the thing you are
 * aiming at moves away from where you clicked. At this amplitude it reads as
 * weight rather than as an effect, and the click target never meaningfully
 * leaves the cursor.
 *
 * Written to CSS custom properties rather than animated from JS: the compositor
 * handles the transition out of `.lp-pull`, so moving the pointer across a row
 * of buttons costs no React renders.
 */
export const Pull: React.FC<PullProps> = ({
  children,
  travel = 5,
  className = "",
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const node = ref.current;
      if (!node) return;
      const box = node.getBoundingClientRect();
      const dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
      node.style.setProperty("--lp-pull-x", `${dx * travel}px`);
      node.style.setProperty("--lp-pull-y", `${dy * travel}px`);
    },
    [travel]
  );

  const onLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--lp-pull-x", "0px");
    node.style.setProperty("--lp-pull-y", "0px");
  }, []);

  if (reduced) {
    return <span className={`inline-flex ${className}`}>{children}</span>;
  }

  return (
    <span
      ref={ref}
      // Pointer events, not mouse events, so a touch tap does not leave the
      // control stuck off-centre with no pointer to follow.
      onPointerMove={(e) => e.pointerType === "mouse" && onMove(e)}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      className={`lp-pull inline-flex ${className}`}
    >
      {children}
    </span>
  );
};
