import React, { useId, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./shared/SectionHeading";
import {
  BuildType,
  describeSubmitError,
  submitCustomBuild,
} from "../lib/customBuildApi";

/**
 * Custom work.
 *
 * This section answers the last objection the page leaves standing: the FAQ
 * says what RupeeBill does, and a shop owner whose trade needs something else
 * has nowhere to go. It is positioned straight after the FAQ for that reason.
 *
 * Form, not card. The page's structural idea is the ledger column, so the
 * intake is drawn as the artifact this trade already uses when something is
 * made to order: a work order. Fields sit on ruled lines with the label left
 * and the value right, the order number sits in the figures column in tabular
 * numerals, and the red total rule closes the order above the one action. No
 * paper texture or handwriting face -- DESIGN_NOTES rejects the skeuomorphic
 * khata skin, and this takes only the structure.
 */

/**
 * The four kinds of work, with a concrete example each.
 *
 * Deliberately not numbered: these are alternatives a shop owner picks between,
 * not a sequence, and numbering content that is not ordered is the tell.
 */
const WORK_KINDS: { value: BuildType; name: string; example: string }[] = [
  {
    value: "feature",
    name: "A screen your trade needs",
    example:
      "Tyre size and brand wise stock for an auto parts shop. Barcode batches with expiry for a pharmacy.",
  },
  {
    value: "report",
    name: "A report someone asks you for",
    example:
      "The exact sheet your CA wants at filing time, or the monthly statement your distributor asks for.",
  },
  {
    value: "integration",
    name: "A link to what you already run",
    example:
      "Tally, your distributor's order system, a weighing scale, or your own website's orders.",
  },
  {
    value: "custom_app",
    name: "A separate app on your own data",
    example:
      "A delivery boy app, a salesman order app, or a customer app that reads your live stock.",
  },
];

/** Field shape: label left, control right, hairline beneath — a ruled entry. */
const FieldRow: React.FC<{
  id: string;
  label: string;
  children: React.ReactNode;
}> = ({ id, label, children }) => (
  <div className="border-b border-[hsl(var(--lp-rule))] py-3 sm:grid sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-4">
    <label
      htmlFor={id}
      className="lp-label block shrink-0 text-[hsl(var(--lp-ink))]"
    >
      {label}
    </label>
    <div className="mt-1.5 sm:mt-0">{children}</div>
  </div>
);

/**
 * Controls are transparent and borderless inside the ruled row — the row's own
 * hairline is the field. A bordered, rounded input here would reintroduce the
 * card kit the page was built to avoid.
 */
const CONTROL =
  "w-full border-0 bg-transparent p-0 text-sm text-[hsl(var(--lp-ink))] " +
  "placeholder:text-muted-foreground/70";

export const CustomBuild: React.FC = () => {
  const uid = useId();
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    contact_phone: "",
    build_type: "" as BuildType | "",
    description: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;

    // Checked here as well as server-side so the owner is told what is missing
    // before a round trip, and in the order the fields appear.
    if (!form.business_name.trim() || !form.contact_name.trim()) {
      setError("Please fill in your shop name and your name.");
      return;
    }
    if (!form.contact_phone.trim()) {
      setError("We need a phone number to call you back on.");
      return;
    }
    if (!form.build_type) {
      setError("Please choose what kind of work this is.");
      return;
    }
    if (form.description.trim().length < 20) {
      setError("Tell us a little more about what the software should do.");
      return;
    }

    setStatus("sending");
    setError(null);
    try {
      const result = await submitCustomBuild({
        business_name: form.business_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        build_type: form.build_type,
        description: form.description.trim(),
        company_website: honeypot,
      });
      setReference(result.reference);
      setStatus("sent");
    } catch (err) {
      setError(describeSubmitError(err));
      setStatus("idle");
    }
  };

  return (
    <section
      id="custom-work"
      className="border-b border-[hsl(var(--lp-rule))] py-20 sm:py-28"
    >
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Custom work"
          title="Your trade needs one thing RupeeBill doesn't do yet"
          description="Every counter runs a little differently. If the job your shop does isn't in here, write it down and we'll tell you what it takes to build it."
          className="mb-12"
        />

        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          {/* What we take on */}
          <div>
            <div className="lp-entry">
              <span className="lp-entry-label">What we take on</span>
            </div>

            <ul className="mt-2">
              {WORK_KINDS.map((kind) => (
                <li
                  key={kind.value}
                  className="border-b border-[hsl(var(--lp-rule))] py-4"
                >
                  <p className="text-[0.9375rem] font-semibold text-[hsl(var(--lp-ink))]">
                    {kind.name}
                  </p>
                  <p className="lp-prose mt-1 max-w-[46ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {kind.example}
                  </p>
                </li>
              ))}
            </ul>

            <p className="lp-prose mt-6 max-w-[46ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
              Your billing, stock and khata keep working while the new piece is
              built. Nothing is switched off and nothing is migrated.
            </p>
          </div>

          {/* The work order */}
          <div className="border border-[hsl(var(--lp-rule-strong))] bg-muted/30 p-5 sm:p-7">
            <div className="flex items-baseline justify-between gap-4 border-b-2 border-[hsl(var(--lp-ink))] pb-2.5">
              <span className="lp-title text-base text-[hsl(var(--lp-ink))]">
                Work order
              </span>
              {/*
                A blank order has a blank number line, the way a real pad does;
                it fills in with the actual reference once the row exists.
              */}
              <span className="lp-figure shrink-0 text-xs text-muted-foreground">
                No.{" "}
                {status === "sent" && reference ? (
                  <span className="font-bold text-[hsl(var(--lp-ink))]">
                    {reference}
                  </span>
                ) : (
                  <span aria-hidden="true">______</span>
                )}
              </span>
            </div>

            {status === "sent" ? (
              <div className="py-8">
                <div className="flex items-center gap-2.5">
                  <Check
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-[hsl(var(--lp-green))]"
                  />
                  <p className="lp-title text-lg text-[hsl(var(--lp-ink))]">
                    Order received
                  </p>
                </div>
                <p className="lp-prose mt-3 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
                  We&apos;ll call you on{" "}
                  <span className="lp-figure font-semibold text-[hsl(var(--lp-ink))]">
                    {form.contact_phone}
                  </span>{" "}
                  within two working days to go through what you need and what it
                  will take.
                </p>
                <p className="mt-5 border-t border-[hsl(var(--lp-rule))] pt-3 text-xs text-muted-foreground">
                  Keep order number{" "}
                  <span className="lp-figure font-semibold text-[hsl(var(--lp-ink))]">
                    {reference}
                  </span>{" "}
                  for when we speak.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="relative">
                <FieldRow id={`${uid}-business`} label="Shop name">
                  <input
                    id={`${uid}-business`}
                    name="business_name"
                    value={form.business_name}
                    onChange={set("business_name")}
                    autoComplete="organization"
                    maxLength={120}
                    className={CONTROL}
                    placeholder="Sharma Tyre House"
                  />
                </FieldRow>

                <FieldRow id={`${uid}-name`} label="Your name">
                  <input
                    id={`${uid}-name`}
                    name="contact_name"
                    value={form.contact_name}
                    onChange={set("contact_name")}
                    autoComplete="name"
                    maxLength={120}
                    className={CONTROL}
                    placeholder="Ramesh Sharma"
                  />
                </FieldRow>

                <FieldRow id={`${uid}-phone`} label="Phone or WhatsApp">
                  <input
                    id={`${uid}-phone`}
                    name="contact_phone"
                    value={form.contact_phone}
                    onChange={set("contact_phone")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={24}
                    className={`${CONTROL} lp-figure`}
                    placeholder="98765 43210"
                  />
                </FieldRow>

                <FieldRow id={`${uid}-kind`} label="Kind of work">
                  <select
                    id={`${uid}-kind`}
                    name="build_type"
                    value={form.build_type}
                    onChange={set("build_type")}
                    className={`${CONTROL} cursor-pointer`}
                  >
                    <option value="">Choose one</option>
                    {WORK_KINDS.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.name}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow id={`${uid}-description`} label="What it should do">
                  <textarea
                    id={`${uid}-description`}
                    name="description"
                    value={form.description}
                    onChange={set("description")}
                    rows={4}
                    maxLength={4000}
                    className={`${CONTROL} resize-y leading-relaxed`}
                    placeholder="I sell tyres and want to see stock by size and brand, so I know what to reorder from my distributor."
                  />
                </FieldRow>

                {/*
                  Honeypot. Off-screen rather than display:none, which some bots
                  check for, and hidden from assistive tech and tab order.
                */}
                <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input
                    id={`${uid}-website`}
                    name="company_website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 border-l-2 border-[hsl(var(--lp-red))] pl-3 text-[0.8125rem] text-[hsl(var(--lp-red))]"
                  >
                    {error}
                  </p>
                )}

                {/* The red rule closes the order, as a total is ruled. */}
                <div className="lp-total mt-6 pt-5">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={status === "sending"}
                    className="lp-btn h-12 w-full rounded-none px-8 text-sm sm:w-auto"
                  >
                    {status === "sending" ? (
                      <>
                        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      "Send work order"
                    )}
                  </Button>
                  <p className="lp-prose mt-3 max-w-[44ch] text-xs leading-relaxed text-muted-foreground">
                    No charge to ask, and no obligation. We&apos;ll come back
                    with what it involves and what it costs before anything
                    starts.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
