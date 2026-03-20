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
