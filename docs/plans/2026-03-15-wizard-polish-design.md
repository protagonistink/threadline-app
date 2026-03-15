# Wizard Polish Pass — Design Document

**Date:** 2026-03-15
**Scope:** Monthly Planning Wizard, Weekly Planning Wizard, WeeklyIntentions view
**Goal:** Fix bugs, improve ceremony, add step transitions, and make the monthly entry point a clear part of the flow.

---

## Background

The Monthly and Weekly planning wizards are the highest-intention moments in the app — they set the context for everything that follows. The current implementation has the right editorial language but lacks ceremony: CTAs have no visual weight, steps swap abruptly, and the "Locked In" payoff (step 4) feels flat. This pass raises all of those.

---

## Changes

### 1. Bug Fixes & Token Alignment

**GOAL_COLORS duplicate** (affects `WeeklyPlanningWizard.tsx`, `WeeklyIntentions.tsx`)
- Current: `bg-done` used for both "Muted" and "Green" — they look identical
- Fix: Introduce a third color token `--color-accent-green: oklch(58% 0.14 160)` (muted sage) in `globals.css`, add `bg-accent-green` to Tailwind theme block
- Update `GOAL_COLORS` in both files to use three distinct values: `bg-accent-warm`, `bg-done`, `bg-accent-green`

**Off-system tokens in countdown selector** (`WeeklyPlanningWizard.tsx:238–258`)
- Current: `text-ink/40`, `hover:text-ink/60`, `bg-amber-400/20 text-amber-300`
- Fix: Replace with `text-text-muted`, `hover:text-text-primary`, `bg-accent-warm/15 text-accent-warm`

### 2. Step Transitions (Both Wizards)

Both wizards currently swap step content with no animation. Add `AnimatePresence` with directional motion:

- Track step direction via a ref (`prevStep`)
- Forward navigation: `initial={{ x: 16, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}`
- Back navigation: `initial={{ x: -16, opacity: 0 }}` → `animate={{ x: 0, opacity: 1 }}`
- Duration: 200ms, ease: `easeOut`, `mode="wait"` on `AnimatePresence`
- Wrap the per-step content render in a `motion.div` keyed by step

### 3. CTA Weight — "Begin the Week" & Final Save Buttons

- **Weekly wizard step 4:** `Begin the Week` → `bg-accent-warm text-bg` (currently ghost style)
- **Monthly wizard step 3:** `Lock in [Month]` is already `bg-accent-warm` — no change needed
- Both final-step buttons should be visually distinct from all `Next →` navigation buttons

### 4. Ritual Step Improvements (Weekly Step 3)

**Add workday context above the capacity summary:**
```
Workday ends at 6:00 PM · [workdayEnd formatted]
```
Pull from `workdayEnd` state, format as `h:mm a`.

**Replace `<input type="number">` with step buttons:**
- Display value as plain text: `30m`, `1h`, etc. using existing `formatMins()`
- Flanked by `−` and `+` buttons that step by `getStepMins()` logic (15m <60min, 30m 60–119min, 60m ≥120min — same pattern as Timeline pomodoro counter)
- Min value: 0 (− button disabled at 0)

### 5. "Locked In" Step Redesign (Weekly Step 4)

The payoff moment. Changes:
- **Card expands:** Modal widens to `max-w-2xl` on step 4 via `motion.div` layout animation on the card container
- **Week date range:** Below "Your week is set." heading, add a line: `March 16 – 22` (derived from `startOfWeek` / `endOfWeek`)
- **Staggered goal cards:** Each goal card animates in with `delay: index * 0.08s` — the week assembles itself
- **Monthly aim shown first:** If `monthlyPlan.oneThing` is set, it appears at the top with its month label before the goal cards
- **Capacity strip:** Ritual load + focused time → compact single `flex` row instead of two-row table
- **"Begin the Week" button:** Full-width, `bg-accent-warm`, separated by a top border — not a footer nav button

### 6. Monthly Step 3 Payoff

After the `why` textarea, once both `oneThing` and `why` are non-empty, display a pull-quote block:
- Thin horizontal rule above and below
- `oneThing` in `font-display italic text-[22px]` centered
- `why` beneath in `text-[13px] text-text-muted italic` centered
- Replaces the current left-bordered preview card

### 7. Monthly Wizard Header — Step Labels

Add `stepLabels` array to match the Weekly wizard:
```ts
const stepLabels = ['Reflect', 'Set Intent', 'Lock It In'];
```
Display beside the dots in the header as mono text. Mirrors the Weekly wizard's UX pattern.

### 8. Monthly Entry Point (WeeklyIntentions + Weekly Wizard)

**In `WeeklyIntentions` (goals view):**

The monthly aim strip is the primary portal to the Monthly Wizard from the homescreen. Upgrade it:

- When no monthly plan: render a proper CTA card (not just metadata text) — `editorial-card` styled section with heading "No monthly aim yet" + an accent-warm "Set your aim for [Month] →" button
- When monthly plan exists: show `oneThing` prominently at `text-[18px]` with month label, and an "Edit" button that is visible (not just on hover)

**In Weekly wizard Step 2 (Goals):**

When `!monthlyPlan`, show a linked nudge inline beneath the step heading:
```
No monthly aim set.  [Set one first →]
```
The link calls `openMonthlyPlanning()` — which opens the monthly wizard. The weekly wizard stays open behind it (both can be open simultaneously since they're separate `isOpen` states and the monthly wizard renders at `z-50` above the weekly).

---

## Files Changed

| File | Changes |
|---|---|
| `src/styles/globals.css` | Add `--color-accent-green` token |
| `src/components/WeeklyPlanningWizard.tsx` | Transitions, CTA fix, ritual inputs, step 4 redesign, step 2 nudge, GOAL_COLORS fix, token fix |
| `src/components/MonthlyPlanningWizard.tsx` | Transitions, step labels, step 3 payoff block |
| `src/components/WeeklyIntentions.tsx` | Monthly aim strip upgrade, GOAL_COLORS fix |

---

## Out of Scope

- `WeeklyIntentions` layout rework (7-day grid, xl breakpoint) — deferred to a separate audit pass
- "Protect the thread" copy on day cells — deferred
- Empty task lane affordance — deferred
