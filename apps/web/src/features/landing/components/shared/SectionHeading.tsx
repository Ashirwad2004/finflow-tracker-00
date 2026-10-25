import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DUR, EASE_DRAW, IN_VIEW, Reveal, RuleDraw, SetType, Tally } from "@/features/landing/motion";

interface SectionHeadingProps {
  /**
   * The ledger entry label — what this section is, in the words a shop owner
   * would use. Sentence case: it is a name, not a tracked-out eyebrow.
   */
  label?: string;
  /**
   * The figure that belongs to this section, right-aligned in the figures
   * column. It has to be true and specific — a count, a price, a span of time.
   * Leave it out rather than filling the slot with a word.
   */
  figure?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional element below the description, e.g. a control or a stat block. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Every section opens as a ledger entry being written: the label arrives, its
 * figure counts up on the right, the rule is drawn beneath them, and then the
 * heading sets word by word on top of it.
 *
 * That sequence is the whole page's thesis in four beats, and because this one
 * component opens eight sections, the page gets a repeated rhythm rather than
 * eight separately-invented entrances. The order is fixed and the delays are
 * absolute: rule first, because the rule is the structure, then the words.
 *
 * There is no centred variant on purpose. The figures column only reads as a
 * column if it stays in the same place all the way down the page, and a page
 * where every section is centred reads as a template.
 */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  label,
  figure,
  title,
  description,
  aside,
  className = "",
}) => {
  const reduced = useReducedMotion();

  return (
    <div className={`text-left ${className}`}>
      {/* The entry line. The rule is a separate drawn element rather than this
          row's border, because a border cannot be animated from the left. */}
      <div className="flex items-baseline justify-between gap-6 pb-2.5">
        {label && (
          <motion.span
            className="lp-entry-label"
            initial={reduced ? undefined : { opacity: 0, x: -14 }}
            whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
            viewport={IN_VIEW}
            transition={{ duration: 0.55, ease: EASE_DRAW }}
          >
            {label}
          </motion.span>
        )}

        {figure && (
          <motion.span
            className="lp-figure ml-auto shrink-0 text-sm font-semibold text-[hsl(var(--lp-ink))]"
            initial={reduced ? undefined : { opacity: 0 }}
            whileInView={reduced ? undefined : { opacity: 1 }}
            viewport={IN_VIEW}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            {/* A figure written as plain text counts up; anything richer is
                passed through untouched. */}
            {typeof figure === "string" ? (
              <Tally value={figure} delay={0.3} duration={DUR.tally} />
            ) : (
              figure
            )}
          </motion.span>
        )}
      </div>

      {/* Drawn, but not lit. The travelling brass highlight is reserved for a
          total; putting it under all eight section headings would mean it
          marked nothing. */}
      <RuleDraw weight="rule" />

      {typeof title === "string" ? (
        <SetType
          as="h2"
          className="lp-display mt-6 max-w-3xl text-[1.9rem] text-[hsl(var(--lp-ink))] sm:text-[2.7rem] lg:text-[3.25rem]"
          delay={0.22}
        >
          {title}
        </SetType>
      ) : (
        <Reveal
          as="div"
          move="set"
          delay={0.22}
          className="lp-display mt-6 max-w-3xl text-[1.9rem] text-[hsl(var(--lp-ink))] sm:text-[2.7rem] lg:text-[3.25rem]"
        >
          <h2>{title}</h2>
        </Reveal>
      )}

      {description && (
        <Reveal
          as="p"
          move="set"
          delay={0.42}
          className="lp-prose mt-4 max-w-[62ch] text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base"
        >
          {description}
        </Reveal>
      )}

      {aside && (
        <Reveal move="set" delay={0.54} className="mt-6">
          {aside}
        </Reveal>
      )}
    </div>
  );
};
