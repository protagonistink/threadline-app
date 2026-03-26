# Drag-to-Reorder Schedule Chips

**Date:** 2026-03-26
**Status:** Approved

---

## Context

Schedule chips in the morning briefing proposal are currently static — once Ink proposes an order, the only way to reorder is to ask Ink to regenerate the schedule. Users need a way to manually drag chips into a different order with times auto-recalculating to match.

---

## Decisions

| Question | Decision |
|---|---|
| Time recalculation on drop | Cascade from drop point — dragged chip takes the start time of the displaced chip; everything from that index to end of list cascades tightly |
| Drag target | Whole chip (react-dnd movement threshold distinguishes tap from drag naturally) |
| Chip visual style | 16px border-radius + 3px solid left accent bar (`var(--color-accent-warm)`) |
| Drag library | `react-dnd` + `HTML5Backend` (already installed) |

---

## Cascade Algorithm

Pure function `reorderChips(chips, fromIndex, toIndex) → ScheduleChip[]`:

1. **Guard:** if `fromIndex === toIndex`, return original array unchanged (no-op)
2. Capture `anchorStartHour` and `anchorStartMin` from `chips[Math.min(fromIndex, toIndex)]` in the **original** array, before any reordering
3. Build a new array with the chip moved from `fromIndex` to `toIndex` (immutable — do not mutate the input)
4. Determine `cascadeStart = Math.min(fromIndex, toIndex)`
5. Set the chip at `cascadeStart` to the captured anchor start time
6. Iterate from `cascadeStart + 1` to end of array; set each chip's start = previous chip's `startHour * 60 + startMin + durationMins` converted back to `startHour` / `startMin`
7. Chips above `cascadeStart` are copied through unchanged

**Example** — drag Social (3:30, 30m) from index 4 to index 3 (above Post-Plaid at 2:30, 45m):
- `cascadeStart = 3`, anchor = 2:30 (read from original `chips[3]` before reorder)
- Social → 2:30–3:00
- Post-Plaid → 3:00–3:45
- Everything above index 3 unchanged

**Edge cases:**
- **Same position** (`fromIndex === toIndex`): early return, no cascade runs
- **Single chip** (`chips.length < 2`): `useDrag` / `useDrop` should not be registered; render chip as normal with no drag affordance
- **Midnight overflow**: if cascade pushes any chip's end past 23:59, clamp `startHour` to 23 and `startMin` to 59 minus `durationMins` (treated as out-of-scope for Ink's typical proposals but guarded to prevent NaN / negative values)

---

## Architecture

### `reorderChips` utility
- Location: `src/components/ink/morningBriefingUtils.ts`
- Pure function — takes chips array + from/to indices, returns new array with recalculated times
- No side effects, easily unit-tested

### `ScheduleChip` type
- Add a stable `id` field (`string`) to the `ScheduleChip` interface in `morningBriefingUtils.ts`
- Populate it in `parseScheduleProposal` (e.g. `crypto.randomUUID()` or index-based `chip-${i}` at parse time)
- Use `id` as the React `key` on each chip element (replacing the current index key) so React diffs correctly when order changes mid-gesture

### `ScheduleChips.tsx` changes
- Scope `DndProvider` (HTML5Backend) **inside** `ScheduleChips.tsx` only — no ancestor provider exists in the tree and none should be added above; nesting two providers throws a runtime error
- Each chip becomes a drag source (`useDrag`) and drop target (`useDrop`) when `chips.length >= 2`
- On drop: call `reorderChips(chips, fromIndex, toIndex)`, pass result to `onReorder` prop
- **Drop indicator:** shows **above** the target chip when dragging upward, **below** when dragging downward — determined by comparing `fromIndex` to `toIndex` in `useDrop`'s hover handler
- Dragging chip: `opacity: 0.4`
- Cursor: `grab` at rest, `grabbing` while dragging

### State wiring
- `onReorder` handler lives in `useProposalExecution.ts` alongside `toggleScheduleChip` — it calls `setScheduleChips(reorderChips(scheduleChips, from, to))`
- Surface through `ProposalActions` type, then through `BriefingActions` in `useBriefingState.ts`, to `ScheduleChips` via `MorningBriefing.tsx`
- **Do not** add `onReorder` to `useBriefingState` directly — it does not own `scheduleChips` state

---

## Chip Visual Style

Use CSS variables to match the existing theme system — no hardcoded hex values.

**Selected chip (active):**
```css
border-radius: 16px;
border: 1.5px solid rgba(var(--color-accent-warm-rgb), 0.28);  /* fallback: use existing borderColor pattern */
border-left: 3px solid var(--color-accent-warm);
background: var(--color-bg-chip-selected, rgba(var(--color-accent-warm-rgb), 0.15));
```

In practice, use the same inline `style` pattern already in `ScheduleChips.tsx` (`style={{ borderColor: ..., background: ... }}`), referencing `var(--color-accent-warm)` for the accent bar and keeping existing fill/border logic unchanged. Only add `borderLeft: '3px solid var(--color-accent-warm)'` and change `borderRadius` from `rounded-lg` (8px) to a `16px` value via inline style or a Tailwind `rounded-2xl` override.

**Deselected chip:**
Same shape + radius. Left bar: `3px solid var(--color-text-muted)` at low opacity. Background: `var(--color-bg-chip)`.

---

## Files to Change

| File | Change |
|---|---|
| `src/components/ink/morningBriefingUtils.ts` | Add `id` to `ScheduleChip` interface; add `reorderChips(chips, from, to)` pure function; populate `id` in `parseScheduleProposal` |
| `src/components/ScheduleChips.tsx` | Add `DndProvider` (scoped here only); add `useDrag`/`useDrop` per chip; update chip styles (16px radius, accent bar); add `onReorder` prop |
| `src/hooks/useProposalExecution.ts` | Add `reorderChips` handler to `ProposalActions`; wire to `setScheduleChips` |
| `src/hooks/useBriefingState.ts` | Thread `onReorder` through `BriefingActions` to reach `ScheduleChips` |
| `src/components/ink/MorningBriefing.tsx` | Pass `onReorder` from briefing actions down to `ScheduleChips` |

---

## Out of Scope

- Touch/mobile drag (HTML5Backend is desktop-only; fine for Electron)
- Drag handles (whole chip is the target)
- Undo/redo of reorder
- Persisting reordered state across sessions (chips are ephemeral per briefing)

---

## Verification

- `npm run build` — TypeScript compiles clean
- Drag a chip upward — times cascade correctly from the earlier position; chips above are unchanged
- Drag a chip downward — same cascade behaviour from the earlier position
- Drag to same position — no time change, no visual glitch
- Clicking a chip still toggles selected state (no accidental drag triggers on tap)
- Drop indicator appears above target when dragging up, below when dragging down
- Selected/deselected chip styles render with 16px radius and accent bar
- Single-chip list: no drag affordance, chip renders normally
