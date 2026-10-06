# Landing page design direction

## Brief (assumed — correct this if wrong)

RupeeBill is free GST billing, POS, inventory and party-khata software for Indian
counter businesses: kirana, garments, electronics, auto spares, pharmacy, hardware,
wholesale distribution. The visitor is a shop owner or counter staff on a Windows
counter PC with a 2"/3" thermal printer and a barcode gun, patchy internet, WhatsApp
as the delivery channel for bills, and a CA they export to at tax time. The page's
job: convince that owner this replaces the paper khata and the Excel sheet, and that
it costs nothing.

## What the previous pass had to change

The earlier foundation landed almost exactly on the current house style of generated
design, so these were removed rather than refined:

- Warm cream paper (`36 38% 97%`) + warm-orange accent (`22 92% 50%`) + an
  Instrument Serif italic display accent. That trio is the single most common
  generated-design signature right now.
- A serif italic on one phrase per headline (`.lp-serif`), in four headlines.
- Tracked-out all-caps eyebrow labels above every heading (`.lp-eyebrow`).
- Fade-and-slide-up reveal on every section, staggered 60/90/120/180ms.
- `→` appended to every CTA label; `A · B · C` middle-dot meta strings.
- Grain + dot grid + radial bloom + gradient hairlines as pure decoration.
- Decorative section numbering (`01`, `05`) on sections that are not a sequence.

Numbering was kept in How it works, which genuinely is a stepped sequence.

## Direction: the ledger column

The structure comes from the thing RupeeBill replaces — the bahi khata. Not as
texture or skin (no cloth, no paper photo, no torn edges, no handwriting face), but
as a **structural system**: content sits in ruled columns, and every figure lives in
a right-hand figures column with tabular numerals, the way an entry does in a khata.
Vertical hairline column rules do the work that cards and shadows were doing. Almost
no software landing page is ruled vertically, and it is literally how this audience
already keeps books.

### Color

| token | value | role |
|---|---|---|
| `--lp-paper` | `190 16% 97%` ≈ `#F4F8F9` | cool stationery paper, not cream |
| `--lp-ink` | `224 42% 15%` ≈ `#16203B` | blue-black ledger ink; also the CTA fill |
| `--lp-red` | `350 68% 44%` ≈ `#BC243F` | ledger red: total rules, the one stamp, the key mark |
| `--lp-green` | `164 58% 26%` ≈ `#1C6A54` | money received / reconciled, only on real values |
| `--lp-rule` | `205 22% 82%` | printed ruling |
| `--lp-rule-strong` | `207 20% 68%` | column rules and totals |

Red is structure and emphasis, never a status, and never the CTA — a red button on
a billing page reads as danger. CTAs are ink.

### Type

One family: **Archivo** variable, using its width axis (`wdth 62–125`). Display is
set condensed (`font-stretch: 84%`) at heavy weights, which reads as printed
stationery and forms rather than friendly SaaS geometric. Body sits at normal width.
No second display family, no italic accent. System mono appears only inside the
thermal-receipt mockups, where the artifact really is machine output.

### Layout

Left-aligned throughout, with a figures column on the right. The section heading is
itself a ledger entry line — title left, the relevant figure right, rule beneath:

```
 Billing                                              15,000 counters
 ────────────────────────────────────────────────────────────────────
 Five jobs your shop does every day,
 one place to do them.                                  ₹0 forever
 Retailers, wholesalers, distributors ...
```

The right-hand figure is required to be a real fact, not a label — that is what
earns the device over a centred eyebrow.

### Motion

One orchestrated moment: on load the hero's register ruling draws itself from the
left (`.lp-rule-draw`), then the headline, copy, buttons and figures column set in
sequence (`.lp-type-set`, 60–600ms). Nothing else animates unless a person acts on
it — tab switches keep their fade, because that answers a click.

`shared/Enter.tsx` is one step of that opening. `shared/Reveal.tsx` is now a
pass-through that renders its children without hiding them, kept so the sections
that still import it need no edit.

### How the palette reaches the existing sections

`.lp` re-points the app's own tokens — `--background`, `--card`, `--muted`,
`--border`, `--primary` and the rest — at the ledger palette. Every
`bg-background`, `bg-card`, `border-border` and `text-primary` already written in
these sections lands on the right colour without being rewritten, and the
dashboard is untouched because the mapping is scoped to `.lp`. `--primary` had
been a purple that belonged to the app, not this page.

### Two things to not repeat

- Tailwind cannot prefix a custom class: `lg:lp-col` and `sm:lp-col` generate
  nothing. Breakpoint-dependent ruling lives in CSS (`.lp-register`,
  `.lp-figures-col`).
- `.lp-btn` and friends are scoped as `.lp .lp-btn` on purpose. Unscoped they tie
  with shadcn's own `bg-primary` on specificity, and the winner would come down to
  stylesheet order.

### Contrast floor

All text pairs clear 4.5:1 on paper — ink 15.4, muted text 5.1, red 5.7, green
6.2, paper-on-ink 15.4. `--lp-rule-strong` is 2.1:1 and is for hairlines only;
the quiet button's border is `hsl(var(--lp-ink) / 0.5)` to clear 3:1 as a control
boundary.

### Not done

- `hero/CustomHero.tsx` is dead code and still on the old orange system.
- `RealSubscriptionCheckout` is a modal, not landing layout, and was left alone.
- Nothing here was checked in a browser — no browser tooling was available in the
  session that built it. Typecheck, lint and build pass; the layout itself has
  not been looked at.

## Custom work (the work order)

The section after the FAQ. The FAQ says what the software does; this catches the
owner whose trade needs something it doesn't, which was the last objection the
page left standing.

The intake is drawn as a **work order** — the artifact this trade already fills
in when something is made to order — rather than a contact card. It extends the
ledger system instead of restating it: the rest of the page shows ledger
*entries*, this shows a ledger *order form*. Fields sit on ruled rows with the
label left and the control right, the order number sits in the figures column in
tabular numerals, and the red total rule closes the order above the single
action. Controls are borderless and transparent, so the row's own hairline is
the field.

The order number line is blank (`No. ______`) until the row exists, the way a
real pad is, then fills with the reference the API returns.

Decisions worth keeping:

- **No figure in the section heading.** The slot wants a real fact, and the
  honest candidates — turnaround time, price — are business commitments nobody
  had stated. Left empty per the rule, rather than filled with a word. Supply a
  real median turnaround and it belongs there.
- **Four kinds of work, unnumbered.** They are alternatives to pick between, not
  a sequence; `HowItWorks` keeps its numbers because it genuinely is one.
- **Green on the confirmation, not red.** Red is structure here and never a
  status, and the existing sections already use green for completed states
  ("Sent", "Ready to export").
- **No email field.** Phone and WhatsApp is the channel this audience uses and
  the copy promises a call, so an optional email was the accessory to remove.
  The API still accepts `contact_email` if it is ever wanted back.
- **Do not suppress the focus ring.** The first draft put
  `focus-visible:outline-none` on the borderless controls, which ties on
  specificity with `.lp :focus-visible` and would have left keyboard users with
  no visible focus on any field, decided by stylesheet order.

Not checked in a browser — no browser tooling in the session that built it
either. Typecheck, lint, build and the backend tests pass; the layout itself has
not been looked at. The label column is fixed at `11rem`, which is the thing
most likely to need adjusting once seen.

## Tried and rejected

- Rubber-stamp texture and cloth-bound ledger imagery — tips into skeuomorphic
  cliché, and Indian fintech already over-uses the khata-book skin.
- Devanagari type as decoration — borrowing a script for flavour, not for meaning.
- Red CTA — reads as destructive in a finance interface.
- An inline hint beside the "What it should do" label — overflowed the 11rem
  label column and broke the ruled row's baseline. The placeholder carries it.
- A "typically 2-3 weeks" figure on the custom-work heading — inventing a
  delivery promise the business had not made.

## The page / product boundary

The single most important rule added after the first pass: **the page uses the
ledger system, a product shot uses the app's own look.**

`.lp` remaps the app's token names (`--background`, `--card`, `--primary`, …) onto
the ledger palette so the marketing sections inherit it for free. That silently
recoloured the product shots too — the hero was claiming "live product, not a
screenshot" while rendering the dashboard in ink instead of the violet the app
actually is. `.lp .lp-product` restores the app's real values, mirrored from
`src/index.css`.

Anything that depicts the product carries `lp-product` and keeps the app's colours
*and* its radii and shadows: the hero laptop canvas, the five feature-panel screen
columns, the invoice and receipt render stage. Everything else — headings, chips,
tab groups, panels, CTAs — is ruled, square and on the four-colour palette. The
break between the two is deliberate and it carries information: it marks where the
page stops and the software starts.

So a radius or an emerald inside `lp-product` is correct, and the same thing in
page chrome is the card kit creeping back.

## The hero product shot

`hero/LaptopFrame.tsx` holds the live component, not a screenshot. It lays the app
out at a 1200px design width and scales it down with a transform, so the type stays
vector-crisp and the dashboard stays clickable inside the lid.

- Scale is `lidWidth / 1200`. At the current `max-w-5xl` lid that is ~0.85, which
  keeps the app's 12px text at ~10px. Below roughly 900px of lid the UI stops being
  readable and becomes decoration.
- The screen takes the app's measured height, clamped between 16:9 and 1.45:1, so
  there is no empty band under a short page and no clipped row under a tall one.
- The frame does not engage below 1024px of viewport. The app's responsive classes
  are viewport media queries, not container queries, so a phone would render the
  stacked mobile layout inside the lid. Below that the app renders directly.

The mockup sidebar imports the app's own `businessMenuItems` and
`personalMenuItems`, so every module that ships appears on the landing page with no
edit, and the Business mode switch swaps the two lists the way it does in the app.
Only `/business-dashboard` and `/pos` have live views here; the rest are readable
rows that do not pretend to open a screen that is not present.
