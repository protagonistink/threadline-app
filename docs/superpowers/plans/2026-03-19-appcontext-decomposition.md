# AppContext Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `AppContext.tsx` (796 lines, 100+ context properties) into 5 focused hooks without changing the public `AppContextValue` interface or any component.

**Architecture:** Extract cohesive slices of state+effects+callbacks out of `AppProvider` into dedicated hooks. `AppProvider` becomes a thin orchestrator that calls the hooks and assembles the context value. `useApp()` and all components stay identical.

**Tech Stack:** React 18, TypeScript, Electron, `useReducer` for planner state, `useCallback`/`useEffect`/`useState` hooks.

---

## File Map

**Create:**
- `src/hooks/useWorkdayPrompts.ts` — start/end-of-day prompt logic + bug fix
- `src/hooks/useDayLock.ts` — focus mode lock state
- `src/hooks/useWeeklyPlanningModal.ts` — weekly planning modal state
- `src/hooks/useMonthlyPlanning.ts` — monthly plan state + prompt
- `src/hooks/useCollectionActions.ts` — ritual + countdown CRUD

**Modify:**
- `src/context/AppContext.tsx` — remove extracted code, call new hooks

**Reference (do not modify):**
- `src/context/plannerState.ts` — `createPlannerFieldSetter`, `Dispatch<SetStateAction<T>>`
- `src/hooks/usePlannerPersistence.ts` — verify `monthlyPlan` + `weeklyPlanningLastCompleted` still flow through after Steps 3–4
- `src/types/index.ts` — `DailyRitual`, `Countdown`, `MonthlyPlan`

---

## Task 1: Extract `useWorkdayPrompts` (fixes the re-prompting bug)

**Files:**
- Create: `src/hooks/useWorkdayPrompts.ts`
- Modify: `src/context/AppContext.tsx`

### What moves out

From `AppContext.tsx`:
- Lines 158–164: `showEndOfDayPrompt`, `showStartOfDayPrompt`, `isFirstLoadOfDay` state + their 4 refs
- Lines 299–353: two interval-based `useEffect`s
- Lines 249–256: the two `window.api.store.get` calls in `loadState` that seed the refs
- Lines 658–662: `dismissEndOfDayPrompt` + `dismissStartOfDayPrompt` callbacks

### The bug that gets fixed

Line 306: `hasShownStartOfDayRef.current = false` resets the session guard whenever `workdayStartMinutes` changes. If the user edits their start time after the prompt has already fired today, the effect re-runs and clears the guard. During the async window before `startOfDayShownDateRef` is populated from IPC, both guards are clear and the next interval tick fires the prompt again.

**Fix:** Remove `hasShownStartOfDayRef.current = false` from the start-of-day effect. Remove `hasShownEndOfDayRef.current = false` from the end-of-day effect. The date guard (`shownDateRef.current === today`) is sufficient.

- [ ] **Step 1.1: Create `src/hooks/useWorkdayPrompts.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';

interface WorkdayPromptsOptions {
  isInitialized: boolean;
  workdayStartMinutes: number;
  workdayEndMinutes: number;
  initialStartShownDate: string | null;
  initialEndShownDate: string | null;
  initialIsFirstLoadOfDay: boolean;
}

interface WorkdayPromptsResult {
  showStartOfDayPrompt: boolean;
  showEndOfDayPrompt: boolean;
  isFirstLoadOfDay: boolean;
  setIsFirstLoadOfDay: (value: boolean) => void;
  dismissStartOfDayPrompt: () => void;
  dismissEndOfDayPrompt: () => void;
}

export function useWorkdayPrompts({
  isInitialized,
  workdayStartMinutes,
  workdayEndMinutes,
  initialStartShownDate,
  initialEndShownDate,
  initialIsFirstLoadOfDay,
}: WorkdayPromptsOptions): WorkdayPromptsResult {
  const [showStartOfDayPrompt, setShowStartOfDayPrompt] = useState(false);
  const [showEndOfDayPrompt, setShowEndOfDayPrompt] = useState(false);
  const [isFirstLoadOfDay, setIsFirstLoadOfDay] = useState(initialIsFirstLoadOfDay);

  const hasShownStartOfDayRef = useRef(false);
  const hasShownEndOfDayRef = useRef(false);
  const startOfDayShownDateRef = useRef<string | null>(initialStartShownDate);
  const endOfDayShownDateRef = useRef<string | null>(initialEndShownDate);

  // Start-of-day prompt: fire once per calendar day when time crosses workdayStart.
  // BUG FIX: Do NOT reset hasShownStartOfDayRef on workdayStartMinutes change.
  // The date guard (startOfDayShownDateRef.current === today) is sufficient.
  useEffect(() => {
    if (!isInitialized) return;
    let previousMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const check = () => {
      if (hasShownStartOfDayRef.current) return;
      const today = new Date().toISOString().split('T')[0];
      if (startOfDayShownDateRef.current === today) return;
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const crossedStartBoundary =
        previousMinutes < workdayStartMinutes && nowMinutes >= workdayStartMinutes;
      previousMinutes = nowMinutes;
      if (crossedStartBoundary) {
        hasShownStartOfDayRef.current = true;
        startOfDayShownDateRef.current = today;
        setIsFirstLoadOfDay(false);
        void window.api.store.set('startOfDay.shownDate', today);
        setShowStartOfDayPrompt(true);
        void window.api.window.showMain();
      }
    };

    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, [isInitialized, workdayStartMinutes]);

  // End-of-day prompt: fire once per calendar day when time crosses workdayEnd.
  // BUG FIX: Do NOT reset hasShownEndOfDayRef on workdayEndMinutes change.
  useEffect(() => {
    if (!isInitialized) return;

    const check = () => {
      if (hasShownEndOfDayRef.current) return;
      const today = new Date().toISOString().split('T')[0];
      if (endOfDayShownDateRef.current === today) return;
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      if (nowMinutes >= workdayEndMinutes) {
        hasShownEndOfDayRef.current = true;
        endOfDayShownDateRef.current = today;
        void window.api.store.set('endOfDay.shownDate', today);
        setShowStartOfDayPrompt(false);
        setShowEndOfDayPrompt(true);
        void window.api.window.showMain();
      }
    };

    check();
    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, [isInitialized, workdayEndMinutes]);

  const dismissStartOfDayPrompt = useCallback(() => {
    setIsFirstLoadOfDay(false);
    setShowStartOfDayPrompt(false);
  }, []);

  const dismissEndOfDayPrompt = useCallback(() => setShowEndOfDayPrompt(false), []);

  return {
    showStartOfDayPrompt,
    showEndOfDayPrompt,
    isFirstLoadOfDay,
    setIsFirstLoadOfDay,
    dismissStartOfDayPrompt,
    dismissEndOfDayPrompt,
  };
}
```

- [ ] **Step 1.2: Update `AppContext.tsx`**

Add a state holder for IPC-loaded init values (add near the other `useState` calls at the top of `AppProvider`):
```typescript
const [workdayPromptsInit, setWorkdayPromptsInit] = useState<{
  startShownDate: string | null;
  endShownDate: string | null;
  isFirstLoadOfDay: boolean;
} | null>(null);
```

Inside `loadState`, replace lines 249–256:
```typescript
// REMOVE:
const [startShown, endShown] = await Promise.all([
  window.api.store.get('startOfDay.shownDate'),
  window.api.store.get('endOfDay.shownDate'),
]);
const today = new Date().toISOString().split('T')[0];
startOfDayShownDateRef.current = (startShown as string) || null;
endOfDayShownDateRef.current = (endShown as string) || null;
setIsFirstLoadOfDay(startOfDayShownDateRef.current !== today);

// REPLACE WITH:
const [startShown, endShown] = await Promise.all([
  window.api.store.get('startOfDay.shownDate'),
  window.api.store.get('endOfDay.shownDate'),
]);
const today = new Date().toISOString().split('T')[0];
const startShownDate = (startShown as string) || null;
setWorkdayPromptsInit({
  startShownDate,
  endShownDate: (endShown as string) || null,
  isFirstLoadOfDay: startShownDate !== today,
});
```

Remove the 7 state/ref declarations (lines 158–164), remove the two interval effects (lines 299–353), remove `dismissEndOfDayPrompt` and `dismissStartOfDayPrompt` callbacks (lines 658–662).

Add import at top of file:
```typescript
import { useWorkdayPrompts } from '@/hooks/useWorkdayPrompts';
```

Add hook call after the `workdayStartMinutes`/`workdayEndMinutes` derivations:
```typescript
const {
  showStartOfDayPrompt,
  showEndOfDayPrompt,
  isFirstLoadOfDay,
  setIsFirstLoadOfDay,
  dismissStartOfDayPrompt,
  dismissEndOfDayPrompt,
} = useWorkdayPrompts({
  isInitialized,
  workdayStartMinutes,
  workdayEndMinutes,
  initialStartShownDate: workdayPromptsInit?.startShownDate ?? null,
  initialEndShownDate: workdayPromptsInit?.endShownDate ?? null,
  initialIsFirstLoadOfDay: workdayPromptsInit?.isFirstLoadOfDay ?? true,
});
```

- [ ] **Step 1.3: Run build**

```bash
npm run build
```
Expected: clean build, no TypeScript errors.

- [ ] **Step 1.4: Commit**

```bash
git add src/hooks/useWorkdayPrompts.ts src/context/AppContext.tsx
git commit -m "refactor: extract useWorkdayPrompts, fix prompt double-fire on workday time edit"
```

---

## Task 2: Extract `useDayLock`

**Files:**
- Create: `src/hooks/useDayLock.ts`
- Modify: `src/context/AppContext.tsx`

### What moves out

- Lines 153, 157: `dayLocked`, `focusResumePrompt` state
- Lines 267–284: day lock check `useEffect`
- Lines 526–550: `lockDay`, `unlockDay`, `resumeFocusMode`, `dismissFocusPrompt` callbacks
- Line 688–689 in `resetDay`: `void window.api.store.set('dayLocked', false); setDayLocked(false);` → replace with `unlockDay()`

- [ ] **Step 2.1: Create `src/hooks/useDayLock.ts`**

```typescript
import { useCallback, useEffect, useState } from 'react';

interface DayLockResult {
  dayLocked: boolean;
  focusResumePrompt: boolean;
  lockDay: () => void;
  unlockDay: () => void;
  resumeFocusMode: () => void;
  dismissFocusPrompt: () => void;
}

export function useDayLock(): DayLockResult {
  const [dayLocked, setDayLocked] = useState(false);
  const [focusResumePrompt, setFocusResumePrompt] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    void Promise.all([
      window.api.store.get('dayLocked'),
      window.api.store.get('dayLockedDate'),
    ]).then(([locked, lockedDate]) => {
      if (locked) {
        if (lockedDate === today) {
          setFocusResumePrompt(true);
        } else {
          void window.api.store.set('dayLocked', false);
          void window.api.store.set('dayLockedDate', null);
        }
      }
    });
  }, []);

  const lockDay = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    void window.api.store.set('dayLocked', true);
    void window.api.store.set('dayLockedDate', today);
    setDayLocked(true);
  }, []);

  const unlockDay = useCallback(() => {
    void window.api.store.set('dayLocked', false);
    setDayLocked(false);
  }, []);

  const resumeFocusMode = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    void window.api.store.set('dayLocked', true);
    void window.api.store.set('dayLockedDate', today);
    setFocusResumePrompt(false);
    setDayLocked(true);
  }, []);

  const dismissFocusPrompt = useCallback(() => {
    setFocusResumePrompt(false);
    void window.api.store.set('dayLocked', false);
    void window.api.store.set('dayLockedDate', null);
  }, []);

  return { dayLocked, focusResumePrompt, lockDay, unlockDay, resumeFocusMode, dismissFocusPrompt };
}
```

- [ ] **Step 2.2: Update `AppContext.tsx`**

Add import:
```typescript
import { useDayLock } from '@/hooks/useDayLock';
```

Add hook call near top of `AppProvider` (after the `useState` declarations):
```typescript
const { dayLocked, focusResumePrompt, lockDay, unlockDay, resumeFocusMode, dismissFocusPrompt } = useDayLock();
```

Remove from `AppProvider`:
- `const [dayLocked, setDayLocked] = useState(false);`
- `const [focusResumePrompt, setFocusResumePrompt] = useState(false);`
- The day lock `useEffect` (lines 267–284)
- `lockDay`, `unlockDay`, `resumeFocusMode`, `dismissFocusPrompt` callbacks

In `resetDay`, replace:
```typescript
void window.api.store.set('dayLocked', false);
setDayLocked(false);
```
With:
```typescript
unlockDay();
```

- [ ] **Step 2.3: Run build**

```bash
npm run build
```
Expected: clean. Watch for `setDayLocked` still referenced anywhere.

- [ ] **Step 2.4: Commit**

```bash
git add src/hooks/useDayLock.ts src/context/AppContext.tsx
git commit -m "refactor: extract useDayLock hook"
```

---

## Task 3: Extract `useWeeklyPlanningModal`

**Files:**
- Create: `src/hooks/useWeeklyPlanningModal.ts`
- Modify: `src/context/AppContext.tsx`

### What moves out

- Lines 151–152: `weeklyPlanningLastCompleted`, `isWeeklyPlanningOpen` state
- Lines 499–504: `openWeeklyPlanning`, `closeWeeklyPlanning`, `completeWeeklyPlanning` callbacks
- Line 244: `setWeeklyPlanningLastCompleted(stored.weeklyPlanningLastCompleted ?? null)` in `loadState`

- [ ] **Step 3.1: Create `src/hooks/useWeeklyPlanningModal.ts`**

```typescript
import { useCallback, useState } from 'react';
import { getToday } from '@/lib/planner';

interface WeeklyPlanningModalOptions {
  initialLastCompleted: string | null;
}

interface WeeklyPlanningModalResult {
  isWeeklyPlanningOpen: boolean;
  weeklyPlanningLastCompleted: string | null;
  openWeeklyPlanning: () => void;
  closeWeeklyPlanning: () => void;
  completeWeeklyPlanning: () => void;
}

export function useWeeklyPlanningModal({
  initialLastCompleted,
}: WeeklyPlanningModalOptions): WeeklyPlanningModalResult {
  const [isWeeklyPlanningOpen, setIsWeeklyPlanningOpen] = useState(false);
  const [weeklyPlanningLastCompleted, setWeeklyPlanningLastCompleted] =
    useState<string | null>(initialLastCompleted);

  const openWeeklyPlanning = useCallback(() => setIsWeeklyPlanningOpen(true), []);
  const closeWeeklyPlanning = useCallback(() => setIsWeeklyPlanningOpen(false), []);
  const completeWeeklyPlanning = useCallback(() => {
    setWeeklyPlanningLastCompleted(getToday());
    setIsWeeklyPlanningOpen(false);
  }, []);

  return {
    isWeeklyPlanningOpen,
    weeklyPlanningLastCompleted,
    openWeeklyPlanning,
    closeWeeklyPlanning,
    completeWeeklyPlanning,
  };
}
```

- [ ] **Step 3.2: Update `AppContext.tsx`**

Add a state holder for the loaded value (with the other `useState` calls):
```typescript
const [weeklyPlanningInit, setWeeklyPlanningInit] = useState<string | null | undefined>(undefined);
```

Inside `loadState`, replace:
```typescript
if (stored?.weeklyPlanningLastCompleted !== undefined)
  setWeeklyPlanningLastCompleted(stored.weeklyPlanningLastCompleted ?? null);
```
With:
```typescript
setWeeklyPlanningInit(stored?.weeklyPlanningLastCompleted ?? null);
```

Add import:
```typescript
import { useWeeklyPlanningModal } from '@/hooks/useWeeklyPlanningModal';
```

Add hook call:
```typescript
const {
  isWeeklyPlanningOpen,
  weeklyPlanningLastCompleted,
  openWeeklyPlanning,
  closeWeeklyPlanning,
  completeWeeklyPlanning,
} = useWeeklyPlanningModal({ initialLastCompleted: weeklyPlanningInit ?? null });
```

Remove from `AppProvider`:
- `const [weeklyPlanningLastCompleted, setWeeklyPlanningLastCompleted] = useState<string | null>(null);`
- `const [isWeeklyPlanningOpen, setIsWeeklyPlanningOpen] = useState(false);`
- `openWeeklyPlanning`, `closeWeeklyPlanning`, `completeWeeklyPlanning` callbacks

Verify `usePlannerPersistence` still receives `weeklyPlanningLastCompleted` from the hook's return value (it should — the name is the same).

- [ ] **Step 3.3: Run build**

```bash
npm run build
```

- [ ] **Step 3.4: Commit**

```bash
git add src/hooks/useWeeklyPlanningModal.ts src/context/AppContext.tsx
git commit -m "refactor: extract useWeeklyPlanningModal hook"
```

---

## Task 4: Extract `useMonthlyPlanning`

**Files:**
- Create: `src/hooks/useMonthlyPlanning.ts`
- Modify: `src/context/AppContext.tsx`

### What moves out

- Lines 154–156: `monthlyPlan`, `monthlyPlanPrompt`, `isMonthlyPlanningOpen` state
- Lines 286–297: monthly plan prompt `useEffect`
- Lines 468–482: `setMonthlyPlan`, `dismissMonthlyPlanPrompt`, `openMonthlyPlanning`, `closeMonthlyPlanning` callbacks
- Line 247: `setMonthlyPlanState(stored.monthlyPlan ?? null)` in `loadState`

- [ ] **Step 4.1: Create `src/hooks/useMonthlyPlanning.ts`**

```typescript
import { useCallback, useEffect, useState } from 'react';
import type { MonthlyPlan } from '@/types';

interface MonthlyPlanningOptions {
  isInitialized: boolean;
  initialMonthlyPlan: MonthlyPlan | null;
}

interface MonthlyPlanningResult {
  monthlyPlan: MonthlyPlan | null;
  monthlyPlanPrompt: boolean;
  isMonthlyPlanningOpen: boolean;
  setMonthlyPlan: (plan: MonthlyPlan) => void;
  dismissMonthlyPlanPrompt: () => void;
  openMonthlyPlanning: () => void;
  closeMonthlyPlanning: () => void;
}

export function useMonthlyPlanning({
  isInitialized,
  initialMonthlyPlan,
}: MonthlyPlanningOptions): MonthlyPlanningResult {
  const [monthlyPlan, setMonthlyPlanState] = useState<MonthlyPlan | null>(initialMonthlyPlan);
  const [monthlyPlanPrompt, setMonthlyPlanPrompt] = useState(false);
  const [isMonthlyPlanningOpen, setIsMonthlyPlanningOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!monthlyPlan || monthlyPlan.month !== currentMonth) {
      void window.api.store.get('monthlyPlanDismissedDate').then((dismissed) => {
        const today = new Date().toISOString().split('T')[0];
        if (dismissed !== today) {
          setMonthlyPlanPrompt(true);
        }
      });
    }
  }, [isInitialized, monthlyPlan]);

  const setMonthlyPlan = useCallback((plan: MonthlyPlan) => {
    const planWithTimestamp: MonthlyPlan = { ...plan, completedAt: new Date().toISOString() };
    setMonthlyPlanState(planWithTimestamp);
    setMonthlyPlanPrompt(false);
    setIsMonthlyPlanningOpen(false);
  }, []);

  const dismissMonthlyPlanPrompt = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    void window.api.store.set('monthlyPlanDismissedDate', today);
    setMonthlyPlanPrompt(false);
  }, []);

  const openMonthlyPlanning = useCallback(() => setIsMonthlyPlanningOpen(true), []);
  const closeMonthlyPlanning = useCallback(() => setIsMonthlyPlanningOpen(false), []);

  return {
    monthlyPlan,
    monthlyPlanPrompt,
    isMonthlyPlanningOpen,
    setMonthlyPlan,
    dismissMonthlyPlanPrompt,
    openMonthlyPlanning,
    closeMonthlyPlanning,
  };
}
```

- [ ] **Step 4.2: Update `AppContext.tsx`**

Add a state holder:
```typescript
const [monthlyPlanInit, setMonthlyPlanInit] = useState<MonthlyPlan | null | undefined>(undefined);
```

Inside `loadState`, replace:
```typescript
if (stored?.monthlyPlan !== undefined) setMonthlyPlanState(stored.monthlyPlan ?? null);
```
With:
```typescript
setMonthlyPlanInit(stored?.monthlyPlan ?? null);
```

Add import:
```typescript
import { useMonthlyPlanning } from '@/hooks/useMonthlyPlanning';
```

Add hook call:
```typescript
const {
  monthlyPlan,
  monthlyPlanPrompt,
  isMonthlyPlanningOpen,
  setMonthlyPlan,
  dismissMonthlyPlanPrompt,
  openMonthlyPlanning,
  closeMonthlyPlanning,
} = useMonthlyPlanning({
  isInitialized,
  initialMonthlyPlan: monthlyPlanInit ?? null,
});
```

Remove from `AppProvider`:
- `const [monthlyPlan, setMonthlyPlanState] = useState<MonthlyPlan | null>(null);`
- `const [monthlyPlanPrompt, setMonthlyPlanPrompt] = useState(false);`
- `const [isMonthlyPlanningOpen, setIsMonthlyPlanningOpen] = useState(false);`
- The monthly plan prompt `useEffect`
- `setMonthlyPlan`, `dismissMonthlyPlanPrompt`, `openMonthlyPlanning`, `closeMonthlyPlanning` callbacks

Verify `usePlannerPersistence` still receives `monthlyPlan` from the hook return value.

- [ ] **Step 4.3: Run build**

```bash
npm run build
```

- [ ] **Step 4.4: Commit**

```bash
git add src/hooks/useMonthlyPlanning.ts src/context/AppContext.tsx
git commit -m "refactor: extract useMonthlyPlanning hook"
```

---

## Task 5: Extract `useCollectionActions`

**Files:**
- Create: `src/hooks/useCollectionActions.ts`
- Modify: `src/context/AppContext.tsx`

### What moves out

- Lines 445–466: `addRitual`, `removeRitual`, `toggleRitualComplete`
- Lines 484–497: `updateRitualEstimate`, `addCountdown`, `removeCountdown`

- [ ] **Step 5.1: Create `src/hooks/useCollectionActions.ts`**

```typescript
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Countdown, DailyRitual } from '@/types';
import { getToday } from '@/lib/planner';

interface CollectionActionsOptions {
  setRituals: Dispatch<SetStateAction<DailyRitual[]>>;
  setCountdowns: Dispatch<SetStateAction<Countdown[]>>;
}

interface CollectionActionsResult {
  addRitual: (title: string) => void;
  removeRitual: (id: string) => void;
  toggleRitualComplete: (id: string) => void;
  updateRitualEstimate: (id: string, mins: number) => void;
  addCountdown: (title: string, dueDate: string) => void;
  removeCountdown: (id: string) => void;
}

export function useCollectionActions({
  setRituals,
  setCountdowns,
}: CollectionActionsOptions): CollectionActionsResult {
  const addRitual = useCallback((title: string) => {
    if (!title.trim()) return;
    setRituals((prev) => [
      ...prev,
      { id: `ritual-${Date.now()}`, title: title.trim(), completedDates: [] },
    ]);
  }, [setRituals]);

  const removeRitual = useCallback((id: string) => {
    setRituals((prev) => prev.filter((r) => r.id !== id));
  }, [setRituals]);

  const toggleRitualComplete = useCallback((id: string) => {
    const today = getToday();
    setRituals((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const already = r.completedDates.includes(today);
        return {
          ...r,
          completedDates: already
            ? r.completedDates.filter((d) => d !== today)
            : [...r.completedDates, today],
        };
      })
    );
  }, [setRituals]);

  const updateRitualEstimate = useCallback((id: string, mins: number) => {
    setRituals((prev) => prev.map((r) => (r.id === id ? { ...r, estimateMins: mins } : r)));
  }, [setRituals]);

  const addCountdown = useCallback((title: string, dueDate: string) => {
    if (!title.trim() || !dueDate) return;
    setCountdowns((prev) => [
      ...prev,
      { id: `countdown-${Date.now()}`, title: title.trim(), dueDate },
    ]);
  }, [setCountdowns]);

  const removeCountdown = useCallback((id: string) => {
    setCountdowns((prev) => prev.filter((c) => c.id !== id));
  }, [setCountdowns]);

  return {
    addRitual,
    removeRitual,
    toggleRitualComplete,
    updateRitualEstimate,
    addCountdown,
    removeCountdown,
  };
}
```

- [ ] **Step 5.2: Update `AppContext.tsx`**

Add import:
```typescript
import { useCollectionActions } from '@/hooks/useCollectionActions';
```

Add hook call (after `setRituals` and `setCountdowns` are defined via `createPlannerFieldSetter`):
```typescript
const {
  addRitual,
  removeRitual,
  toggleRitualComplete,
  updateRitualEstimate,
  addCountdown,
  removeCountdown,
} = useCollectionActions({ setRituals, setCountdowns });
```

Remove from `AppProvider`: all 6 callbacks listed above.

- [ ] **Step 5.3: Run build**

```bash
npm run build
```

- [ ] **Step 5.4: Commit**

```bash
git add src/hooks/useCollectionActions.ts src/context/AppContext.tsx
git commit -m "refactor: extract useCollectionActions hook"
```

---

## Verification

After all 5 tasks:
1. `npm run build` — must be clean
2. Open app in Electron, verify:
   - Start-of-day prompt fires at workday start time (not on settings changes)
   - End-of-day prompt fires at workday end time
   - Day lock / focus resume prompt works on reopen
   - Weekly planning modal opens and closes
   - Monthly plan prompt appears / can be dismissed
   - Rituals can be added, removed, toggled complete
   - Countdowns can be added and removed

**AppContext line count should drop from ~796 lines to ~450 lines.** No component changes needed.
