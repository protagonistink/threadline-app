# P1: Inbox Work Mode Tags, Ritual Cleanup, Open Intervals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual hierarchy to inbox items via work mode tags + colored borders, remove ritual duplication from MorningSidebar, promote queue depth to inbox header, and render open intervals on the committed timeline.

**Architecture:** Four independent changes that share no state or logic. Each task produces a working, testable increment. Work mode tags add a `workMode` field to `PlannedTask` + `InboxItem`, sourced from Asana custom fields (Phase 1). Open intervals are computed from sorted schedule blocks and rendered as lightweight styled divs.

**Tech Stack:** React, TypeScript, Tailwind, Electron IPC (Asana API)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `workMode` to `PlannedTask` + `InboxItem` |
| `src/lib/planner.ts` | Modify | Map Asana custom field → `workMode` in `asPlannedTask`, pass through in `asInboxItem` |
| `src/components/UnifiedInbox.tsx` | Modify | Render work mode tag + colored left border on `IncomingCard`; add queue count to header |
| `src/components/MorningSidebar.tsx` | Modify | Delete rituals section |
| `src/components/Timeline.tsx` | Modify | Compute + render open interval blocks between committed blocks |
| `src/styles/globals.css` | Modify | Add work mode border color CSS custom properties |

---

### Task 1: Add `workMode` type + field to PlannedTask and InboxItem

**Files:**
- Modify: `src/types/index.ts:74-90` (PlannedTask), `src/types/index.ts:118-125` (InboxItem)

- [ ] **Step 1: Add WorkMode type and fields**

In `src/types/index.ts`, after the `TaskStatus` type (line 72):

```typescript
export type WorkMode = 'deep_work' | 'collaborative' | 'admin' | 'quick_win';
```

Add to `PlannedTask` interface (after `asanaProject` field, ~line 84):
```typescript
workMode?: WorkMode;
```

Add to `InboxItem` interface (after `active` field, ~line 125):
```typescript
workMode?: WorkMode;
```

- [ ] **Step 2: Build passes**

Run: `npm run build`
Expected: Success (new optional fields, no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add WorkMode type to PlannedTask and InboxItem"
```

---

### Task 2: Map Asana custom field → workMode in planner.ts

**Files:**
- Modify: `src/lib/planner.ts` — `asPlannedTask()` (~line 20) and `asInboxItem()` (~line 30)

- [ ] **Step 1: Read current asPlannedTask and asInboxItem**

Read `src/lib/planner.ts` lines 15-40 to see current conversion logic.

- [ ] **Step 2: Extract workMode from Asana custom fields**

In `asPlannedTask()`, after the existing field mapping, add:

```typescript
const workModeField = asanaTask.custom_fields?.find(
  (f) => f.name.toLowerCase() === 'work mode'
);
const workModeMap: Record<string, WorkMode> = {
  'deep work': 'deep_work',
  'collaborative': 'collaborative',
  'admin': 'admin',
  'quick win': 'quick_win',
};
const workMode = workModeField?.display_value
  ? workModeMap[workModeField.display_value.toLowerCase()]
  : undefined;
```

Add `workMode` to the returned PlannedTask object.

- [ ] **Step 3: Pass workMode through in asInboxItem**

In `asInboxItem()`, add `workMode: task.workMode` to the returned InboxItem.

- [ ] **Step 4: Import WorkMode type**

Add `WorkMode` to the import from `@/types` at the top of `planner.ts`.

- [ ] **Step 5: Build passes**

Run: `npm run build`
Expected: Success

- [ ] **Step 6: Commit**

```bash
git add src/lib/planner.ts
git commit -m "feat: extract workMode from Asana custom field in task conversion"
```

---

### Task 3: Render work mode tags + colored left borders on IncomingCard

**Files:**
- Modify: `src/components/UnifiedInbox.tsx:71-167` (IncomingCard component)
- Modify: `src/styles/globals.css` (add work mode CSS custom properties)

- [ ] **Step 1: Add work mode color constants**

At the top of `UnifiedInbox.tsx` (after imports), add:

```typescript
const WORK_MODE_COLORS: Record<string, string> = {
  deep_work: '#C83C2F',     // Rust
  collaborative: '#252B54', // Deep Indigo
  admin: '#9C9EA2',         // Cool Gray
  quick_win: '#5B8A8A',     // Muted Teal
};

const WORK_MODE_LABELS: Record<string, string> = {
  deep_work: 'DEEP WORK',
  collaborative: 'COLLABORATIVE',
  admin: 'ADMIN',
  quick_win: 'QUICK WIN',
};
```

- [ ] **Step 2: Add work mode rendering to IncomingCard**

Inside `IncomingCard`, after the `isPrimaryGoal` line (~line 101), add:

```typescript
const workMode = item.workMode;
const workModeColor = workMode ? WORK_MODE_COLORS[workMode] : undefined;
const workModeLabel = workMode ? WORK_MODE_LABELS[workMode] : undefined;
```

- [ ] **Step 3: Apply colored left border**

On the `.note-entry` div (line 134-141), add an inline style for the left border when workMode is present. Replace the existing `className` div:

```tsx
<div
  onClick={onSelect}
  className={cn(
    'note-entry',
    threadClass,
    isPlaced && 'placed',
    selected && 'bg-[rgba(250,250,250,0.03)]'
  )}
  style={workModeColor ? { borderLeftColor: workModeColor } : undefined}
>
```

- [ ] **Step 4: Add work mode tag + source badge**

After the title div (line 143-145), add the work mode tag:

```tsx
{workModeLabel && !isPlaced && (
  <div
    className="font-sans text-[9px] uppercase tracking-[0.16em] font-medium mt-1.5"
    style={{ color: workModeColor, opacity: 0.7 }}
  >
    {workModeLabel}
  </div>
)}
```

After the "Ink recommends" block (line 159-163), add the source badge:

```tsx
{!isPlaced && (
  <div className="font-sans text-[9px] uppercase tracking-[0.12em] text-text-muted/30 mt-1.5">
    {item.source === 'asana' ? 'ASANA' : item.source === 'gcal' ? 'CALENDAR' : item.source.toUpperCase()}
  </div>
)}
```

- [ ] **Step 5: Build passes**

Run: `npm run build`
Expected: Success

- [ ] **Step 6: Commit**

```bash
git add src/components/UnifiedInbox.tsx
git commit -m "feat: add work mode tags and colored left borders to inbox items"
```

---

### Task 4: Promote queue depth to inbox header

**Files:**
- Modify: `src/components/UnifiedInbox.tsx:287-293` (header area)

- [ ] **Step 1: Add queue count badge to header**

Replace the inbox header (lines 287-293):

```tsx
<div className="workspace-header">
  <div className="workspace-header-copy">
    <h2 className="font-display text-[22px] font-normal text-[#c8c6c2] leading-tight">
      Inbox{' '}
      <span className="font-sans text-[13px] font-normal text-text-muted/40">
        · {inboxItems.length}
      </span>
    </h2>
    <span className="section-lbl mt-2" style={{ marginBottom: 0 }}>Ready to ink</span>
  </div>
  {syncStatus.loading && <span className="workspace-header-meta">syncing</span>}
</div>
```

- [ ] **Step 2: Build passes**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/components/UnifiedInbox.tsx
git commit -m "feat: promote queue depth count to inbox header"
```

---

### Task 5: Remove rituals section from MorningSidebar

**Files:**
- Modify: `src/components/MorningSidebar.tsx:128-159`

- [ ] **Step 1: Delete the rituals section**

Remove lines 128-159 (the entire `{/* Rituals */}` block including the wrapping div).

The section to delete:
```tsx
{/* Rituals */}
<div className="mb-8">
  <h3 ...>Rituals</h3>
  <div className="flex flex-col gap-6">
    {rituals.length > 0 ? (
      rituals.map(...)
    ) : (
      <p ...>No rituals set.</p>
    )}
  </div>
</div>
```

- [ ] **Step 2: Check if `rituals` is still used elsewhere in MorningSidebar**

If `rituals` and `todayStr` are only used by the deleted section, remove them from the destructuring/computation at the top of the component to avoid unused variable warnings.

- [ ] **Step 3: Build passes**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/components/MorningSidebar.tsx
git commit -m "feat: remove ritual duplication from MorningSidebar — rituals live on timeline only"
```

---

### Task 6: Render open intervals on committed timeline

**Files:**
- Modify: `src/components/Timeline.tsx` — add interval computation + render component

- [ ] **Step 1: Create OpenInterval component**

Add a lightweight component above the `BlockCard` function (~line 168):

```tsx
function OpenInterval({
  startMins,
  durationMins,
  dayStartMins,
}: {
  startMins: number;
  durationMins: number;
  dayStartMins: number;
}) {
  const top = timeToTop(startMins, dayStartMins);
  const height = (durationMins / 60) * HOUR_HEIGHT;
  if (height < 12) return null; // too small to render

  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const label = hours > 0
    ? `${hours}h${mins > 0 ? ` ${mins}m` : ''} open`
    : `${mins}m open`;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        top,
        height,
        border: '1px dashed rgba(156,158,162,0.15)',
        borderRadius: 8,
      }}
    >
      <span
        className="font-sans text-[10px]"
        style={{ color: 'rgba(156,158,162,0.3)' }}
      >
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Compute open intervals**

Inside the `Timeline` component, after `const totalHeight = ...` (~line 812), add the interval computation:

```typescript
import { blockStartMinutes, blockEndMinutes } from '@/lib/planner';

// ... inside Timeline function:
const openIntervals = useMemo(() => {
  if (dayCommitInfo.state !== 'committed') return [];

  const sorted = [...scheduleBlocks]
    .sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b));

  const intervals: Array<{ startMins: number; durationMins: number }> = [];
  let cursor = dayStartMins;

  for (const block of sorted) {
    const bStart = blockStartMinutes(block);
    const bEnd = blockEndMinutes(block);
    if (bStart > cursor) {
      const gap = bStart - cursor;
      if (gap >= 30) { // only show gaps >= 30 minutes
        intervals.push({ startMins: cursor, durationMins: gap });
      }
    }
    cursor = Math.max(cursor, bEnd);
  }

  // Gap after last block → day end
  if (cursor < dayEndMins) {
    const gap = dayEndMins - cursor;
    if (gap >= 30) {
      intervals.push({ startMins: cursor, durationMins: gap });
    }
  }

  return intervals;
}, [dayCommitInfo.state, scheduleBlocks, dayStartMins, dayEndMins]);
```

- [ ] **Step 3: Render intervals in the block container**

In the absolute-positioned block container (~line 1109), add interval rendering after the `scheduleBlocks.map(...)`:

```tsx
<div className="absolute top-0 left-14 right-0 bottom-0">
  {scheduleBlocks.map((block, i) => (
    <BlockCard key={block.id} ... />
  ))}
  {openIntervals.map((interval, i) => (
    <OpenInterval
      key={`interval-${i}`}
      startMins={interval.startMins}
      durationMins={interval.durationMins}
      dayStartMins={dayStartMins}
    />
  ))}
</div>
```

- [ ] **Step 4: Add imports**

Add `blockStartMinutes` and `blockEndMinutes` to the existing planner import at the top of Timeline.tsx.

- [ ] **Step 5: Build passes**

Run: `npm run build`
Expected: Success

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All tests pass (no timeline tests affected)

- [ ] **Step 7: Commit**

```bash
git add src/components/Timeline.tsx
git commit -m "feat: render open intervals as labeled gaps on committed timeline"
```

---

## Verification

1. `npm run build` — TypeScript compilation passes
2. `npm test` — All existing tests pass
3. Manual test in Electron:
   - Inbox items with Asana "Work Mode" custom field show colored left borders + tag labels
   - Items without workMode show existing thread-color behavior (no regression)
   - Source badges (ASANA, CALENDAR, etc.) appear below each inbox item
   - Inbox header shows "Inbox · N" count
   - MorningSidebar no longer shows rituals section (rituals still on timeline)
   - When timeline has committed blocks, gaps ≥30min render as dashed-border "open interval" blocks with duration labels
   - Open intervals only appear in `committed` state (not `briefing` or `closed`)
