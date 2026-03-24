// src/components/timelineUtils.ts
import { CALENDAR_GRID_SNAP_MINS, blockStartMinutes, blockEndMinutes } from '@/lib/planner';
import type { ScheduleBlock } from '@/types';

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

export function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

export function getStepMins(durationMins: number): number {
  if (durationMins < 60) return 15;
  if (durationMins < 120) return 30;
  return 60;
}

export function computeOpenIntervals(
  blocks: ScheduleBlock[],
  dayStartMins: number,
  dayEndMins: number,
  minGapMins = 30,
): Array<{ startMins: number; durationMins: number }> {
  const sorted = [...blocks]
    .sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b));

  const intervals: Array<{ startMins: number; durationMins: number }> = [];
  let cursor = dayStartMins;

  for (const block of sorted) {
    const bStart = blockStartMinutes(block);
    const bEnd = blockEndMinutes(block);
    if (bStart > cursor) {
      const gap = bStart - cursor;
      if (gap >= minGapMins) {
        intervals.push({ startMins: cursor, durationMins: gap });
      }
    }
    cursor = Math.max(cursor, bEnd);
  }

  if (cursor < dayEndMins) {
    const gap = dayEndMins - cursor;
    if (gap >= minGapMins) {
      intervals.push({ startMins: cursor, durationMins: gap });
    }
  }

  return intervals;
}

export function computeOverlapLayout(
  blocks: ScheduleBlock[],
): Map<string, { colIndex: number; colCount: number }> {
  const layout = new Map<string, { colIndex: number; colCount: number }>();
  const sorted = [...blocks].sort((a, b) => blockStartMinutes(a) - blockStartMinutes(b));
  // Group blocks that overlap in time
  const groups: ScheduleBlock[][] = [];
  let curGroup: ScheduleBlock[] = [];
  let curGroupEnd = 0;
  for (const blk of sorted) {
    const s = blockStartMinutes(blk);
    const e = blockEndMinutes(blk);
    if (curGroup.length === 0 || s < curGroupEnd) {
      curGroup.push(blk);
      curGroupEnd = Math.max(curGroupEnd, e);
    } else {
      groups.push(curGroup);
      curGroup = [blk];
      curGroupEnd = e;
    }
  }
  if (curGroup.length > 0) groups.push(curGroup);
  // Assign columns per group
  for (const grp of groups) {
    if (grp.length === 1) {
      layout.set(grp[0].id, { colIndex: 0, colCount: 1 });
      continue;
    }
    const cols: number[][] = [];
    for (const blk of grp) {
      const s = blockStartMinutes(blk);
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c][cols[c].length - 1] <= s) {
          cols[c].push(blockEndMinutes(blk));
          layout.set(blk.id, { colIndex: c, colCount: cols.length });
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push([blockEndMinutes(blk)]);
        layout.set(blk.id, { colIndex: cols.length - 1, colCount: cols.length });
      }
    }
    // Final pass: set colCount to total columns used in group
    const totalCols = cols.length;
    for (const blk of grp) {
      const entry = layout.get(blk.id);
      if (entry) entry.colCount = totalCols;
    }
  }
  return layout;
}
