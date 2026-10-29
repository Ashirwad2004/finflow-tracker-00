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
| `--lp-brass` | `38 74% 36%` ≈ `#A3721A` | the counter's metal: scale, cash-box clasp |
| `--lp-brass-lit` | `40 86% 52%` | brass catching light — hairlines and glows only |
| `--lp-ink-deep` | `226 48% 9%` ≈ `#0C1322` | the stage: hero band and closing panel |
| `--lp-rule` | `205 22% 82%` | printed ruling |
| `--lp-rule-strong` | `207 20% 68%` | column rules and totals |

Red is structure and emphasis, never a status, and never the CTA — a red button on
a billing page reads as danger. CTAs are ink.

### Type

Two families, one job each.

**Bricolage Grotesque** variable sets display (`.lp-display`, `.lp-title`,
`.lp-shout`), with its optical-size axis pushed to the display end and the width
axis held condensed at heavy weight. It is a drawn grotesque with slightly
irregular terminals and a tall x-height, so at headline size it reads as printed
commercial stationery — the register header, the rate card, the stamped form —
rather than as a geometric SaaS face.

**Archivo** variable keeps body copy and, more importantly, every figure: the
ledger columns depend on its tabular numerals, and the counting figures
(`tally`) are only usable because each glyph is the same width at every step.

`.lp-shout` is the one exception to condensed display: a figure that is the whole
point of the sentence — the zero in the price, a merchant's headline number —
goes wide instead of narrow. Width carries the emphasis, so no colour change and
no italic is needed on it.

System mono appears only inside the thermal-receipt mockups, where the artifact
really is machine output.

An earlier pass used Archivo alone across display and body. One family was the
more disciplined choice, but it gave the page no voice of its own at headline
size — the brief asked for type with character, and a width axis is not a
character.

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

**The brief changed here.** The first pass spent the whole motion budget on one
orchestrated moment in the hero and held everything else still. The page is now
meant to be led by motion throughout, so the question became how to carry a lot
of it without landing on a staggered fade-up per section, which is the generic
default and reads as generated.

The answer is in the subject: **a bill is a thing that gets made.** It is ruled,
written up, tallied, stamped and printed, in that order, at a speed the product
advertises on the front page. So motion is the content being produced rather than
an effect laid over it, and the vocabulary comes straight out of bookkeeping.

Five moves, and nothing else. Anything needing a sixth is probably decoration.

| move | what it does | what it means |
|---|---|---|
| `rule` | a hairline draws itself left to right, 0.9s | structure arriving |
| `set` | type rises into place under a clip mask, per word | words being written |
| `tally` | a figure counts up in tabular numerals | a sum being added |
| `stamp` | a mark overshoots and settles off-axis | the one impression |
| `lift` | depth under pointer and scroll | a real object on a counter |

Durations: 0.9s for a drawn rule (hand speed), 0.5–0.8s for type, 0.5s for a
stamp. Easing is expo-out — `cubic-bezier(0.16, 1, 0.3, 1)` — fast departure and
long settle, which is what makes a drawn line look drawn rather than tweened.

`features/landing/motion/` holds the system. `rule`, `set` and `stamp` also have
CSS implementations in `landing.css`, because the hero's load sequence has to
start on the first frame rather than wait on React. Everything scroll-driven is
Framer Motion, firing once per element — never on the way back up, since a page
that re-animates when you scroll up to re-read a price feels unstable.

`shared/Reveal.tsx` now forwards to the system's `set` move instead of being a
pass-through. New code should import from `@/features/landing/motion` and name a
move.

#### Where the page spends it

- **The hero** is one written-down timeline (`BEAT` in `hero/HeroHeader.tsx`):
  rule at 0.1s, the entry label, the headline in two separately-set lines, body,
  actions, stamp, and the figures totalling last. Absolute delays in one object,
  because nine scattered delay props cannot be reasoned about.
- **`HeroBillFlow`** is the only timer-driven loop on the page. The product's
  central claim is a duration, and a shop owner cannot evaluate "five seconds"
  from the words — only from watching the four things that happen inside it, at
  the pace they happen. It advances on a timer rather than on scroll, because the
  timing *is* the content and must not be scrubbed.
- **`SectionHeading`** performs the same four beats at every section: label in,
  figure counting, rule drawn, heading set. One component opens eight sections,
  so the page gets a rhythm instead of eight invented entrances.
- **Tab and trade switches** (`VyaparFeatures`, `BusinessTypes`,
  `InvoiceThemesShowcase`, the hero's device switcher) move the selection block
  with `layoutId` rather than fading one out and another in, and replace the
  panel under `AnimatePresence mode="wait"`. This is motion answering a click,
  which is the kind that always earns its place.
- **`HowItWorks`** has the page's only scroll-scrubbed element: the timeline
  spine, which is a measure of how far through the sequence you are. It runs on a
  faint full-length track so the part still ahead of you stays visible.
- **The `TrustBand` marquee** came back after being cut in the first pass. A line
  that moves gets read, and a shop owner scanning for their own trade needs the
  list to catch their eye. It stops dead on hover and focus, masks its edges, and
  under reduced motion renders one copy as a plain wrapped list.

#### The looping rule

Two things on the page loop forever: `HeroBillFlow` and `.lp-rule-lit`. The lit
rule is brass travelling along a hairline and it is reserved for a **total** —
the hero's price and the lead merchant's figure. It was briefly under all eight
section headings, at which point it marked nothing; a looping highlight only
earns the loop if it is saying something.

#### Reduced motion

One switch, `@media (prefers-reduced-motion: reduce)` at the end of
`landing.css`, plus `useReducedMotion()` in each primitive. Everything either
stops or settles at its end state — nothing is left mid-transform, and nothing
that was carrying information disappears with the animation. `HeroBillFlow`
becomes the ordered list of four steps it is describing; the marquee becomes a
wrapped list; the spine becomes an undrawn track.

### The stage

The hero and the closing panel are deep ink; everything between them is paper.
Two reasons, and "dark looks premium" is not one of them:

- A product shot can only throw real light against a dark ground. It is what
  makes the laptop read as a machine sitting on a counter instead of an image
  pasted onto paper — on the stage it gets a near-black contact shadow and a thin
  warm bounce under the deck, which is the light above it coming back off the
  counter. A flat screenshot cannot have that.
- A page that opens dark, turns to paper, and closes dark frames the document and
  marks where the marketing stops and the ledger begins.

`.lp-stage` flips the `.lp` tokens rather than restyling anything, so every
`bg-muted`, `text-muted-foreground` and `border-border` already written inside
those sections lands correctly with no rewrite. Two things do need a stage
variant: `.lp-btn`, which would be white on white, becomes filled brass carrying
deep ink — the only place brass is a surface rather than a line — and the hero's
device switcher, whose selected tab was filled with `bg-background` and so became
the *least* visible tab on a dark ground.

The sticky header carries `.lp-stage` until the page scrolls 24px, then drops it
for the paper bar. The swap is instant on purpose: custom properties do not
interpolate, and a half-swapped header looks broken.

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
- `Footer` was left still on purpose. Every other section now moves; the footer
  is where the page should stop performing.
- **Nothing here has been checked in a browser.** No browser tooling was
  available in either session that built this. Typecheck, lint and production
  build pass, and the motion-pass review caught six defects by reading
  (a discarded `delay` prop on every `Reveal`, a lit rule washing brass across
  whole table rows, two `background-image` classes cancelling each other on the
  hero backdrop, a doubled trade list under reduced motion, the invisible
  selected tab on the stage, and `Tally` rounding `₹1.8L` to `2`) — but the
  composition, the type at real sizes, and the timing of the sequences have not
  been looked at. **The hero timeline and the section stagger are the two things
  most likely to need tuning once seen.**

## Custom software conversion panel

The section after the FAQ now serves a broader offer: complete custom web and
mobile apps, RupeeBill enhancements, integrations, and dashboards. It is linked
from the primary navigation and footer so visitors do not need to discover it by
reading the whole page.

The original ruled work-order and the later full split panel were both too large
and formal for a secondary landing-page offer. The final treatment is a compact,
dark CTA banner with a small product-interface illustration. It communicates the
offer in one headline and keeps only two actions visible: start a project or open
WhatsApp.

The structured project form now opens in a modal. This keeps the landing page
short while preserving service selection, lead validation, API submission, and
the generated reference. "Web or mobile app" is selected by default to remove
an avoidable step. The successful state stays inside the same modal.

## Tried and rejected

- Rubber-stamp texture and cloth-bound ledger imagery — tips into skeuomorphic
  cliché, and Indian fintech already over-uses the khata-book skin.
- Devanagari type as decoration — borrowing a script for flavour, not for meaning.
- Red CTA — reads as destructive in a finance interface.
- An inline hint beside the "What it should do" label — overflowed the 11rem
  label column and broke the ruled row's baseline. The placeholder carries it.
- A "typically 2-3 weeks" figure on the custom-work heading — inventing a
  delivery promise the business had not made.
- A live "recent bills" ticker in the hero — fabricating transaction data and
  presenting it as activity. `HeroBillFlow` demonstrates the four steps of a sale
  instead, which is a real description of the product.
- Dimming or tinting the second line of the hero headline — that is the
  one-phrase-accent treatment this page already decided against. The third of a
  second between the two lines carries the hierarchy instead.
- `holdLast` on `SetType`, for releasing the final word of a headline on its own.
  Built, used nowhere, removed.
- The violet-to-indigo wash behind the invoice gallery — violet is the *app's*
  accent. It is brass now, because the page/product boundary below is the one
  rule this design cannot break.

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
