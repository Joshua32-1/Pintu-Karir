# PINTU Karir — Claude Code Build Brief

**Phase 1: layout + framework only. No fixed content.**

> **How to use this file:** save it in the repo as `docs/BRIEF.md`, then open Claude Code and say:
> *"Read docs/BRIEF.md end to end. Confirm your understanding by writing docs/DECISIONS.md with your
> design plan (§4) and your route map (§5). Do not write component code until I approve that file.
> Then execute §13 phase by phase, stopping at each checkpoint."*
>
> The two-step (plan → approve → build) matters. Claude Code that jumps straight to code will produce a
> competent, forgettable dashboard. The plan gate is where the distinctiveness gets decided.

## 1. Context

**Product:** PINTU Karir — a career and income platform for Indonesian students at NTU Singapore, built
under the PINTU Tech umbrella.

**Problem it addresses.** Indonesian students at NTU need side income or work experience but don't know
where to find opportunities they can trust. Gig and job listings are scattered across WhatsApp groups,
Telegram channels, and Instagram stories with no verification and no history. Separately, there is no easy
path to reach alumni for career questions or referrals — the network exists but is invisible and
unaddressable.

**What the product does.** Three surfaces, one graph of people:

- **Gigs** — part-time, freelance, and tutoring work posted by students, alumni, and vetted external posters.
- **Mentorship** — matching to alumni by industry, function, company, batch, and city, with a lightweight
  request-and-session flow.
- **Referrals** — structured internship and job referral requests routed to alumni who can actually make them.

**Audience:** undergraduates, mostly 18–24, mostly on phones, bilingual Indonesian/English, code-switching
constantly. Design for the phone first and the projector second.

**Judging rubric this build is optimized against:**

| Weight | Criterion | What it actually measures | What that means for this codebase |
|---|---|---|---|
| 30% | Does the code work? | Functionality and how real the demo feels | Nothing may be a dead end. Every button does something. Zero network dependency at demo time. |
| 25% | How wild is the idea? | Creativity and originality | The structure itself must be the argument — see the Threshold (§4.5). A generic job board loses this category no matter how well built. |
| 20% | Is the interface good? | UX/UI and ease of use | Design system, real states, motion with intent, accessible by default. |
| 15% | Wow factor | Presentation impact | One orchestrated moment, plus a judge-proof scripted tour (§11). |
| 10% | Q&A | Pitch delivery and answering questions | The UI must contain the answers to the obvious hard questions (§2.3). |

Read that table as the actual spec. Every requirement below traces back to a row in it.

## 2. Scope of this phase

### 2.1 Build these

- Full design token system and theming (light + dark).
- Complete route tree with real, navigable layouts — no placeholder pages.
- Every layout shell, every component shell, every state (loading / empty / error / filtered-empty / success).
- A typed domain model and a repository interface, with a deterministic mock implementation behind it.
- A centralized copy dictionary so the interface renders real-feeling language that can be swapped in one file.
- Demo mode, persona switching, and the scripted judge tour.
- A `/kitchen-sink` route that renders every component in every state.

### 2.2 Do not build these

- **No final copy.** Every user-facing string comes from `src/content/copy.ts`. If a component contains a
  hardcoded English or Indonesian sentence, that's a bug.
- **No real data.** No real names, real companies, real photos, real WhatsApp numbers, real alumni. All mock
  data is generated deterministically from a seed. If a real person's photo exists anywhere in the repo, remove it.
- **No backend, no auth provider, no database.** The repository interface is designed so these drop in later
  without touching a component.
- **No business logic.** Matching, ranking, pricing, and verification each get a pure function with a documented
  signature, a deterministic placeholder implementation, and a `TODO(logic)` marker.
- **No payments, no messaging infrastructure, no notifications infrastructure.** Shells only.
- **No lorem ipsum.** Placeholder copy must read like a real product wrote it, because judges read the screen.
  Lorem ipsum reads as unfinished; plausible copy reads as shipped.

### 2.3 Build the answers to these questions into the UI

These come up in Q&A. If the interface already answers them, the answer is credible instead of defensive.

- **"Why not just LinkedIn?"** → Because LinkedIn can't tell you which alumnus actually shares your major, your
  batch adjacency, and your visa situation. Make that visible in the mentor card.
- **"Why not the existing WhatsApp group?"** → Because a WhatsApp group has no history, no verification, and no
  accountability after the gig ends. Make verification state and completed-gig history first-class in the schema
  and visible in the UI.
- **"How do you solve cold start with zero alumni?"** → The UI should not pretend to be at scale. Design the
  small-network state to feel intentional (see §10.3): "4 mentors in your major" presented with confidence beats
  a fake directory of 400.
- **"Can international students legally take these gigs?"** → Student's Pass holders in Singapore have work
  restrictions. Put a `workEligibility` field in the gig schema and a compliance surface in the gig detail layout.
  Leave the actual rule text as `TODO(content)` — but build the slot. A judge who asks this and sees a slot for it
  gets a much better answer than one who sees nothing.

## 3. Stack and constraints

**Framework:** Next.js (App Router, TypeScript, `src/` directory). Scaffold with `npx create-next-app@latest` —
do not pin versions from memory. After install, run `npx next --version`, record it in `docs/DECISIONS.md`, and use
version-matched documentation for any API you're unsure about.

**Approved dependencies:**

| Purpose | Package | Notes |
|---|---|---|
| Styling | Tailwind CSS (latest major) | Verify v3 vs v4 config syntax against the installed version before writing config. |
| Primitives | shadcn/ui + Radix | Install only components you use. Restyle them — default shadcn is a visual tell. |
| Icons | lucide-react | One icon family throughout. |
| Motion | motion (Framer Motion) | See §4.6 for the discipline required. |
| Client state | zustand | Threshold value, persona, demo state, filters. |
| Server state | @tanstack/react-query | Wraps the repo layer so swapping in a real backend changes nothing upstream. |
| Forms | react-hook-form + zod | One zod schema per form, colocated with the domain type. |
| Mock data | @faker-js/faker + seedrandom | Seeded. Same seed → identical data every run. |
| Fonts | next/font | Self-hosted. No runtime CDN font requests. |
| Charts (if needed) | recharts | Only if §5 pathway view needs it. Prefer hand-rolled SVG for the signature visual. |

Anything outside this table: **ask first.**

**Hard constraints:**

- TypeScript `strict: true`. No `any`. No `@ts-ignore`.
- **Zero external network requests at runtime.** Fonts self-hosted, images local, all data local. Venue wifi must be
  irrelevant to the demo. This single constraint protects 30% of the score.
- Everything must work at **360px** width. Test it.
- **Dark mode is not optional** — the demo may run on a projector in a dark room, and dark mode is where this palette
  is strongest.
- Every commit builds. Run `npm run build` before each checkpoint.

## 4. Design direction

This section is the brief for the design plan, not the plan itself. Write your plan into `docs/DECISIONS.md` first.
Before you build it, stress-test it: would you have produced the same palette and type pairing for a fintech dashboard,
a travel startup, and a study-notes app? If yes, it isn't a choice — revise it and say what you changed.

Three looks to actively avoid, because they're the current defaults rather than decisions: cream background with
high-contrast serif and terracotta accent; near-black with a single acid-green accent; broadsheet layout with hairline
rules and zero border-radius.

### 4.1 The grounding idea

**Pintu means door.** That is not a coincidence to decorate with — it's the product thesis. This is a door between where
a student is and where they're trying to get. Every structural device should encode passage: thresholds, openings, gates,
the state of being between two rooms.

The specific architectural reference is the **gapura** — the split gate. Two halves that part to let someone through. Use
it as a structural motif, not as clip art: split reveals, paired asymmetric columns, an arch aspect ratio for portrait
cards. Do not put a literal illustrated gate on the landing page.

### 4.2 Color

Define 6 tokens, semantic names, in one file. Starting proposal — refine it, but keep the information logic, which is the
part that matters:

| Token | Suggested value | Job |
|---|---|---|
| `--ink` | `#171A21` | Base text; dark-mode background |
| `--merah` | `#CE1126` | Gigs, earning, primary action |
| `--laut` | `#0E7C7B` | Mentorship, growth, long-horizon |
| `--emas` | `#C9A227` | Verification and trust only — never decoration |
| `--kertas` | `#FBFAF7` | Light-mode surface |
| `--abu` | `#6E7583` | Secondary text, borders, disabled |

The point: **hue carries meaning.** Red-family means income now. Teal-family means career later. Gold means verified. A
user should be able to read the feed's temperature without reading a word. Do not introduce a fourth accent. Do not use
gradient-on-everything.

Verify AA contrast for every text-on-surface pair in both themes, and fix the ones that fail rather than shipping them.

### 4.3 Type

Three roles, deliberately paired:

- **Display** — something with actual personality and a variable width axis; Bricolage Grotesque is a good candidate.
  Used at large sizes only, with restraint.
- **Body** — a clean neutral workhorse; Geist or Instrument Sans.
- **Numeric/utility** — a monospace for money, rates, hours, dates, batch years. Geist Mono. Tabular figures everywhere
  numbers align in a column.

Fluid type scale via `clamp()`, roughly 1.2 ratio on mobile widening to 1.25 on desktop. Set the scale as tokens; never
write a raw `font-size` in a component.

The monospace-for-money decision does real work: this product is partly about earning, and mono numerals make amounts feel
like data rather than marketing.

### 4.4 Layout system

- 12-column grid, 1200px max content width, 24px gutters desktop / 16px mobile.
- 4px spacing base, exposed as tokens. No arbitrary pixel values in components.
- Two radii only: one for cards, one for controls. Pick them and hold the line.
- One elevation ramp of three steps. Prefer borders and background shifts over shadow stacks.

### 4.5 The signature: the Threshold

**This is the element the product is remembered by. Build it well.**

A single persistent control — a horizontal rail — that the user slides between two poles:

```
  Cuan sekarang  ●──────────────────────────  Karier nanti
  (earn now)                                  (career later)
```

Sliding it **does not filter.** It re-weights the entire home feed in place: at the left extreme the feed is dominated by
gigs paying this week; at the right extreme by mentors, referral windows, and long-horizon opportunities; in the middle it
interleaves. Cards reorder with layout animation. Section headers change. The accent temperature of the page shifts along
the red→teal axis defined in §4.2.

Why this wins the creativity category: every competitor in this space presents jobs and mentorship as two separate tabs.
Modeling them as two ends of one axis a student is actually standing between is a genuine product argument, and it's
legible in three seconds during a demo.

For this phase: build the control, the store slice, the re-ranking function (`src/lib/ranking/threshold.ts` — deterministic
placeholder that reads a `horizonScore` off each mock item), and the animated reorder. The real ranking model is `TODO(logic)`.

**Requirements:** keyboard-operable (arrow keys, Home/End), value persisted, ARIA slider semantics with a live text
description of the current state, and a graceful reduced-motion path where cards cross-fade instead of flying.

### 4.6 Motion

**One orchestrated moment, then restraint everywhere else.** Scattered animation is the strongest tell that a UI was
generated rather than designed.

The one moment: the **gapura reveal** on first load — two panels part, content settles in a short stagger. Once per session,
~700ms, skippable, and fully replaced by a fade under `prefers-reduced-motion`.

Everywhere else: 120–180ms hover and press feedback, layout-animated list reordering for the Threshold, and route transitions
(View Transitions API if the installed Next version supports it, otherwise a simple opacity/transform pair).

Nothing loops. Nothing floats ambiently. No parallax.

## 5. Route map

Route slugs in English (maintainability), interface copy bilingual with Indonesian as default (audience). Locale lives in the
copy layer, not in routing — no `[lang]` segment in this phase.

| Route | Purpose |
|---|---|
| `/` | Landing — gapura reveal, thesis hero, three-surface explainer |
| `/sign-in` | Auth shell — NTU email pattern, mock only |
| `/onboarding` | 3 steps: role → interests & major → verification stub |
| `/home` | Dashboard — Threshold rail + unified feed ★ demo centerpiece |
| `/gigs` | Gig board — filter rail, sort, list/grid toggle |
| `/gigs/[id]` | Gig detail — sticky apply card, poster trust panel, eligibility slot |
| `/gigs/new` | Post a gig — 3-step form shell |
| `/mentors` | Alumni directory — filters: industry, function, company, batch, city |
| `/mentors/[id]` | Mentor profile — availability, request-session sheet |
| `/pathways` | Pathway map — where alumni from your major actually went ★ wow |
| `/referrals` | Referral requests board — open windows, request flow |
| `/profile/[handle]` | Public profile — verification ladder, history, portfolio |
| `/messages` | Two-pane thread shell (mobile: list → thread) |
| `/notifications` | Grouped notification list |
| `/settings` | Locale, theme, notification preferences, account shell |
| `/kitchen-sink` | Component gallery, all states — dev/demo builds only |

★ = must be flawless. Everything else must be complete and correct, but these two carry the demo.

`/pathways` deserves a note. It is a static-layout visualization: your major on the left, a spine of company/industry
destinations on the right, curved SVG paths between them weighted by how many alumni took each route, clicking a destination
filters the mentor directory. This is the single most persuasive screen for "why this can't be WhatsApp" — the network becomes
visible. Build it as a deterministic SVG from mock data, no physics simulation, no layout thrash. If it can't be made beautiful
in the time available, cut it to a simple ranked list rather than shipping it half-rendered.

## 6. Layout shells

**Desktop (≥1024px)**

```
┌──────────────────────────────────────────────────────────────┐
│ [PINTU Karir]   [ search ⌘K ]      [Threshold ●───]  [avatar] │  64px bar
├──────────┬───────────────────────────────────────────────────┤
│          │                                                    │
│  Home    │   ┌─────────────────────────────────────────────┐  │
│  Gigs    │   │  greeting + Threshold state, in words       │  │
│  Mentors │   └─────────────────────────────────────────────┘  │
│  Paths   │   ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  Refer   │   │              │ │              │ │           │  │
│  Msgs    │   │   feed card  │ │   feed card  │ │  card     │  │
│          │   └──────────────┘ └──────────────┘ └───────────┘  │
│  ───     │                                                    │
│  Settings│                                                    │
└──────────┴───────────────────────────────────────────────────┘
   240px rail, collapsible to 72px icons
```

**Mobile (<768px)**

```
┌─────────────────────┐
│ ☰   PINTU Karir   ◐ │  top app bar, 56px
├─────────────────────┤
│  ●────────────      │  Threshold, sticky under bar
├─────────────────────┤
│  ┌───────────────┐  │
│  │   feed card   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   feed card   │  │
│  └───────────────┘  │
├─────────────────────┤
│ ⌂    ▤    ◈    ✉  ○ │  bottom tabs, 5 max, 56px + safe area
└─────────────────────┘
```

**Detail pages** (gig, mentor) — 8/4 split with a sticky action card in the right column above 1024px; single column with a
fixed bottom action bar below it.

**Overlays** — right-side sheet on desktop, bottom sheet on mobile, from one `Sheet` primitive. Focus trapped, Esc closes,
scroll locked, focus restored on close.

## 7. Component inventory

Build every one of these with props typed, all states handled, and an entry in `/kitchen-sink`.

- **Foundation** — ThemeProvider, Container, Stack, Grid, Section, Divider, VisuallyHidden
- **Navigation** — AppShell, SideRail, TopBar, BottomTabs, CommandPalette (⌘K), Breadcrumbs, PersonaSwitcher
- **Signature** — ThresholdRail, ThresholdBadge, GapuraReveal, PathwayMap, PathwayStrand
- **Domain cards** — GigCard, MentorCard, ReferralCard, SessionCard, ProfileCard, FeedCard (discriminated union renderer over
  the three types)
- **Trust** — VerificationBadge (tiers: unverified → email-verified → student-verified → alumni-verified), TrustLadder,
  HistoryStrip (completed gigs / sessions held)
- **Inputs** — SearchField, FilterRail, FilterChip, MultiSelect, RangeInput, DateRangeInput, TagInput, Combobox, Stepper,
  FormField (label + hint + error + required, one component)
- **Feedback** — Skeleton (per card type, matching real dimensions), EmptyState, ErrorState, Toast, InlineAlert, ProgressRing,
  LoadingBar
- **Overlays** — Sheet, Dialog, Popover, Tooltip, DropdownMenu, ConfirmDialog
- **Demo** — DemoControls, JudgeTour, TourStep, ScenarioPicker

## 8. Data layer

**The rule: components never know where data comes from.**

```
src/lib/
  types.ts            Domain types — the contract
  repo/
    index.ts          Repo interface + provider
    mock.repo.ts      Deterministic seeded implementation (this phase)
    supabase.repo.ts  Stub. Every method throws NotImplementedError.
  ranking/threshold.ts   rankByHorizon(items, threshold) → items
  matching/score.ts      scoreMatch(student, mentor) → { score, reasons[] }
  verification/tier.ts   tierFor(user) → VerificationTier
src/mock/
  seed.ts             Single seed constant. Change it → new world, same shape.
  generators.ts       makeGig(), makeMentor(), makeReferral(), makeUser()
  scenarios.ts        Named demo states: 'fresh', 'active', 'rich', 'empty', 'error'
```

Sketch the domain types along these lines and refine as you build — the shape matters more than the exact fields:

```ts
type Horizon = number; // 0 = pays this week, 1 = pays in three years

type Gig = {
  id: string;
  kind: 'part-time' | 'freelance' | 'tutoring' | 'campus';
  horizonScore: Horizon;
  compensation: { min: number; max: number; currency: 'SGD' | 'IDR'; period: 'hour' | 'session' | 'project' };
  commitment: { hoursPerWeek: number; weeks: number | null };
  workEligibility: EligibilityFlag[];   // TODO(content): rule text
  poster: PosterRef;                     // carries verification tier
  location: { mode: 'onsite' | 'remote' | 'hybrid'; area: string | null };
  postedAt: string;
  // ...
};

type Mentor = {
  id: string;
  horizonScore: Horizon;
  batch: number;
  major: string;
  path: PathStep[];                      // feeds PathwayMap
  offers: ('chat' | 'review' | 'referral' | 'mock-interview')[];
  availability: AvailabilityWindow[];
  verification: VerificationTier;
  // ...
};
```

Every generator takes an optional `overrides` object. Every list method takes filter/sort/pagination params. `MockRepo` methods
return promises with a small artificial latency (120–400ms, configurable, 0ms in demo mode) so skeletons are visible in
development and invisible in the demo.

**Deterministic seeding is non-negotiable.** The same seed produces the same world every time. A demo that looks different on
each reload is a demo you can't rehearse.

## 9. Copy layer

```ts
// src/content/copy.ts
export const copy = {
  home: {
    greeting: { id: '...', en: '...' },
    thresholdHint: { id: '...', en: '...' },
    emptyFeed: { title: {...}, body: {...}, action: {...} },
  },
  // ...
} as const;
```

Typed so a missing key is a compile error. Accessed through a `useCopy()` hook that reads the current locale. Indonesian is the
default; English toggles in settings.

Write placeholder copy that follows these rules, because judges read the screen:

- Plain verbs, sentence case, no filler. Be specific rather than clever.
- Name things by what the user controls, never by how the system works.
- A control says exactly what happens: "Send request", not "Submit". The action keeps its name through the whole flow — the
  button that says "Apply" produces a toast that says "Applied".
- Errors state what happened and what to do next. They don't apologize and they're never vague.
- Empty states are invitations to act, not mood pieces.
- Mark anything genuinely undecided with `TODO(content)` and a one-line note on what's needed.

## 10. States

### 10.1 Every async surface implements

`loading` (skeleton matching final layout — no spinners on list views) · `empty` (never populated) · `filtered-empty`
(populated but filters exclude everything — offer to clear them) · `error` (what happened + retry) · `partial` (some sections
loaded) · `success`

`/kitchen-sink` must be able to force each state.

### 10.2 Forms

Inline validation on blur, not on keystroke. Errors adjacent to the field. Submit disabled only while pending, never as a
validation signal. Optimistic UI where the mock supports it, with rollback on the injected-error path.

### 10.3 Small-network states

**Special case, and important.** When there are 3 mentors in a major rather than 300, do not render an apologetic empty state.
Render the three with confidence and offer an adjacent expansion ("also showing 2 batches either side"). The product's honest
early state should look deliberate — this is directly the answer to the cold-start question in §2.3.

## 11. Demo mode

The most common way a hackathon demo fails is not bad code. It's wifi, or a login, or data that looks different than it did in
rehearsal. Engineer that away.

**DemoControls** — floating panel, toggled by `` ` ``, present only when `NEXT_PUBLIC_DEMO_MODE=true`:

- Switch persona: Student / Alumni / Poster — instantly re-renders the whole shell
- Load scenario: fresh / active / rich / empty / error
- Reset to seed
- Toggle artificial latency
- Toggle skeleton preview
- Fast-forward time (moves relative dates so "posted 2 hours ago" stays true)

**JudgeTour** — press `J` or open `/?tour=1`. A guided overlay walking six steps in a fixed order, each with a spotlight, a
caption, and a real interaction. Arrow keys navigate, Esc exits, progress dots visible, resumable.

Proposed sequence: land → gapura reveal → drag the Threshold from left to right and watch the feed transform → open a gig, see
the trust panel → open the pathway map, click a destination → land in a filtered mentor list → send a request.

This is worth building properly. It converts the 15% wow criterion from "hope the demo goes well" into a rehearsed, repeatable,
ninety-second artifact, and it lets a judge re-run the whole thing themselves on their own phone afterward.

Also: a `--demo` build that seeds localStorage on first load, an offline-safe service worker or fully static export if it's
cheap, and a printed QR to the deployed URL. All three protect the 30%.

## 12. Quality floor

Build to this without announcing it.

- **Responsive** 360 / 768 / 1024 / 1440. Test each. No horizontal scroll anywhere.
- **Keyboard** — every interactive element reachable and operable. Visible focus ring, styled to the design system, never
  `outline: none` without a replacement. Logical tab order. Skip-to-content link.
- **Screen reader** — landmarks, headings in order, labeled controls, `aria-live` for toasts and the Threshold value.
- **Contrast** — AA minimum, both themes, verified not assumed.
- **Reduced motion** — `prefers-reduced-motion` fully respected; the app must be pleasant with all animation off.
- **No layout shift** — skeletons match final dimensions; images have explicit dimensions.
- **Performance** — Lighthouse ≥ 90 on performance and accessibility for `/home`. No unnecessary client components; keep
  `'use client'` at the leaves.
- **Clean console** — no errors, no warnings, no React key warnings, no hydration mismatches.
- **No dead ends** — every link resolves, every button acts. If something is genuinely out of scope, it is visibly and
  deliberately marked, not silently inert.

## 13. Build order

Commit at every phase. Stop at every checkpoint and report.

- **Phase 0 — Foundation.** Scaffold, dependency install, strict TypeScript, folder structure, `CLAUDE.md` (conventions,
  commands, architecture notes for future sessions), `docs/DECISIONS.md` with the design plan from §4 and the version numbers
  actually installed. → **Checkpoint: show me DECISIONS.md before writing any component.**
- **Phase 1 — Design system.** Tokens, themes, fonts, type scale, spacing, radii, elevation. The eight or so primitives
  everything else is built from. Start `/kitchen-sink`. → **Checkpoint: screenshot of /kitchen-sink, both themes.**
- **Phase 2 — Shells and routing.** AppShell, rail, top bar, bottom tabs, command palette, every route from §5 rendering its
  real layout with skeletons. Navigation fully working. → **Checkpoint: screenshots at 360px and 1440px.**
- **Phase 3 — Data and states.** Types, repo interface, seeded mock, generators, scenarios, React Query wiring. Every list,
  card, and state populated. All five states per surface. → **Checkpoint: /kitchen-sink showing every state.**
- **Phase 4 — Signature.** ThresholdRail with store, re-ranking, and layout-animated reorder. GapuraReveal. PathwayMap.
  → **Checkpoint: screen recording of the Threshold sweeping left to right.**
- **Phase 5 — Flows.** Apply to gig, request a mentor, post a gig, request a referral, onboarding. Sheets, forms, validation,
  optimistic updates, toasts.
- **Phase 6 — Demo layer.** DemoControls, JudgeTour, personas, scenarios, zero-latency demo path.
- **Phase 7 — Polish and audit.** Motion pass, reduced-motion pass, keyboard pass, contrast pass, Lighthouse, console clean,
  `npm run build` clean, README with setup and demo instructions. → **Checkpoint: run §15 and report each line honestly.**

## 14. Deliverables

- Working app, `npm run dev` from clean clone with no environment variables required.
- `README.md` — setup, scripts, architecture in a paragraph, how to run the demo, how to swap the mock repo for a real one.
- `CLAUDE.md` — conventions and commands for future sessions.
- `docs/DECISIONS.md` — design plan, what was rejected and why, installed versions, open questions.
- `docs/HANDOFF.md` — a table of every `TODO(content)` and `TODO(logic)`, what each needs, and who supplies it.
- `/kitchen-sink` — complete component gallery.

## 15. Acceptance checklist

Run this yourself before declaring done. Report each line as pass or fail, honestly — a false pass here costs more than a known gap.

**Functionality (30%)**

- [ ] Clean clone → `npm i` → `npm run dev` works with zero configuration
- [ ] `npm run build` passes with no errors or warnings
- [ ] Zero outbound network requests at runtime (check the Network tab in airplane mode)
- [ ] Every route renders; no 404s, no dead links, no inert buttons
- [ ] All five flows complete end to end against the mock
- [ ] Reload produces identical data every time
- [ ] Console clean across every route

**Creativity (25%)**

- [ ] The Threshold works, and its effect on the feed is obvious within three seconds
- [ ] Gigs and mentorship are modeled as one axis, not two tabs
- [ ] Verification and history are structural, not badges bolted on
- [ ] `/pathways` makes the alumni network legible in a way a list cannot

**Interface (20%)**

- [ ] Every color and size traces to a token; no arbitrary values in components
- [ ] Both themes complete and AA-compliant
- [ ] 360px through 1440px with no horizontal scroll
- [ ] Every async surface has all five states
- [ ] Keyboard-navigable throughout with visible focus
- [ ] `prefers-reduced-motion` fully respected
- [ ] Lighthouse ≥ 90 performance and accessibility on `/home`

**Wow (15%)**

- [ ] Gapura reveal lands, is skippable, and degrades to a fade
- [ ] JudgeTour runs start to finish without a stumble
- [ ] Threshold reorder animation is smooth on a mid-range phone
- [ ] Personas switch instantly and change the interface meaningfully

**Q&A (10%)**

- [ ] Trust and verification are visible on gig and mentor surfaces
- [ ] `workEligibility` slot exists on gigs
- [ ] Small-network state looks deliberate, not broken
- [ ] `HANDOFF.md` accounts for every unfinished decision

**Scope discipline**

- [ ] No hardcoded user-facing strings outside `copy.ts`
- [ ] No real names, companies, or photographs anywhere in the repo
- [ ] No lorem ipsum
- [ ] Every unimplemented decision carries a TODO and a `HANDOFF.md` row

## 16. Working agreement

- Read this file before each phase. Follow the approved `DECISIONS.md` exactly; if you want to deviate, say so and wait.
- Ask before adding any dependency outside §3.
- Small commits, conventional messages, one concern each.
- If a requirement here is wrong or impossible, say so rather than working around it silently.
- If you find yourself writing a specific fact — a company, a rate, a person, a policy — stop. That's a `TODO(content)`, and it
  belongs in `HANDOFF.md`.
- Screenshot your own work at each checkpoint and critique it before I do.
