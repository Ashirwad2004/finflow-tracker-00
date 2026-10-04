import React from "react";

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
 * Every section opens as a ledger entry: label on the left, its figure on the
 * right, a rule beneath, then the heading.
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
  return (
    <div className={`text-left ${className}`}>
      <div className="lp-entry">
        {label && <span className="lp-entry-label">{label}</span>}
        {figure && (
          <span className="lp-figure ml-auto shrink-0 text-sm font-semibold text-[hsl(var(--lp-ink))]">
            {figure}
          </span>
        )}
      </div>

      <h2 className="lp-display mt-6 max-w-3xl text-[1.9rem] text-[hsl(var(--lp-ink))] sm:text-[2.7rem] lg:text-[3.25rem]">
        {title}
      </h2>

      {description && (
        <p className="lp-prose mt-4 max-w-[62ch] text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      )}

      {aside && <div className="mt-6">{aside}</div>}
    </div>
  );
};
