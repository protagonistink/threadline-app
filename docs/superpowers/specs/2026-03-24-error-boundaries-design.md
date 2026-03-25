# Error Boundaries Design

## Problem

The app has zero error boundaries. Any component render error crashes the entire app to a white screen with no recovery path. In Electron there's no browser refresh button — the user must force-quit and relaunch.

## Design

### Single `ErrorBoundary` Component

A reusable class component at `src/components/shared/ErrorBoundary.tsx`.

**Props:**

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onReset?: () => void;
  resetKeys?: unknown[];
}
```

- `fallback` — static ReactNode or render function receiving the error and a reset callback
- `onReset` — called when the user triggers recovery (e.g., clicks "Back to planning")
- `resetKeys` — array of values; when any value changes, the error state auto-clears. This means navigating away from a crashed mode via sidebar or keyboard naturally recovers without explicit user action.

**Behavior:**

- `componentDidCatch` logs the error to console (and later to an optional telemetry hook)
- `getDerivedStateFromError` captures the error into state
- `componentDidUpdate` compares `resetKeys` — if changed, clears error state and calls `onReset`
- `resetErrorBoundary()` method clears error state and calls `onReset`

### Two Placement Tiers

**1. Root boundary** — wraps `AppLayout` inside `App()`

```
App
  ThemeProvider
    AppProvider
      DndProvider
        ErrorBoundary (root)       ← catches catastrophic failures
          AppLayout
```

Fallback: full-screen recovery UI with app logo, "Something went wrong" message, and a "Reload" button that calls `window.location.reload()`. Styled with inline styles (not Tailwind) so it renders even if the CSS pipeline is broken.

**2. Mode-level boundaries** — wrap each branch of the mode router inside `AppLayout`

Each mode component (`BriefingMode`, `PlanningMode`, `ExecutingMode`, `FocusMode`, `IntentionsView`) gets its own boundary with:
- `resetKeys={[mode, view]}` — auto-recovers when user navigates away
- `onReset` calls the appropriate mode transition (e.g., `completeBriefing()` for briefing, `exitFocus()` for focus)
- Fallback: lighter inline message within the content area — "This view hit a problem" with a "Back to planning" action that calls `resetAppMode()`

The sidebar, `AtmosphereLayer`, and global overlays (`Settings`, `CommandPalette`, `InkThread`) remain outside mode boundaries so they stay functional when a mode crashes — the user can still navigate.

### Fallback UI

Two pre-built fallback components, co-located in `ErrorBoundary.tsx`:

**`RootFallback`** — full-screen, inline-styled (no Tailwind dependency), centered vertically:
- App name in Satoshi
- "Something went wrong" heading
- Error message in monospace (JetBrains Mono) at reduced opacity
- "Reload" button

**`ModeFallback`** — Tailwind-styled, fits within the content area:
- "This view hit a problem" message
- Error message in mono at reduced opacity
- "Back to planning" button using `resetErrorBoundary`

Both use the existing color tokens (`--color-bg`, `--color-text-primary`, `--color-accent`).

### What This Does NOT Include

- No error reporting service integration (future work)
- No retry logic for async errors (error boundaries only catch render errors; IPC timeouts are a separate item)
- No boundaries around individual cards or widgets (overkill at current scale)

## Files Changed

| File | Change |
|------|--------|
| `src/components/shared/ErrorBoundary.tsx` | New — ErrorBoundary class component + RootFallback + ModeFallback |
| `src/App.tsx` | Wrap AppLayout in root boundary; wrap each mode branch in mode boundary |

## Testing

- Unit test: `ErrorBoundary.test.tsx` — verify error catch renders fallback, resetKeys auto-recovery, onReset callback, resetErrorBoundary manual recovery
- Use a `ThrowingComponent` test helper that throws on render when a flag is set
