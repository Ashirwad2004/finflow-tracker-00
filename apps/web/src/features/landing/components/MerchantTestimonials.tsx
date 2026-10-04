import React from "react";
import { Building2 } from "lucide-react";
import { SectionHeading } from "./shared/SectionHeading";

/**
 * Each merchant's quote carries one number they actually moved, and that number
 * sits in the figures column where every other figure on the page sits. The
 * quotes are not equal weight on purpose — three identical cards flatten the
 * story into filler, so the lead quote gets the room and the other two support
 * it.
 */
const TESTIMONIALS = [
  {
    name: "Kailash Agarwal",
    shop: "Agarwal Provisions & Kirana",
    city: "Jaipur, Rajasthan",
    quote:
      "Evening rush used to be a nightmare with handwritten bills. With 3-inch thermal printing and a barcode scanner our billing speed doubled, and customers like getting the receipt on WhatsApp.",
    figure: "2×",
    figureLabel: "Billing speed at the counter",
  },
  {
    name: "Harpreet Singh",
    shop: "Singh Auto Spares & Bearings",
    city: "Ludhiana, Punjab",
    quote:
      "Udhar was our biggest headache. WhatsApp reminders with a UPI QR recovered over ₹1.8 lakh of overdue customer payments in the first month.",
    figure: "₹1.8L",
    figureLabel: "Overdue credit recovered, first month",
  },
  {
    name: "Deepak Patel",
    shop: "Patel Electricals & Hardware",
    city: "Ahmedabad, Gujarat",
    quote:
      "My accountant used to take three days every month to file GSTR-1. Now I export the Excel and send him the exact slab breakdown.",
    figure: "3 days",
    figureLabel: "Saved on GSTR-1 every month",
  },
];

const Merchant: React.FC<{ name: string; shop: string; city: string }> = ({
  name,
  shop,
  city,
}) => (
  <figcaption className="flex items-center gap-3">
    <span className="lp-figure flex h-10 w-10 shrink-0 items-center justify-center border border-[hsl(var(--lp-rule-strong))] text-xs font-bold text-[hsl(var(--lp-ink))]">
      {name
        .split(" ")
        .map((n) => n[0])
        .join("")}
    </span>
    <div>
      <div className="text-sm font-bold text-foreground">{name}</div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Building2 className="h-3 w-3 shrink-0" />
        <span>
          {shop}, {city}
        </span>
      </div>
    </div>
  </figcaption>
);

export const MerchantTestimonials: React.FC = () => {
  const [lead, ...supporting] = TESTIMONIALS;

  return (
    <section className="border-b border-[hsl(var(--lp-rule))] bg-muted/15 py-16 sm:py-24">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Merchants"
          figure="3 trades"
          title="Nobody changes their billing system for fun"
          description="Three owners in three different trades, and the one number each of them actually moved."
          className="mb-12"
        />

        {/* The lead quote: copy left, its figure in the figures column. */}
        <figure className="grid gap-8 border-t border-[hsl(var(--lp-rule-strong))] pt-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          <div className="flex flex-col justify-between gap-7">
            <blockquote className="lp-prose max-w-[46ch] text-lg leading-relaxed text-foreground sm:text-[1.3rem] sm:leading-[1.55]">
              {lead.quote}
            </blockquote>
            <Merchant name={lead.name} shop={lead.shop} city={lead.city} />
          </div>

          <div className="lp-figures-col">
            <div className="lp-total pt-4">
              <div className="lp-figure text-[2.75rem] font-extrabold leading-none text-[hsl(var(--lp-ink))]">
                {lead.figure}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {lead.figureLabel}
              </div>
            </div>
          </div>
        </figure>

        {/* The two supporting quotes, ruled rather than boxed. */}
        <div className="mt-12 grid gap-10 border-t border-[hsl(var(--lp-rule))] pt-10 md:grid-cols-2 md:gap-12">
          {supporting.map((t) => (
            <figure key={t.name} className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between gap-4 border-b border-[hsl(var(--lp-rule))] pb-3">
                <span className="text-sm text-muted-foreground">
                  {t.figureLabel}
                </span>
                <span className="lp-figure shrink-0 text-2xl font-extrabold text-[hsl(var(--lp-red))]">
                  {t.figure}
                </span>
              </div>

              <blockquote className="lp-prose max-w-[48ch] flex-1 text-sm leading-relaxed text-foreground/90">
                {t.quote}
              </blockquote>

              <Merchant name={t.name} shop={t.shop} city={t.city} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
