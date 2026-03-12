import { describe, expect, it } from 'vitest';
import { buildLocalDayWindow } from './gcalDayWindow';

describe('buildLocalDayWindow', () => {
  it('creates a UTC query window that preserves the requested local day', () => {
    const { timeMin, timeMax } = buildLocalDayWindow('2026-03-11');

    const start = new Date(timeMin);
    const end = new Date(timeMax);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(11);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(11);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});
