import { describe, expect, it } from 'vitest';
import { computeBalanceAwareness, computeFocusCapacity } from './railUtils';

// ---------------------------------------------------------------------------
// computeFocusCapacity
// ---------------------------------------------------------------------------

describe('computeFocusCapacity', () => {
  it('returns full workday hours when current hour is before workday start', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 7,
    });
    // min(17-7, 17-9) = min(10, 8) = 8 hours
    expect(result.hoursRemaining).toBe(8);
    expect(result.label).toContain('8 hours');
  });

  it('uses remaining hours from now when inside the workday', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 13,
    });
    // min(17-13, 17-9) = min(4, 8) = 4 hours
    expect(result.hoursRemaining).toBe(4);
    expect(result.label).toContain('4 hours');
    expect(result.label).toContain('deep work');
  });

  it('subtracts scheduled minutes from available hours', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 120, // 2 hours of hard blocks
      currentHour: 9,
    });
    expect(result.hoursRemaining).toBe(6);
  });

  it('returns 0 and "fully booked" label when scheduled minutes exceed available time', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 600, // 10 hours — more than 8-hour day
      currentHour: 9,
    });
    expect(result.hoursRemaining).toBe(0);
    expect(result.label).toBe('Your day is fully booked');
  });

  it('returns 0 and "fully booked" label after workday ends', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 18,
    });
    expect(result.hoursRemaining).toBe(0);
    expect(result.label).toBe('Your day is fully booked');
  });

  it('uses "left — use them well" label when 2 or fewer hours remain', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 15,
    });
    // min(17-15, 8) = 2 hours
    expect(result.hoursRemaining).toBe(2);
    expect(result.label).toContain('left');
    expect(result.label).toContain('use them well');
  });

  it('rounds to nearest half hour in label', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 45, // 0.75 hours
      currentHour: 9,
    });
    // 8 - 0.75 = 7.25 → rounded to 7.5
    expect(result.hoursRemaining).toBeCloseTo(7.25);
    expect(result.label).toContain('7.5 hours');
  });

  it('uses singular "1 hour" form correctly', () => {
    const result = computeFocusCapacity({
      workdayStartHour: 9,
      workdayEndHour: 17,
      scheduledMinutes: 0,
      currentHour: 16,
    });
    // min(17-16, 8) = 1 hour
    expect(result.hoursRemaining).toBe(1);
    expect(result.label).toContain('1 hour');
    expect(result.label).not.toContain('1 hours');
  });
});

// ---------------------------------------------------------------------------
// computeBalanceAwareness
// ---------------------------------------------------------------------------

describe('computeBalanceAwareness', () => {
  it('returns null message when no intentions provided', () => {
    const result = computeBalanceAwareness({ intentions: [] });
    expect(result.neglected).toEqual([]);
    expect(result.message).toBeNull();
  });

  it('returns null message when all intentions have 0 completions', () => {
    const result = computeBalanceAwareness({
      intentions: [
        { id: '1', title: 'DRIVR', tasksCompletedToday: 0 },
        { id: '2', title: 'Writing', tasksCompletedToday: 0 },
      ],
    });
    expect(result.message).toBeNull();
  });

  it('returns null message when all intentions have completions', () => {
    const result = computeBalanceAwareness({
      intentions: [
        { id: '1', title: 'DRIVR', tasksCompletedToday: 2 },
        { id: '2', title: 'Writing', tasksCompletedToday: 1 },
      ],
    });
    expect(result.message).toBeNull();
    expect(result.neglected).toEqual([]);
  });

  it('identifies a neglected intention and names the active one', () => {
    const result = computeBalanceAwareness({
      intentions: [
        { id: '1', title: 'DRIVR', tasksCompletedToday: 3 },
        { id: '2', title: 'Writing', tasksCompletedToday: 0 },
      ],
    });
    expect(result.neglected).toEqual(['Writing']);
    expect(result.message).toContain('DRIVR');
    expect(result.message).toContain('Writing');
    expect(result.message).toContain("hasn't moved yet");
  });

  it('handles multiple neglected intentions', () => {
    const result = computeBalanceAwareness({
      intentions: [
        { id: '1', title: 'DRIVR', tasksCompletedToday: 2 },
        { id: '2', title: 'Writing', tasksCompletedToday: 0 },
        { id: '3', title: 'Health', tasksCompletedToday: 0 },
      ],
    });
    expect(result.neglected).toEqual(['Writing', 'Health']);
    expect(result.message).toContain('Writing');
    expect(result.message).toContain('Health');
    expect(result.message).toContain("hasn't moved yet");
  });

  it('handles a single intention with completions — no imbalance', () => {
    const result = computeBalanceAwareness({
      intentions: [{ id: '1', title: 'DRIVR', tasksCompletedToday: 1 }],
    });
    expect(result.neglected).toEqual([]);
    expect(result.message).toBeNull();
  });

  it('handles a single intention with no completions', () => {
    const result = computeBalanceAwareness({
      intentions: [{ id: '1', title: 'DRIVR', tasksCompletedToday: 0 }],
    });
    expect(result.neglected).toEqual([]);
    expect(result.message).toBeNull();
  });
});
