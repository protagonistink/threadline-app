# Block Nesting — Design Spec

## Problem

Overlapping blocks on the timeline imply you can do two tasks simultaneously. This defeats the purpose of a realistic day planner. Tasks need to live *inside* time blocks, not compete with them for the same slot.

## Solution

Blocks are exclusive owners of their time slot. Tasks get nested inside blocks as a checklist — not scheduled as separate overlapping blocks.

## Rules

### No Overlaps

- Every block (focus, ritual, hard/gcal) acts as a solid obstacle.
- `planFocusCascade` already prevents focus blocks from overlapping each other and immovable blocks. Ritual blocks are already `readOnly: true`, so they're treated as immovable obstacles too. Verify this works end-to-end and that no code path bypasses the cascade.
- The `overlapLayout` side-by-side rendering code becomes a safety net only. Under normal operation, no two blocks should share a time range.

### Nesting Tasks Into Blocks

**Drag to nest:** Drag a task from the TodaysFlow sidebar onto an existing block (any kind: focus, ritual, or hard). The task appears as a checklist item inside that block instead of creating a new block.

**Drop target implementation:** Each `BlockCard` gets its own `useDrop` zone that accepts `DragTypes.TASK`. When a task is dragged:
- If the cursor is over a `BlockCard`'s drop zone → the block highlights and the task nests inside it on drop
- If the cursor is over empty grid space → the existing grid-level `useDrop` handles it (creates a new focus block)

The BlockCard drop zone takes priority because it's rendered inside the grid and is higher in the DOM/z-order.

**Inline add:** Each block shows a `+` button (visible on hover, or always visible if the block already has nested tasks). Clicking opens a single-line text input inside the block. Pressing Enter creates a new local task and nests it in that block. The new task is assigned to the block's linked task's goal if available, otherwise no goal. Pressing Escape or blur dismisses. New tasks are appended at the bottom (insertion order).

### Visual Treatment

Nested tasks render as compact lines inside the BlockCard, below the block title and above the physics warning / AI breakdown:

```
┌─ 2px left border (thread color)
│  Writing                         9 AM
│  ┌ ○ Draft intro paragraph
│  ├ ○ Research competitor pricing
│  └ + Add task
└─
```

- Small circle checkbox (8-10px), muted border, fills on check
- Task title: sans-serif, 11px, `text-text-primary/70`
- Checked tasks: strike-through, `text-text-muted/40`
- The `+` row: muted plus icon + "Add task" placeholder, same 11px size
- If no nested tasks and not hovering, the `+` button is hidden
- If the block is too short (height < ~80px), nested tasks are hidden and only shown when the block is hovered or selected

### Data Model

**Relationship to existing `parentId` system:** The codebase already has task-to-task nesting via `PlannedTask.parentId` (used by `nestTask`/`unnestTask` in `useTaskActions`). That system nests tasks under *other tasks*. This new system nests tasks inside *schedule blocks*. They are orthogonal — a task with a `parentId` (subtask) can also be nested inside a block. No changes to the existing `parentId` system.

Add to `ScheduleBlock`:

```typescript
nestedTaskIds?: string[];
```

These reference task IDs from the existing `plannedTasks` array. A task that is nested inside a block:
- Is removed from the "unscheduled" count in TodaysFlow
- Is still visible in TodaysFlow under its goal section (but shown with a subtle indicator that it's scheduled)
- Does NOT get its own ScheduleBlock — it lives inside the parent block's `nestedTaskIds`

### Persistence Across GCal Sync

Hard (gcal) blocks are rebuilt from external data on each sync via `eventToBlock()` in `useExternalPlannerSync`. This would lose `nestedTaskIds`. To preserve nesting:

- Store a separate map in planner state: `blockNesting: Record<string, string[]>` keyed by block ID.
- After GCal sync rebuilds blocks, re-apply nesting from this map by matching block IDs.
- GCal block IDs are derived from the calendar event ID, so they're stable across syncs.
- If a GCal event is deleted, its nesting entries are cleaned up — nested tasks return to the unscheduled pool.

### Nesting a Task (State Changes)

When a task is dropped onto a block:
1. Add `task.id` to `block.nestedTaskIds`
2. If the task previously had its own ScheduleBlock, remove that block
3. The task remains in `committedTaskIds` — it's still committed for the day

When a nested task is checked:
1. Toggle the task's `status` to `done` (same as the existing `toggleTask`)
2. Visual update only — no block duration changes

When a nested task is removed from a block:
1. Remove `task.id` from `block.nestedTaskIds`
2. The task returns to the unscheduled pool in TodaysFlow
3. Method: select the nested task line + Delete key, or drag it out

When a block is deleted (`removeScheduleBlock`):
1. All tasks in `block.nestedTaskIds` return to the unscheduled pool
2. Their `committedTaskIds` status is preserved — they're still committed, just no longer scheduled

When `resetDay` is called:
1. All `nestedTaskIds` are cleared along with the blocks
2. Follows existing `resetDay` behavior — tasks go back to uncommitted

### No Time Tracking

Nested tasks are a checklist. They have no individual time estimates. The parent block's duration is unchanged by nesting. Physics warnings ignore nested tasks — they only consider block duration vs. time-of-day rules.

## Out of Scope

- Reordering nested tasks within a block (can add later)
- Nested task time estimates or progress bars
- Nesting blocks inside blocks (only tasks nest inside blocks)
- Drag-to-reorder nested tasks

## Files Affected

- `src/types/index.ts` — add `nestedTaskIds` to `ScheduleBlock`
- `src/context/AppContext.tsx` — add `nestTaskInBlock`, `unnestTaskFromBlock` actions; update `scheduleTaskBlock` to handle drop-on-block vs. drop-on-grid
- `src/hooks/useScheduleManager.ts` — handle `nestedTaskIds` cleanup in `removeScheduleBlock`
- `src/hooks/useExternalPlannerSync.ts` — preserve `nestedTaskIds` across GCal sync
- `src/hooks/useDragDrop.ts` — may need extended `DragItem` metadata for nest-vs-schedule distinction
- `src/components/Timeline.tsx` — `BlockCard` gets `useDrop` zone, renders nested tasks, inline add input
- `src/components/TodaysFlow.tsx` — show indicator on tasks that are nested in a block
- `src/lib/planner.ts` — verify all block kinds act as solid obstacles (ritual blocks are already `readOnly: true`)
- `src/lib/plannerState.ts` — serialize/deserialize `nestedTaskIds` and `blockNesting` map
