# Error Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add error boundaries so component crashes show recovery UI instead of white-screening the app.

**Architecture:** A single reusable `ErrorBoundary` class component with `resetKeys` auto-recovery. Placed at two tiers: root (catches everything, inline-styled) and mode-level (catches per-view crashes, Tailwind-styled, auto-recovers on navigation).

**Tech Stack:** React class component, vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-24-error-boundaries-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/shared/ErrorBoundary.tsx` | Create | ErrorBoundary class component, RootFallback, ModeFallback |
| `src/components/shared/ErrorBoundary.test.tsx` | Create | Unit tests for catch, reset, resetKeys |
| `src/App.tsx` | Modify | Wrap root + each mode branch in boundaries |

---

### Task 1: ErrorBoundary Component — Failing Tests

**Files:**
- Create: `src/components/shared/ErrorBoundary.test.tsx`

- [ ] **Step 1: Write test file with all cases**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Component, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Helper that throws on render when `shouldThrow` is true
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Boom');
  return <div>child content</div>;
}

// Suppress React error boundary console noise in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <div>hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('hello')).toBeDefined();
  });

  it('renders static fallback on error', () => {
    render(
      <ErrorBoundary fallback={<div>something broke</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('something broke')).toBeDefined();
    expect(screen.queryByText('child content')).toBeNull();
  });

  it('renders function fallback with error and reset', () => {
    render(
      <ErrorBoundary
        fallback={({ error, resetErrorBoundary }) => (
          <div>
            <span>{error.message}</span>
            <button onClick={resetErrorBoundary}>retry</button>
          </div>
        )}
      >
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Boom')).toBeDefined();
    expect(screen.getByText('retry')).toBeDefined();
  });

  it('calls onReset and clears error when resetErrorBoundary is invoked', () => {
    const onReset = vi.fn();

    function Wrapper() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          fallback={({ resetErrorBoundary }) => (
            <button onClick={() => { setShouldThrow(false); resetErrorBoundary(); }}>
              recover
            </button>
          )}
          onReset={onReset}
        >
          <ThrowingChild shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Wrapper />);
    fireEvent.click(screen.getByText('recover'));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByText('child content')).toBeDefined();
  });

  it('logs error to console.error', () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary]',
      expect.any(Error)
    );
  });

  it('auto-resets when resetKeys change', () => {
    function Wrapper() {
      const [key, setKey] = useState(0);
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button onClick={() => { setShouldThrow(false); setKey((k) => k + 1); }}>
            navigate
          </button>
          <ErrorBoundary fallback={<div>crashed</div>} resetKeys={[key]}>
            <ThrowingChild shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    }

    render(<Wrapper />);
    expect(screen.getByText('crashed')).toBeDefined();
    fireEvent.click(screen.getByText('navigate'));
    expect(screen.getByText('child content')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/shared/ErrorBoundary.test.tsx`
Expected: FAIL — module `./ErrorBoundary` not found

---

### Task 2: ErrorBoundary Component — Implementation

**Files:**
- Create: `src/components/shared/ErrorBoundary.tsx`

- [ ] **Step 1: Write the ErrorBoundary class component**

```tsx
import { Component, type ReactNode } from 'react';

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((props: FallbackProps) => ReactNode);
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error === null) return;
    if (!this.props.resetKeys || !prevProps.resetKeys) return;

    const changed = this.props.resetKeys.some(
      (key, i) => key !== prevProps.resetKeys![i]
    );
    if (changed) this.resetErrorBoundary();
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error !== null) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback({ error, resetErrorBoundary: this.resetErrorBoundary });
      }
      return fallback;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/shared/ErrorBoundary.test.tsx`
Expected: All 6 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ErrorBoundary.tsx src/components/shared/ErrorBoundary.test.tsx
git commit -m "feat: add ErrorBoundary component with resetKeys auto-recovery"
```

---

### Task 3: Fallback UI Components

**Files:**
- Modify: `src/components/shared/ErrorBoundary.tsx`

- [ ] **Step 1: Add RootFallback below the ErrorBoundary class**

Uses inline styles so it renders even if the CSS pipeline breaks.

```tsx
export function RootFallback({ error }: { error: Error }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#121212',
        color: 'rgba(255, 255, 255, 0.92)',
        fontFamily: 'Satoshi, system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '0.875rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          marginBottom: '1.5rem',
          opacity: 0.45,
        }}
      >
        INKED
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.5rem' }}>
        Something went wrong
      </h1>
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.75rem',
          opacity: 0.45,
          maxWidth: '32rem',
          marginBottom: '1.5rem',
          wordBreak: 'break-word',
        }}
      >
        {error.message}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#C83C2F',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '0.5rem 1.25rem',
          fontSize: '0.8125rem',
          fontFamily: 'Satoshi, system-ui, sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add ModeFallback below RootFallback**

Uses Tailwind classes — safe here because mode boundaries sit inside the styled app shell.

```tsx
export function ModeFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-text-primary">This view hit a problem</p>
      <p className="max-w-md break-words font-mono text-xs text-text-muted">
        {error.message}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 rounded-md bg-accent-warm px-4 py-2 text-sm font-medium text-white hover:bg-accent-warm-hover transition-colors"
      >
        Back to planning
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Run tests to confirm nothing broke**

Run: `npx vitest run src/components/shared/ErrorBoundary.test.tsx`
Expected: All 5 tests still PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/ErrorBoundary.tsx
git commit -m "feat: add RootFallback and ModeFallback UI components"
```

---

### Task 4: Wire Boundaries into App.tsx

**Files:**
- Modify: `src/App.tsx:1-359`

- [ ] **Step 1: Add import at top of App.tsx (after existing imports, before lazy declarations)**

```tsx
import { ErrorBoundary, RootFallback, ModeFallback } from './components/shared/ErrorBoundary';
```

- [ ] **Step 2: Wrap each mode branch in the mode router with ErrorBoundary**

Replace the content inside the `<motion.div>` (lines 270-327) with error-bounded versions. Each boundary gets `resetKeys={[mode, view]}` so navigating auto-clears errors, and `onReset` calls `resetAppMode()` from context (already destructured but not yet used — needs adding to the destructure).

Add `resetAppMode` to the destructure at line 25:
```tsx
const {
    mode,
    view,
    focusTaskId,
    completeBriefing,
    startDay,
    enterFocus,
    exitFocus,
    openInbox,
    isInitialized,
    dayCommitInfo,
    resetDay,
    setView,
    setViewDate,
    resetAppMode,
  } = useApp();
```

Then replace the mode router JSX (inside `<motion.div>`):
```tsx
{view === 'intentions' ? (
  <ErrorBoundary
    resetKeys={[mode, view]}
    onReset={resetAppMode}
    fallback={({ error, resetErrorBoundary }) => (
      <ModeFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    )}
  >
    <Suspense fallback={null}>
      <IntentionsView
        assistantOpen={assistantOpen}
        assistantPinned={assistantPinned}
        onAssistantHover={openAssistantPreview}
        onAssistantLeave={scheduleAssistantClose}
        onToggleAssistant={togglePinnedAssistant}
        onPlanWeekWithInk={openWeeklyPlanningAssistant}
        inkStreaming={inkStreaming}
        briefingSessionId={briefingSessionId}
        onNewChat={() => setBriefingSessionId((n) => n + 1)}
        onStreamingChange={setInkStreaming}
      />
    </Suspense>
  </ErrorBoundary>
) : mode === 'briefing' ? (
  <ErrorBoundary
    resetKeys={[mode, view]}
    onReset={resetAppMode}
    fallback={({ error, resetErrorBoundary }) => (
      <ModeFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    )}
  >
    <BriefingMode
      onComplete={closeBriefing}
      isEvening={isEveningReflection}
      briefingSessionId={briefingSessionId}
      onNewChat={() => setBriefingSessionId((n) => n + 1)}
      onStreamingChange={setInkStreaming}
      briefingMode={briefingMode}
    />
  </ErrorBoundary>
) : mode === 'focus' && focusTaskId ? (
  <ErrorBoundary
    resetKeys={[mode, view]}
    onReset={resetAppMode}
    fallback={({ error, resetErrorBoundary }) => (
      <ModeFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    )}
  >
    <FocusMode taskId={focusTaskId} onExit={exitFocus} />
  </ErrorBoundary>
) : mode === 'planning' ? (
  <ErrorBoundary
    resetKeys={[mode, view]}
    onReset={resetAppMode}
    fallback={({ error, resetErrorBoundary }) => (
      <ModeFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    )}
  >
    <PlanningMode
      onStartDay={startDay}
      onOpenInk={openFullscreenInk}
      onEndDay={() => { setPendingDayReset(true); openEveningReflection(); }}
      assistantOpen={assistantOpen}
      assistantPinned={assistantPinned}
      onAssistantHover={openAssistantPreview}
      onAssistantLeave={scheduleAssistantClose}
      onToggleAssistant={togglePinnedAssistant}
      inkStreaming={inkStreaming}
      briefingSessionId={briefingSessionId}
      onNewChat={() => setBriefingSessionId((n) => n + 1)}
      onStreamingChange={setInkStreaming}
    />
  </ErrorBoundary>
) : (
  <ErrorBoundary
    resetKeys={[mode, view]}
    onReset={resetAppMode}
    fallback={({ error, resetErrorBoundary }) => (
      <ModeFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    )}
  >
    <ExecutingMode
      onEnterFocus={enterFocus}
      onOpenInk={openFullscreenInk}
      onOpenInbox={openInbox}
      onEndDay={() => { setPendingDayReset(true); openEveningReflection(); }}
      assistantOpen={assistantOpen}
      assistantPinned={assistantPinned}
      onAssistantHover={openAssistantPreview}
      onAssistantLeave={scheduleAssistantClose}
      onToggleAssistant={togglePinnedAssistant}
      inkStreaming={inkStreaming}
      briefingSessionId={briefingSessionId}
      onNewChat={() => setBriefingSessionId((n) => n + 1)}
      onStreamingChange={setInkStreaming}
    />
  </ErrorBoundary>
)}
```

- [ ] **Step 3: Wrap AppLayout in root boundary**

In the `App()` function (line 349), wrap `<AppLayout />` with the root boundary:

```tsx
export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <DndProvider backend={HTML5Backend}>
          <ErrorBoundary fallback={({ error }) => <RootFallback error={error} />}>
            <AppLayout />
          </ErrorBoundary>
        </DndProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean compilation, no type errors

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire error boundaries into root and mode router"
```
