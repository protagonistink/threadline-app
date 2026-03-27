# Gravity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Gravity" system that dims non-priority UI until the user engages with their most stale intention, then releases for the day.

**Architecture:** A `useGravity` hook computes the stale intention and whether gravity is released. It reads existing `timeLogs`, `weeklyGoals`, and `plannedTasks` from PlannerContext. A `GravityContext` wraps the app to provide `{ gravityActive, staleGoal, releaseGravity }` to any component that needs it. CSS classes `.gravity-dim` handle the visual dimming. Anarchy mode is a Cmd+K command that calls `releaseGravity()` and persists "anarchy" for the day.

**Tech Stack:** React context + hooks, Tailwind/CSS, existing PomodoroTimer integration, existing CommandPalette, existing `useAttentionBalance` from `useWeeklyMode.ts`.

---

### Task 1: useGravity Hook — Core Logic

**Files:**
- Create: `src/hooks/useGravity.ts`
- Test: `src/hooks/useGravity.test.ts`

This hook computes:
1. Which intention (if any) is stale — longest `daysSinceLastActivity` where `energyLevel === 'quiet'` AND intention is below 40% satisfaction
2. Whether gravity has been released today (timer ran ≥ 5 min on a task under any stale intention, or anarchy was invoked)

**Step 1: Write the failing test**

Create `src/hooks/useGravity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeGravityState, type GravityInput } from './useGravity';

describe('computeGravityState', () => {
  const baseInput: GravityInput = {
    attentionData: [],
    todayTimeLogs: [],
    todayAnarchy: false,
    weekendGravity: true,
    isWeekend: false,
    weeklyModeActive: true,
  };

  it('returns inactive when no intentions exist', () => {
    const result = computeGravityState(baseInput);
    expect(result.active).toBe(false);
    expect(result.staleGoalId).toBeNull();
  });

  it('returns inactive when all intentions are warm', () => {
    const result = computeGravityState({
      ...baseInput,
      attentionData: [
        { goalId: 'g1', energyLevel: 'warm', daysSinceLastActivity: 0, tasksThisWeek: 5, tasksDone: 3 },
      ],
    });
    expect(result.active).toBe(false);
  });

  it('activates for the quietest intention', () => {
    const result = computeGravityState({
      ...baseInput,
      attentionData: [
        { goalId: 'g1', energyLevel: 'warm', daysSinceLastActivity: 0, tasksThisWeek: 5, tasksDone: 3 },
        { goalId: 'g2', energyLevel: 'quiet', daysSinceLastActivity: 4, tasksThisWeek: 10, tasksDone: 1 },
        { goalId: 'g3', energyLevel: 'quiet', daysSinceLastActivity: 6, tasksThisWeek: 8, tasksDone: 0 },
      ],
    });
    expect(result.active).toBe(true);
    expect(result.staleGoalId).toBe('g3');
  });

  it('skips intentions at or above 40% satisfaction', () => {
    const result = computeGravityState({
      ...baseInput,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 4 },
      ],
    });
    expect(result.active).toBe(false);
  });

  it('releases when anarchy is true', () => {
    const result = computeGravityState({
      ...baseInput,
      todayAnarchy: true,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 1 },
      ],
    });
    expect(result.active).toBe(false);
  });

  it('releases when today has a focus log for the stale goal >= 5 min', () => {
    const result = computeGravityState({
      ...baseInput,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 1 },
      ],
      todayTimeLogs: [
        { objectiveId: 'g1', durationMins: 6 },
      ],
    });
    expect(result.active).toBe(false);
  });

  it('does not release for focus log under 5 min', () => {
    const result = computeGravityState({
      ...baseInput,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 1 },
      ],
      todayTimeLogs: [
        { objectiveId: 'g1', durationMins: 3 },
      ],
    });
    expect(result.active).toBe(true);
  });

  it('respects weekend setting', () => {
    const result = computeGravityState({
      ...baseInput,
      isWeekend: true,
      weekendGravity: false,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 1 },
      ],
    });
    expect(result.active).toBe(false);
  });

  it('returns inactive when weekly mode is not active', () => {
    const result = computeGravityState({
      ...baseInput,
      weeklyModeActive: false,
      attentionData: [
        { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 10, tasksDone: 1 },
      ],
    });
    expect(result.active).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useGravity.test.ts`
Expected: FAIL — module `./useGravity` not found

**Step 3: Write minimal implementation**

Create `src/hooks/useGravity.ts`:

```typescript
import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { usePlanner } from '@/context/AppContext';
import { useAttentionBalance, useWeeklyMode } from '@/hooks/useWeeklyMode';

/** Minimal attention shape needed by gravity computation */
export interface GravityAttention {
  goalId: string;
  energyLevel: 'warm' | 'steady' | 'quiet';
  daysSinceLastActivity: number;
  tasksThisWeek: number;
  tasksDone: number;
}

/** Minimal time-log shape needed by gravity computation */
export interface GravityTimeLog {
  objectiveId: string | null;
  durationMins: number;
}

export interface GravityInput {
  attentionData: GravityAttention[];
  todayTimeLogs: GravityTimeLog[];
  todayAnarchy: boolean;
  weekendGravity: boolean;
  isWeekend: boolean;
  weeklyModeActive: boolean;
}

export interface GravityState {
  active: boolean;
  staleGoalId: string | null;
  staleGoalTitle: string | null;
  daysSinceActivity: number;
}

const SATISFACTION_THRESHOLD = 0.4;
const RELEASE_MINUTES = 5;

export function computeGravityState(input: GravityInput): GravityState {
  const inactive: GravityState = { active: false, staleGoalId: null, staleGoalTitle: null, daysSinceActivity: 0 };

  if (!input.weeklyModeActive) return inactive;
  if (input.isWeekend && !input.weekendGravity) return inactive;
  if (input.todayAnarchy) return inactive;
  if (input.attentionData.length === 0) return inactive;

  // Find the stalest intention that's below satisfaction threshold
  const staleIntentions = input.attentionData
    .filter((a) => {
      if (a.energyLevel !== 'quiet') return false;
      if (a.tasksThisWeek === 0) return false;
      const satisfaction = a.tasksDone / a.tasksThisWeek;
      return satisfaction < SATISFACTION_THRESHOLD;
    })
    .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);

  if (staleIntentions.length === 0) return inactive;

  const stalest = staleIntentions[0];

  // Check if today's time logs have enough focus on any stale intention
  const staleGoalIds = new Set(staleIntentions.map((a) => a.goalId));
  const focusOnStale = input.todayTimeLogs
    .filter((log) => log.objectiveId && staleGoalIds.has(log.objectiveId))
    .reduce((sum, log) => sum + log.durationMins, 0);

  if (focusOnStale >= RELEASE_MINUTES) return inactive;

  return {
    active: true,
    staleGoalId: stalest.goalId,
    staleGoalTitle: null, // resolved by the hook, not the pure function
    daysSinceActivity: stalest.daysSinceLastActivity,
  };
}

export function useGravity() {
  const { weeklyGoals, timeLogs } = usePlanner();
  const weeklyMode = useWeeklyMode();
  const attentionData = useAttentionBalance();

  const [anarchyDate, setAnarchyDate] = useState<string | null>(null);

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const isWeekend = [0, 6].includes(new Date().getDay());
  const todayAnarchy = anarchyDate === todayKey;

  const todayTimeLogs = useMemo(() => {
    return timeLogs
      .filter((log) => log.startedAt.startsWith(todayKey))
      .map((log) => ({ objectiveId: log.objectiveId, durationMins: log.durationMins }));
  }, [timeLogs, todayKey]);

  const gravityInput: GravityInput = useMemo(() => ({
    attentionData: attentionData.map((a) => ({
      goalId: a.goalId,
      energyLevel: a.energyLevel,
      daysSinceLastActivity: a.daysSinceLastActivity,
      tasksThisWeek: a.tasksThisWeek,
      tasksDone: a.tasksDone,
    })),
    todayTimeLogs,
    todayAnarchy,
    weekendGravity: true, // TODO: wire to user setting later
    isWeekend,
    weeklyModeActive: weeklyMode === 'active-week',
  }), [attentionData, todayTimeLogs, todayAnarchy, isWeekend, weeklyMode]);

  const state = useMemo(() => {
    const computed = computeGravityState(gravityInput);
    if (computed.staleGoalId) {
      const goal = weeklyGoals.find((g) => g.id === computed.staleGoalId);
      return { ...computed, staleGoalTitle: goal?.title ?? null };
    }
    return computed;
  }, [gravityInput, weeklyGoals]);

  const invokeAnarchy = useCallback(() => {
    setAnarchyDate(todayKey);
  }, [todayKey]);

  return { ...state, invokeAnarchy, todayAnarchy };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useGravity.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/hooks/useGravity.ts src/hooks/useGravity.test.ts
git commit -m "feat(gravity): add useGravity hook with pure computation and tests"
```

---

### Task 2: GravityContext Provider

**Files:**
- Create: `src/context/GravityContext.tsx`
- Modify: `src/App.tsx` (wrap app with GravityProvider — find the provider tree)

This wraps `useGravity` into a context so any component can read gravity state without prop drilling.

**Step 1: Find where providers are composed**

Read `src/App.tsx` to locate the provider tree. The GravityProvider must be inside the existing `AppProvider` (needs planner data) but wrapping the main layout.

**Step 2: Write the context provider**

Create `src/context/GravityContext.tsx`:

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import { useGravity, type GravityState } from '@/hooks/useGravity';

interface GravityContextValue extends GravityState {
  invokeAnarchy: () => void;
  todayAnarchy: boolean;
}

const GravityContext = createContext<GravityContextValue>({
  active: false,
  staleGoalId: null,
  staleGoalTitle: null,
  daysSinceActivity: 0,
  invokeAnarchy: () => {},
  todayAnarchy: false,
});

export function GravityProvider({ children }: { children: ReactNode }) {
  const gravity = useGravity();
  return (
    <GravityContext.Provider value={gravity}>
      {children}
    </GravityContext.Provider>
  );
}

export function useGravityContext() {
  return useContext(GravityContext);
}
```

**Step 3: Add GravityProvider to the app provider tree**

Modify `src/App.tsx`: Wrap the main layout children with `<GravityProvider>`. Place it inside `<AppProvider>` so it has access to PlannerContext.

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean compilation, no errors

**Step 5: Commit**

```bash
git add src/context/GravityContext.tsx src/App.tsx
git commit -m "feat(gravity): add GravityContext provider to app tree"
```

---

### Task 3: Gravity CSS — The Dim

**Files:**
- Modify: `src/styles/globals.css` (after the existing `focus-dim` rules, around line 296)

Add gravity-specific dim classes that work independently of focus mode. These use a `[data-gravity="active"]` attribute on `<html>`, similar to how themes use `[data-theme]`.

**Step 1: Write the CSS rules**

Add to `src/styles/globals.css` after the focus-dim section:

```css
/* === GRAVITY — Intention Enforcement ===
   Dims non-priority UI when the user hasn't engaged their stale intention.
   Uses [data-gravity="active"] on documentElement. Lighter than focus-dim:
   content is readable and clickable, just visually receded. */

[data-gravity="active"] .gravity-dim {
  opacity: 0.5;
  filter: saturate(0.6);
  transition: opacity 500ms cubic-bezier(0.22, 1, 0.36, 1),
              filter 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Release transition — when gravity lifts */
.gravity-dim {
  transition: opacity 500ms cubic-bezier(0.22, 1, 0.36, 1),
              filter 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

**Step 2: Add data-gravity attribute management**

Modify `src/context/GravityContext.tsx` — add a `useEffect` inside `GravityProvider` that sets `document.documentElement.setAttribute('data-gravity', gravity.active ? 'active' : 'released')`:

```typescript
import { createContext, useContext, useEffect, type ReactNode } from 'react';

// Inside GravityProvider:
useEffect(() => {
  document.documentElement.setAttribute(
    'data-gravity',
    gravity.active ? 'active' : 'released'
  );
}, [gravity.active]);
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 4: Commit**

```bash
git add src/styles/globals.css src/context/GravityContext.tsx
git commit -m "feat(gravity): add gravity-dim CSS and data-gravity attribute"
```

---

### Task 4: Apply gravity-dim Classes to UI Components

**Files:**
- Modify: `src/components/inbox/UnifiedInbox.tsx:429` — add `gravity-dim` class
- Modify: `src/components/rail/RightRail.tsx:135` — add `gravity-dim` class
- Modify: `src/components/shared/TaskCard.tsx:178` — conditionally add `gravity-dim` when task is NOT under the stale intention

**Step 1: Add gravity-dim to UnifiedInbox**

At line 429, the root div already has `focus-dim`. Add `gravity-dim` alongside it:

```typescript
'focus-dim gravity-dim bg-bg column-divider flex flex-col ...'
```

**Step 2: Add gravity-dim to RightRail**

At line 135, the `<aside>` element. Add `gravity-dim`:

```typescript
<aside className="gravity-dim w-[280px] flex-shrink-0 ...">`
```

**Step 3: Conditionally dim TaskCards**

This is the key visual — tasks under the stale intention stay bright, others dim.

Modify `TaskCard` to accept an optional `gravityTarget` prop and use `useGravityContext`:

```typescript
import { useGravityContext } from '@/context/GravityContext';

// Inside TaskCard component:
const { active: gravityActive, staleGoalId } = useGravityContext();
const isGravityTarget = gravityActive && task.weeklyGoalId === staleGoalId;
const isGravityDimmed = gravityActive && !isGravityTarget;
```

Add to the root div's `cn()` call:

```typescript
isGravityDimmed && 'gravity-dim',
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 5: Commit**

```bash
git add src/components/inbox/UnifiedInbox.tsx src/components/rail/RightRail.tsx src/components/shared/TaskCard.tsx
git commit -m "feat(gravity): apply gravity-dim to inbox, rail, and non-target task cards"
```

---

### Task 5: Gravity Prompt in the Morning Briefing

**Files:**
- Create: `src/components/shared/GravityPrompt.tsx`
- Modify: `src/components/ink/MorningBriefing.tsx` — add GravityPrompt above the messages area
- Modify: `src/modes/PlanningMode.tsx` or wherever Flow view renders — add GravityPrompt at top of task list

The gravity prompt shows the blunt statement and a "Start timer" button.

**Step 1: Create GravityPrompt component**

Create `src/components/shared/GravityPrompt.tsx`:

```typescript
import { useGravityContext } from '@/context/GravityContext';
import { usePlanner } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export function GravityPrompt() {
  const { active, staleGoalId, staleGoalTitle, daysSinceActivity } = useGravityContext();
  const { plannedTasks } = usePlanner();

  if (!active || !staleGoalId || !staleGoalTitle) return null;

  // Find the oldest uncommitted task under the stale intention
  const targetTask = plannedTasks
    .filter((t) => t.weeklyGoalId === staleGoalId && t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => {
      // Prefer tasks without recent activity
      const aDate = a.lastCommittedDate ?? '0000';
      const bDate = b.lastCommittedDate ?? '0000';
      return aDate.localeCompare(bDate);
    })[0];

  const handleStartTimer = async () => {
    if (!targetTask) return;
    await window.api.pomodoro.start(targetTask.id, targetTask.title);
  };

  const dayLabel = daysSinceActivity === 1
    ? 'yesterday'
    : `${daysSinceActivity} days`;

  return (
    <div className="px-6 py-5 border-b border-border-subtle">
      <p className="font-display text-[16px] text-text-emphasis leading-relaxed">
        It's been {dayLabel} since you touched{' '}
        <span className="font-semibold">{staleGoalTitle}</span>.
        {' '}Everything else is on hold until you do.
      </p>
      {targetTask && (
        <button
          onClick={() => void handleStartTimer()}
          className={cn(
            'mt-3 px-4 py-2 rounded-md text-[12px] uppercase tracking-[0.12em] font-medium',
            'bg-text-primary text-bg transition-opacity hover:opacity-80'
          )}
        >
          Start: {targetTask.title}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Add GravityPrompt to MorningBriefing**

Modify `src/components/ink/MorningBriefing.tsx`. Import `GravityPrompt` and render it above the messages area (before the streaming content, after the header). Find the section around line 173 where messages begin.

```typescript
import { GravityPrompt } from '@/components/shared/GravityPrompt';

// Inside render, before the messages scroll area:
<GravityPrompt />
```

**Step 3: Add GravityPrompt to Flow view**

Find where the committed task list renders in Flow/Planning mode. Add `<GravityPrompt />` at the top of the task list area, before the first TaskCard.

Read `src/modes/PlanningMode.tsx` (or equivalent) to find the exact insertion point. The prompt should appear above the task list, inside the main content area.

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 5: Commit**

```bash
git add src/components/shared/GravityPrompt.tsx src/components/ink/MorningBriefing.tsx
git commit -m "feat(gravity): add GravityPrompt to briefing and flow views"
```

---

### Task 6: Timer Release Integration

**Files:**
- Modify: `src/components/PomodoroTimer.tsx` — detect when 5 min have elapsed on a stale-intention task and trigger gravity release

The release should happen automatically when the PomodoroTimer detects ≥ 5 minutes have been logged for a task under the stale intention. Since `logFocusSession` writes to `timeLogs`, and `useGravity` reads `timeLogs`, the release is **automatic** — no explicit "release" call needed.

However, `logFocusSession` only fires when a work session completes (break starts) or when the timer is stopped. For the 5-minute release to feel immediate, we need to react to the running timer's elapsed time.

**Step 1: Add a running-time check to GravityContext**

Modify `src/context/GravityContext.tsx`:

Add a `releaseGravity` function that can be called imperatively when the timer hits 5 min. Also export a `checkTimerRelease` that PomodoroTimer can call on each tick:

```typescript
// Inside GravityProvider, add:
const [manualRelease, setManualRelease] = useState<string | null>(null);
const todayKey = format(new Date(), 'yyyy-MM-dd');

const releaseGravity = useCallback(() => {
  setManualRelease(todayKey);
}, [todayKey]);

// Pass manualRelease into useGravity (or treat it like anarchy for today)
```

**Step 2: Modify PomodoroTimer to check gravity release**

In `src/components/PomodoroTimer.tsx`, inside the `onTick` subscription (around line 50-100):

```typescript
import { useGravityContext } from '@/context/GravityContext';

// Inside PomodoroTimer:
const { active: gravityActive, staleGoalId, releaseGravity } = useGravityContext();

// Inside the onTick handler, when state updates:
// Check if current task is under the stale goal and elapsed >= 5 min
if (gravityActive && nextState.isRunning && !nextState.isBreak) {
  const elapsed = nextState.totalTime - nextState.timeRemaining;
  if (elapsed >= 300) { // 5 minutes in seconds
    const task = plannedTasks.find((t) => t.id === nextState.currentTaskId);
    if (task?.weeklyGoalId === staleGoalId) {
      releaseGravity();
    }
  }
}
```

**Step 3: Wire releaseGravity into gravity computation**

Update `useGravity` to accept a `manualReleaseDate` param (or manage it internally). When `manualReleaseDate === todayKey`, gravity is released regardless of time logs.

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 5: Commit**

```bash
git add src/context/GravityContext.tsx src/components/PomodoroTimer.tsx src/hooks/useGravity.ts
git commit -m "feat(gravity): release gravity after 5 min timer on stale intention"
```

---

### Task 7: Anarchy Mode in Cmd+K

**Files:**
- Modify: `src/components/chrome/CommandPalette.tsx:42-55` — add Anarchy command

**Step 1: Add the Anarchy command**

Import `useGravityContext` and add a command to the `commands` array:

```typescript
import { useGravityContext } from '@/context/GravityContext';
import { Flame } from 'lucide-react'; // or Skull, Zap — pick something irreverent

// Inside CommandPalette:
const { active: gravityActive, invokeAnarchy } = useGravityContext();

// Add to commands array (in Actions category):
{
  id: 'action-anarchy',
  title: 'Anarchy',
  icon: Flame,
  category: 'Action',
  action: () => { invokeAnarchy(); },
},
```

The command appears in the list regardless of gravity state (it's a quick action, not contextual). If gravity isn't active, invoking it is a no-op for the day.

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 3: Commit**

```bash
git add src/components/chrome/CommandPalette.tsx
git commit -m "feat(gravity): add Anarchy command to Cmd+K palette"
```

---

### Task 8: Briefing Anarchy Memory

**Files:**
- Modify: `src/hooks/useGravity.ts` — persist anarchy dates to electron-store
- Modify: `src/components/shared/GravityPrompt.tsx` — show "Yesterday was anarchy" line

When Ink generates the morning briefing, it should mention if yesterday was anarchy. The simplest approach: persist `anarchyDates` (array of date strings) in the planner state, and the GravityPrompt checks if yesterday is in the list.

**Step 1: Add anarchy persistence**

Modify `useGravity` to persist anarchy dates via `window.api.store`:

```typescript
// On mount, load anarchyDates from store
useEffect(() => {
  window.api.store.get('gravityAnarchyDates').then((dates: string[] | undefined) => {
    if (dates?.includes(todayKey)) setAnarchyDate(todayKey);
  });
}, [todayKey]);

// When anarchy is invoked, persist
const invokeAnarchy = useCallback(() => {
  setAnarchyDate(todayKey);
  window.api.store.get('gravityAnarchyDates').then((dates: string[] | undefined) => {
    const updated = [...(dates ?? []), todayKey].slice(-14); // keep 2 weeks
    void window.api.store.set('gravityAnarchyDates', updated);
  });
}, [todayKey]);
```

**Step 2: Show yesterday's anarchy in GravityPrompt**

Add to `GravityPrompt`:

```typescript
const [yesterdayAnarchy, setYesterdayAnarchy] = useState(false);

useEffect(() => {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  window.api.store.get('gravityAnarchyDates').then((dates: string[] | undefined) => {
    if (dates?.includes(yesterday)) setYesterdayAnarchy(true);
  });
}, []);

// In render, before the main message:
{yesterdayAnarchy && (
  <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted mb-2">
    Day {daysSinceActivity}. Yesterday was anarchy.
  </p>
)}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 4: Commit**

```bash
git add src/hooks/useGravity.ts src/components/shared/GravityPrompt.tsx
git commit -m "feat(gravity): persist anarchy dates and surface in briefing"
```

---

### Task 9: First-Time Tooltip

**Files:**
- Modify: `src/components/shared/GravityPrompt.tsx` — add a one-time tooltip explaining gravity on first activation

**Step 1: Add first-time detection**

```typescript
const [isFirstTime, setIsFirstTime] = useState(false);

useEffect(() => {
  if (!active) return;
  window.api.store.get('gravityFirstTimeSeen').then((seen: boolean | undefined) => {
    if (!seen) {
      setIsFirstTime(true);
      void window.api.store.set('gravityFirstTimeSeen', true);
    }
  });
}, [active]);
```

**Step 2: Render tooltip**

Below the gravity prompt, conditionally show:

```typescript
{isFirstTime && (
  <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
    This is Gravity. Your other tasks are dimmed until you start working on what you said matters.
    You can always type Cmd+K → Anarchy to override.
  </p>
)}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean compilation

**Step 4: Commit**

```bash
git add src/components/shared/GravityPrompt.tsx
git commit -m "feat(gravity): add first-time tooltip explaining gravity"
```

---

### Task 10: Integration Test & Final Verification

**Files:**
- Test: `src/hooks/useGravity.test.ts` — add edge case tests

**Step 1: Add edge case tests**

```typescript
it('handles Infinity daysSinceLastActivity (no activity ever)', () => {
  const result = computeGravityState({
    ...baseInput,
    attentionData: [
      { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: Infinity, tasksThisWeek: 5, tasksDone: 0 },
    ],
  });
  expect(result.active).toBe(true);
  expect(result.staleGoalId).toBe('g1');
});

it('picks stalest when multiple are quiet', () => {
  const result = computeGravityState({
    ...baseInput,
    attentionData: [
      { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 3, tasksThisWeek: 10, tasksDone: 2 },
      { goalId: 'g2', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 8, tasksDone: 1 },
    ],
  });
  expect(result.staleGoalId).toBe('g2');
});

it('releases when ANY stale intention gets focus, not just the stalest', () => {
  const result = computeGravityState({
    ...baseInput,
    attentionData: [
      { goalId: 'g1', energyLevel: 'quiet', daysSinceLastActivity: 3, tasksThisWeek: 10, tasksDone: 2 },
      { goalId: 'g2', energyLevel: 'quiet', daysSinceLastActivity: 5, tasksThisWeek: 8, tasksDone: 1 },
    ],
    todayTimeLogs: [
      { objectiveId: 'g1', durationMins: 6 },
    ],
  });
  expect(result.active).toBe(false);
});
```

**Step 2: Run all gravity tests**

Run: `npx vitest run src/hooks/useGravity.test.ts`
Expected: All tests PASS

**Step 3: Run full build**

Run: `npm run build`
Expected: Clean compilation, no type errors

**Step 4: Commit**

```bash
git add src/hooks/useGravity.test.ts
git commit -m "test(gravity): add edge case tests for gravity computation"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | useGravity hook + tests | `src/hooks/useGravity.ts`, `src/hooks/useGravity.test.ts` |
| 2 | GravityContext provider | `src/context/GravityContext.tsx`, `src/App.tsx` |
| 3 | Gravity CSS dim rules | `src/styles/globals.css`, `src/context/GravityContext.tsx` |
| 4 | Apply gravity-dim to UI | `UnifiedInbox.tsx`, `RightRail.tsx`, `TaskCard.tsx` |
| 5 | GravityPrompt component | `src/components/shared/GravityPrompt.tsx`, `MorningBriefing.tsx` |
| 6 | Timer release integration | `GravityContext.tsx`, `PomodoroTimer.tsx`, `useGravity.ts` |
| 7 | Anarchy in Cmd+K | `CommandPalette.tsx` |
| 8 | Anarchy persistence | `useGravity.ts`, `GravityPrompt.tsx` |
| 9 | First-time tooltip | `GravityPrompt.tsx` |
| 10 | Edge case tests + final build | `useGravity.test.ts` |
