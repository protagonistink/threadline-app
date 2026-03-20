# Timeline Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `Timeline.tsx` (~1430 lines) into 7 focused files — a shared utils module, 5 pure sub-components, and one large `BlockCard` component — reducing the main file to ~600 lines with zero behavior changes.

**Architecture:** Extract module-level constants/utils to `timelineUtils.ts`. Extract each inline sub-component (`FocusSetMeter` stays internal to `BlockCard`) to its own file. `FocusSetMeter` is ~21 lines used only by `BlockCard` — it stays as a non-exported function inside `BlockCard.tsx`. `Timeline.tsx` is modified last: all inline definitions are removed and replaced with imports.

**Tech Stack:** React 18, TypeScript, Electron (no browser preview — verify with `npm run build` only)

**Spec:** `docs/superpowers/specs/2026-03-20-timeline-decomposition-design.md`

---

## File Map

| File | Action | Lines |
|------|--------|-------|
| `src/components/timelineUtils.ts` | Create | ~40 |
| `src/components/OpenInterval.tsx` | Create | ~40 |
| `src/components/CurrentTimeIndicator.tsx` | Create | ~40 |
| `src/components/AfterHoursVeil.tsx` | Create | ~80 |
| `src/components/DeadlineMargin.tsx` | Create | ~125 |
| `src/components/AIBreakdown.tsx` | Create | ~100 |
| `src/components/BlockCard.tsx` | Create | ~400 |
| `src/components/Timeline.tsx` | Modify | ~1430 → ~600 |

---

## Task 1: Create `timelineUtils.ts`

**Files:**
- Create: `src/components/timelineUtils.ts`

- [ ] Create the file with the 3 constants and 5 utility functions, copied verbatim from `Timeline.tsx` lines 18–49. The only change is adding `import { CALENDAR_GRID_SNAP_MINS } from '@/lib/planner'` and `export` on each declaration:

```typescript
// src/components/timelineUtils.ts
import { CALENDAR_GRID_SNAP_MINS } from '@/lib/planner';

export const BASE_HOUR_HEIGHT = 96;
export const GRID_SNAP_MINS = CALENDAR_GRID_SNAP_MINS;
export const MIN_VISIBLE_DAY_HOURS = 16;

export function clampMinutes(totalMinutes: number, dayStartMins: number, dayEndMins: number, maxDurationMins = 0): number {
  return Math.min(Math.max(totalMinutes, dayStartMins), dayEndMins - maxDurationMins);
}

export function timeToTop(totalMinutes: number, dayStartMins: number, hourHeight: number): number {
  return ((totalMinutes - dayStartMins) / 60) * hourHeight;
}

export function formatTime(h: number, m: number): string {
  const normalizedHour = ((h % 24) + 24) % 24;
  const ampm = normalizedHour >= 12 ? 'PM' : 'AM';
  const hour = normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour;
  const min = m.toString().padStart(2, '0');
  return `${hour}:${min} ${ampm}`;
}

export function formatTimeShort(h: number, m: number): string {
  const normalizedHour = ((h % 24) + 24) % 24;
  const ampm = normalizedHour >= 12 ? 'PM' : 'AM';
  const hour = normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function getStepMins(durationMins: number): number {
  if (durationMins < 60) return 15;
  if (durationMins < 120) return 30;
  return 60;
}
```

- [ ] Run `npm run build` from the repo root and confirm it passes (Timeline.tsx still has its own copies, so this is a net-new file with no conflicts)

- [ ] Commit:

```bash
git add src/components/timelineUtils.ts
git commit -m "feat: extract timeline utility constants and functions to timelineUtils.ts"
```

---

## Task 2: Create `OpenInterval.tsx`

**Files:**
- Create: `src/components/OpenInterval.tsx`

- [ ] Create the file. The component renders a dashed-border gap indicator between scheduled blocks. Copied from `Timeline.tsx` lines 171–210, with `timeToTop` import added:

```typescript
// src/components/OpenInterval.tsx
import { timeToTop } from './timelineUtils';

export function OpenInterval({
  startMins,
  durationMins,
  dayStartMins,
  hourHeight,
}: {
  startMins: number;
  durationMins: number;
  dayStartMins: number;
  hourHeight: number;
}) {
  const top = timeToTop(startMins, dayStartMins, hourHeight);
  const height = (durationMins / 60) * hourHeight;
  if (height < 12) return null;

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

- [ ] Commit:

```bash
git add src/components/OpenInterval.tsx
git commit -m "feat: extract OpenInterval sub-component from Timeline.tsx"
```

---

## Task 3: Create `CurrentTimeIndicator.tsx`

**Files:**
- Create: `src/components/CurrentTimeIndicator.tsx`

- [ ] Create the file. The component renders a red "now" line and owns its own 30-second clock interval. Copied from `Timeline.tsx` lines 582–617:

```typescript
// src/components/CurrentTimeIndicator.tsx
import { useEffect, useState } from 'react';
import { timeToTop, formatTime } from './timelineUtils';

export function CurrentTimeIndicator({
  dayStartMins,
  dayEndMins,
  hourHeight,
}: {
  dayStartMins: number;
  dayEndMins: number;
  hourHeight: number;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;
  if (currentMinutes < dayStartMins || currentMinutes >= dayEndMins) return null;

  const top = timeToTop(currentMinutes, dayStartMins, hourHeight);

  return (
    <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none" style={{ top: `${top}px` }} id="now-indicator">
      <div className="time-lbl" style={{ color: 'rgba(229, 85, 71, 0.5)' }}>
        {formatTime(currentHour, currentMin)}
      </div>
      <div className="flex items-center flex-1 gap-0">
        <div className="now-pip" />
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(229, 85, 71, 0.3), transparent 80%)' }} />
        <span className="font-sans text-[10px] text-[#E55547]/40 pl-2">now</span>
      </div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add src/components/CurrentTimeIndicator.tsx
git commit -m "feat: extract CurrentTimeIndicator sub-component from Timeline.tsx"
```

---

## Task 4: Create `AfterHoursVeil.tsx`

**Files:**
- Create: `src/components/AfterHoursVeil.tsx`

- [ ] Create the file. Renders the semi-transparent after-hours overlay with a draggable boundary line and SVG wave. Copied from `Timeline.tsx` lines 744–823. Uses `MouseEvent` type from react (not the React namespace), `cn` from utils, and `timeToTop`/`formatTime` from timelineUtils:

```typescript
// src/components/AfterHoursVeil.tsx
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { timeToTop, formatTime } from './timelineUtils';

export function AfterHoursVeil({
  workdayEnd,
  onEdit,
  onDragBoundaryStart,
  isLight,
  isPastClose,
  minutesPastClose,
  dayStartMins,
  hourHeight,
}: {
  workdayEnd: { hour: number; min: number };
  onEdit: () => void;
  onDragBoundaryStart: (event: MouseEvent<HTMLElement>) => void;
  isLight: boolean;
  isPastClose: boolean;
  minutesPastClose: number;
  dayStartMins: number;
  hourHeight: number;
}) {
  const endMinutes = workdayEnd.hour * 60 + workdayEnd.min;
  const top = timeToTop(endMinutes, dayStartMins, hourHeight);
  const overrunHours = Math.floor(minutesPastClose / 60);
  const overrunMinutes = minutesPastClose % 60;
  const overrunLabel = overrunHours > 0 ? `${overrunHours}h ${overrunMinutes}m` : `${overrunMinutes}m`;

  return (
    <div
      className="absolute left-14 right-0 bottom-0 pointer-events-none z-[5]"
      style={{ top: `${top}px` }}
    >
      <button
        onClick={onEdit}
        onMouseDown={onDragBoundaryStart}
        className={cn(
          'pointer-events-auto absolute left-4 -top-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-all hover:text-text-primary',
          isLight
            ? 'border-stone-300/70 bg-white/92 text-stone-500 hover:border-stone-400/80'
            : 'border-border bg-bg-elevated/90 text-text-muted hover:border-border'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', isPastClose ? 'bg-accent-warm' : 'bg-accent-warm/70')} />
        {isPastClose ? `Day closed ${overrunLabel} ago` : `Day closes ${formatTime(workdayEnd.hour, workdayEnd.min)}`}
      </button>
      <div className="absolute inset-x-0 top-0 h-0.5 mt-[0px]">
        <svg className="absolute top-[-5px] left-0 right-0 w-full h-[10px] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 10">
          <path
            d="M0 5 Q 25 4.5, 50 6 T 100 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.6"
            strokeLinecap="round"
            className={cn(
              isLight
                ? isPastClose
                  ? 'text-amber-400'
                  : 'text-stone-300'
                : isPastClose
                  ? 'text-accent-warm'
                  : 'text-border'
            )}
          />
        </svg>
      </div>
      <div
        onMouseDown={onDragBoundaryStart}
        className="pointer-events-auto absolute inset-x-0 top-[-8px] h-4 cursor-row-resize"
        title="Drag to move day close"
      />
      <div
        className={cn(
          'absolute inset-0',
          isLight
            ? isPastClose ? 'bg-[rgba(196,132,78,0.04)]' : 'bg-[rgba(176,112,88,0.03)]'
            : isPastClose ? 'bg-[rgba(200,60,47,0.06)]' : 'bg-[rgba(10,10,10,0.55)]'
        )}
      />
    </div>
  );
}
```

- [ ] Commit:

```bash
git add src/components/AfterHoursVeil.tsx
git commit -m "feat: extract AfterHoursVeil sub-component from Timeline.tsx"
```

---

## Task 5: Create `DeadlineMargin.tsx`

**Files:**
- Create: `src/components/DeadlineMargin.tsx`

- [ ] Create the file. Renders upcoming countdowns in horizontal or vertical layout. Reads `useApp()` directly. Copied from `Timeline.tsx` lines 619–742 (includes the `LIFE_EVENT_RE` constant, which stays local to this file):

```typescript
// src/components/DeadlineMargin.tsx
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useApp } from '@/context/AppContext';

const LIFE_EVENT_RE = /birthday|party|anniversary|wedding|graduation|holiday|vacation|trip/i;

export function DeadlineMargin({ layout = 'vertical' }: { layout?: 'horizontal' | 'vertical' }) {
  const { countdowns } = useApp();
  const today = new Date();

  const items = countdowns
    .map((c) => ({ ...c, days: differenceInCalendarDays(parseISO(c.dueDate), today) }))
    .filter((c) => c.days >= 0)
    .sort((a, b) => a.days - b.days);

  if (items.length === 0) return null;

  if (layout === 'horizontal') {
    return (
      <div
        className="shrink-0 flex items-center gap-6 overflow-x-auto hide-scrollbar"
        style={{
          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          padding: '10px 20px',
        }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'rgba(148,163,184,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          Upcoming
        </div>
        {items.map((item) => {
          const isLife = LIFE_EVENT_RE.test(item.title);
          return (
            <div key={item.id} className="flex items-baseline gap-2 shrink-0">
              <span
                className="font-display italic text-[14px] leading-none"
                style={{ color: isLife ? 'rgba(110,135,175,0.65)' : 'rgba(190,90,55,0.8)' }}
              >
                {item.days}d
              </span>
              <span
                className="text-[10px] leading-none"
                style={{
                  color: 'rgba(160,150,130,0.5)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 120,
                }}
              >
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical layout (focus mode — 1/3 column)
  return (
    <div
      className="shrink-0 flex flex-col overflow-y-auto hide-scrollbar"
      style={{
        width: '33%',
        minWidth: 140,
        borderLeft: '0.5px solid rgba(255,255,255,0.04)',
        padding: '16px 0 8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: 8,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: 'rgba(130,120,100,0.25)',
          padding: '0 14px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        Upcoming
      </div>
      {items.map((item) => {
        const isLife = LIFE_EVENT_RE.test(item.title);
        return (
          <div
            key={item.id}
            style={{
              padding: '8px 14px',
              borderBottom: '0.5px solid rgba(255,255,255,0.03)',
              overflow: 'hidden',
            }}
          >
            <div
              className="font-display italic text-[16px] leading-none"
              style={{
                color: isLife ? 'rgba(110,135,175,0.65)' : 'rgba(190,90,55,0.8)',
                marginBottom: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {item.days}d
            </div>
            <div
              className="text-[10px] leading-[1.35]"
              style={{
                color: 'rgba(160,150,130,0.5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.title}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] Commit:

```bash
git add src/components/DeadlineMargin.tsx
git commit -m "feat: extract DeadlineMargin sub-component from Timeline.tsx"
```

---

## Task 6: Create `AIBreakdown.tsx`

**Files:**
- Create: `src/components/AIBreakdown.tsx`

- [ ] Create the file. Renders the AI sub-task suggestion panel for focus blocks. Reads `nestTask` and `addLocalTask` from `useApp()`. Copied from `Timeline.tsx` lines 72–169:

```typescript
// src/components/AIBreakdown.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import type { ScheduleBlock } from '@/types';

export function AIBreakdown({ block }: { block: ScheduleBlock }) {
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { nestTask, addLocalTask } = useApp();

  async function fetchBreakdown() {
    setExpanded(true);
    if (suggestions.length > 0) return;
    setLoading(true);
    try {
      const res = await window.api.ai.chat(
        [{ role: 'user', content: `Break down "${block.title}" into 3-5 concrete sub-tasks. Return ONLY a numbered list, no preamble.` }],
        {} as any
      );
      if (res.success && res.content) {
        const lines = res.content.split('\n')
          .map(l => l.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter(l => l.length > 0);
        setSuggestions(lines.slice(0, 5));
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  function toggleItem(item: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function inkSelected() {
    for (const item of selected) {
      if (block.linkedTaskId) {
        const taskId = addLocalTask(item);
        if (taskId) nestTask(taskId, block.linkedTaskId);
      }
    }
    setSelected(new Set());
    setExpanded(false);
  }

  return (
    <div className="mt-3">
      {!expanded ? (
        <button
          onClick={(e) => { e.stopPropagation(); fetchBreakdown(); }}
          className="font-sans text-[11px] text-[#919fae]/40 hover:text-[#919fae]/70 transition-colors"
        >
          ✨ AI Breakdown
        </button>
      ) : (
        <div className="pt-3" style={{ borderTop: '1px solid rgba(250,250,250,0.05)' }}>
          <span className="font-sans text-[9px] tracking-[0.18em] uppercase text-[#919fae]/28 block mb-3">
            Ink suggests from Asana
          </span>
          {loading ? (
            <span className="text-[11px] text-text-muted/30">Thinking...</span>
          ) : (
            <>
              {suggestions.map((item) => (
                <div
                  key={item}
                  className={cn('triage-row', selected.has(item) && 'selected')}
                  onClick={(e) => { e.stopPropagation(); toggleItem(item); }}
                >
                  <div className="triage-box" />
                  <span>{item}</span>
                </div>
              ))}
              {selected.size > 0 && (
                <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(250,250,250,0.04)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); inkSelected(); }}
                    className="font-sans text-[13px] text-[#E55547]/65 hover:text-[#E55547]/90 transition-colors cursor-pointer font-medium"
                  >
                    Ink it →
                  </button>
                  <span className="text-text-muted/20 text-[10px]">·</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                    className="font-sans text-[11px] text-text-muted/30 hover:text-text-muted/50 transition-colors cursor-pointer"
                  >
                    skip for now
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] Commit:

```bash
git add src/components/AIBreakdown.tsx
git commit -m "feat: extract AIBreakdown sub-component from Timeline.tsx"
```

---

## Task 7: Create `BlockCard.tsx`

**Files:**
- Create: `src/components/BlockCard.tsx`

- [ ] Create the file. This is the largest extraction. `FocusSetMeter` stays as a non-exported internal function at the top of the file — it is only used by `BlockCard`. Copied from `Timeline.tsx` lines 51–580. Key imports: `AIBreakdown` from `./AIBreakdown`; `timeToTop`, `formatTimeShort`, `GRID_SNAP_MINS`, `getStepMins` from `./timelineUtils`:

```typescript
// src/components/BlockCard.tsx
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { GripVertical, Play, Check, RefreshCw } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { cn, formatRoundedHours } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { DragTypes, type DragItem } from '@/hooks/useDragDrop';
import type { PlannedTask, ScheduleBlock } from '@/types';
import { AIBreakdown } from './AIBreakdown';
import { timeToTop, formatTimeShort, GRID_SNAP_MINS, getStepMins } from './timelineUtils';

function FocusSetMeter({ durationMins }: { durationMins: number }) {
  const setCount = Math.max(1, Math.round(durationMins / 25));

  return (
    <div className="flex items-center gap-2 rounded-full border border-accent-warm/18 bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-text-muted/90 focus-fade-meta">
      <div className="flex items-center gap-1">
        {Array.from({ length: setCount }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 rounded-full bg-accent-warm/70',
              index === 0 ? 'w-4' : 'w-2'
            )}
          />
        ))}
      </div>
      <span>{setCount} focus set{setCount === 1 ? '' : 's'}</span>
    </div>
  );
}

export function BlockCard({
  block,
  onRemove,
  onUpdate,
  onUpdateDuration,
  resolvePlacement,
  acceptProposal,
  stagger = 0,
  isNow = false,
  actualMins = 0,
  dayStartMins,
  dayEndMins,
  hourHeight,
  physicsWarning,
  locked = false,
  colIndex = 0,
  colCount = 1,
  isSelected = false,
  onSelect,
}: {
  block: ScheduleBlock;
  onRemove: () => void;
  onUpdate: (startHour: number, startMin: number, durationMins: number) => void;
  onUpdateDuration?: (durationMins: number) => void;
  resolvePlacement: (rawMinutes: number, durationMins: number, targetBlockId?: string) => { startHour: number; startMin: number };
  acceptProposal: (blockId: string) => void;
  stagger?: number;
  isNow?: boolean;
  actualMins?: number;
  dayStartMins: number;
  dayEndMins: number;
  hourHeight: number;
  physicsWarning?: string | null;
  locked?: boolean;
  colIndex?: number;
  colCount?: number;
  isSelected?: boolean;
  onSelect?: (blockId: string) => void;
}) {
  const { isFocus } = useTheme();
  const { plannedTasks, weeklyGoals, setActiveTask, toggleTask, nestTaskInBlock } = useApp();
  const linkedTask = block.linkedTaskId ? plannedTasks.find((task) => task.id === block.linkedTaskId) : null;
  const isDone = linkedTask?.status === 'done';

  // Dynamic thread color for border-left based on weekly goal
  const goalId = linkedTask?.weeklyGoalId ?? null;
  const goalIndex = goalId ? weeklyGoals.findIndex((g) => g.id === goalId) : -1;
  const threadColor = goalIndex === 0 ? 'rgba(229,85,71,0.5)'
    : goalIndex === 1 ? 'rgba(74,109,140,0.5)'
    : goalIndex === 2 ? 'rgba(145,159,174,0.4)'
    : 'rgba(100,116,139,0.3)';
  // Highlighter tint — faintest whisper of goal color so text pops
  const tintColor = goalIndex === 0 ? 'rgba(229,85,71,0.025)'
    : goalIndex === 1 ? 'rgba(74,109,140,0.025)'
    : goalIndex === 2 ? 'rgba(145,159,174,0.02)'
    : block.kind === 'break' ? 'rgba(250,250,250,0.015)'
    : block.kind === 'hard' ? 'rgba(145,159,174,0.025)'
    : 'rgba(100,116,139,0.02)';
  const nestedTasks = useMemo(
    () => (block.nestedTaskIds ?? [])
      .map((id) => plannedTasks.find((t) => t.id === id))
      .filter((t): t is PlannedTask => t != null),
    [block.nestedTaskIds, plannedTasks]
  );

  const [{ isNestOver }, nestDropRef] = useDrop<DragItem, void, { isNestOver: boolean }>({
    accept: DragTypes.TASK,
    canDrop: () => !locked,
    collect: (monitor) => ({ isNestOver: monitor.isOver() && monitor.canDrop() }),
    drop: (item) => {
      void nestTaskInBlock(item.id, block.id);
    },
  });

  const blockRef = useCallback((node: HTMLDivElement | null) => {
    nestDropRef(node);
  }, [nestDropRef]);

  const [{ isDragging }, dragRef, previewRef] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: DragTypes.BLOCK,
    canDrag: !locked && !block.readOnly && !isDone && Boolean(block.linkedTaskId),
    item: {
      id: block.linkedTaskId || block.id,
      title: block.title,
      blockId: block.id,
      linkedTaskId: block.linkedTaskId,
      sourceType: linkedTask?.source ?? block.source,
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    previewRef(getEmptyImage(), { captureDraggingState: true });
  }, [previewRef]);
  const [draft, setDraft] = useState<{ startHour: number; startMin: number; durationMins: number } | null>(null);
  const draftRef = useRef<{ startHour: number; startMin: number; durationMins: number } | null>(null);
  const didDragRef = useRef(false);
  const top = timeToTop(((draft?.startHour ?? block.startHour) * 60) + (draft?.startMin ?? block.startMin), dayStartMins, hourHeight);
  const height = ((draft?.durationMins ?? block.durationMins) / 60) * hourHeight;
  const actualLabel = actualMins > 0 ? formatRoundedHours(actualMins, true) : null;

  // Determine block variant class
  const blockVariant = block.kind === 'hard'
    ? 't-gcal'
    : block.kind === 'break'
      ? 't-ritual'
      : block.proposal === 'draft'
        ? 't-draft'
        : 't-inked';

  function beginDrag(event: React.MouseEvent<HTMLDivElement>) {
    if (locked || block.readOnly || isDone) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    event.preventDefault();
    didDragRef.current = false;
    const startY = event.clientY;
    const baseMinutes = block.startHour * 60 + block.startMin;

    function onMove(moveEvent: MouseEvent) {
      const deltaY = moveEvent.clientY - startY;
      if (Math.abs(deltaY) > 4) didDragRef.current = true;
      const rawMinutes = baseMinutes + (deltaY / hourHeight) * 60;
      const placement = resolvePlacement(rawMinutes, block.durationMins, block.id);
      const nextDraft = {
        startHour: placement.startHour,
        startMin: placement.startMin,
        durationMins: block.durationMins,
      };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (draftRef.current) onUpdate(draftRef.current.startHour, draftRef.current.startMin, draftRef.current.durationMins);
      draftRef.current = null;
      setDraft(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function beginResize(event: React.MouseEvent<HTMLDivElement>) {
    if (locked || block.readOnly || isDone) return;
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const baseDuration = block.durationMins;

    function onMove(moveEvent: MouseEvent) {
      const deltaY = moveEvent.clientY - startY;
      const pixelsPerSnap = hourHeight * (GRID_SNAP_MINS / 60);
      const step = Math.round(deltaY / pixelsPerSnap) * GRID_SNAP_MINS;
      const nextDuration = Math.max(GRID_SNAP_MINS, baseDuration + step);
      const maxDuration = dayEndMins - (block.startHour * 60 + block.startMin);
      const placement = resolvePlacement(block.startHour * 60 + block.startMin, Math.min(nextDuration, maxDuration), block.id);
      const nextDraft = {
        startHour: placement.startHour,
        startMin: placement.startMin,
        durationMins: Math.min(nextDuration, maxDuration),
      };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (draftRef.current) onUpdate(draftRef.current.startHour, draftRef.current.startMin, draftRef.current.durationMins);
      draftRef.current = null;
      setDraft(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startFocus(event: React.MouseEvent<HTMLButtonElement>) {
    if (locked || !block.linkedTaskId || block.readOnly || isDone) return;
    event.stopPropagation();
    setActiveTask(block.linkedTaskId);
    void window.api.window.showPomodoro();
    void window.api.pomodoro.start(block.linkedTaskId, block.title);
    void window.api.window.activate();
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (didDragRef.current) { didDragRef.current = false; return; }
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.stopPropagation(); // Prevent grid from deselecting immediately
    // Select/deselect this block
    onSelect?.(isSelected ? '' : block.id);
  }

  function handleToggleTask(event: React.MouseEvent<HTMLButtonElement>) {
    if (locked || !block.linkedTaskId || block.readOnly) return;
    event.stopPropagation();
    void toggleTask(block.linkedTaskId);
  }

  // Compute horizontal positioning for overlapping blocks
  const colWidthPct = colCount > 1 ? 100 / colCount : 100;
  const colLeftPct = colIndex * colWidthPct;

  return (
    <div
      data-task-id={block.linkedTaskId || undefined}
      onMouseDown={beginDrag}
      onClick={handleClick}
      className={cn(
        blockVariant,
        'animate-fade-in absolute overflow-hidden flex flex-col gap-1 transition-all duration-300 group/block',
        isFocus && block.kind !== 'hard' && 'focus-block-card',
        stagger === 1 && 'stagger-2',
        stagger === 2 && 'stagger-3',
        stagger === 3 && 'stagger-4',
        isDragging && 'opacity-30 scale-[0.98]',
        isDone && 'opacity-70 saturate-[0.8]',
        isSelected && 'ring-1 ring-accent-warm/50',
        isNow && !isDragging && !isSelected && 'ring-1 ring-active/40'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: colCount > 1 ? `calc(${colLeftPct}% + 4px)` : '4px',
        right: colCount > 1 ? `calc(${100 - colLeftPct - colWidthPct}% + 4px)` : '4px',
        borderLeftColor: block.kind === 'focus' ? threadColor : undefined,
        backgroundColor: blockVariant !== 't-draft' ? tintColor : undefined,
        zIndex: isSelected ? 6 : isNow ? 5 : colIndex + 1,
      }}
    >
      {/* Drag handle to return block to sidebar */}
      {!locked && !block.readOnly && !isDone && block.linkedTaskId && (
        <button
          ref={dragRef}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className="absolute top-2 left-2 p-1 rounded-md text-text-muted/60 hover:text-text-primary hover:bg-bg-card cursor-grab active:cursor-grabbing opacity-0 group-hover/block:opacity-100 transition-all z-10"
          title="Drag back to plan"
        >
          <GripVertical className="w-3 h-3" />
        </button>
      )}
      {!locked && !block.readOnly && block.linkedTaskId && !isDone && (
        <button
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={startFocus}
          className="absolute top-2 right-9 rounded-md bg-black/15 p-1 text-text-muted/80 hover:text-accent-warm hover:bg-bg-card opacity-0 group-hover/block:opacity-100 transition-all"
          title="Start focus"
        >
          <Play className="w-3 h-3 fill-current" />
        </button>
      )}
      {!locked && !block.readOnly && block.linkedTaskId && (
        <button
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={handleToggleTask}
          className={cn(
            'absolute top-2 right-2 rounded-md p-1 transition-all',
            isDone
              ? 'bg-accent-warm/18 text-accent-warm opacity-100'
              : 'bg-black/15 text-text-muted/80 opacity-0 group-hover/block:opacity-100 hover:text-text-primary hover:bg-bg-card'
          )}
          title={isDone ? 'Mark incomplete' : 'Mark done'}
        >
          <Check className="w-3 h-3" />
        </button>
      )}

      <div className="relative z-10 flex items-start pr-6">
        <h4 className={cn(
          'truncate focus-editorial font-display italic text-[16px] leading-snug flex-1',
          isDone ? 'text-text-muted line-through' : 'text-slate-100'
        )}>{block.title}</h4>
        <span className="shrink-0 ml-2 flex items-center gap-1.5 text-[10px] text-[rgba(148,163,184,0.3)] tracking-wider whitespace-nowrap">
          {physicsWarning && (
            <span
              className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: 'rgba(245,158,11,0.55)' }}
              title={physicsWarning}
            />
          )}
          {formatTimeShort(block.startHour, block.startMin)}
        </span>
      </div>
      <div className="relative z-10 flex items-center gap-2 focus-fade-meta">
        {isDone && (
          <span className="flex items-center gap-1 rounded-full border border-white/6 bg-black/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-text-muted/90">
            <Check className="h-3 w-3" />
            done
          </span>
        )}
        {actualLabel && block.kind === 'focus' && (
          <span className="rounded-full border border-white/6 bg-black/15 px-2 py-0.5 text-[10px] normal-case tracking-normal text-text-muted/90">
            {actualLabel} worked
          </span>
        )}
      </div>

      {/* AI Breakdown for focus blocks */}
      {block.kind === 'focus' && block.linkedTaskId && (
        <AIBreakdown block={block} />
      )}

      {/* Draft block accept/reject actions */}
      {!locked && blockVariant === 't-draft' && (
        <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(250,250,250,0.04)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); acceptProposal(block.id); }}
            className="font-sans text-[13px] text-[#E55547]/65 hover:text-[#E55547]/90 transition-colors cursor-pointer font-medium"
          >
            Ink it →
          </button>
          <span className="text-text-muted/20 text-[10px]">·</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="font-sans text-[11px] text-text-muted/30 hover:text-text-muted/50 transition-colors cursor-pointer"
          >
            skip for now
          </button>
        </div>
      )}

      {!locked && onUpdateDuration && !isDone && block.durationMins >= 15 && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateDuration(Math.max(15, block.durationMins - getStepMins(block.durationMins))); }}
            disabled={block.durationMins <= 15}
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors px-1 disabled:opacity-30"
          >
            –
          </button>
          <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-text-muted/90">
            {block.durationMins} min
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onUpdateDuration(block.durationMins + getStepMins(block.durationMins)); }}
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors px-1"
          >
            +
          </button>
        </div>
      )}
      {!locked && !block.readOnly && !isDone && block.linkedTaskId && block.durationMins >= 15 && !onUpdateDuration && (() => {
        return (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(block.startHour, block.startMin, Math.max(15, block.durationMins - getStepMins(block.durationMins))); }}
              disabled={block.durationMins <= 15}
              className="text-[12px] text-text-muted hover:text-text-primary transition-colors px-1 disabled:opacity-30"
            >
              –
            </button>
            <FocusSetMeter durationMins={block.durationMins} />
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(block.startHour, block.startMin, block.durationMins + getStepMins(block.durationMins)); }}
              className="text-[12px] text-text-muted hover:text-text-primary transition-colors px-1"
            >
              +
            </button>
          </div>
        );
      })()}
      {!locked && !block.readOnly && !isDone && (
        <div
          onMouseDown={beginResize}
          className="absolute left-3 right-3 bottom-1 h-2 cursor-row-resize rounded-full bg-accent-warm/20 opacity-0 group-hover/block:opacity-100 transition-opacity"
        />
      )}
    </div>
  );
}
```

- [ ] Run `npm run build` and confirm it passes. All 7 new files exist; `Timeline.tsx` still has its original inline definitions so no conflicts yet.

- [ ] Commit:

```bash
git add src/components/BlockCard.tsx
git commit -m "feat: extract BlockCard (with FocusSetMeter internal) from Timeline.tsx"
```

---

## Task 8: Modify `Timeline.tsx`

**Files:**
- Modify: `src/components/Timeline.tsx`

This is the final step: remove all extracted code from `Timeline.tsx` and replace with imports. The file goes from ~1430 lines to ~600.

- [ ] **Replace the import block** at the top of `Timeline.tsx` (lines 1–16) with this updated version that adds the new component/utility imports and drops `RefreshCw` from lucide (it stays — it's used in the sync button), drops `differenceInCalendarDays`/`parseISO` (moved to DeadlineMargin), and drops `useDrag`/`getEmptyImage` (moved to BlockCard):

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { cn, formatRoundedHours } from '@/lib/utils';
import { CALENDAR_GRID_SNAP_MINS, blockStartMinutes, blockEndMinutes, planFocusCascade, snapToCalendarGrid } from '@/lib/planner';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { DragTypes, type DragItem } from '@/hooks/useDragDrop';
import { useSound } from '@/hooks/useSound';
import { usePhysicsWarnings } from '@/hooks/usePhysicsWarnings';
import { useCurrentMinute } from '@/hooks/useCurrentMinute';
import type { PomodoroState, ScheduleBlock } from '@/types';
import { DateHeader } from './DateHeader';
import { BASE_HOUR_HEIGHT, GRID_SNAP_MINS, MIN_VISIBLE_DAY_HOURS, clampMinutes, timeToTop, formatTimeShort } from './timelineUtils';
import { OpenInterval } from './OpenInterval';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { AfterHoursVeil } from './AfterHoursVeil';
import { DeadlineMargin } from './DeadlineMargin';
import { BlockCard } from './BlockCard';
```

- [ ] **Delete lines 18–821** — this is everything from `const BASE_HOUR_HEIGHT = 96;` through the blank line after `AfterHoursVeil`'s closing brace (line 820 is `}`, line 821 is blank, line 822 is `export function Timeline() {`). That removes:
  - 3 module-level constants
  - 5 utility functions
  - `FocusSetMeter`
  - `AIBreakdown`
  - `OpenInterval`
  - `BlockCard`
  - `CurrentTimeIndicator`
  - `LIFE_EVENT_RE` constant
  - `DeadlineMargin`
  - `AfterHoursVeil`

  After deletion, the file should start with `import ...` (the new block above) immediately followed by `export function Timeline() {`.

- [ ] Run `npm run build` from the repo root:

  ```bash
  npm run build
  ```

  Expected: TypeScript compiles clean, zero errors. If there are errors, they will be import mismatches — check that every identifier referenced in `Timeline.tsx` is either still defined locally or present in the new import block.

- [ ] Commit:

```bash
git add src/components/Timeline.tsx
git commit -m "refactor: decompose Timeline.tsx — extract 7 sub-components and utilities"
```

---

## Verification

After all 8 tasks are committed:

```bash
npm run build
```

TypeScript must compile clean. No runtime behavior changes — blocks render, drag, resize, AI breakdown opens, deadline margin shows, after-hours veil appears. Keyboard Backspace/Delete on a selected block removes it. Click selects/deselects blocks.

Manual smoke test in Electron: open the timeline view, drag a block, resize a block, click to select/deselect, press Backspace to delete selected block, open AI breakdown on a focus block, verify deadline margin shows in focus mode, confirm after-hours veil appears past workday end.
