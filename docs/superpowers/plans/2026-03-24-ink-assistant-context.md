# Ink Assistant Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Ink assistant state and callbacks from App.tsx into a dedicated context, eliminating 9-prop drilling across 4 components.

**Architecture:** Create `InkAssistantContext` owning all assistant state (open, pinned, streaming, sessionId, briefingMode) and callbacks (hover, leave, toggle, close, newChat, planWeekWithInk). Mode components consume via `useInkAssistant()` hook. The duplicated FAB+overlay JSX in PlanningMode, ExecutingMode, and IntentionsView gets extracted into a shared `InkFab` component.

**Tech Stack:** React Context API, vitest, @testing-library/react

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/context/InkAssistantContext.tsx` | Create | Context provider, state, callbacks, `useInkAssistant` hook |
| `src/components/ink/InkFab.tsx` | Create | Shared FAB button + overlay (replaces duplicated JSX in 3 files) |
| `src/App.tsx` | Modify | Wrap with `InkAssistantProvider`, remove assistant state/callbacks, simplify mode props |
| `src/modes/PlanningMode.tsx` | Modify | Remove assistant props, use `useInkAssistant()` + `<InkFab />` |
| `src/modes/ExecutingMode.tsx` | Modify | Remove assistant props, use `useInkAssistant()` + `<InkFab />` |
| `src/components/intentions/IntentionsView.tsx` | Modify | Remove assistant props, use `useInkAssistant()` + `<InkFab />` |
| `src/modes/BriefingMode.tsx` | Modify | Remove briefingSessionId/onNewChat/onStreamingChange/briefingMode props, use `useInkAssistant()` |

---

### Task 1: Create InkAssistantContext

**Files:**
- Create: `src/context/InkAssistantContext.tsx`

- [ ] **Step 1: Write the context + provider + hook**

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const ASSISTANT_CLOSE_DELAY_MS = 140;

interface InkAssistantContextValue {
  // State
  assistantOpen: boolean;
  assistantPinned: boolean;
  inkStreaming: boolean;
  briefingSessionId: number;
  briefingMode: 'briefing' | 'chat';
  // Callbacks
  openAssistantPreview: () => void;
  scheduleAssistantClose: () => void;
  togglePinnedAssistant: () => void;
  closeAssistant: () => void;
  setInkStreaming: (streaming: boolean) => void;
  newChat: () => void;
  openWeeklyPlanningAssistant: () => void;
  setBriefingMode: (mode: 'briefing' | 'chat') => void;
  setAssistantOpen: (open: boolean) => void;
  setAssistantPinned: (pinned: boolean) => void;
}

const InkAssistantContext = createContext<InkAssistantContextValue | null>(null);

export function InkAssistantProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: string;
}) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPinned, setAssistantPinned] = useState(false);
  const [inkStreaming, setInkStreaming] = useState(false);
  const [briefingSessionId, setBriefingSessionId] = useState(0);
  const [briefingMode, setBriefingMode] = useState<'briefing' | 'chat'>('briefing');

  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const closeAssistant = useCallback(() => {
    clearCloseTimeout();
    setAssistantPinned(false);
    setAssistantOpen(false);
  }, [clearCloseTimeout]);

  const openAssistantPreview = useCallback(() => {
    if (mode === 'briefing') return;
    clearCloseTimeout();
    setBriefingMode('chat');
    setAssistantOpen(true);
  }, [clearCloseTimeout, mode]);

  const scheduleAssistantClose = useCallback(() => {
    if (assistantPinned) return;
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setAssistantOpen(false);
    }, ASSISTANT_CLOSE_DELAY_MS);
  }, [assistantPinned, clearCloseTimeout]);

  const togglePinnedAssistant = useCallback(() => {
    if (assistantPinned) {
      closeAssistant();
      return;
    }
    if (mode === 'briefing') return;
    clearCloseTimeout();
    setBriefingMode('chat');
    setAssistantOpen(true);
    setAssistantPinned(true);
  }, [assistantPinned, closeAssistant, clearCloseTimeout, mode]);

  const newChat = useCallback(() => {
    setBriefingSessionId((n) => n + 1);
  }, []);

  const openWeeklyPlanningAssistant = useCallback(() => {
    clearCloseTimeout();
    setBriefingMode('briefing');
    setBriefingSessionId((n) => n + 1);
    setAssistantOpen(true);
    setAssistantPinned(true);
  }, [clearCloseTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout]);

  return (
    <InkAssistantContext.Provider
      value={{
        assistantOpen,
        assistantPinned,
        inkStreaming,
        briefingSessionId,
        briefingMode,
        openAssistantPreview,
        scheduleAssistantClose,
        togglePinnedAssistant,
        closeAssistant,
        setInkStreaming,
        newChat,
        openWeeklyPlanningAssistant,
        setBriefingMode,
        setAssistantOpen,
        setAssistantPinned,
      }}
    >
      {children}
    </InkAssistantContext.Provider>
  );
}

export function useInkAssistant(): InkAssistantContextValue {
  const ctx = useContext(InkAssistantContext);
  if (!ctx) throw new Error('useInkAssistant must be used within InkAssistantProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean build (file is created but not yet consumed)

- [ ] **Step 3: Commit**

```bash
git add src/context/InkAssistantContext.tsx
git commit -m "feat: add InkAssistantContext for assistant state management"
```

---

### Task 2: Create shared InkFab component

**Files:**
- Create: `src/components/ink/InkFab.tsx`

This extracts the duplicated FAB button + overlay JSX from PlanningMode, ExecutingMode, and IntentionsView into a single component.

- [ ] **Step 1: Write the InkFab component**

```tsx
import { lazy, Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInkAssistant } from '@/context/InkAssistantContext';

const MorningBriefing = lazy(() =>
  import('@/components/ink/MorningBriefing').then((m) => ({ default: m.MorningBriefing }))
);

interface InkFabProps {
  /** Override the MorningBriefing mode (e.g., IntentionsView uses conditional logic) */
  briefingModeOverride?: 'briefing' | 'chat';
}

export function InkFab({ briefingModeOverride }: InkFabProps) {
  const {
    assistantOpen,
    assistantPinned,
    openAssistantPreview,
    scheduleAssistantClose,
    togglePinnedAssistant,
    inkStreaming,
    briefingSessionId,
    newChat,
    setInkStreaming,
  } = useInkAssistant();

  const displayMode = briefingModeOverride ?? 'chat';

  return (
    <div
      className="absolute bottom-6 right-6 z-40"
      onMouseEnter={openAssistantPreview}
      onMouseLeave={scheduleAssistantClose}
    >
      {assistantOpen && (
        <div
          className={cn(
            'assistant-overlay no-drag absolute bottom-16 right-0 w-[440px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-[28px] border border-[#243041] shadow-[0_28px_80px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-200 ease-out',
            assistantPinned ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'
          )}
        >
          <Suspense fallback={null}>
            <MorningBriefing
              key={briefingSessionId}
              mode={displayMode}
              variant="overlay"
              onClose={togglePinnedAssistant}
              onNewChat={newChat}
              onStreamingChange={setInkStreaming}
            />
          </Suspense>
        </div>
      )}
      <button
        onClick={togglePinnedAssistant}
        title={assistantPinned ? 'Close Ink' : 'Open Ink'}
        aria-label={assistantPinned ? 'Close Ink' : 'Open Ink'}
        className={cn(
          'ink-fab no-drag relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-accent-warm/35 bg-accent-warm text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)] backdrop-blur-md transition-[border-color,color,background-color,box-shadow] hover:border-accent-warm-hover hover:bg-accent-warm-hover hover:text-white',
          (inkStreaming || assistantPinned) && 'ink-fab--thinking',
          assistantPinned && 'border-accent-warm-hover bg-accent-warm-hover text-white shadow-[0_0_34px_rgba(200,60,47,0.35)]'
        )}
      >
        {inkStreaming && (
          <>
            <span className="ink-fab__ring ink-fab__ring--1" />
            <span className="ink-fab__ring ink-fab__ring--2" />
            <span className="ink-fab__ring ink-fab__ring--3" />
          </>
        )}
        <Sparkles className="ink-fab__icon h-5 w-5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ink/InkFab.tsx
git commit -m "feat: extract shared InkFab component from duplicated FAB code"
```

---

### Task 3: Wire InkAssistantProvider into App.tsx and strip assistant state

**Files:**
- Modify: `src/App.tsx`

This is the big task — remove ~80 lines of assistant state/callbacks from AppLayout, wrap the tree with `InkAssistantProvider`, and simplify all mode component props.

- [ ] **Step 1: Rewrite App.tsx**

Key changes:
1. Add `import { InkAssistantProvider, useInkAssistant } from './context/InkAssistantContext'`
2. Remove from AppLayout: `assistantOpen`, `assistantPinned`, `inkStreaming`, `briefingSessionId`, `briefingMode` state declarations
3. Remove from AppLayout: `assistantCloseTimeoutRef`, `clearAssistantCloseTimeout`, `closeAssistant`, `openAssistantPreview`, `scheduleAssistantClose`, `togglePinnedAssistant`, `openWeeklyPlanningAssistant` callback declarations
4. Replace with: `const ink = useInkAssistant()` destructure for the values still needed in AppLayout (for `openFullscreenInk`, `closeBriefing`, Escape key handler, and the `data-ink-open` attribute)
5. Remove all assistant props from IntentionsView, PlanningMode, ExecutingMode, BriefingMode JSX
6. Wrap the tree: `InkAssistantProvider` goes inside `AppProvider` but outside `ErrorBoundary`, receiving `mode` prop

The resulting `App()` function:
```tsx
export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <DndProvider backend={HTML5Backend}>
          <AppLayoutWithInk />
        </DndProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

function AppLayoutWithInk() {
  const { mode } = useApp();
  return (
    <InkAssistantProvider mode={mode}>
      <ErrorBoundary fallback={({ error }) => <RootFallback error={error} />}>
        <AppLayout />
      </ErrorBoundary>
    </InkAssistantProvider>
  );
}
```

Note: `InkAssistantProvider` needs `mode` from `useApp()`, so it must be inside `AppProvider`. The intermediate `AppLayoutWithInk` component bridges this.

AppLayout shrinks to use `useInkAssistant()` for the few remaining references:
- `assistantOpen` — for `data-ink-open` attribute and grain class
- `closeAssistant` — used by `openFullscreenInk` and `openEveningReflection`
- `assistantPinned` — for Escape key handler
- `setBriefingMode` — used by `openFullscreenInk` and `openEveningReflection`
- `briefingMode` — passed to BriefingMode (but BriefingMode will read from context in Task 6)

Mode component props become:
- `IntentionsView` — no props (reads everything from context + `useApp`)
- `BriefingMode` — `onComplete`, `isEvening` only
- `PlanningMode` — `onStartDay`, `onOpenInk`, `onEndDay` only
- `ExecutingMode` — `onEnterFocus`, `onOpenInk`, `onOpenInbox`, `onEndDay` only
- `FocusMode` — unchanged (`taskId`, `onExit`)

- [ ] **Step 2: Do NOT commit yet** — App.tsx, consumer files, and the build will be broken until all consumers are updated in Tasks 4-7. All files are committed atomically in Task 8.

---

### Task 4: Update PlanningMode to use context + InkFab

**Files:**
- Modify: `src/modes/PlanningMode.tsx`

- [ ] **Step 1: Rewrite PlanningMode**

Remove all 9 assistant props from the interface. Replace the 44-line FAB block (lines 88-132) with `<InkFab />`. Remove `MorningBriefing` lazy import (InkFab owns it now).

```tsx
import { useState } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedInbox } from '@/components/inbox/UnifiedInbox';
import { Timeline } from '@/components/timeline/Timeline';
import { RightRail } from '@/components/rail/RightRail';
import { InkFab } from '@/components/ink/InkFab';

export interface PlanningModeProps {
  onStartDay: () => void;
  onOpenInk: () => void;
  onEndDay: () => void;
}

export function PlanningMode({
  onStartDay: _onStartDay,
  onOpenInk,
  onEndDay,
}: PlanningModeProps) {
  const [inboxCollapsed, setInboxCollapsed] = useState(false);

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Inbox column */}
        <div className="relative shrink-0 h-full flex">
          {inboxCollapsed && (
            <button
              onClick={() => setInboxCollapsed(false)}
              title="Open source list"
              aria-label="Open source list"
              className="flex h-full w-10 shrink-0 items-center justify-center border-r border-border-subtle bg-bg text-text-muted transition-colors hover:text-text-primary"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
          <div
            className={cn(
              'relative h-full overflow-hidden transition-[width,opacity] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              inboxCollapsed ? 'w-0 min-w-0 opacity-0 pointer-events-none' : 'w-[280px] opacity-100'
            )}
          >
            {!inboxCollapsed && (
              <button
                onClick={() => setInboxCollapsed(true)}
                title="Collapse source list"
                aria-label="Collapse source list"
                className="absolute right-3 top-10 z-10 rounded-md border border-border-subtle bg-bg-card/90 p-1 text-text-muted backdrop-blur-sm transition-colors hover:text-text-primary"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <UnifiedInbox collapsed={inboxCollapsed} />
          </div>
        </div>

        {/* Timeline — center column */}
        <div className="flex-1 min-w-[320px] h-full overflow-hidden">
          <Timeline />
        </div>

        {/* Right Rail */}
        <RightRail onOpenInk={onOpenInk} onEndDay={onEndDay} />
      </div>

      <InkFab />
    </>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — committed atomically in Task 8.

---

### Task 5: Update ExecutingMode to use context + InkFab

**Files:**
- Modify: `src/modes/ExecutingMode.tsx`

- [ ] **Step 1: Rewrite ExecutingMode**

Same pattern as PlanningMode — remove 9 assistant props, replace FAB block with `<InkFab />`.

```tsx
import { useState } from 'react';
import { ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedInbox } from '@/components/inbox/UnifiedInbox';
import { Timeline } from '@/components/timeline/Timeline';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { RightRail } from '@/components/rail/RightRail';
import { InkFab } from '@/components/ink/InkFab';

export interface ExecutingModeProps {
  onEnterFocus: (taskId: string) => void;
  onOpenInk: () => void;
  onOpenInbox: () => void;
  onEndDay: () => void;
}

export function ExecutingMode({
  onOpenInk,
  onOpenInbox,
  onEndDay,
}: ExecutingModeProps) {
  const [inboxVisible, setInboxVisible] = useState(false);

  function handleOpenInbox() {
    setInboxVisible(true);
    onOpenInbox();
  }

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        {/* Inbox — hidden by default, temporarily expandable */}
        <div className="relative shrink-0 h-full flex">
          {!inboxVisible && (
            <button
              onClick={handleOpenInbox}
              title="Open source list"
              aria-label="Open source list"
              className="flex h-full w-10 shrink-0 items-center justify-center border-r border-border-subtle bg-bg text-text-muted transition-colors hover:text-text-primary"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
          <div
            className={cn(
              'relative h-full overflow-hidden transition-[width,opacity] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              !inboxVisible ? 'w-0 min-w-0 opacity-0 pointer-events-none' : 'w-[280px] opacity-100'
            )}
          >
            <UnifiedInbox collapsed={!inboxVisible} />
          </div>
        </div>

        {/* Timeline — center column, wider without inbox */}
        <div className="flex-1 min-w-[320px] h-full overflow-hidden">
          <Timeline />
        </div>

        {/* Right Rail */}
        <RightRail onOpenInk={onOpenInk} onEndDay={onEndDay} />
      </div>

      <InkFab />

      {/* Hidden PomodoroTimer — mounted off-screen for tray functionality */}
      <div className="absolute h-px w-px overflow-hidden -left-[9999px] top-0">
        <PomodoroTimer />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — committed atomically in Task 8.

---

### Task 6: Update IntentionsView to use context + InkFab

**Files:**
- Modify: `src/components/intentions/IntentionsView.tsx`

- [ ] **Step 1: Rewrite IntentionsView**

Remove all 10 assistant props from the interface. Replace the FAB block (lines 171-215) with `<InkFab briefingModeOverride={weeklyGoals.length === 0 ? 'briefing' : 'chat'} />`. The "Plan the week with Ink" button uses `useInkAssistant().openWeeklyPlanningAssistant`. Remove `MorningBriefing` lazy import.

The component goes from accepting 10 props to accepting zero props. Export stays named `IntentionsView`.

Key changes in the JSX:
- Line 123: `onClick={onPlanWeekWithInk}` → `onClick={ink.openWeeklyPlanningAssistant}`
- Lines 171-215: Replace entire FAB block with `<InkFab briefingModeOverride={weeklyGoals.length === 0 ? 'briefing' : 'chat'} />`
- Remove: `Sparkles` import from lucide-react (InkFab owns it now)

- [ ] **Step 2: Do NOT commit yet** — committed atomically in Task 8.

---

### Task 7: Update BriefingMode to use context

**Files:**
- Modify: `src/modes/BriefingMode.tsx`

- [ ] **Step 1: Rewrite BriefingMode**

Remove `briefingSessionId`, `onNewChat`, `onStreamingChange`, `briefingMode` from props. Read them from `useInkAssistant()`.

```tsx
import { lazy, Suspense } from 'react';
import { useInkAssistant } from '@/context/InkAssistantContext';

const MorningBriefing = lazy(() =>
  import('@/components/ink/MorningBriefing').then((m) => ({ default: m.MorningBriefing }))
);
const TodaysFlow = lazy(() =>
  import('@/components/timeline/TodaysFlow').then((m) => ({ default: m.TodaysFlow }))
);

export interface BriefingModeProps {
  onComplete: () => void;
  isEvening: boolean;
}

export function BriefingMode({ onComplete, isEvening }: BriefingModeProps) {
  const { briefingSessionId, newChat, setInkStreaming, briefingMode } = useInkAssistant();

  return (
    <>
      {isEvening ? (
        <>
          <div className="flex-1 min-w-0 h-full overflow-hidden border-r border-border-subtle">
            <Suspense fallback={null}>
              <TodaysFlow />
            </Suspense>
          </div>
          <div className="h-full overflow-hidden" style={{ flex: '1 1 0%', minWidth: 320 }}>
            <Suspense fallback={null}>
              <MorningBriefing
                key={briefingSessionId}
                mode={briefingMode}
                onClose={onComplete}
                onNewChat={newChat}
                onStreamingChange={setInkStreaming}
              />
            </Suspense>
          </div>
        </>
      ) : (
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <Suspense fallback={null}>
            <MorningBriefing
              key={briefingSessionId}
              mode={briefingMode}
              onClose={onComplete}
              onNewChat={newChat}
              onStreamingChange={setInkStreaming}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Do NOT commit yet** — committed atomically in Task 8.

---

### Task 8: Final App.tsx cleanup and verification

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Complete the App.tsx rewrite**

Now that all consumers have been updated, finalize App.tsx. The full file should have:
- `InkAssistantProvider` wrapping via `AppLayoutWithInk`
- AppLayout using `useInkAssistant()` for: `assistantOpen` (grain/data-ink-open), `assistantPinned` (Escape handler), `closeAssistant` (used in openFullscreenInk/openEveningReflection), `setBriefingMode` (used in openFullscreenInk/openEveningReflection)
- No more `briefingSessionId`, `setBriefingSessionId`, `inkStreaming`, `setInkStreaming` local state
- Simplified mode component JSX with only mode-specific props

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Clean compilation

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass (existing tests don't test components directly, so no breakage expected)

- [ ] **Step 4: Commit all files atomically**

```bash
git add src/context/InkAssistantContext.tsx src/components/ink/InkFab.tsx src/App.tsx src/modes/PlanningMode.tsx src/modes/ExecutingMode.tsx src/modes/BriefingMode.tsx src/components/intentions/IntentionsView.tsx
git commit -m "refactor: extract Ink assistant state into context, shared InkFab component"
```
