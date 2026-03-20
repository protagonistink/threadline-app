# Block Nesting — Design Spec

## Problem

Overlapping blocks on the timeline imply you can do two tasks simultaneously. This defeats the purpose of a realistic day planner. Tasks need to live *inside* time blocks, not compete with them for the same slot.

## Solution

Blocks are exclusive owners of their time slot. Tasks get nested inside blocks as a checklist — not scheduled as separate overlapping blocks.

## Rules

### No Overlaps

- Every block (focus, ritual, hard/gcal) acts as a solid obstacle.
- `planFocusCascade` already prevents focus blocks from overlapping each other and immovable blocks. Extend this so that when a user drags a block to a time slot occupied by another block, the block cascades to the next available gap — never stacks on top.
- The `overlapLayout` side-by-side rendering code becomes a safety net only. Under normal operation, no two blocks should share a time range.

### Nesting Tasks Into Blocks

**Drag to nest:** Drag a task from the TodaysFlow sidebar onto an existing block (any kind: focus, ritual, or hard). The task appears as a checklist item inside that block instead of creating a new block.

**Drop target differentiation:** When dragging a task over the timeline:
- Hovering over empty grid space → show the existing ghost block preview (creates a new focus block)
- Hovering over an existing block → highlight the block (e.g., brighter border or subtle glow) to indicate "nest inside this block"

**Inline add:** Each block shows a `+` button (visible on hover, or always visible if the block already has nested tasks). Clicking opens a single-line text input inside the block. Pressing Enter creates a new local task and nests it in that block. Pressing Escape or blur dismisses.

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

Add to `ScheduleBlock`:

```typescript
nestedTaskIds?: string[];
```

These reference task IDs from the existing `plannedTasks` array. A task that is nested inside a block:
- Is removed from the "unscheduled" count in TodaysFlow
- Is still visible in TodaysFlow under its goal section (but shown with a subtle indicator that it's scheduled)
- Does NOT get its own ScheduleBlock — it lives inside the parent block's `nestedTaskIds`

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

### No Time Tracking

Nested tasks are a checklist. They have no individual time estimates. The parent block's duration is unchanged by nesting.

## Out of Scope

- Reordering nested tasks within a block (can add later)
- Nested task time estimates or progress bars
- Nesting blocks inside blocks (only tasks nest inside blocks)
- Drag-to-reorder nested tasks

## Files Affected

- `src/types.ts` — add `nestedTaskIds` to `ScheduleBlock`
- `src/context/AppContext.tsx` — add `nestTaskInBlock`, `unnestTaskFromBlock` actions; update `scheduleTaskBlock` to handle drop-on-block vs. drop-on-grid
- `src/components/Timeline.tsx` — `BlockCard` renders nested tasks, handles drop target for nesting, inline add input
- `src/components/TodaysFlow.tsx` — show indicator on tasks that are nested in a block
- `src/lib/planner.ts` — ensure all block kinds act as obstacles (ritual blocks currently may not)
