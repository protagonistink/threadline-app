# Wizard Polish Pass — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Monthly and Weekly planning wizard UX: fix bugs, add step transitions, upgrade the Locked In ceremony, improve the monthly entry point, and make "Begin the Week" feel like an actual commitment.

**Architecture:** Pure React/CSS changes across 4 files. Step transitions use `motion/react` (already installed). No new components extracted — changes stay co-located with each wizard. The `MonthlyPlanningWizard` gets `z-[60]` so it can overlay the Weekly wizard when both are open.

**Tech Stack:** React 18, TypeScript, Tailwind v4 (CSS variable tokens in `@theme {}`), `motion/react` v12 (`AnimatePresence`, `motion.div`), `date-fns`, vitest

**Design doc:** `docs/plans/2026-03-15-wizard-polish-design.md`

---

## File Map

| File | What changes |
|---|---|
| `src/styles/globals.css` | Add `--color-accent-green` token to all 3 theme blocks + `@theme {}` |
| `src/components/WeeklyPlanningWizard.tsx` | GOAL_COLORS fix, countdown token fix, direction tracking, AnimatePresence, ritual step buttons + workday context, Step 4 redesign, Step 2 monthly nudge, "Begin the Week" accent CTA |
| `src/components/MonthlyPlanningWizard.tsx` | Step labels, AnimatePresence, step 3 pull-quote payoff, z-index bump to `z-[60]` |
| `src/components/WeeklyIntentions.tsx` | GOAL_COLORS fix, monthly aim strip upgrade |

---

## Chunk 1: Token Foundation

### Task 1: Add `--color-accent-green` design token

The third goal color is currently a duplicate of `bg-done`. Add a real token: a muted sage green that sits alongside rust and grey without competing.

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Add token to `@theme {}` block (line ~18)**

  Find the block starting with `@theme {` and add after `--color-accent-warm`:

  ```css
  --color-accent-green: oklch(55% 0.10 155);  /* muted sage */
  ```

- [ ] **Step 2: Add token to `[data-theme="dark"]` block**

  Find `[data-theme="dark"] {` (or the inline dark variables block ~line 45) and add:

  ```css
  --color-accent-green: oklch(55% 0.10 155);
  ```

- [ ] **Step 3: Add token to light theme block**

  Find the light theme block (`--color-bg: #f5f4f1` block ~line 68) and add:

  ```css
  --color-accent-green: oklch(48% 0.10 155);
  ```
  (Slightly darker for light mode contrast)

- [ ] **Step 4: Add token to focus theme block (if it exists)**

  Search for a focus/theater theme block in globals.css. If present, add `--color-accent-green: oklch(55% 0.10 155);` there too. If absent, skip.

- [ ] **Step 5: Verify token resolves in browser**

  Run `npm run dev`, open DevTools, inspect any element and check `--color-accent-green` resolves. Alternatively, temporarily add `background: var(--color-accent-green)` to `.bg-accent-green` and visually confirm a muted green appears.

- [ ] **Step 6: Commit**

  ```bash
  git add src/styles/globals.css
  git commit -m "feat(tokens): add --color-accent-green for third goal color"
  ```

---

## Chunk 2: Bug Fixes

### Task 2: Fix GOAL_COLORS duplicate in all three files

Current: index 1 and 2 both use `bg-done` → visually identical dots. Fix: use `bg-accent-green` for index 2.

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx` (line ~9)
- Modify: `src/components/WeeklyIntentions.tsx` (line ~8)

- [ ] **Step 1: Fix WeeklyPlanningWizard.tsx**

  Find:
  ```ts
  const GOAL_COLORS = [
    { label: 'Warm', value: 'bg-accent-warm' },
    { label: 'Muted', value: 'bg-done' },
    { label: 'Green', value: 'bg-done' },
  ];
  ```

  Replace with:
  ```ts
  const GOAL_COLORS = [
    { label: 'Warm', value: 'bg-accent-warm' },
    { label: 'Muted', value: 'bg-done' },
    { label: 'Green', value: 'bg-accent-green' },
  ];
  ```

- [ ] **Step 2: Fix WeeklyIntentions.tsx**

  Same replacement in `WeeklyIntentions.tsx` line ~8.

- [ ] **Step 3: Visual check**

  Open the weekly planning wizard → Step 2. The three color dots in an IntentionCard should now show rust, grey, and sage green — three visually distinct options.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx src/components/WeeklyIntentions.tsx
  git commit -m "fix(wizard): third goal color was duplicate bg-done, now uses bg-accent-green"
  ```

### Task 3: Fix off-system tokens in countdown selector

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx` (IntentionCard countdown section ~line 234)

- [ ] **Step 1: Find the countdown button block**

  Locate the `{goal && countdowns.length > 0 && (` block (~line 234). It contains buttons with:
  - `bg-amber-400/20 text-amber-300` (active state)
  - `text-ink/40 hover:text-ink/60` (inactive state)

- [ ] **Step 2: Replace with design token classes**

  Replace the two `className` expressions in that block:

  **"No deadline" button:**
  ```tsx
  className={cn(
    'px-2 py-0.5 rounded text-xs transition-colors',
    !goal.countdownId
      ? 'bg-accent-warm/15 text-accent-warm'
      : 'text-text-muted hover:text-text-primary'
  )}
  ```

  **countdown map buttons:**
  ```tsx
  className={cn(
    'px-2 py-0.5 rounded text-xs transition-colors',
    goal.countdownId === cd.id
      ? 'bg-accent-warm/15 text-accent-warm'
      : 'text-text-muted hover:text-text-primary'
  )}
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | grep -E "error|warning" | head -20
  ```
  Expected: no new errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx
  git commit -m "fix(wizard): replace off-system amber/ink tokens in countdown selector"
  ```

---

## Chunk 3: Step Transitions

### Task 4: Step transitions in WeeklyPlanningWizard

Add directional AnimatePresence so forward steps slide in from the right, back steps from the left.

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx`

- [ ] **Step 1: Add motion imports**

  At the top of `WeeklyPlanningWizard.tsx`, add to imports:
  ```tsx
  import { AnimatePresence, motion } from 'motion/react';
  ```

- [ ] **Step 2: Add direction state to WeeklyPlanningWizard**

  Inside the `WeeklyPlanningWizard` function, after the existing state declarations, add:
  ```tsx
  const [direction, setDirection] = useState(1);
  ```

- [ ] **Step 3: Update handleNext and handleBack to set direction**

  Replace:
  ```tsx
  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      completeWeeklyPlanning();
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }
  ```

  With:
  ```tsx
  function handleNext() {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      completeWeeklyPlanning();
    }
  }

  function handleBack() {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }
  ```

- [ ] **Step 4: Wrap step content in AnimatePresence + motion.div**

  Find the `{/* Content */}` section:
  ```tsx
  {/* Content */}
  <div className="flex-1 overflow-y-auto px-8 py-7 hide-scrollbar">
    {step === 1 && (
      <StepReview ... />
    )}
    {step === 2 && <StepGoals monthlyPlan={monthlyPlan} />}
    {step === 3 && <StepRituals />}
    {step === 4 && <StepLockedIn carriedForwardCount={visibleMigrated.length} />}
  </div>
  ```

  Replace the inner content (keep the outer div) with:
  ```tsx
  {/* Content */}
  <div className="flex-1 overflow-y-auto px-8 py-7 hide-scrollbar">
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        initial={(d: number) => ({ x: d * 16, opacity: 0 })}
        animate={{ x: 0, opacity: 1 }}
        exit={(d: number) => ({ x: d * -16, opacity: 0 })}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {step === 1 && (
          <StepReview
            migratedTasks={visibleMigrated}
            onDrop={handleDrop}
            candidateItems={candidateItems}
          />
        )}
        {step === 2 && <StepGoals monthlyPlan={monthlyPlan} />}
        {step === 3 && <StepRituals />}
        {step === 4 && <StepLockedIn carriedForwardCount={visibleMigrated.length} />}
      </motion.div>
    </AnimatePresence>
  </div>
  ```

- [ ] **Step 5: Verify build is clean**

  ```bash
  npm run build 2>&1 | grep -E "error" | head -20
  ```

- [ ] **Step 6: Test in app**

  Open the weekly wizard. Click Next and Back. Content should slide in from the correct direction at ~200ms. Should feel snappy, not sluggish.

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx
  git commit -m "feat(wizard): add directional step transitions to weekly planning wizard"
  ```

### Task 5: Step transitions in MonthlyPlanningWizard

Same pattern as the weekly wizard.

**Files:**
- Modify: `src/components/MonthlyPlanningWizard.tsx`

- [ ] **Step 1: Add motion imports**

  ```tsx
  import { AnimatePresence, motion } from 'motion/react';
  ```

- [ ] **Step 2: Add direction state and step labels**

  Inside `MonthlyPlanningWizard`, after existing state declarations, add:
  ```tsx
  const [direction, setDirection] = useState(1);
  const stepLabels = ['Reflect', 'Set Intent', 'Lock It In'];
  ```

- [ ] **Step 3: Wrap step content in AnimatePresence**

  Find the `{/* Step content */}` section. The current structure renders `{step === 1 && ...}` etc. directly inside `<div className="flex-1 overflow-y-auto ...">`.

  Wrap it:
  ```tsx
  <div className="flex-1 overflow-y-auto px-8 py-7 hide-scrollbar">
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        initial={(d: number) => ({ x: d * 16, opacity: 0 })}
        animate={{ x: 0, opacity: 1 }}
        exit={(d: number) => ({ x: d * -16, opacity: 0 })}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {step === 1 && ( /* ...reflection step... */ )}
        {step === 2 && ( /* ...oneThing step... */ )}
        {step === 3 && ( /* ...why step... */ )}
      </motion.div>
    </AnimatePresence>
  </div>
  ```

- [ ] **Step 4: Add step label to header**

  Find the header section. Currently it shows dots + `Month · {monthLabel}`. Add the step label:

  Replace the header inner content so it reads:
  ```tsx
  <div className="flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i < step ? 'bg-text-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
        {stepLabels[step - 1]}
      </span>
    </div>
    <span className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
      {monthLabel}
    </span>
    <button
      onClick={closeMonthlyPlanning}
      className="text-text-muted hover:text-text-primary transition-colors"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
  ```

  > Note: The header now has three slots: left (dots + step label), center (month), right (close). Adjust flex layout so it's `justify-between` across three items.

- [ ] **Step 5: Update Next/Back buttons to set direction**

  The footer `setStep` calls need direction tracking. The footer currently uses inline `onClick={() => setStep((s) => s - 1)}` and `onClick={() => setStep((s) => s + 1)}`. Replace:

  ```tsx
  {/* Back */}
  <button
    onClick={() => { setDirection(-1); setStep((s) => s - 1); }}
    ...
  >
    ← Back
  </button>

  {/* Next */}
  <button
    onClick={() => { setDirection(1); setStep((s) => s + 1); }}
    ...
  >
    Next →
  </button>
  ```

- [ ] **Step 6: Bump z-index to z-[60]**

  The monthly wizard needs to render above the weekly wizard when both are open (Step 2 monthly nudge in Task 11). Find the outermost `<div className="fixed inset-0 z-50 ...">` in `isMonthlyPlanningOpen && (...)` and change to `z-[60]`. Do the same for the `monthlyPlanPrompt` overlay.

- [ ] **Step 7: Build check + visual test**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

  Open app → open monthly wizard. Steps should slide, header should show step label ("Reflect", "Set Intent", "Lock It In") alongside month.

- [ ] **Step 8: Commit**

  ```bash
  git add src/components/MonthlyPlanningWizard.tsx
  git commit -m "feat(wizard): add step transitions and step labels to monthly planning wizard"
  ```

---

## Chunk 4: Ritual Step Improvements

### Task 6: Ritual time — step buttons + workday context

Replace the raw `<input type="number">` with `−`/`+` step buttons. Show the workday end time for context.

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx` (StepRituals component ~line 310)

- [ ] **Step 1: Add step size helper inline**

  Inside `StepRituals` (before the return), add:
  ```tsx
  function getStepMins(current: number): number {
    if (current < 60) return 15;
    if (current < 120) return 30;
    return 60;
  }
  ```

- [ ] **Step 2: Add workday end label above capacity summary**

  The workday end is `workdayEnd: { hour: number; min: number }` from `useApp()`. Add a helper:
  ```tsx
  function formatWorkdayEnd(hour: number, min: number): string {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const m = min.toString().padStart(2, '0');
    return `${h}:${m} ${suffix}`;
  }
  ```

  In the return JSX, above the capacity summary block (`{rituals.length > 0 && (`), add:
  ```tsx
  <div className="text-[12px] text-text-muted">
    Workday ends at {formatWorkdayEnd(workdayEnd.hour, workdayEnd.min)}
  </div>
  ```

- [ ] **Step 3: Replace number input with step buttons**

  Find the ritual list item render (~line 340):
  ```tsx
  <input
    type="number"
    min={0}
    step={15}
    value={ritual.estimateMins ?? 0}
    onChange={(e) => updateRitualEstimate(ritual.id, parseInt(e.target.value) || 0)}
    className="w-14 bg-transparent border-b border-border-subtle text-[12px] font-mono text-text-muted text-right outline-none"
  />
  <span className="text-[11px] text-text-muted">min</span>
  ```

  Replace with:
  ```tsx
  <div className="flex items-center gap-1.5">
    <button
      onClick={() => {
        const current = ritual.estimateMins ?? 0;
        const step = getStepMins(current);
        updateRitualEstimate(ritual.id, Math.max(0, current - step));
      }}
      disabled={(ritual.estimateMins ?? 0) === 0}
      className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg transition-colors disabled:opacity-30 text-[14px] leading-none"
      aria-label="Decrease"
    >
      −
    </button>
    <span className="text-[12px] font-mono text-text-muted w-10 text-center">
      {formatMins(ritual.estimateMins ?? 0)}
    </span>
    <button
      onClick={() => {
        const current = ritual.estimateMins ?? 0;
        const step = getStepMins(current);
        updateRitualEstimate(ritual.id, current + step);
      }}
      className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg transition-colors text-[14px] leading-none"
      aria-label="Increase"
    >
      +
    </button>
  </div>
  ```

  > Note: `formatMins` is already defined at the top of this file (~line 17). No import needed.

- [ ] **Step 4: Build check**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

- [ ] **Step 5: Test in app**

  Open weekly wizard → Step 3 (Rituals). Add a ritual. Verify:
  - `−` is disabled at 0, enabled above 0
  - `+` steps: 0 → 15m → 30m → 45m → 60m → 90m → 120m → 180m
  - Workday end label appears above capacity bar
  - No browser number spinner visible

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx
  git commit -m "feat(wizard): replace ritual number input with step buttons, add workday end context"
  ```

---

## Chunk 5: Locked In Redesign

### Task 7: Step 4 — ceremony, card expansion, stagger, accent CTA

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx` (StepLockedIn ~line 394, WeeklyPlanningWizard main ~line 471)

- [ ] **Step 1: Add date-fns imports for week range**

  At the top of `WeeklyPlanningWizard.tsx`, add to the existing (or create) date-fns import:
  ```tsx
  import { endOfWeek, format, startOfWeek } from 'date-fns';
  ```

- [ ] **Step 2: Add motion import (if not already added in Task 4)**

  ```tsx
  import { AnimatePresence, motion } from 'motion/react';
  ```

- [ ] **Step 3: Redesign StepLockedIn component**

  Replace the entire `StepLockedIn` function:

  ```tsx
  function StepLockedIn({ carriedForwardCount }: { carriedForwardCount: number }) {
    const { weeklyGoals, rituals, workdayEnd, monthlyPlan } = useApp();

    const totalRitualMins = rituals.reduce((sum, r) => sum + (r.estimateMins ?? 0), 0);
    const workdayMins = workdayEnd.hour * 60 + workdayEnd.min - WORKDAY_START_MINS;
    const focusedMins = Math.max(0, workdayMins - totalRitualMins);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekRange = `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd')}`;

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="font-display italic text-[28px] font-light tracking-wide text-text-primary">
            Your week is set.
          </h2>
          <p className="text-[13px] text-text-muted mt-1 font-mono uppercase tracking-widest">
            {weekRange}
          </p>
        </div>

        {monthlyPlan?.oneThing && (
          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
              {new Date().toLocaleDateString('en-US', { month: 'long' })}
            </div>
            <div className="font-display italic text-[14px] text-text-muted leading-relaxed">
              {monthlyPlan.oneThing}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted">
            This Week
          </div>
          {weeklyGoals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.08, ease: 'easeOut' }}
              className="rounded-lg border border-border bg-bg-card p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', goal.color)} />
                <h3 className="text-[15px] font-medium text-text-primary">{goal.title}</h3>
              </div>
              {goal.why && (
                <p className="text-[13px] text-text-muted italic pl-[22px] leading-relaxed">
                  "{goal.why}"
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {(totalRitualMins > 0 || carriedForwardCount > 0) && (
          <div className="flex items-center gap-6 text-[12px] text-text-muted">
            {carriedForwardCount > 0 && (
              <span>
                <span className="font-mono uppercase tracking-widest text-[10px]">Carried </span>
                {carriedForwardCount} {carriedForwardCount === 1 ? 'task' : 'tasks'}
              </span>
            )}
            {totalRitualMins > 0 && (
              <>
                <span>
                  <span className="font-mono uppercase tracking-widest text-[10px]">Rituals </span>
                  {formatMins(totalRitualMins)}/day
                </span>
                <span>
                  <span className="font-mono uppercase tracking-widest text-[10px]">Focus </span>
                  ~{formatMins(focusedMins)}/day
                </span>
              </>
            )}
          </div>
        )}

        <p className="font-display italic text-[16px] text-text-muted text-center">
          Three things. Seven days. Make it count.
        </p>
      </div>
    );
  }
  ```

- [ ] **Step 4: Expand card on step 4 + accent CTA**

  In the main `WeeklyPlanningWizard` return, find the Card div:
  ```tsx
  <div className="relative z-10 w-full max-w-xl mx-6 bg-bg-elevated border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
  ```

  Wrap it in a `motion.div` with layout animation for width expansion:
  ```tsx
  <motion.div
    layout
    className={cn(
      'relative z-10 w-full mx-6 bg-bg-elevated border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]',
      step === 4 ? 'max-w-2xl' : 'max-w-xl'
    )}
    transition={{ layout: { duration: 0.3, ease: 'easeOut' } }}
  >
    {/* ...all existing card content... */}
  </motion.div>
  ```

- [ ] **Step 5: Make "Begin the Week" accent-warm**

  Find the final-step button in the footer:
  ```tsx
  <button
    onClick={handleNext}
    className="px-5 py-2 rounded-md bg-bg-card border border-border text-[13px] font-medium text-text-primary hover:bg-bg hover:border-border-hover transition-colors"
  >
    {step === TOTAL_STEPS ? 'Begin the Week' : 'Next →'}
  </button>
  ```

  Split into two separate buttons so the final step can have its own style:
  ```tsx
  {step === TOTAL_STEPS ? (
    <button
      onClick={handleNext}
      className="px-6 py-2.5 rounded-md bg-accent-warm text-bg text-[13px] font-medium hover:bg-accent-warm/90 transition-colors"
    >
      Begin the Week
    </button>
  ) : (
    <button
      onClick={handleNext}
      className="px-5 py-2 rounded-md bg-bg-card border border-border text-[13px] font-medium text-text-primary hover:bg-bg hover:border-border-hover transition-colors"
    >
      Next →
    </button>
  )}
  ```

- [ ] **Step 6: Build check**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

- [ ] **Step 7: Test in app**

  Walk through all 4 steps of the weekly wizard:
  - Step 4: card should animate slightly wider
  - Goal cards should stagger in (each ~80ms apart)
  - "Begin the Week" button is rust/accent-warm — clearly different from "Next →"
  - Capacity stats show as a single horizontal strip

- [ ] **Step 8: Commit**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx
  git commit -m "feat(wizard): redesign Locked In step with stagger, card expansion, and accent CTA"
  ```

---

## Chunk 6: Monthly Payoff

### Task 8: Monthly step 3 pull-quote payoff

When both `oneThing` and `why` are filled, display the intention as a pull-quote.

**Files:**
- Modify: `src/components/MonthlyPlanningWizard.tsx` (step 3 content ~line 143)

- [ ] **Step 1: Replace the preview card with a pull-quote block**

  In step 3's JSX, find the preview card:
  ```tsx
  {oneThing.trim().length > 0 && (
    <div className="mt-6 rounded-lg bg-bg-card border-l-2 border-accent-warm px-4 py-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-text-muted mb-1">
        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>
      <div className="font-display italic text-[15px] text-text-primary leading-snug">
        {oneThing}
      </div>
    </div>
  )}
  ```

  Replace with:
  ```tsx
  {oneThing.trim().length > 0 && why.trim().length > 0 && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-8 flex flex-col items-center gap-3"
    >
      <div className="w-full border-t border-border-subtle" />
      <div className="py-4 flex flex-col items-center gap-2 text-center">
        <div className="font-display italic text-[22px] font-light text-text-primary leading-snug max-w-sm">
          {oneThing}
        </div>
        <div className="text-[13px] text-text-muted italic max-w-xs leading-relaxed">
          {why}
        </div>
      </div>
      <div className="w-full border-b border-border-subtle" />
    </motion.div>
  )}
  ```

  > Note: `motion` must be imported (added in Task 5). `AnimatePresence` is not needed here since it's a single conditional render — just `motion.div` with `initial`/`animate`.

- [ ] **Step 2: Build + test**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

  Open monthly wizard → advance to step 3. Type something in the `why` field. Once both fields have content, the pull-quote block should fade+slide in below.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/MonthlyPlanningWizard.tsx
  git commit -m "feat(wizard): replace monthly step 3 preview card with pull-quote payoff block"
  ```

---

## Chunk 7: Monthly Entry Points

### Task 9: Monthly nudge in Weekly wizard Step 2

When no monthly plan is set, Step 2 of the weekly wizard should surface a link to set one.

**Files:**
- Modify: `src/components/WeeklyPlanningWizard.tsx` (StepGoals component ~line 267)

- [ ] **Step 1: Add openMonthlyPlanning to StepGoals**

  `StepGoals` currently receives `monthlyPlan` as a prop. Add `openMonthlyPlanning` from `useApp()`:

  In the `StepGoals` function body, the first line is:
  ```tsx
  const { weeklyGoals, addWeeklyGoal, renameWeeklyGoal, updateGoalWhy, updateGoalColor, updateGoalCountdown, countdowns } = useApp();
  ```

  Add `openMonthlyPlanning` to this destructure:
  ```tsx
  const { weeklyGoals, addWeeklyGoal, renameWeeklyGoal, updateGoalWhy, updateGoalColor, updateGoalCountdown, countdowns, openMonthlyPlanning } = useApp();
  ```

- [ ] **Step 2: Add nudge below step heading when no monthly plan**

  In `StepGoals`'s return, find where `monthlyPlan?.oneThing` is conditionally shown:
  ```tsx
  {monthlyPlan?.oneThing && (
    <p className="font-display italic text-[14px] text-text-muted leading-relaxed">
      {new Date().toLocaleDateString('en-US', { month: 'long' })}: {monthlyPlan.oneThing}
    </p>
  )}
  ```

  Replace with:
  ```tsx
  {monthlyPlan?.oneThing ? (
    <p className="font-display italic text-[14px] text-text-muted leading-relaxed">
      {new Date().toLocaleDateString('en-US', { month: 'long' })}: {monthlyPlan.oneThing}
    </p>
  ) : (
    <p className="text-[13px] text-text-muted">
      No monthly aim set.{' '}
      <button
        onClick={openMonthlyPlanning}
        className="text-accent-warm hover:text-accent-warm/80 transition-colors underline-offset-2 hover:underline"
      >
        Set one first →
      </button>
    </p>
  )}
  ```

  > When the user clicks "Set one first →", `openMonthlyPlanning()` opens the monthly wizard at `z-[60]`, which renders above the weekly wizard (z-50). The weekly wizard stays open behind it. When the monthly wizard is saved and closed, the user returns to Step 2 of the weekly wizard with `monthlyPlan.oneThing` now populated.

- [ ] **Step 3: Build check**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

- [ ] **Step 4: Test the flow**

  If no monthly plan is set: open weekly wizard → Step 2 → "No monthly aim set. Set one first →" is visible. Click it → monthly wizard opens on top. Complete monthly → close. Weekly wizard Step 2 now shows the monthly aim. ✓

### Task 10: Upgrade monthly aim strip in WeeklyIntentions

The "goals homescreen" currently shows the monthly aim as a plain text row. Upgrade it so when no plan exists it reads as a CTA card, and when it exists the Edit button is clearly visible.

**Files:**
- Modify: `src/components/WeeklyIntentions.tsx` (monthly aim section ~line 281)

- [ ] **Step 1: Replace the conditional monthly aim strip**

  Find in `WeeklyIntentions`'s return:

  ```tsx
  {monthlyPlan ? (
    <div className="border-b border-border-subtle pb-5 mb-2 flex items-start justify-between gap-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <p className="mt-1 font-display italic text-[18px] font-light text-text-primary leading-snug">
          {monthlyPlan.oneThing}
        </p>
      </div>
      <button
        onClick={openMonthlyPlanning}
        className="shrink-0 text-[12px] text-text-muted hover:text-text-primary transition-colors mt-0.5"
      >
        Edit
      </button>
    </div>
  ) : (
    <div className="border-b border-border-subtle pb-5 mb-2 flex items-baseline justify-between gap-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} hasn't been planned
      </div>
      <button
        onClick={openMonthlyPlanning}
        className="shrink-0 text-[12px] text-accent-warm hover:text-accent-warm/80 transition-colors"
      >
        Plan now
      </button>
    </div>
  )}
  ```

  Replace with:

  ```tsx
  {monthlyPlan ? (
    <div className="editorial-card rounded-[24px] px-7 py-5 flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-muted">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <p className="mt-2 font-display italic text-[20px] font-light text-text-primary leading-snug">
          {monthlyPlan.oneThing}
        </p>
      </div>
      <button
        onClick={openMonthlyPlanning}
        className="shrink-0 mt-1 px-3 py-1.5 rounded-md border border-border text-[12px] text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
      >
        Edit
      </button>
    </div>
  ) : (
    <div className="editorial-card rounded-[24px] px-7 py-5 border-dashed flex items-center justify-between gap-4">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-muted">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <p className="mt-1 text-[14px] text-text-muted">
          No monthly aim set yet.
        </p>
      </div>
      <button
        onClick={openMonthlyPlanning}
        className="shrink-0 px-4 py-2 rounded-md bg-accent-warm text-bg text-[13px] font-medium hover:bg-accent-warm/90 transition-colors"
      >
        Set aim for {new Date().toLocaleDateString('en-US', { month: 'long' })} →
      </button>
    </div>
  )}
  ```

- [ ] **Step 2: Build check**

  ```bash
  npm run build 2>&1 | grep "error" | head -10
  ```

- [ ] **Step 3: Test in app**

  Navigate to Weekly Intentions (goals view):
  - **With no monthly plan:** Shows editorial card with dashed border, "Set aim for March →" in accent-warm
  - **With monthly plan:** Shows `oneThing` at 20px italic, "Edit" as a bordered button (visible, not just text)
  - Clicking either opens the Monthly Planning Wizard ✓

- [ ] **Step 4: Commit everything from Tasks 9 + 10**

  ```bash
  git add src/components/WeeklyPlanningWizard.tsx src/components/WeeklyIntentions.tsx
  git commit -m "feat(wizard): add monthly nudge in weekly step 2, upgrade monthly aim strip in goals view"
  ```

---

## Final Verification

- [ ] **Full build clean**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no errors, `✓ built in Xs`

- [ ] **Run tests**

  ```bash
  npm test
  ```
  Expected: existing tests pass (this plan adds no new test logic, but shouldn't break any existing tests)

- [ ] **Full walkthrough**

  1. Weekly Intentions (goals view): no monthly plan → accent-warm CTA card → click → monthly wizard opens → complete it → returns to goals view with aim displayed in editorial card with visible "Edit" button
  2. Weekly wizard: Step 1 slides in. Click Next → Step 2 slides from right. If no monthly plan → nudge present. Click "Set one first →" → monthly wizard opens over weekly. Complete monthly → close. Step 2 now shows aim. Continue to Step 3 → rituals with step buttons + workday context. Step 4 → card expands, goals stagger in, "Begin the Week" in rust. Click it.
  3. Monthly wizard standalone: Step label in header, slides between steps, step 3 payoff block appears once both fields filled.

- [ ] **Final commit**

  ```bash
  git commit --allow-empty -m "chore: wizard polish pass complete"
  ```
  (only if no unstaged changes remain — otherwise ensure everything is staged and committed above)
