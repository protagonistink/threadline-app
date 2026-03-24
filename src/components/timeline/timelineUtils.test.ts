import { describe, it, expect } from 'vitest';
import type { ScheduleBlock } from '@/types';
import {
  clampMinutes,
  timeToTop,
  formatTime,
  formatTimeShort,
  formatMins,
  getStepMins,
  computeOpenIntervals,
  computeOverlapLayout,
} from './timelineUtils';

const makeBlock = (id: string, startHour: number, startMin: number, durationMins: number): ScheduleBlock => ({
  id, title: id, startHour, startMin, durationMins,
  kind: 'focus', readOnly: false, source: 'local',
});

describe('clampMinutes', () => {
  it('returns value when within bounds', () => {
    expect(clampMinutes(500, 300, 1000)).toBe(500);
  });

  it('clamps to dayStartMins when below', () => {
    expect(clampMinutes(100, 300, 1000)).toBe(300);
  });

  it('clamps to dayEndMins when above', () => {
    expect(clampMinutes(1100, 300, 1000)).toBe(1000);
  });

  it('accounts for maxDurationMins', () => {
    expect(clampMinutes(980, 300, 1000, 60)).toBe(940);
  });
});

describe('timeToTop', () => {
  it('converts minutes to pixel position', () => {
    // 120 mins past dayStart at 96px/hour = 2 hours * 96 = 192
    expect(timeToTop(600, 480, 96)).toBe(192);
  });

  it('returns 0 at dayStart', () => {
    expect(timeToTop(480, 480, 96)).toBe(0);
  });

  it('handles fractional hours', () => {
    // 30 mins past dayStart at 96px/hour = 0.5 * 96 = 48
    expect(timeToTop(510, 480, 96)).toBe(48);
  });
});

describe('formatTime', () => {
  it('formats AM time', () => {
    expect(formatTime(9, 30)).toBe('9:30 AM');
  });

  it('formats PM time', () => {
    expect(formatTime(14, 15)).toBe('2:15 PM');
  });

  it('formats midnight as 12:00 AM', () => {
    expect(formatTime(0, 0)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime(12, 0)).toBe('12:00 PM');
  });

  it('pads minutes with leading zero', () => {
    expect(formatTime(8, 5)).toBe('8:05 AM');
  });

  it('handles hour > 24 via modulo', () => {
    expect(formatTime(25, 0)).toBe('1:00 AM');
  });
});

describe('formatTimeShort', () => {
  it('omits minutes when zero', () => {
    expect(formatTimeShort(9, 0)).toBe('9 AM');
  });

  it('includes minutes when non-zero', () => {
    expect(formatTimeShort(9, 30)).toBe('9:30 AM');
  });

  it('formats PM correctly', () => {
    expect(formatTimeShort(15, 0)).toBe('3 PM');
  });

  it('formats midnight', () => {
    expect(formatTimeShort(0, 0)).toBe('12 AM');
  });
});

describe('getStepMins', () => {
  it('returns 15 for durations under 60', () => {
    expect(getStepMins(30)).toBe(15);
    expect(getStepMins(59)).toBe(15);
  });

  it('returns 30 for durations 60-119', () => {
    expect(getStepMins(60)).toBe(30);
    expect(getStepMins(119)).toBe(30);
  });

  it('returns 60 for durations >= 120', () => {
    expect(getStepMins(120)).toBe(60);
    expect(getStepMins(300)).toBe(60);
  });
});

describe('computeOpenIntervals', () => {
  it('returns one big interval when no blocks', () => {
    const result = computeOpenIntervals([], 480, 1020);
    expect(result).toEqual([{ startMins: 480, durationMins: 540 }]);
  });

  it('returns no intervals when blocks are back-to-back', () => {
    const blocks = [
      makeBlock('a', 8, 0, 60),
      makeBlock('b', 9, 0, 60),
      makeBlock('c', 10, 0, 60),
    ];
    // dayStart=480 (8am), dayEnd=660 (11am) — blocks fill entire range
    const result = computeOpenIntervals(blocks, 480, 660);
    expect(result).toEqual([]);
  });

  it('finds gap between blocks', () => {
    const blocks = [
      makeBlock('a', 8, 0, 60),   // 8:00-9:00
      makeBlock('b', 10, 0, 60),  // 10:00-11:00
    ];
    const result = computeOpenIntervals(blocks, 480, 660);
    expect(result).toEqual([{ startMins: 540, durationMins: 60 }]);
  });

  it('filters out gaps smaller than minGapMins', () => {
    const blocks = [
      makeBlock('a', 8, 0, 50),   // 8:00-8:50
      makeBlock('b', 9, 0, 60),   // 9:00-10:00 — 10 min gap, too small
    ];
    const result = computeOpenIntervals(blocks, 480, 600);
    expect(result).toEqual([]);
  });

  it('respects custom minGapMins', () => {
    const blocks = [
      makeBlock('a', 8, 0, 50),   // 8:00-8:50
      makeBlock('b', 9, 0, 60),   // 9:00-10:00 — 10 min gap
    ];
    const result = computeOpenIntervals(blocks, 480, 600, 10);
    expect(result).toEqual([{ startMins: 530, durationMins: 10 }]);
  });

  it('includes gap after last block before day end', () => {
    const blocks = [
      makeBlock('a', 8, 0, 60),   // 8:00-9:00
    ];
    // dayEnd = 660 (11:00) — 2 hour gap after block
    const result = computeOpenIntervals(blocks, 480, 660);
    expect(result).toEqual([{ startMins: 540, durationMins: 120 }]);
  });
});

describe('formatMins', () => {
  it('returns "0m" for 0 minutes', () => {
    expect(formatMins(0)).toBe('0m');
  });

  it('returns "15m" for 15 minutes', () => {
    expect(formatMins(15)).toBe('15m');
  });

  it('returns "1h" for 60 minutes', () => {
    expect(formatMins(60)).toBe('1h');
  });

  it('returns "1h 15m" for 75 minutes', () => {
    expect(formatMins(75)).toBe('1h 15m');
  });

  it('returns "2h" for 120 minutes', () => {
    expect(formatMins(120)).toBe('2h');
  });

  it('returns "1h 30m" for 90 minutes', () => {
    expect(formatMins(90)).toBe('1h 30m');
  });
});

describe('computeOverlapLayout', () => {
  it('returns empty map for no blocks', () => {
    const result = computeOverlapLayout([]);
    expect(result.size).toBe(0);
  });

  it('assigns single block to colIndex 0, colCount 1', () => {
    const blocks = [makeBlock('a', 9, 0, 60)];
    const result = computeOverlapLayout(blocks);
    expect(result.get('a')).toEqual({ colIndex: 0, colCount: 1 });
  });

  it('assigns non-overlapping blocks each to colIndex 0, colCount 1', () => {
    const blocks = [
      makeBlock('a', 9, 0, 60),   // 9:00-10:00
      makeBlock('b', 10, 0, 60),  // 10:00-11:00
    ];
    const result = computeOverlapLayout(blocks);
    expect(result.get('a')).toEqual({ colIndex: 0, colCount: 1 });
    expect(result.get('b')).toEqual({ colIndex: 0, colCount: 1 });
  });

  it('assigns overlapping blocks to different columns', () => {
    const blocks = [
      makeBlock('a', 9, 0, 90),   // 9:00-10:30
      makeBlock('b', 9, 30, 60),  // 9:30-10:30
    ];
    const result = computeOverlapLayout(blocks);
    const a = result.get('a')!;
    const b = result.get('b')!;
    expect(a.colCount).toBe(2);
    expect(b.colCount).toBe(2);
    expect(a.colIndex).not.toBe(b.colIndex);
  });

  it('handles three blocks where two overlap correctly', () => {
    const blocks = [
      makeBlock('a', 9, 0, 90),   // 9:00-10:30
      makeBlock('b', 9, 30, 60),  // 9:30-10:30
      makeBlock('c', 11, 0, 60),  // 11:00-12:00 — separate group
    ];
    const result = computeOverlapLayout(blocks);
    const a = result.get('a')!;
    const b = result.get('b')!;
    const c = result.get('c')!;
    // a and b overlap — 2 columns
    expect(a.colCount).toBe(2);
    expect(b.colCount).toBe(2);
    expect(a.colIndex).not.toBe(b.colIndex);
    // c is alone
    expect(c).toEqual({ colIndex: 0, colCount: 1 });
  });
});
