// @vitest-environment jsdom

import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { useMonthlyPlanning } from './useMonthlyPlanning';
import { installMockApi } from '../test/mockApi';

describe('useMonthlyPlanning', () => {
  beforeEach(() => {
    const api = installMockApi();
    (api.store.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('shows prompt when initialPromptState is true, hides when plan is completed', async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const { result } = renderHook(() =>
      useMonthlyPlanning({
        initialMonthlyPlan: null,
        initialPromptState: true,
      })
    );

    await waitFor(() => {
      expect(result.current.monthlyPlanPrompt).toBe(true);
    });

    act(() => {
      result.current.setMonthlyPlan({
        month: currentMonth,
        reflection: 'Some reflection',
        oneThing: 'Ship the thing',
        why: 'Because it matters',
      });
    });

    await waitFor(() => {
      expect(result.current.monthlyPlan).toMatchObject({
        month: currentMonth,
        oneThing: 'Ship the thing',
      });
      expect(result.current.monthlyPlanPrompt).toBe(false);
    });
  });

  it('does not show prompt when initialPromptState is false', async () => {
    const { result } = renderHook(() =>
      useMonthlyPlanning({
        initialMonthlyPlan: null,
        initialPromptState: false,
      })
    );

    await waitFor(() => {
      expect(result.current.monthlyPlanPrompt).toBe(false);
    });
  });

  it('fills in the current month when a monthly plan is saved without a month stamp', async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const { result } = renderHook(() =>
      useMonthlyPlanning({
        initialMonthlyPlan: null,
        initialPromptState: true,
      })
    );

    act(() => {
      result.current.setMonthlyPlan({
        month: '',
        reflection: '',
        oneThing: 'Finish the month with a clean spine',
        why: '',
      });
    });

    await waitFor(() => {
      expect(result.current.monthlyPlan).toMatchObject({
        month: currentMonth,
        oneThing: 'Finish the month with a clean spine',
      });
      expect(result.current.monthlyPlanPrompt).toBe(false);
    });
  });
});
