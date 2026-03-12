# Lock Day / Focus Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "🔒 Focus" button to the bottom of TodaysFlow that collapses it to a vertical strip, hides the UnifiedInbox, and resizes the window to ~520px wide — putting the Timeline front and center for execution mode.

**Architecture:** `dayLocked: boolean` lives in AppContext, persisted via `window.api.store`. A new IPC handler `window:set-focus-size` resizes/restores the main window. TodaysFlow renders either full layout or a narrow 40px strip based on a `collapsed` prop.

**Tech Stack:** React + AppContext (state), electron-store (persistence), Electron ipcMain (window resize), TodaysFlow (UI), Tailwind v4

---

## Design

- **Lock button:** bottom of TodaysFlow, lock icon + "Focus" label, replaces existing "Lock in the day" button
- **Locked state:** TodaysFlow collapses to 40px strip (lock icon + vertical "Today's Plan" text), UnifiedInbox hidden, window resizes to ~520px wide
- **Unlock:** click the strip, window restores to original width
- **Persistence:** survives app restarts; `resetDay()` clears it
- **Window math:** sidebar(84) + strip(40) + timeline(396) = 520px locked width

---

### Task 1: Add `dayLocked` to AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`

**Step 1: Add to `AppContextValue` interface (after `unnestTask` line ~91)**

```ts
dayLocked: boolean;
lockDay: () => void;
unlockDay: () => void;
```

**Step 2: Add state inside `AppProvider` (after `workdayEnd` state ~line 112)**

```ts
const [dayLocked, setDayLocked] = useState(false);
```

**Step 3: Add load effect (after the existing large `loadState` useEffect, around line 180+)**

```ts
useEffect(() => {
  void window.api.store.get('dayLocked').then((val) => {
    if (val) setDayLocked(true);
  });
}, []);
```

**Step 4: Add `lockDay` and `unlockDay` callbacks (after `setWorkdayEnd` callback)**

```ts
const lockDay = useCallback(() => {
  setDayLocked(true);
  void window.api.store.set('dayLocked', true);
  void window.api.window.setFocusSize(true);
}, []);

const unlockDay = useCallback(() => {
  setDayLocked(false);
  void window.api.store.set('dayLocked', false);
  void window.api.window.setFocusSize(false);
}, []);
```

**Step 5: Clear `dayLocked` in `resetDay` (after `setLastCommitTimestamp(0)` ~line 344)**

```ts
setDayLocked(false);
void window.api.store.set('dayLocked', false);
void window.api.window.setFocusSize(false);
```

**Step 6: Add to the context value object (near `nestTask`, `unnestTask`, `resetDay`)**

```ts
dayLocked,
lockDay,
unlockDay,
```

**Step 7: Run the build to check for TypeScript errors**

```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus" && npm run build 2>&1 | tail -20
```

Expected: build fails with "setFocusSize does not exist" — that's expected, we fix it next.

**Step 8: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat(lock-day): add dayLocked state, lockDay/unlockDay to AppContext"
```

---

### Task 2: Add `setFocusSize` IPC handler

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Add `fullWindowSize` variable in `electron/main.ts` (after `let tray` ~line 19)**

```ts
let fullWindowSize: [number, number] | null = null;
```

**Step 2: Add IPC handler in `electron/main.ts` (after the `window:show-main` handler ~line 235)**

```ts
ipcMain.handle('window:set-focus-size', (_event, locked: boolean) => {
  if (!mainWindow) return;
  if (locked) {
    fullWindowSize = mainWindow.getSize() as [number, number];
    mainWindow.setMinimumSize(400, 600);
    mainWindow.setSize(520, mainWindow.getSize()[1], true);
  } else {
    mainWindow.setMinimumSize(1200, 700);
    if (fullWindowSize) {
      mainWindow.setSize(fullWindowSize[0], fullWindowSize[1], true);
      fullWindowSize = null;
    }
  }
});
```

**Step 3: Add to `electron/preload.ts` window object (after `showMain` ~line 70)**

```ts
setFocusSize: (locked: boolean) => ipcRenderer.invoke('window:set-focus-size', locked),
```

**Step 4: Add to `WindowAPI` interface in `src/types/electron.d.ts` (after `showMain` ~line 113)**

```ts
setFocusSize: (locked: boolean) => Promise<void>;
```

**Step 5: Run build**

```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus" && npm run build 2>&1 | tail -20
```

Expected: TypeScript errors should be gone (or only unrelated).

**Step 6: Commit**

```bash
git add electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat(lock-day): add window:set-focus-size IPC handler for focus mode resize"
```

---

### Task 3: Update `App.tsx` to wire `dayLocked`

**Files:**
- Modify: `src/App.tsx`

**Step 1: Consume `dayLocked` from `useApp()` (in the destructure ~line 59)**

Add `dayLocked, lockDay, unlockDay` to the destructure (they're available but we mainly need `dayLocked` here since TodaysFlow will call `lockDay`/`unlockDay` from context directly).

```ts
const {
  activeView,
  activeSource,
  weeklyPlanningLastCompleted,
  openWeeklyPlanning,
  dailyPlan,
  setActiveView,
  dayLocked,   // add this
} = useApp();
```

**Step 2: Remove `sourceCollapsed` state and related effect**

Remove:
```ts
const [sourceCollapsed, setSourceCollapsed] = useState(false);
```

Remove the `useEffect` at lines ~108–117 that manages `sourceCollapsed`.

**Step 3: Update `sourcePanelIsCollapsed`**

Replace:
```ts
const sourcePanelIsCollapsed = isFocus || (activeView === 'flow' && sourceCollapsed);
```

With:
```ts
const sourcePanelIsCollapsed = isFocus || dayLocked;
```

**Step 4: Update `TodaysFlow` usage**

Replace:
```tsx
<TodaysFlow onCollapse={() => setSourceCollapsed(true)} />
```

With:
```tsx
<TodaysFlow collapsed={dayLocked} />
```

**Step 5: Run build**

```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus" && npm run build 2>&1 | tail -20
```

Expected: TypeScript error that `TodaysFlow` doesn't accept `collapsed` prop yet — fix in next task.

**Step 6: Commit (after Task 4 passes build)**

```bash
git add src/App.tsx
git commit -m "feat(lock-day): wire dayLocked into App layout, remove sourceCollapsed"
```

---

### Task 4: Update `TodaysFlow` component

**Files:**
- Modify: `src/components/TodaysFlow.tsx`

**Step 1: Update props type — find the `TodaysFlow` function signature (search for `function TodaysFlow` or `export function TodaysFlow`)**

Change the props from:
```ts
{ onCollapse }: { onCollapse?: () => void }
```

To:
```ts
{ collapsed = false }: { collapsed?: boolean }
```

**Step 2: Add `dayLocked`, `lockDay`, `unlockDay` to `useApp()` destructure (around line 400)**

```ts
const {
  // ... existing
  lockDay,
  unlockDay,
  dayLocked,
} = useApp();
```

**Step 3: Add `Lock` to lucide imports at top of file**

Add `Lock` to the existing import from `'lucide-react'`.

**Step 4: Add collapsed strip render (before the main return, right after the hooks/memos)**

Find where the main `return (` is in TodaysFlow and add this block just before it:

```tsx
if (collapsed) {
  return (
    <div
      onClick={() => unlockDay()}
      className="w-10 shrink-0 flex flex-col items-center justify-start pt-8 gap-4 cursor-pointer border-r border-border/30 hover:bg-bg-elevated/20 transition-colors select-none"
      title="Today's Plan — click to unlock"
    >
      <Lock className="w-3.5 h-3.5 text-text-muted/60" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted/50 font-medium [writing-mode:vertical-rl] rotate-180">
        Today's Plan
      </span>
    </div>
  );
}
```

**Step 5: Update the Focus button (the existing "Lock in the day" block at lines ~611–624)**

Find the existing button block:
```tsx
{dayTasks.length > 0 && onCollapse && (
  <div className="px-6 pb-3 shrink-0">
    <button
      onClick={() => { onCollapse(); play('paper'); }}
      className="w-full flex items-center justify-between px-6 py-3 bg-[#E55547]/10 hover:bg-[#E55547] text-[#E55547] hover:text-[#FAFAFA] transition-all duration-300 group"
    >
      <span className="text-[11px] uppercase tracking-[0.18em] font-medium">Lock in the day</span>
      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
    </button>
    <svg .../>
  </div>
)}
```

Replace with:
```tsx
{dayTasks.length > 0 && (
  <div className="px-6 pb-3 shrink-0">
    <button
      onClick={() => { lockDay(); play('paper'); }}
      className="w-full flex items-center justify-between px-6 py-3 bg-[#E55547]/10 hover:bg-[#E55547] text-[#E55547] hover:text-[#FAFAFA] transition-all duration-300 group"
    >
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium">
        <Lock className="w-3 h-3" />
        Focus
      </span>
      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
    </button>
    <svg className="w-full h-2 mt-4" preserveAspectRatio="none">
      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" className="text-text-muted/20" strokeWidth="1" strokeDasharray="8 4 12 4 6 4" />
    </svg>
  </div>
)}
```

**Step 6: Remove `onCollapse` from the `ArrowRight` import check** — also remove `ArrowRight` import if it's no longer used anywhere else in the file (check first with grep).

```bash
grep -n "ArrowRight" "/Users/pat/Sites/Protagonist Ink/Playground/timefocus/src/components/TodaysFlow.tsx"
```

If only used in the button we just replaced, remove from lucide import.

**Step 7: Run build**

```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus" && npm run build 2>&1 | tail -30
```

Expected: clean build (TypeScript enforces `noUnusedLocals` so any leftover refs to `onCollapse` will surface here).

**Step 8: Commit**

```bash
git add src/components/TodaysFlow.tsx src/App.tsx
git commit -m "feat(lock-day): Focus button + collapsed strip in TodaysFlow"
```

---

### Task 5: Smoke test

**Step 1: Start the dev server**

```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus" && npm run dev
```

**Step 2: Manual checks**

- [ ] "Focus" button with lock icon appears at bottom of TodaysFlow when tasks are committed
- [ ] Clicking "Focus" collapses TodaysFlow to strip, hides UnifiedInbox, window narrows to ~520px
- [ ] Clicking the strip expands TodaysFlow and restores window width
- [ ] State persists: lock → quit → relaunch → still locked
- [ ] `resetDay()` clears locked state and restores window

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(lock-day): smoke test fixes"
```
