# Foundation Restructure — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Inked from a multi-view app into a two-view, mode-based architecture where Ink is the sole planning interface and the UI reflects "Plot your story for the day."

**Architecture:** Decompose App.tsx (527 lines of conditionals) into 4 mode components. Replace DayCommitState with AppMode state machine. Kill 5 views, 2 wizard modals, capture system, Monarch integration, and pomodoro mini-window. Build new right rail, new focus mode, new sidebar.

**Tech Stack:** React 18, TypeScript, Electron 33, Tailwind CSS, electron-store, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-foundation-restructure-design.md`

---

## File Structure

### New files to create
- `src/modes/BriefingMode.tsx` — Ink 1-on-1 opening screen
- `src/modes/PlanningMode.tsx` — full layout: inbox + timeline + rail
- `src/modes/ExecutingMode.tsx` — collapsed layout: timeline + rail
- `src/modes/FocusMode.tsx` — task hero + timer
- `src/components/rail/RightRail.tsx` — right rail container
- `src/components/rail/FocusCapacity.tsx` — hours-based capacity display
- `src/components/rail/IntentionsSummary.tsx` — 3 weekly intentions
- `src/components/rail/BalanceAwareness.tsx` — intention drift observations
- `src/components/rail/MoneyMoves.tsx` — compact financial context
- `src/components/rail/HardDeadlines.tsx` — real deadlines only
- `src/components/rail/InkLink.tsx` — quick Ink access button
- `src/components/rail/EndOfDayNudge.tsx` — gentle close-out prompt
- `src/components/intentions/IntentionsView.tsx` — combined weekly + monthly
- `src/components/focus/FocusView.tsx` — task hero + timer layout
- `src/hooks/useAppMode.ts` — AppMode state machine
- `src/hooks/useAppMode.test.ts` — state machine tests
- `src/components/rail/RightRail.test.ts` — rail data computation tests

### Files to heavily modify
- `src/App.tsx` — gut and replace with thin mode router
- `src/types/index.ts` — add AppMode, update View type
- `src/types/electron.d.ts` — remove capture/monarch types
- `electron/main.ts` — remove capture/pomodoro windows, add menu bar, add menu IPC
- `electron/preload.ts` — remove capture namespace, add menu listener
- `electron/anthropic.ts` — extend context window (MAX_HISTORY_TURNS, token limits)
- `src/lib/ink-mode.ts` — update token limits
- `src/context/AppContext.tsx` — replace DayCommitState with AppMode, update View type
- `src/components/Sidebar.tsx` — collapsed icon strip with hover overlay
- `src/components/CommandPalette.tsx` — strip to navigation + task actions only
- `src/components/PomodoroTimer.tsx` — remove floating window logic
- `src/components/Settings.tsx` — add light/dark toggle, remove monarch settings
- `src/components/FocusOverlay.tsx` — replace with FocusMode import or delete

### Files to delete
- `src/components/Archive.tsx`
- `src/components/ScratchView.tsx`
- `src/components/ScratchPanel.tsx`
- `src/components/FocusScratchPanel.tsx`
- `src/components/MoneyView.tsx`
- `src/components/WeeklyPlanningWizard.tsx`
- `src/components/MonthlyPlanningWizard.tsx`
- `src/components/CaptureWindow.tsx`
- `electron/capture.ts`
- `electron/monarch.ts`

### Files to keep (do NOT delete)
- `src/components/MorningSidebar.tsx` — used by MorningBriefing.tsx
- `src/components/TodaysFlow.tsx` — used in evening reflection layout
- `electron/plaid-link-preload.ts` — used by Plaid Link integration
- `src/hooks/useDayCommitState.tsx` — keep as `useDayProgress` (renamed), still computes derived data needed by rail and auto-briefing

---

## Task Sequence

Tasks are ordered by dependency. Each task produces a working, buildable app.

---

### Task 1: Define AppMode type and state machine hook

**Files:**
- Create: `src/types/appMode.ts`
- Create: `src/hooks/useAppMode.ts`
- Create: `src/hooks/useAppMode.test.ts`

Note: The current `View` type lives in `src/context/AppContext.tsx` (line 49), NOT in `src/types/index.ts`. Do not modify AppContext in this task — the View type update happens in Task 10 when AppContext is rewritten. The new `View` type is defined in `appMode.ts` and imported by AppContext in Task 10.

- [ ] **Step 1: Write AppMode types**

Create `src/types/appMode.ts`:
```typescript
export type AppMode = 'briefing' | 'planning' | 'executing' | 'focus';
export type View = 'flow' | 'intentions';

export interface AppModeState {
  mode: AppMode;
  view: View;
  focusTaskId: string | null;
}

export type AppModeAction =
  | { type: 'COMPLETE_BRIEFING' }
  | { type: 'START_DAY' }
  | { type: 'CLICK_TASK'; taskId: string }
  | { type: 'ENTER_FOCUS'; taskId: string }
  | { type: 'EXIT_FOCUS' }
  | { type: 'OPEN_INBOX' }
  | { type: 'CLOSE_INBOX' }
  | { type: 'SET_VIEW'; view: View }
  | { type: 'RESET_DAY' };
```

- [ ] **Step 2: Write failing tests for state machine**

Create `src/hooks/useAppMode.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { appModeReducer } from './useAppMode';
import type { AppModeState } from '../types/appMode';

const initial: AppModeState = { mode: 'briefing', view: 'flow', focusTaskId: null };

describe('appModeReducer', () => {
  it('transitions briefing -> planning on COMPLETE_BRIEFING', () => {
    const result = appModeReducer(initial, { type: 'COMPLETE_BRIEFING' });
    expect(result.mode).toBe('planning');
  });

  it('transitions planning -> executing on START_DAY', () => {
    const state: AppModeState = { mode: 'planning', view: 'flow', focusTaskId: null };
    const result = appModeReducer(state, { type: 'START_DAY' });
    expect(result.mode).toBe('executing');
  });

  it('transitions planning -> executing on CLICK_TASK', () => {
    const state: AppModeState = { mode: 'planning', view: 'flow', focusTaskId: null };
    const result = appModeReducer(state, { type: 'CLICK_TASK', taskId: 'task-1' });
    expect(result.mode).toBe('executing');
  });

  it('transitions executing -> focus on ENTER_FOCUS', () => {
    const state: AppModeState = { mode: 'executing', view: 'flow', focusTaskId: null };
    const result = appModeReducer(state, { type: 'ENTER_FOCUS', taskId: 'task-1' });
    expect(result.mode).toBe('focus');
    expect(result.focusTaskId).toBe('task-1');
  });

  it('transitions focus -> executing on EXIT_FOCUS', () => {
    const state: AppModeState = { mode: 'focus', view: 'flow', focusTaskId: 'task-1' };
    const result = appModeReducer(state, { type: 'EXIT_FOCUS' });
    expect(result.mode).toBe('executing');
    expect(result.focusTaskId).toBeNull();
  });

  it('transitions executing -> planning on OPEN_INBOX', () => {
    const state: AppModeState = { mode: 'executing', view: 'flow', focusTaskId: null };
    const result = appModeReducer(state, { type: 'OPEN_INBOX' });
    expect(result.mode).toBe('planning');
  });

  it('resets to briefing on RESET_DAY', () => {
    const state: AppModeState = { mode: 'executing', view: 'flow', focusTaskId: null };
    const result = appModeReducer(state, { type: 'RESET_DAY' });
    expect(result.mode).toBe('briefing');
    expect(result.focusTaskId).toBeNull();
  });

  it('ignores invalid transitions', () => {
    const result = appModeReducer(initial, { type: 'ENTER_FOCUS', taskId: 'task-1' });
    expect(result.mode).toBe('briefing');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useAppMode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement the reducer and hook**

Create `src/hooks/useAppMode.ts`:
```typescript
import { useCallback, useEffect, useReducer } from 'react';
import { format } from 'date-fns';
import type { AppModeState, AppModeAction, AppMode } from '../types/appMode';

const INITIAL_STATE: AppModeState = {
  mode: 'briefing',
  view: 'flow',
  focusTaskId: null,
};

export function appModeReducer(state: AppModeState, action: AppModeAction): AppModeState {
  switch (action.type) {
    case 'COMPLETE_BRIEFING':
      if (state.mode !== 'briefing') return state;
      return { ...state, mode: 'planning' };

    case 'START_DAY':
      if (state.mode !== 'planning') return state;
      return { ...state, mode: 'executing' };

    case 'CLICK_TASK':
      if (state.mode === 'planning') return { ...state, mode: 'executing' };
      return state;

    case 'ENTER_FOCUS':
      if (state.mode !== 'executing') return state;
      return { ...state, mode: 'focus', focusTaskId: action.taskId };

    case 'EXIT_FOCUS':
      if (state.mode !== 'focus') return state;
      return { ...state, mode: 'executing', focusTaskId: null };

    case 'OPEN_INBOX':
      if (state.mode !== 'executing') return state;
      return { ...state, mode: 'planning' };

    case 'CLOSE_INBOX':
      if (state.mode !== 'planning') return state;
      return { ...state, mode: 'executing' };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'RESET_DAY':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

export function useAppMode() {
  const [state, dispatch] = useReducer(appModeReducer, INITIAL_STATE);

  // Persist mode to electron-store
  useEffect(() => {
    window.api.store.set('appMode', state.mode);
    window.api.store.set('appMode.focusTaskId', state.focusTaskId);
  }, [state.mode, state.focusTaskId]);

  // Restore mode on mount (only if same day)
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      window.api.store.get('appMode') as Promise<AppMode | undefined>,
      window.api.store.get('appMode.date') as Promise<string | undefined>,
      window.api.store.get('appMode.focusTaskId') as Promise<string | null | undefined>,
    ]).then(([savedMode, savedDate, savedFocusTaskId]) => {
      if (savedDate === today && savedMode && savedMode !== 'briefing') {
        dispatch({ type: 'COMPLETE_BRIEFING' });
        if (savedMode === 'executing' || savedMode === 'focus') {
          dispatch({ type: 'START_DAY' });
        }
        if (savedMode === 'focus' && savedFocusTaskId) {
          dispatch({ type: 'ENTER_FOCUS', taskId: savedFocusTaskId });
        }
      }
    });
  }, []);

  // Save date whenever mode changes
  useEffect(() => {
    window.api.store.set('appMode.date', format(new Date(), 'yyyy-MM-dd'));
  }, [state.mode]);

  const completeBriefing = useCallback(() => dispatch({ type: 'COMPLETE_BRIEFING' }), []);
  const startDay = useCallback(() => dispatch({ type: 'START_DAY' }), []);
  const clickTask = useCallback((taskId: string) => dispatch({ type: 'CLICK_TASK', taskId }), []);
  const enterFocus = useCallback((taskId: string) => dispatch({ type: 'ENTER_FOCUS', taskId }), []);
  const exitFocus = useCallback(() => dispatch({ type: 'EXIT_FOCUS' }), []);
  const openInbox = useCallback(() => dispatch({ type: 'OPEN_INBOX' }), []);
  const closeInbox = useCallback(() => dispatch({ type: 'CLOSE_INBOX' }), []);
  const setView = useCallback((view: 'flow' | 'intentions') => dispatch({ type: 'SET_VIEW', view }), []);
  const resetDay = useCallback(() => dispatch({ type: 'RESET_DAY' }), []);

  return {
    ...state,
    completeBriefing,
    startDay,
    clickTask,
    enterFocus,
    exitFocus,
    openInbox,
    closeInbox,
    setView,
    resetDay,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useAppMode.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/appMode.ts src/hooks/useAppMode.ts src/hooks/useAppMode.test.ts
git commit -m "feat: add AppMode state machine with reducer and tests"
```

---

### Task 2: Remove dead features — capture, monarch, scratch, archive

**Files:**
- Delete: `electron/capture.ts`, `electron/monarch.ts`
- Delete: `src/components/Archive.tsx`, `src/components/ScratchView.tsx`, `src/components/ScratchPanel.tsx`, `src/components/FocusScratchPanel.tsx`, `src/components/CaptureWindow.tsx`, `src/components/MoneyView.tsx`
- Modify: `electron/main.ts` — remove `registerCaptureHandlers` import/call, `createCaptureWindow` import/call, capture window variable, Cmd+Shift+. global shortcut
- Modify: `electron/preload.ts` — remove `capture:` namespace (lines 121-142 area), remove `window:hide-capture` handler (line 91 area)
- Modify: `src/types/electron.d.ts` — remove CaptureAPI, MonarchAPI types
- Modify: `src/App.tsx` — remove lazy imports for deleted components, remove view branches
- Modify: `package.json` — remove `monarch-money-api` dependency
- Keep: `electron/plaid-link-preload.ts` — actively used by Plaid Link, do NOT delete

- [ ] **Step 1: Delete component files**

Delete these files:
- `src/components/Archive.tsx`
- `src/components/ScratchView.tsx`
- `src/components/ScratchPanel.tsx`
- `src/components/FocusScratchPanel.tsx`
- `src/components/CaptureWindow.tsx`
- `src/components/MoneyView.tsx`

- [ ] **Step 2: Delete electron modules**

Delete these files:
- `electron/capture.ts`
- `electron/monarch.ts`

- [ ] **Step 3: Remove capture imports and handlers from main.ts**

In `electron/main.ts`:
- Remove import of `registerCaptureHandlers` and `createCaptureWindow` (line 11 area)
- Remove `registerCaptureHandlers()` call from the ready handler
- Remove `createCaptureWindow` call and any references to the capture window
- Remove the global shortcut registration for Cmd+Shift+. (line 244 area)

- [ ] **Step 4: Remove capture namespace from preload.ts**

In `electron/preload.ts`:
- Remove the entire `capture:` namespace (lines 121-142 area)
- Remove `window:hide-capture` handler (line 91 area)

- [ ] **Step 5: Remove capture/monarch types from electron.d.ts**

In `src/types/electron.d.ts`:
- Remove `CaptureAPI` interface
- Remove `capture` from the main `ElectronAPI` interface
- Remove any monarch-related types
- Remove `ScratchEntry` type if defined there

- [ ] **Step 6: Remove lazy imports and view branches from App.tsx**

In `src/App.tsx`:
- Remove lazy imports for: Archive, ScratchView, MoneyView, CaptureWindow
- Remove view branches: `activeView === 'archive'` (lines 346-350), `activeView === 'scratch'` (lines 351-355), `activeView === 'money'` (lines 356-360)

- [ ] **Step 7: Remove monarch-money-api dependency**

Run: `npm uninstall monarch-money-api`

- [ ] **Step 8: Remove monarch settings from Settings.tsx**

In `src/components/Settings.tsx`:
- Remove `monarchToken`, `monarchTokenDirty` state variables
- Remove monarch from `financeProvider` options
- Remove monarch credential input fields

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: remove capture, monarch, scratch, archive, money view

Cut dead features: quick capture system, Monarch Money integration,
scratch/notes views, archive view, standalone money view.
Financial context moves to right rail in later task."
```

---

### Task 3: Remove wizard modals (WeeklyPlanningWizard, MonthlyPlanningWizard)

**Files:**
- Delete: `src/components/WeeklyPlanningWizard.tsx`, `src/components/MonthlyPlanningWizard.tsx`
- Modify: `src/App.tsx` — remove lazy imports and Suspense wrappers
- Modify: `src/hooks/useWeeklyPlanningModal.ts` — remove or stub (check if other code depends on it)
- Modify: `src/hooks/useMonthlyPlanning.tsx` — keep data hooks, remove wizard trigger logic
- Modify: `src/components/Sidebar.tsx` — remove "Plan Week" / "Plan Month" buttons if they trigger wizards

- [ ] **Step 1: Check for wizard dependencies**

Search for imports/references to WeeklyPlanningWizard and MonthlyPlanningWizard across the codebase. Check if `useWeeklyPlanningModal` is used elsewhere.

- [ ] **Step 2: Delete wizard component files**

Delete:
- `src/components/WeeklyPlanningWizard.tsx`
- `src/components/MonthlyPlanningWizard.tsx`

- [ ] **Step 3: Remove from App.tsx**

Remove lazy imports (lines 21-22) and Suspense wrappers (lines 369-374):
```tsx
// DELETE these lines:
const WeeklyPlanningWizard = lazy(...)
const MonthlyPlanningWizard = lazy(...)

// DELETE these blocks:
<Suspense fallback={null}>
  <WeeklyPlanningWizard />
</Suspense>
<Suspense fallback={null}>
  <MonthlyPlanningWizard />
</Suspense>
```

- [ ] **Step 4: Clean up related hooks**

Remove wizard-triggering logic from hooks while keeping data persistence (monthly plan data, weekly goals data still needed by IntentionsView).

- [ ] **Step 5: Remove wizard triggers from Sidebar**

Remove any buttons in Sidebar.tsx that open the wizard modals.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove planning wizard modals

Ink handles all planning conversations (daily, weekly, monthly).
Old modal wizards replaced by Ink interviews."
```

---

### Task 4: Extend Ink's context window

**Files:**
- Modify: `electron/anthropic.ts` — raise MAX_HISTORY_TURNS from 12 to 40
- Modify: `src/lib/ink-mode.ts` — raise morning to 1500, evening to 1000

- [ ] **Step 1: Update MAX_HISTORY_TURNS**

In `electron/anthropic.ts` line 15, change:
```typescript
// Before:
const MAX_HISTORY_TURNS = 12;
// After:
const MAX_HISTORY_TURNS = 40;
```

- [ ] **Step 2: Update INK_TOKEN_LIMITS**

In `src/lib/ink-mode.ts` lines 39-44, change:
```typescript
// Before:
export const INK_TOKEN_LIMITS: Record<InkMode, number> = {
  morning: 800,
  midday: 400,
  evening: 600,
  'sunday-interview': 2000,
};
// After:
export const INK_TOKEN_LIMITS: Record<InkMode, number> = {
  morning: 1500,
  midday: 600,
  evening: 1000,
  'sunday-interview': 2000,
};
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add electron/anthropic.ts src/lib/ink-mode.ts
git commit -m "fix: extend Ink context window — 40 turns, higher token limits

MAX_HISTORY_TURNS 12->40 (was dropping conversation after 6 Q&A pairs).
Morning tokens 800->1500 (daily planning needs longer responses).
Evening tokens 600->1000 (reflection needs room).
Midday tokens 400->600."
```

---

### Task 5: Remove pomodoro mini-window

**Files:**
- Modify: `electron/main.ts` — remove `createPomodoroWindow()`, update tray context menu
- Modify: `src/components/PomodoroTimer.tsx` — remove `floating` prop logic, remove window.api.window.showPomodoro/hidePomodoro calls
- Modify: `electron/preload.ts` — remove showPomodoro/hidePomodoro from window namespace

- [ ] **Step 1: Remove createPomodoroWindow from main.ts**

In `electron/main.ts`:
- Remove the `createPomodoroWindow()` function (lines 111-151 area)
- Remove the call to `createPomodoroWindow()` in the ready handler
- Update tray context menu: change "Start thread" item to send IPC to main window instead of creating pomodoro window

- [ ] **Step 2: Remove floating logic from PomodoroTimer.tsx**

In `src/components/PomodoroTimer.tsx`:
- Remove `floating` prop
- Remove all `window.api.window.showPomodoro()` and `hidePomodoro()` calls
- Remove the floating-specific sizing and layout (92x92 vs 180x180 branches)
- Keep the timer state management, tray updates, and in-app rendering

- [ ] **Step 3: Remove pomodoro window IPC from preload**

In `electron/preload.ts`:
- Remove `showPomodoro` and `hidePomodoro` from the `window` namespace

- [ ] **Step 4: Update electron.d.ts**

Remove `showPomodoro` and `hidePomodoro` from `WindowAPI` interface.

- [ ] **Step 5: Keep hidden PomodoroTimer in App.tsx for now**

Do NOT remove the off-screen hidden PomodoroTimer div yet. It must remain mounted for the tray timer to work. It moves into FocusMode.tsx in Task 10 when App.tsx is rewritten.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove pomodoro mini-window, timer moves in-app

Timer now renders inside focus mode + runs in tray.
Separate always-on-top window removed."
```

---

### Task 6: Build the Right Rail

**Files:**
- Create: `src/components/rail/RightRail.tsx`
- Create: `src/components/rail/FocusCapacity.tsx`
- Create: `src/components/rail/IntentionsSummary.tsx`
- Create: `src/components/rail/BalanceAwareness.tsx`
- Create: `src/components/rail/MoneyMoves.tsx`
- Create: `src/components/rail/HardDeadlines.tsx`
- Create: `src/components/rail/InkLink.tsx`
- Create: `src/components/rail/EndOfDayNudge.tsx`
- Create: `src/components/rail/RightRail.test.ts`
- Delete: `src/components/PlanningGuardrails.tsx` (after new rail is in place)

- [ ] **Step 1: Write tests for rail data computations**

Create `src/components/rail/RightRail.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeFocusCapacity, computeBalanceAwareness } from './railUtils';

describe('computeFocusCapacity', () => {
  it('returns hours remaining from workday minus scheduled blocks', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 120,
      currentHour: 9,
    });
    expect(result.hoursRemaining).toBe(6);
    expect(result.label).toContain('6');
  });

  it('accounts for time already passed', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 13,
    });
    expect(result.hoursRemaining).toBe(4);
  });
});

describe('computeBalanceAwareness', () => {
  it('identifies neglected intentions', () => {
    const result = computeBalanceAwareness({
      intentions: [
        { id: '1', title: 'DRIVR', tasksCompletedToday: 3 },
        { id: '2', title: 'Upwork', tasksCompletedToday: 0 },
        { id: '3', title: 'Content', tasksCompletedToday: 1 },
      ],
    });
    expect(result.neglected).toContain('Upwork');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/rail/RightRail.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Create rail utility functions**

Create `src/components/rail/railUtils.ts` with `computeFocusCapacity` and `computeBalanceAwareness` functions that the tests expect.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/rail/RightRail.test.ts`
Expected: PASS

- [ ] **Step 5: Create individual rail components**

Create each component in `src/components/rail/`. Each is a simple presentational component:

**FocusCapacity.tsx** — takes `hoursRemaining: number`, renders human-language string.
**IntentionsSummary.tsx** — takes `intentions: { title: string; color: string }[]`, renders 3 items.
**BalanceAwareness.tsx** — takes balance computation result, renders Ink-voiced observation.
**MoneyMoves.tsx** — takes `obligations: { label: string; amount: number; dueDate: string }[]`, renders compact list.
**HardDeadlines.tsx** — takes `deadlines: { title: string; dueDate: string }[]`, renders list.
**InkLink.tsx** — takes `onClick: () => void`, renders button.
**EndOfDayNudge.tsx** — takes `visible: boolean; onClick: () => void`, renders nudge.

- [ ] **Step 6: Create RightRail.tsx container**

Create `src/components/rail/RightRail.tsx` that composes all sub-components, fetches data from context/IPC, and passes props down. Should accept `onOpenInk: () => void` and `onEndDay: () => void` callbacks.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Clean build (rail not wired in yet)

- [ ] **Step 8: Commit**

```bash
git add src/components/rail/
git commit -m "feat: build right rail — focus capacity, intentions, money, deadlines

New right rail with 7 modules: focus capacity (hours-based),
3 intentions, balance awareness, money moves, hard deadlines,
Ink link, and end-of-day nudge."
```

---

### Task 7: Build IntentionsView (combined weekly + monthly)

**Files:**
- Create: `src/components/intentions/IntentionsView.tsx`
- Reuse logic from: `src/components/WeeklyIntentions.tsx` (weekly goals display)
- Reuse logic from: `src/hooks/useMonthlyPlanning.tsx` (monthly plan data)

- [ ] **Step 1: Create IntentionsView component**

Create `src/components/intentions/IntentionsView.tsx` that combines:
- Weekly intentions (3 goals with tasks, progress, ability to edit)
- Monthly one-thing and why (editable)
- Weekly money goal
- Uses existing data from `plannerState.weeklyGoals` and `monthlyPlan` in electron-store

This is a read/edit view — not a planning wizard. Users can directly modify intentions here.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/intentions/
git commit -m "feat: add IntentionsView — combined weekly + monthly in one view"
```

---

### Task 8: Build FocusView (task hero + timer)

**Files:**
- Create: `src/components/focus/FocusView.tsx`
- Reuse: `src/components/PomodoroTimer.tsx` (timer logic)

- [ ] **Step 1: Create FocusView component**

Create `src/components/focus/FocusView.tsx`:
- Accepts `taskId: string` and `onExit: () => void`
- Renders the task title large and centered
- Shows which intention this task serves (color-coded, subtle)
- Embeds PomodoroTimer prominently (not hidden)
- Shows time-of-day awareness ("2:45pm — 47 minutes left in this block")
- "I'm done" button that completes the task and calls `onExit`
- ESC key handler calls `onExit`
- Full-screen, everything else hidden

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/focus/
git commit -m "feat: add FocusView — task hero with prominent timer"
```

---

### Task 9: Build mode components (BriefingMode, PlanningMode, ExecutingMode, FocusMode)

**Files:**
- Create: `src/modes/BriefingMode.tsx`
- Create: `src/modes/PlanningMode.tsx`
- Create: `src/modes/ExecutingMode.tsx`
- Create: `src/modes/FocusMode.tsx`

- [ ] **Step 1: Create BriefingMode.tsx**

Extract from App.tsx: the `{isOpening ? (...) : (...)}` conditional block (the branch guarded by `isOpening`). This mode renders:
- Collapsed sidebar (icon strip only)
- Full-width MorningBriefing component
- Evening reflection variant (TodaysFlow + MorningBriefing side by side)

Props: `onComplete: () => void`, `onSettings: () => void`, `isEvening: boolean`

- [ ] **Step 2: Create PlanningMode.tsx**

Extract from App.tsx: the active layout branch (the `else` of the `isOpening` conditional, specifically the `activeView === 'flow'` section). This mode renders:
- Sidebar (collapsed by default)
- Inbox column (visible)
- Timeline (center)
- RightRail (right)
- "Start my day" button

Props: `onStartDay: () => void`, `onOpenInk: () => void`, `onSettings: () => void`, `onEndDay: () => void`

- [ ] **Step 3: Create ExecutingMode.tsx**

Similar to PlanningMode but:
- Sidebar collapsed
- Inbox hidden (with button to temporarily reopen)
- Timeline (center)
- RightRail (right)
- Ink floating button (bottom-right)

Props: `onEnterFocus: (taskId: string) => void`, `onOpenInk: () => void`, `onOpenInbox: () => void`, `onSettings: () => void`, `onEndDay: () => void`

- [ ] **Step 4: Create FocusMode.tsx**

Wraps FocusView component:
- Full-screen FocusView with the focused task
- No sidebar, no inbox, no rail
- ESC to exit

Props: `taskId: string`, `onExit: () => void`

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean build (modes not wired in yet)

- [ ] **Step 6: Commit**

```bash
git add src/modes/
git commit -m "feat: add mode components — briefing, planning, executing, focus

Each mode owns its layout. Extracted from App.tsx conditionals."
```

---

### Task 10: Rewire App.tsx as thin mode router

**Files:**
- Modify: `src/App.tsx` — gut and replace with mode router
- Modify: `src/context/AppContext.tsx` — integrate AppMode hook
- Delete: `src/components/FocusOverlay.tsx` (replaced by FocusMode)
- Delete: `src/components/PlanningGuardrails.tsx` (replaced by RightRail)

This is the big integration task. The new App.tsx should be ~100-150 lines.

- [ ] **Step 1: Update AppContext to use AppMode**

In `src/context/AppContext.tsx`:
- Import `useAppMode` hook and its types from `src/hooks/useAppMode.ts`
- Import `View` from `src/types/appMode.ts`, replace the local `View` type definition (line 49: `'flow' | 'archive' | 'goals' | 'scratch' | 'money'`)
- Add `useAppMode()` call in AppProvider, spread its return values into context
- Export mode actions (completeBriefing, startDay, enterFocus, exitFocus, etc.)
- Keep `useDayCommitState` hook — rename it to `useDayProgress`. It still computes derived data (`focusMins`, `completedFocusMins`, `hadBlocks`, `minutesPastClose`) needed by the right rail and auto-briefing check. It runs alongside `useAppMode`.
- Keep existing planner state, task state, and other context unchanged
- Update `DaySwitcherDropdown.tsx` if it imports `useDayCommitState` directly — point it to the renamed hook
- Move hidden PomodoroTimer from App.tsx into ExecutingMode (mounted off-screen) so the tray timer keeps working. It renders prominently inside FocusMode.

- [ ] **Step 2: Rewrite App.tsx**

Replace the entire AppLayout function with:
```tsx
function AppLayout() {
  const { mode, view, focusTaskId, setView, completeBriefing, startDay,
          enterFocus, exitFocus, openInbox, resetDay } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [isEvening, setIsEvening] = useState(false);

  // Auto-briefing check (same logic as before, simplified)
  // ESC handler
  // Ink floating button state

  return (
    <div className="cinematic-shell relative flex h-screen w-full bg-bg text-text-primary font-sans overflow-hidden">
      <div className="drag-region" />

      {view === 'intentions' ? (
        <IntentionsView />
      ) : mode === 'briefing' ? (
        <BriefingMode onComplete={completeBriefing} isEvening={isEvening} onSettings={() => setShowSettings(true)} />
      ) : mode === 'planning' ? (
        <PlanningMode onStartDay={startDay} onOpenInk={...} onSettings={() => setShowSettings(true)} onEndDay={...} />
      ) : mode === 'focus' && focusTaskId ? (
        <FocusMode taskId={focusTaskId} onExit={exitFocus} />
      ) : (
        <ExecutingMode onEnterFocus={enterFocus} onOpenInk={...} onOpenInbox={openInbox} onSettings={() => setShowSettings(true)} onEndDay={...} />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      <DragOverlay />
      <CommandPalette />
    </div>
  );
}
```

- [ ] **Step 3: Delete replaced components**

Delete:
- `src/components/FocusOverlay.tsx`
- `src/components/PlanningGuardrails.tsx`

- [ ] **Step 4: Delete old WeeklyIntentions if fully replaced**

If IntentionsView fully replaces it, delete `src/components/WeeklyIntentions.tsx`.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (some old tests may need updating for removed components)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rewire App.tsx as thin mode router

App.tsx reduced from 527 lines to ~120. Each mode owns its layout.
FocusOverlay and PlanningGuardrails replaced by FocusMode and RightRail."
```

---

### Task 11: Redesign sidebar — collapsed icon strip with hover overlay

**Files:**
- Modify: `src/components/Sidebar.tsx` — rebuild as overlay

- [ ] **Step 1: Rebuild Sidebar.tsx**

Replace current push sidebar with:
- Collapsed state: thin icon strip (position: fixed, left: 0), icons for Flow, Intentions, Settings
- Hover state: overlay panel (position: fixed, doesn't push content), shows labels
- Contains only: Flow, Intentions, Settings navigation
- No view-specific buttons (no "Plan Week", "Plan Month" — those are gone)

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: redesign sidebar — collapsed icon strip with hover overlay

Sidebar is now position:fixed, doesn't push content.
Collapsed by default, hover to expand.
Contains: Flow, Intentions, Settings."
```

---

### Task 12: Clean up CommandPalette

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 1: Strip CommandPalette to essentials**

Remove:
- Light/dark mode toggle (moves to Settings)
- Focus mode toggle
- Any references to removed views (archive, scratch, money)

Keep:
- Navigation: Flow, Intentions
- Task actions: New Task, search
- Open Ink
- Open Inbox (dispatches OPEN_INBOX — only shown in executing mode)
- Open Settings

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/components/CommandPalette.tsx
git commit -m "feat: strip CommandPalette to navigation + task actions only"
```

---

### Task 13: Add light/dark toggle to Settings, clean up monarch references

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Add appearance section to Settings**

Add a new section (or add to the 'day' tab) with light/dark mode toggle. Use the `useTheme` hook's `setMode` function.

- [ ] **Step 2: Remove monarch settings**

Remove any remaining monarch token fields, monarch as a finance provider option.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: add light/dark toggle to Settings, remove monarch options"
```

---

### Task 14: Build native menu bar

**Files:**
- Modify: `electron/main.ts` — build full menu template
- Modify: `electron/preload.ts` — add menu event listener
- Modify: `src/types/electron.d.ts` — add menu types

- [ ] **Step 1: Build menu template in main.ts**

Replace the minimal menu with a full macOS menu:
```typescript
const menuTemplate: MenuItemConstructorOptions[] = [
  // App menu (macOS)
  { role: 'appMenu' },
  // File
  { label: 'File', submenu: [
    { label: 'New Task', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-task') },
    { label: 'New Event', accelerator: 'CmdOrCtrl+Shift+N', click: () => mainWindow?.webContents.send('menu:new-event') },
    { type: 'separator' },
    { role: 'close' },
  ]},
  // Edit
  { role: 'editMenu' },
  // View
  { label: 'View', submenu: [
    { label: 'Flow', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('menu:set-view', 'flow') },
    { label: 'Intentions', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('menu:set-view', 'intentions') },
    { type: 'separator' },
    { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: () => mainWindow?.webContents.send('menu:toggle-sidebar') },
    { type: 'separator' },
    { role: 'toggleDevTools' },
  ]},
  // Go
  { label: 'Go', submenu: [
    { label: 'Today', accelerator: 'CmdOrCtrl+Shift+T', click: () => mainWindow?.webContents.send('menu:go-today') },
    { label: 'Start Day', click: () => mainWindow?.webContents.send('menu:start-day') },
    { label: 'Open Ink', accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('menu:open-ink') },
  ]},
  // Window
  { role: 'windowMenu' },
  // Help
  { label: 'Help', submenu: [
    { label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu:open-settings') },
  ]},
];
```

- [ ] **Step 2: Add menu event listeners in preload**

In `electron/preload.ts`, add a `menu` namespace following existing listener pattern (return cleanup functions):
```typescript
menu: {
  onNewTask: (cb: () => void) => {
    ipcRenderer.on('menu:new-task', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:new-task');
  },
  onSetView: (cb: (view: string) => void) => {
    ipcRenderer.on('menu:set-view', (_e, view) => cb(view));
    return () => ipcRenderer.removeAllListeners('menu:set-view');
  },
  onToggleSidebar: (cb: () => void) => {
    ipcRenderer.on('menu:toggle-sidebar', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:toggle-sidebar');
  },
  onGoToday: (cb: () => void) => {
    ipcRenderer.on('menu:go-today', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:go-today');
  },
  onStartDay: (cb: () => void) => {
    ipcRenderer.on('menu:start-day', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:start-day');
  },
  onOpenInk: (cb: () => void) => {
    ipcRenderer.on('menu:open-ink', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:open-ink');
  },
  onOpenSettings: (cb: () => void) => {
    ipcRenderer.on('menu:open-settings', () => cb());
    return () => ipcRenderer.removeAllListeners('menu:open-settings');
  },
},
```
Use cleanup functions in useEffect hooks in the renderer.

- [ ] **Step 3: Wire menu events in App.tsx or AppContext**

Add useEffect hooks to listen for menu events and dispatch appropriate actions.

- [ ] **Step 4: Update electron.d.ts**

Add `MenuAPI` interface with all the listener types.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: add native macOS menu bar — File, Edit, View, Go, Window, Help"
```

---

### Task 15: Ensure consistent drag region across all modes

**Files:**
- Modify: each mode component to include proper drag region

- [ ] **Step 1: Verify drag-region class**

Check that `div.drag-region` with proper `-webkit-app-region: drag` CSS is present at the top of every mode. Currently it's in App.tsx (line 239). Ensure it stays in the root App.tsx shell so it applies to all modes.

- [ ] **Step 2: Verify no modes override or block the drag region**

Check that no mode component places interactive elements in the top ~28px of the window without `no-drag` class.

- [ ] **Step 3: Commit if changes needed**

```bash
git add -A
git commit -m "fix: ensure consistent window drag region across all modes"
```

---

### Task 16: Add degraded state handling

**Files:**
- Modify: `src/modes/BriefingMode.tsx` — skip to planning if API unavailable
- Modify: `src/components/rail/MoneyMoves.tsx` — handle finance API failure
- Modify: `src/components/UnifiedInbox.tsx` — handle sync failure gracefully

- [ ] **Step 1: Add API check to BriefingMode**

On mount, check if Anthropic API is configured. If not, immediately call `onComplete()` to skip to planning mode. Show a subtle message in planning mode: "Ink is unavailable — plan manually today."

- [ ] **Step 2: Add error handling to MoneyMoves**

If `finance:get-state` fails, show "Unavailable" or hide the component.

- [ ] **Step 3: Add sync failure indicator to UnifiedInbox**

If Asana sync fails, show "Sync failed" with retry button instead of empty state.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add degraded state handling — app works without AI/sync"
```

---

### Task 17: Clean up old types and unused code

**Files:**
- Modify: `src/types/index.ts` — remove old View type, update DayCommitState references
- Modify: `src/context/AppContext.tsx` — final cleanup of old state machine
- Run: grep for any remaining references to removed components

- [ ] **Step 1: Search for dead references**

Grep for: Archive, ScratchView, ScratchPanel, FocusScratchPanel, CaptureWindow, MoneyView, WeeklyPlanningWizard, MonthlyPlanningWizard, FocusOverlay, PlanningGuardrails, monarch, capture

- [ ] **Step 2: Clean up any remaining references**

Remove imports, type references, and dead code paths.

- [ ] **Step 3: Update View type in types/index.ts**

Replace old View type with:
```typescript
export type View = 'flow' | 'intentions';
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: clean up dead references and update types

Remove all references to deleted components, update View type
to 'flow' | 'intentions', clean up unused imports."
```

---

### Task 18: Reorganize components into domain folders

**Files:**
- Move existing components into domain folders per spec Section 6

- [ ] **Step 1: Create folder structure**

```
src/components/ink/
src/components/timeline/
src/components/inbox/
src/components/chrome/
src/components/shared/
```

Note: `rail/`, `intentions/`, `focus/` already created in earlier tasks.

- [ ] **Step 2: Move components**

Move files and update ALL import paths across the codebase:
- `ink/`: MorningBriefing, BriefingInput, MessageBubble, Thread, MorningWelcome, MorningMoneyBlock
- `timeline/`: Timeline, BlockCard, CurrentTimeIndicator, BeforeHoursVeil, AfterHoursVeil, OpenInterval, DeadlineMargin, TodaysFlow
- `inbox/`: UnifiedInbox
- `chrome/`: Sidebar, CommandPalette, Settings
- `shared/`: TaskCard, DragOverlay, AppIcons, InkedLogo

- [ ] **Step 3: Update all imports**

Search for every import of moved components and update paths. This is the tedious but necessary part.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: reorganize components into domain folders

ink/, timeline/, rail/, inbox/, intentions/, focus/, chrome/, shared/
No functional changes — just file organization."
```

---

### Task 19: Final integration test

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Clean build

- [ ] **Step 4: Manual smoke test checklist**

Tell the user to verify in the Electron app:
- [ ] App opens to Ink briefing screen
- [ ] After briefing, transitions to planning mode with inbox visible
- [ ] "Start my day" or clicking a task transitions to executing mode
- [ ] Inbox collapses in executing mode
- [ ] Right rail shows focus capacity, intentions, money, deadlines
- [ ] Clicking focus on a task enters focus mode (task hero + timer)
- [ ] ESC exits focus mode
- [ ] Sidebar hover-expands as overlay
- [ ] Cmd+K opens stripped-down command palette
- [ ] Intentions view shows combined weekly + monthly
- [ ] Menu bar has all expected items
- [ ] Tray shows timer when pomodoro is running
- [ ] End-of-day nudge appears in right rail
- [ ] Light/dark toggle works in Settings

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from smoke testing"
```
