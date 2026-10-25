import React from "react";
import {
  motion,
  useReducedMotion,
  type Easing,
  type Target,
  type Variants,
} from "framer-motion";
import { DUR, EASE_DRAW, IN_VIEW, STAGGER } from "./tokens";

/**
 * The move vocabulary, by name. A caller picks a move, never a transform — that
 * is what keeps a page this busy feeling like one piece of work.
 *
 *   rule   a hairline draws itself from the left
 *   set    the block rises into place from behind its own edge
 *   lift   the block arrives with depth, for a product shot or a panel
 *   enter  the quietest option, for a block that should simply be there
 */
export type Move = "rule" | "set" | "lift" | "enter";

/**
 * The elements a revealed block is allowed to be.
 *
 * Named rather than inlined because `Reveal`, `Stagger` and `StaggerItem` each
 * need their own slice of it, and because the list was missing `article` — a
 * review on the feedback wall is an article, and the call site that said so was
 * a type error the project's own `typecheck` script could not see.
 */
export type RevealTag =
  | "div"
  | "section"
  | "article"
  | "figure"
  | "li"
  | "span"
  | "tr"
  | "td"
  | "p";

/**
 * Each move as a start state, an end state, and how long it takes.
 *
 * Deliberately not Framer `Variants` with their own `transition` blocks: a
 * transition declared inside a variant beats the one passed as a prop, so a
 * component that needs to add a delay on top of a named move cannot do it that
 * way round. Keeping the three pieces separate lets `Reveal` build a single
 * transition carrying duration, ease *and* delay.
 */
const MOVES: Record<
  Move,
  { from: Target; to: Target; duration: number; ease?: Easing }
> = {
  rule: {
    from: { scaleX: 0 },
    to: { scaleX: 1 },
    duration: DUR.rule,
  },
  set: {
    from: { y: 26, opacity: 0 },
    to: { y: 0, opacity: 1 },
    duration: DUR.set,
  },
  lift: {
    from: { y: 44, scale: 0.975, opacity: 0 },
    to: { y: 0, scale: 1, opacity: 1 },
    duration: DUR.lift,
  },
  enter: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 0.5,
  },
};

/** The same, as variants, for the children of a `Stagger` group. There the
 *  parent owns the delay through `staggerChildren`, so a variant-level
 *  transition is correct and nothing needs to override it. */
const itemVariants = (move: Move): Variants => ({
  hidden: MOVES[move].from,
  shown: {
    ...MOVES[move].to,
    transition: {
      duration: MOVES[move].duration,
      ease: MOVES[move].ease ?? EASE_DRAW,
    },
  },
});

/*
 * Built by walking the move names rather than with `Object.fromEntries` and a
 * double assertion. `fromEntries` returns `{ [k: string]: ... }`, which does
 * not overlap `Record<Move, Variants>` well enough for TypeScript to accept the
 * cast — so the old form was an error that only surfaced once the project was
 * compiled against the config that actually includes `src`.
 */
const ITEM_VARIANTS = (Object.keys(MOVES) as Move[]).reduce(
  (acc, move) => {
    acc[move] = itemVariants(move);
    return acc;
  },
  {} as Record<Move, Variants>
);

interface RevealProps {
  children: React.ReactNode;
  /** Which of the four named moves to use. */
  move?: Move;
  /** Seconds before this element moves. */
  delay?: number;
  /** Position in a sibling group; multiplied by the row stagger. */
  index?: number;
  className?: string;
  as?: RevealTag;
  style?: React.CSSProperties;
}

/**
 * Scroll-driven arrival for a block.
 *
 * Fires once, never on the way back up: a page where everything re-animates
 * each time it scrolls past feels unstable, and someone scrolling back to
 * re-read a price should find it already there.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  move = "set",
  delay = 0,
  index = 0,
  className = "",
  as = "div",
  style,
}) => {
  const reduced = useReducedMotion();
  if (reduced) {
    return React.createElement(as, { className, style }, children);
  }

  const Tag = motion[as] as typeof motion.div;
  const { from, to, duration, ease } = MOVES[move];

  return (
    <Tag
      className={className}
      style={move === "rule" ? { ...style, transformOrigin: "left" } : style}
      initial={from}
      whileInView={to}
      viewport={IN_VIEW}
      transition={{
        duration,
        ease: ease ?? EASE_DRAW,
        delay: delay + index * STAGGER.row,
      }}
    >
      {children}
    </Tag>
  );
};

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "section" | "dl";
  /** Seconds between children. */
  step?: number;
  /** Seconds before the first child. */
  delay?: number;
}

/**
 * A group whose children arrive in order.
 *
 * Use with `StaggerItem` where the children are a real list — a register of
 * trades, a column of totals, a row of plans. The order is information in those
 * cases: it is the order you would read them in.
 */
export const Stagger: React.FC<StaggerProps> = ({
  children,
  className = "",
  as = "div",
  step = STAGGER.cell,
  delay = 0,
}) => {
  const reduced = useReducedMotion();
  if (reduced) {
    return React.createElement(as, { className }, children);
  }

  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={IN_VIEW}
      variants={{
        hidden: {},
        shown: { transition: { delayChildren: delay, staggerChildren: step } },
      }}
    >
      {children}
    </Tag>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  move?: Move;
  className?: string;
  as?: "div" | "li" | "span" | "tr" | "p";
  style?: React.CSSProperties;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  move = "set",
  className = "",
  as = "div",
  style,
}) => {
  const reduced = useReducedMotion();
  if (reduced) {
    return React.createElement(as, { className, style }, children);
  }

  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      className={className}
      style={move === "rule" ? { ...style, transformOrigin: "left" } : style}
      variants={ITEM_VARIANTS[move]}
    >
      {children}
    </Tag>
  );
};
