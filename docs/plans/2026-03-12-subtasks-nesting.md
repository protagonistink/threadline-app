# Subtasks / Nesting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users group related PlannedTasks under a parent "timeblock" by modifier+dragging one task card onto another.

**Architecture:** Add `parentId?: string` to `PlannedTask`. Subtasks are committed alongside their parent but excluded from capacity math. A new `useModifierKey` hook switches drag-drop behavior on the TaskCard, which becomes a conditional drop target. Parent cards render a collapsed subtask list (expand on click).

**Tech Stack:** React + react-dnd (useDrag/useDrop), TypeScript, Tailwind v4, electron-store persistence.

---

### Task 1: Add `parentId` to PlannedTask

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add the field**

In `PlannedTask` interface, after `lastCommittedDate?:string`, add:
```ts
parentId?: string;
```

**Step 2: Build to verify no breakage**
```bash
cd "/Users/pat/Sites/Protagonist Ink/Playground/timefocus"
npm run build
```
Expected: clean build (adding optional field is non-breaking).

**Step 3: Commit**
```bash
git add src/types/index.ts
git commit -m "feat(subtasks): add parentId field to PlannedTask"
```

---

### Task 2: Create `useModifierKey` hook

**Files:**
- Create: `src/hooks/useModifierKey.ts`

**Step 1: Create the file**

```ts
import { useEffect, useState } from 'react';

export function useModifierKey(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.shiftKey || e.altKey) setHeld(true);
    };
    const up = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.shiftKey && !e.altKey) setHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return held;
}
```

**Step 2: Build**
```bash
npm run build
```
Expected: clean build.

**Step 3: Commit**
```bash
git add src/hooks/useModifierKey.ts
git commit -m "feat(subtasks): add useModifierKey hook"
```

---

### Task 3: Add `nestTask` and `unnestTask` to `useTaskActions`

**Files:**
- Modify: `src/hooks/useTaskActions.ts`

**Step 1: Add `nestTask` after `bringForward`**

```ts
const nestTask = useCallback((childId: string, parentTaskId: string) => {
  setPlannedTasks((prev) => {
    const parent = prev.find((t) => t.id === parentTaskId);
    if (!parent) return prev;
    return prev.map((task) => {
      if (task.id === childId) {
        return {
          ...task,
          parentId: parentTaskId,
          weeklyGoalId: parent.weeklyGoalId,
          status: task.status === 'done' ? 'done' : 'committed',
          lastCommittedDate: TODAY,
        };
      }
      if (
        task.id === parentTaskId &&
        task.status !== 'committed' &&
        task.status !== 'scheduled' &&
        task.status !== 'done'
      ) {
        return { ...task, status: 'committed', lastCommittedDate: TODAY };
      }
      return task;
    });
  });

  setDailyPlan((prev) => {
    let ids = prev.committedTaskIds;
    if (!ids.includes(childId)) ids = [...ids, childId];
    if (!ids.includes(parentTaskId)) ids = [...ids, parentTaskId];
    return { ...prev, committedTaskIds: ids };
  });

  setSelectedInboxId(null);
  setLastCommitTimestamp(Date.now());
}, [setDailyPlan, setLastCommitTimestamp, setPlannedTasks, setSelectedInboxId]);
```

**Step 2: Add `unnestTask` after `nestTask`**

```ts
const unnestTask = useCallback((childId: string) => {
  setPlannedTasks((prev) =>
    prev.map((task) =>
      task.id === childId ? { ...task, parentId: undefined } : task
    )
  );
}, [setPlannedTasks]);
```

**Step 3: Clear `parentId` when parent is moved forward**

In `moveForward`, update `setPlannedTasks` to also clear `parentId` on orphaned subtasks:
```ts
setPlannedTasks((prev) =>
  prev.map((task) => {
    if (task.id === taskId) {
      return { ...task, status: 'migrated', active: false, scheduledEventId: undefined, scheduledCalendarId: undefined };
    }
    if (task.parentId === taskId) {
      return { ...task, parentId: undefined };
    }
    return task;
  })
);
```

**Step 4: Same for `releaseTask`**

In `releaseTask`, add the same orphan-clearing pattern to its `setPlannedTasks` call:
```ts
setPlannedTasks((prev) =>
  prev.map((task) => {
    if (task.id === taskId) {
      return { ...task, status: 'cancelled', active: false, scheduledEventId: undefined, scheduledCalendarId: undefined };
    }
    if (task.parentId === taskId) {
      return { ...task, parentId: undefined };
    }
    return task;
  })
);
```

**Step 5: Export `nestTask` and `unnestTask` from the return object**

Add both to the `return { ... }` object at the bottom of `useTaskActions`.

**Step 6: Build**
```bash
npm run build
```
Expected: clean build.

**Step 7: Commit**
```bash
git add src/hooks/useTaskActions.ts
git commit -m "feat(subtasks): add nestTask and unnestTask actions"
```

---

### Task 4: Update `usePlannerSelectors` to exclude subtasks from counts

**Files:**
- Modify: `src/hooks/usePlannerSelectors.ts`

**Step 1: Update `dayTasks` to exclude subtasks**

Change the `dayTasks` memo to filter out tasks whose parent is also in today's plan:

```ts
const dayTasks = useMemo(() => plannedTasks.filter((task) => (
  dailyPlan.committedTaskIds.includes(task.id) &&
  (task.status === 'committed' || task.status === 'scheduled') &&
  (!task.parentId || !dailyPlan.committedTaskIds.includes(task.parentId))
)), [dailyPlan.committedTaskIds, plannedTasks]);
```

**Step 2: Update `committedTasks` the same way**

```ts
const committedTasks = useMemo(() => plannedTasks.filter((task) => (
  task.status === 'committed' &&
  dailyPlan.committedTaskIds.includes(task.id) &&
  (!task.parentId || !dailyPlan.committedTaskIds.includes(task.parentId))
)), [dailyPlan.committedTaskIds, plannedTasks]);
```

> Why: `dayTasks` drives time/capacity math and the `finishedCount`/`totalDayCount` header. Subtasks travel with their parent — the parent's estimate covers the timeblock.

**Step 3: Build**
```bash
npm run build
```
Expected: clean build.

**Step 4: Commit**
```bash
git add src/hooks/usePlannerSelectors.ts
git commit -m "feat(subtasks): exclude subtasks from dayTasks/committedTasks counts"
```

---

### Task 5: Wire up new actions in `AppContext`

**Files:**
- Modify: `src/context/AppContext.tsx`

**Step 1: Add `nestTask` and `unnestTask` to `AppContextValue` interface**

After `updateTaskEstimate`:
```ts
nestTask: (childId: string, parentId: string) => void;
unnestTask: (childId: string) => void;
```

**Step 2: Destructure from `useTaskActions`**

Add `nestTask` and `unnestTask` to the destructured return from `useTaskActions(...)`.

**Step 3: Clear `parentId` in `resetDay`**

In the existing `resetDay` callback, update the `setPlannedTasks` map to also clear `parentId`:
```ts
setPlannedTasks((prev) =>
  prev.map((task) =>
    task.status === 'committed' || task.status === 'scheduled'
      ? {
          ...task,
          status: 'candidate',
          scheduledEventId: undefined,
          scheduledCalendarId: undefined,
          parentId: undefined,
        }
      : task
  )
);
```

**Step 4: Expose in context value**

Add `nestTask` and `unnestTask` to the `<AppContext.Provider value={{ ... }}>` object.

**Step 5: Build**
```bash
npm run build
```
Expected: clean build.

**Step 6: Commit**
```bash
git add src/context/AppContext.tsx
git commit -m "feat(subtasks): expose nestTask/unnestTask in AppContext"
```

---

### Task 6: Update TodaysFlow — SubtaskRow + GoalSection + TaskCard

**Files:**
- Modify: `src/components/TodaysFlow.tsx`

**Step 1: Add `ChevronRight` to imports**

The file already imports `ChevronDown` — add `ChevronRight` to the same Lucide import line.

**Step 2: Add `SubtaskRow` component**

Add after the existing imports, before `TaskCard`:

```tsx
function SubtaskRow({ task, unnestTask }: { task: PlannedTask; unnestTask: (id: string) => void }) {
  const { toggleTask } = useApp();
  return (
    <div className="flex items-center gap-2 py-2 pl-7 border-b border-ink/5 last:border-0">
      <button
        onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }}
        className="shrink-0"
      >
        {task.status === 'done' ? (
          <div className="w-3.5 h-3.5 border border-text-muted/50 flex items-center justify-center">
            <Check className="w-2 h-2 stroke-[2]" />
          </div>
        ) : (
          <div className="w-3.5 h-3.5 border border-text-muted/40 hover:border-text-primary transition-colors" />
        )}
      </button>
      <span className={cn(
        'flex-1 font-display text-[14px] leading-snug',
        task.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary/80'
      )}>
        {task.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); unnestTask(task.id); }}
        className="p-1 text-text-muted/40 hover:text-text-muted transition-colors"
        title="Detach subtask"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
```

**Step 3: Update `TaskCard` signature to accept subtasks**

Change:
```tsx
function TaskCard({ task, index, actualMins = 0 }: { task: PlannedTask; index: number; actualMins?: number })
```
To:
```tsx
function TaskCard({
  task,
  index,
  actualMins = 0,
  subtasks = [],
  nestTask,
  unnestTask,
}: {
  task: PlannedTask;
  index: number;
  actualMins?: number;
  subtasks?: PlannedTask[];
  nestTask: (childId: string, parentId: string) => void;
  unnestTask: (childId: string) => void;
})
```

**Step 4: Add modifier key tracking and drop target inside `TaskCard`**

After the existing `useDrag` block, add:

```tsx
const modifierHeld = useModifierKey();
const [expanded, setExpanded] = useState(false);

const [{ isNestOver, canNest }, nestDropRef] = useDrop<DragItem, void, { isNestOver: boolean; canNest: boolean }>({
  accept: DragTypes.TASK,
  canDrop: (item) => modifierHeld && item.id !== task.id && item.id !== task.parentId,
  drop: (item) => { nestTask(item.id, task.id); },
  collect: (monitor) => ({
    isNestOver: monitor.isOver(),
    canNest: monitor.canDrop(),
  }),
});
```

**Step 5: Combine drag and nest-drop refs on the card `div`**

The card's outer `div` currently uses `ref={dragRef}`. Change it to use a callback ref that applies both:

```tsx
const combinedRef = useCallback(
  (node: HTMLDivElement | null) => {
    dragRef(node);
    nestDropRef(node);
  },
  [dragRef, nestDropRef]
);
```

Then on the outer `div`: `ref={combinedRef}`.

Also add the nest-hover ring to the card's `className`:
```tsx
isNestOver && canNest && 'ring-1 ring-inset ring-accent-warm/40'
```

**Step 6: Add subtask toggle + rows inside the card**

After the closing `</div>` of the `div.flex.items-center.gap-1` (action buttons row), add:

```tsx
{subtasks.length > 0 && (
  <div className="w-full mt-1.5">
    <button
      onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
      className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-text-muted hover:text-text-primary transition-colors pb-1"
    >
      {expanded ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
      {subtasks.length} task{subtasks.length !== 1 ? 's' : ''}
    </button>
    {expanded && (
      <div className="flex flex-col border-t border-ink/10 mt-1">
        {subtasks.map((sub) => (
          <SubtaskRow key={sub.id} task={sub} unnestTask={unnestTask} />
        ))}
      </div>
    )}
  </div>
)}
```

**Step 7: Add nest affordance overlay**

After the subtask section, add:
```tsx
{isNestOver && canNest && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-sm">
    <span className="text-[10px] uppercase tracking-[0.18em] text-accent-warm bg-bg px-2 py-0.5 border border-accent-warm/30">
      Nest here
    </span>
  </div>
)}
```

The outer `div` needs `relative` in its className (it already has `relative` from existing code — verify).

**Step 8: Update `GoalSection` to build subtask map and pass props**

Update `GoalSection`'s props and internals:

```tsx
function GoalSection({
  goal,
  tasks,
  allDaySubtasks,
  startIndex,
  actualByTask,
  nestTask,
  unnestTask,
}: {
  goal: WeeklyGoal;
  tasks: PlannedTask[];
  allDaySubtasks: PlannedTask[];
  startIndex: number;
  actualByTask: Map<string, number>;
  nestTask: (childId: string, parentId: string) => void;
  unnestTask: (childId: string) => void;
})
```

Inside `GoalSection`, before the return, build the subtask map:
```tsx
const subtasksByParent = useMemo(() => {
  const map = new Map<string, PlannedTask[]>();
  for (const sub of allDaySubtasks) {
    if (!sub.parentId) continue;
    const arr = map.get(sub.parentId) ?? [];
    arr.push(sub);
    map.set(sub.parentId, arr);
  }
  return map;
}, [allDaySubtasks]);
```

Update the render to pass subtasks to each TaskCard:
```tsx
tasks.map((task, i) => (
  <TaskCard
    key={task.id}
    task={task}
    index={startIndex + i}
    actualMins={actualByTask.get(task.id) || 0}
    subtasks={subtasksByParent.get(task.id) ?? []}
    nestTask={nestTask}
    unnestTask={unnestTask}
  />
))
```

**Step 9: Update `TodaysFlow` to derive subtask list and pass down**

In the `TodaysFlow` function body, destructure `nestTask` and `unnestTask` from `useApp()`. Also compute `allCommittedSubtasks` from `plannedTasks`:

```tsx
const { nestTask, unnestTask, /* ...existing... */ } = useApp();

const allCommittedSubtasks = useMemo(() =>
  plannedTasks.filter((t) =>
    t.parentId &&
    (t.status === 'committed' || t.status === 'scheduled') &&
    dailyPlan.committedTaskIds.includes(t.id)
  ),
  [plannedTasks, dailyPlan.committedTaskIds]
);
```

Update the `grouped` render in the JSX to pass the new props:
```tsx
<GoalSection
  key={goal.id}
  goal={goal}
  tasks={tasks}
  allDaySubtasks={allCommittedSubtasks}
  startIndex={startIndex}
  actualByTask={actualByTask}
  nestTask={nestTask}
  unnestTask={unnestTask}
/>
```

**Step 10: Add imports**

Add `useModifierKey` import:
```tsx
import { useModifierKey } from '@/hooks/useModifierKey';
```

Add `useMemo` to GoalSection imports (it already uses `useDrop` from react-dnd, and `useMemo` is already imported at the top of the file — verify).

**Step 11: Build**
```bash
npm run build
```
Expected: clean build. Fix any TypeScript errors (usually unused variables or missing dependency arrays).

**Step 12: Commit**
```bash
git add src/components/TodaysFlow.tsx src/hooks/useModifierKey.ts
git commit -m "feat(subtasks): modifier+drag to nest tasks, collapsed subtask rows in TodaysFlow"
```

---

## Verification Checklist

1. **Build passes:** `npm run build` — no TypeScript errors
2. **Nest gesture:** Run app. Hold Cmd (or Option/Shift) and drag a task from the Inbox onto a committed TaskCard in TodaysFlow. The card shows a "Nest here" overlay. On drop, parent shows "▸ 1 task" badge.
3. **Expand/collapse:** Click the "▸ 1 task" badge → subtask rows expand. Click again → collapse.
4. **Subtask check-off:** Expand subtasks. Click checkbox on a subtask → it shows strikethrough. Parent stays visible.
5. **Detach:** Click X on a subtask row → it becomes a standalone committed task, no longer nested.
6. **Capacity math:** With a parent (60 min) + 1 subtask (30 min) both committed, TodaysFlow header should show the parent's 60 min only, not 90 min total.
7. **Clear board:** Click "Clear board" → confirm. Both parent and subtask are removed from today. Neither has a stale `parentId`.
8. **Carry forward parent:** Click ArrowRight on parent → it migrates. Subtask loses its `parentId` and stays in the day as a standalone committed task.
