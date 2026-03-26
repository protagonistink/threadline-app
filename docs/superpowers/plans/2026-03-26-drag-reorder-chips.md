# Drag-to-Reorder Schedule Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag schedule chips into a new order during the morning briefing proposal; times cascade automatically from the drop point.

**Architecture:** A pure `reorderChips` utility computes the new chip array with cascaded times. A `reorderScheduleChips` action in `useProposalExecution` owns state mutation. `useBriefingState` threads the action through to `MorningBriefing`, which passes it to the upgraded `ScheduleChips` component. `ScheduleChips` wraps itself in a scoped `DndProvider` and makes each chip both a drag source and drop target via `react-dnd`.

**Tech Stack:** React 18, TypeScript, react-dnd v16 + react-dnd-html5-backend (already installed), vitest

---

## File Map

| File | What changes |
|---|---|
| `src/components/ink/morningBriefingUtils.ts` | Add `id` to `ScheduleChip`; populate in `parseScheduleProposal`; add `reorderChips` |
| `src/components/ink/morningBriefingUtils.test.ts` | Tests for `reorderChips` |
| `src/hooks/useProposalExecution.ts` | Add `reorderScheduleChips` to `ProposalActions` + implement |
| `src/hooks/useBriefingState.ts` | Add `reorderScheduleChip` to `BriefingActions` + thread through |
| `src/components/ink/MorningBriefing.tsx` | Pass `onReorder` to `<ScheduleChips>` |
| `src/components/ScheduleChips.tsx` | DnD, new chip styles, `onReorder` prop |

---

## Task 1: `reorderChips` utility + `id` on `ScheduleChip`

**Files:**
- Modify: `src/components/ink/morningBriefingUtils.ts`
- Test: `src/components/ink/morningBriefingUtils.test.ts`

- [ ] **Step 1: Write failing tests for `reorderChips`**

Add to `src/components/ink/morningBriefingUtils.test.ts`:

```ts
import { reorderChips } from './morningBriefingUtils';
import type { ScheduleChip } from './morningBriefingUtils';

function makeChip(startHour: number, startMin: number, durationMins: number): ScheduleChip {
  return {
    id: `chip-${startHour}`,
    title: `Task ${startHour}`,
    startHour,
    startMin,
    durationMins,
    matchedTaskId: null,
    matchedGoalId: null,
    selected: true,
  };
}

describe('reorderChips', () => {
  it('returns original array when fromIndex === toIndex', () => {
    const chips = [makeChip(9, 0, 60), makeChip(10, 0, 30)];
    expect(reorderChips(chips, 0, 0)).toBe(chips);
  });

  it('moves chip up and cascades times from new position', () => {
    // [9:00 60m, 10:00 30m, 10:30 45m] → drag index 2 to index 0
    const chips = [makeChip(9, 0, 60), makeChip(10, 0, 30), makeChip(10, 30, 45)];
    const result = reorderChips(chips, 2, 0);
    // cascadeStart = 0, anchor = 9:00
    // slot 0 (moved chip, 45m): 9:00–9:45
    expect(result[0].startHour).toBe(9);
    expect(result[0].startMin).toBe(0);
    expect(result[0].durationMins).toBe(45);
    // slot 1 (original first, 60m): 9:45–10:45
    expect(result[1].startHour).toBe(9);
    expect(result[1].startMin).toBe(45);
    // slot 2 (original second, 30m): 10:45–11:15
    expect(result[2].startHour).toBe(10);
    expect(result[2].startMin).toBe(45);
  });

  it('moves chip down and cascades times from earlier position', () => {
    // [9:00 60m, 10:00 30m, 10:30 45m] → drag index 0 to index 2
    const chips = [makeChip(9, 0, 60), makeChip(10, 0, 30), makeChip(10, 30, 45)];
    const result = reorderChips(chips, 0, 2);
    // cascadeStart = 0, anchor = 9:00
    // slot 0 (original second, 30m): 9:00–9:30
    expect(result[0].startHour).toBe(9);
    expect(result[0].startMin).toBe(0);
    expect(result[0].durationMins).toBe(30);
    // slot 1 (original third, 45m): 9:30–10:15
    expect(result[1].startHour).toBe(9);
    expect(result[1].startMin).toBe(30);
    // slot 2 (moved chip, 60m): 10:15–11:15
    expect(result[2].startHour).toBe(10);
    expect(result[2].startMin).toBe(15);
  });

  it('leaves chips above cascadeStart unchanged', () => {
    // [8:00 30m, 9:00 60m, 10:00 30m] → drag index 2 to index 1
    const chips = [makeChip(8, 0, 30), makeChip(9, 0, 60), makeChip(10, 0, 30)];
    const result = reorderChips(chips, 2, 1);
    // index 0 is above cascadeStart=1, must be untouched
    expect(result[0].startHour).toBe(8);
    expect(result[0].startMin).toBe(0);
  });

  it('clamps times that would exceed 23:59', () => {
    const chips = [makeChip(23, 30, 45), makeChip(23, 45, 60)];
    const result = reorderChips(chips, 1, 0);
    // no chip should have startHour > 23 or produce negative values
    result.forEach(chip => {
      expect(chip.startHour).toBeLessThanOrEqual(23);
      expect(chip.startMin).toBeGreaterThanOrEqual(0);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npx vitest run src/components/ink/morningBriefingUtils.test.ts 2>&1 | tail -20
```

Expected: errors about `reorderChips` not exported and `id` missing from `ScheduleChip`.

- [ ] **Step 3: Add `id` to `ScheduleChip` interface and populate it in `parseScheduleProposal`**

In `src/components/ink/morningBriefingUtils.ts`, update the `ScheduleChip` interface (currently at line 174):

```ts
export interface ScheduleChip {
  id: string;           // ← add this
  title: string;
  startHour: number;
  startMin: number;
  durationMins: number;
  matchedTaskId: string | null;
  matchedGoalId: string | null;
  selected: boolean;
}
```

In `parseScheduleProposal`, update the `.map()` return (currently at lines 202–222) to include `id`:

```ts
return parsed
  .filter((item: Record<string, unknown>) => item.title && typeof item.startHour === 'number')
  .map((item: Record<string, unknown>, i: number) => {        // ← add index param
    const title = String(item.title);
    const normalized = normalizeTaskTitle(title);
    const exactMatch = matchableTasks.find((t) => normalizeTaskTitle(t.title) === normalized);
    const fuzzyMatch = exactMatch
      ? null
      : matchableTasks.find((t) => {
          const nt = normalizeTaskTitle(t.title);
          return nt.includes(normalized) || normalized.includes(nt);
        });
    const matched = exactMatch || fuzzyMatch;

    return {
      id: `chip-${i}`,                                        // ← add this
      title,
      startHour: Number(item.startHour),
      startMin: Number(item.startMin) || 0,
      durationMins: Number(item.durationMins) || 60,
      matchedTaskId: matched?.id || null,
      matchedGoalId: matched?.weeklyGoalId || null,
      selected: true,
    };
  });
```

- [ ] **Step 4: Add `reorderChips` function**

Add after the `parseScheduleProposal` closing brace in `src/components/ink/morningBriefingUtils.ts`:

```ts
export function reorderChips(chips: ScheduleChip[], fromIndex: number, toIndex: number): ScheduleChip[] {
  if (fromIndex === toIndex) return chips;

  const cascadeStart = Math.min(fromIndex, toIndex);
  // Capture anchor from ORIGINAL array before reordering
  const anchorMins = chips[cascadeStart].startHour * 60 + chips[cascadeStart].startMin;

  // Build reordered array immutably
  const reordered = [...chips];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  // Cascade from cascadeStart to end; leave items above untouched
  let cursorMins = anchorMins;
  return reordered.map((chip, i) => {
    if (i < cascadeStart) return chip;
    // Clamp to prevent overflow past 23:59
    const maxStart = 23 * 60 + 59 - chip.durationMins;
    const clampedStart = Math.min(Math.max(cursorMins, 0), maxStart);
    cursorMins = clampedStart + chip.durationMins;
    return {
      ...chip,
      startHour: Math.floor(clampedStart / 60),
      startMin: clampedStart % 60,
    };
  });
}
```

- [ ] **Step 5: Run tests — expect all to pass**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npx vitest run src/components/ink/morningBriefingUtils.test.ts 2>&1 | tail -20
```

Expected: all `reorderChips` tests pass; pre-existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && git add src/components/ink/morningBriefingUtils.ts src/components/ink/morningBriefingUtils.test.ts && git commit -m "feat: add reorderChips utility and id field to ScheduleChip"
```

---

## Task 2: Wire `reorderScheduleChips` action in `useProposalExecution`

**Files:**
- Modify: `src/hooks/useProposalExecution.ts`

- [ ] **Step 1: Add `reorderScheduleChips` to `ProposalActions` interface**

In `src/hooks/useProposalExecution.ts`, add to the `ProposalActions` interface after `toggleScheduleChip` (line 33):

```ts
reorderScheduleChips: (fromIndex: number, toIndex: number) => void;
```

- [ ] **Step 2: Implement the action**

Add after the `toggleScheduleChip` implementation (after line 148):

```ts
const reorderScheduleChips = useCallback((fromIndex: number, toIndex: number) => {
  setScheduleChips((prev) => reorderChips(prev, fromIndex, toIndex));
}, []);
```

Also add `reorderChips` to the import at the top of the file:

```ts
import { inferPlanningDateFromContent, parseCommitChips, parseRitualSuggestions, parseScheduleProposal, reorderChips, type CommitChip, type ScheduleChip } from '@/components/ink/morningBriefingUtils';
```

- [ ] **Step 3: Add to returned actions object**

In the `return` statement (around line 163), add `reorderScheduleChips` to the `actions` object:

```ts
actions: {
  showCommitChips,
  executeCommit,
  executeSchedule,
  toggleChip,
  toggleScheduleChip,
  reorderScheduleChips,    // ← add
  parseProposalFromMessage,
  parseRitualsFromMessage,
  skipRitual,
  clearProposal,
  setProposalDate,
},
```

- [ ] **Step 4: Build to verify TypeScript**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && git add src/hooks/useProposalExecution.ts && git commit -m "feat: add reorderScheduleChips action to useProposalExecution"
```

---

## Task 3: Thread `onReorder` through `useBriefingState` + `MorningBriefing`

**Files:**
- Modify: `src/hooks/useBriefingState.ts`
- Modify: `src/components/ink/MorningBriefing.tsx`

- [ ] **Step 1: Add `reorderScheduleChip` to `BriefingActions` interface**

In `src/hooks/useBriefingState.ts`, add to the `BriefingActions` interface after `toggleScheduleChip` (line 57):

```ts
reorderScheduleChip: (fromIndex: number, toIndex: number) => void;
```

- [ ] **Step 2: Implement by delegating to `proposal.actions`**

Find where `useBriefingState` builds its returned `actions` object (search for `toggleScheduleChip: proposal.actions.toggleScheduleChip`). Add the delegation alongside it:

```ts
reorderScheduleChip: proposal.actions.reorderScheduleChips,
```

- [ ] **Step 3: Pass `onReorder` to `<ScheduleChips>` in `MorningBriefing.tsx`**

In `src/components/ink/MorningBriefing.tsx`, find the `<ScheduleChips>` render (around line 213) and add the prop:

```tsx
<ScheduleChips
  chips={state.scheduleChips}
  proposalLabel={state.proposalLabel}
  isOverlay={state.isOverlay}
  onToggle={actions.toggleScheduleChip}
  onExecute={() => void actions.executeSchedule()}
  onReorder={actions.reorderScheduleChip}   // ← add
/>
```

- [ ] **Step 4: Commit** (do not run `tsc` here — `ScheduleChips` doesn't accept `onReorder` yet; Task 4 adds it and fixes the type error)

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && git add src/hooks/useBriefingState.ts src/components/ink/MorningBriefing.tsx && git commit -m "feat: thread onReorder through useBriefingState and MorningBriefing"
```

---

## Task 4: Add DnD + new styles to `ScheduleChips.tsx`

**Files:**
- Modify: `src/components/ScheduleChips.tsx`

- [ ] **Step 1: Replace `ScheduleChips.tsx` with the full DnD + restyled implementation**

Overwrite `src/components/ScheduleChips.tsx` entirely:

```tsx
// src/components/ScheduleChips.tsx
import { useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleChip } from '@/components/ink/morningBriefingUtils';
import { formatTime } from '@/components/timeline/timelineUtils';

const CHIP_TYPE = 'SCHEDULE_CHIP';

function DraggableChip({
  chip,
  index,
  totalChips,
  onToggle,
  onReorder,
}: {
  chip: ScheduleChip;
  index: number;
  totalChips: number;
  onToggle: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: CHIP_TYPE,
    item: { index },
    canDrag: totalChips >= 2,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver, dragIndex }, drop] = useDrop({
    accept: CHIP_TYPE,
    drop(item: { index: number }) {
      if (item.index !== index) onReorder(item.index, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      dragIndex: (monitor.getItem() as { index: number } | null)?.index ?? null,
    }),
  });

  drag(drop(ref));

  const dropPosition =
    isOver && dragIndex !== null && dragIndex !== index
      ? dragIndex > index
        ? 'above'
        : 'below'
      : null;

  const timeLabel = formatTime(chip.startHour, chip.startMin);
  const endTotalMins = chip.startHour * 60 + chip.startMin + chip.durationMins;
  const endLabel = formatTime(Math.floor(endTotalMins / 60), endTotalMins % 60);

  const dropLine = (
    <div
      style={{
        height: 2,
        background: 'var(--color-accent-warm)',
        borderRadius: 2,
        margin: '2px 0',
      }}
    />
  );

  return (
    <>
      {dropPosition === 'above' && dropLine}
      <button
        ref={ref}
        onClick={() => onToggle(index)}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 text-left transition-all text-[13px]',
          chip.selected ? 'border' : 'border border-transparent'
        )}
        style={{
          borderRadius: 16,
          borderLeftWidth: 3,
          borderLeftStyle: 'solid',
          borderLeftColor: chip.selected ? 'var(--color-accent-warm)' : 'var(--color-text-muted)',
          borderColor: chip.selected ? 'rgba(var(--color-accent-warm-rgb, 200 60 47) / 0.3)' : 'transparent',
          background: chip.selected ? 'var(--color-bg-chip-selected, rgba(200,60,47,0.15))' : 'var(--color-bg-chip)',
          color: chip.selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          opacity: isDragging ? 0.4 : 1,
          cursor: totalChips >= 2 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <div
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{
            borderColor: chip.selected ? 'var(--color-accent-warm)' : 'var(--color-text-muted)',
            background: chip.selected ? 'var(--color-accent-warm)' : 'transparent',
          }}
        >
          {chip.selected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>
        <span className="flex-1 min-w-0 truncate">{chip.title}</span>
        <span className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          <Clock className="w-3 h-3" />
          {timeLabel}–{endLabel}
        </span>
      </button>
      {dropPosition === 'below' && dropLine}
    </>
  );
}

export function ScheduleChips({
  chips,
  proposalLabel,
  isOverlay,
  onToggle,
  onExecute,
  onReorder,
}: {
  chips: ScheduleChip[];
  proposalLabel: string;
  isOverlay: boolean;
  onToggle: (index: number) => void;
  onExecute: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-2 mt-2">
        <div
          className="text-[10px] uppercase tracking-[0.14em] font-medium px-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Proposed schedule for {proposalLabel}
        </div>
        {chips.map((chip, i) => (
          <DraggableChip
            key={chip.id}
            chip={chip}
            index={i}
            totalChips={chips.length}
            onToggle={onToggle}
            onReorder={onReorder}
          />
        ))}
        <button
          onClick={onExecute}
          disabled={chips.every((c) => !c.selected)}
          className={cn(
            'mt-2 rounded-lg text-[13px] font-medium transition-all',
            isOverlay ? 'px-3.5 py-2' : 'px-4 py-2'
          )}
          style={{
            background: chips.some((c) => c.selected)
              ? 'var(--color-accent-warm)'
              : 'var(--color-bg-elevated)',
            color: chips.some((c) => c.selected)
              ? 'var(--color-text-on-accent)'
              : 'var(--color-text-muted)',
            cursor: chips.some((c) => c.selected) ? 'pointer' : 'not-allowed',
          }}
        >
          Lock it in
        </button>
      </div>
    </DndProvider>
  );
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 3: Run full build**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npm run build 2>&1 | tail -10
```

Expected: successful build, no errors.

- [ ] **Step 4: Run full test suite**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && git add src/components/ScheduleChips.tsx && git commit -m "feat: add drag-to-reorder to schedule chips with cascading times"
```

---

## Verification Checklist

After all tasks complete, open the app in Electron and verify:

- [ ] Schedule chips render with 16px radius and left accent bar
- [ ] Drag a chip upward — times cascade from the new (earlier) position; chips above the drag target are unchanged
- [ ] Drag a chip downward — same cascade from the earlier position
- [ ] Drag to same slot — no time change, no visual glitch
- [ ] Tapping a chip still toggles selected state (no accidental drag)
- [ ] Drop indicator line appears above chip when dragging up, below when dragging down
- [ ] With only one chip, no drag cursor or affordance
- [ ] "Lock it in" still executes the schedule correctly after reordering
