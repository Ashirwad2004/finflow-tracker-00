/**
 * The page's motion constants, in one place.
 *
 * Every move on the landing page reads from these, so the whole page shares one
 * sense of weight and speed. Changing a curve here changes the page's character
 * rather than one component's.
 */

/**
 * Expo-out. Fast departure, long settle — this is the curve that makes a drawn
 * line look drawn by a hand rather than tweened by a machine, and it is the
 * default for everything structural.
 */
export const EASE_DRAW = [0.16, 1, 0.3, 1] as const;

/** A small overshoot, for a mark landing on paper. Used only by the stamp. */
export const EASE_SETTLE = [0.34, 1.4, 0.64, 1] as const;

/** Durations, in seconds, named by the move they belong to. */
export const DUR = {
  /** A hairline being ruled across the page. Hand speed. */
  rule: 0.9,
  /** A word rising into place. */
  set: 0.72,
  /** A figure counting up to its total. */
  tally: 1.25,
  /** A mark being stamped. */
  stamp: 0.5,
  /** A panel or product shot arriving. */
  lift: 0.85,
} as const;

/** Per-item stagger, in seconds. */
export const STAGGER = {
  word: 0.045,
  line: 0.09,
  row: 0.065,
  cell: 0.05,
} as const;

/**
 * When a scroll-driven move fires.
 *
 * `once` matters: a page where everything re-animates on the way back up feels
 * unstable, and a shop owner scrolling to re-read a price should find it
 * already there. `amount` is low so a tall section starts moving as its top
 * edge arrives rather than waiting to be a third on screen.
 */
export const IN_VIEW = {
  once: true,
  amount: 0.18,
  margin: "0px 0px -8% 0px",
} as const;

/** The same, for a short element that must be well inside the frame first. */
export const IN_VIEW_LATE = {
  once: true,
  amount: 0.6,
  margin: "0px 0px -4% 0px",
} as const;
