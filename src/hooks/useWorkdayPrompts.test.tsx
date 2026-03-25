// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkdayPrompts } from './useWorkdayPrompts';
import { installMockApi } from '../test/mockApi';

describe('useWorkdayPrompts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-24T15:00:00'));
    installMockApi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not trigger end-of-day prompt immediately when workday end changes earlier than now', async () => {
    const { result, rerender } = renderHook(
      ({ endMinutes }) =>
        useWorkdayPrompts({
          isInitialized: true,
          workdayStartMinutes: 9 * 60,
          workdayEndMinutes: endMinutes,
          initialStartShownDate: null,
          initialEndShownDate: null,
          initialIsFirstLoadOfDay: false,
        }),
      {
        initialProps: { endMinutes: 18 * 60 },
      }
    );

    expect(result.current.showEndOfDayPrompt).toBe(false);

    rerender({ endMinutes: 14 * 60 });

    await act(async () => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.showEndOfDayPrompt).toBe(false);
    expect(window.api.window.showMain).not.toHaveBeenCalled();
    expect(window.api.store.set).not.toHaveBeenCalledWith('endOfDay.shownDate', expect.anything());
  });
});
