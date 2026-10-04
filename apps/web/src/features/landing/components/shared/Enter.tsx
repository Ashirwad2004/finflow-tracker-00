import React from "react";

interface EnterProps {
  children: React.ReactNode;
  /** Position in the entrance sequence, in milliseconds. */
  delay?: number;
  className?: string;
}

/**
 * One step of the hero's page-load entrance.
 *
 * Deliberately not scroll-triggered and deliberately not used below the fold:
 * the page gets a single orchestrated opening, and everything after it is
 * simply there when you arrive. The animation itself lives in landing.css so
 * `prefers-reduced-motion` switches it off in one place.
 */
export const Enter: React.FC<EnterProps> = ({
  children,
  delay = 0,
  className = "",
}) => (
  <div
    className={`lp-enter ${className}`}
    style={{ ["--lp-delay" as string]: `${delay}ms` }}
  >
    {children}
  </div>
);
