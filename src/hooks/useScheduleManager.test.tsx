// @vitest-environment jsdom

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { useScheduleManager } from './useScheduleManager';
import type { DailyPlan, PlannedTask, ScheduleBlock } from '@/types';

function useHarness() {
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([
    {
      id: 'task-1',
      title: 'Write draft',
      source: 'local',
      weeklyGoalId: 'goal-1',
      status: 'candidate',
      estimateMins: 60,
      active: false,
    },
  ]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan>({
    date: '2026-03-12',
    committedTaskIds: [],
  });

  const schedule = useScheduleManager({
    plannedTasks,
    scheduleBlocks,
    dailyPlan,
    setPlannedTasks,
    setScheduleBlocks,
    setDailyPlan,
    bringForward: (taskId: string) => {
      setPlannedTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: 'committed', lastCommittedDate: '2026-03-12' }
            : task
        )
      );
      setDailyPlan((prev) => ({
        ...prev,
        committedTaskIds: prev.committedTaskIds.includes(taskId)
          ? prev.committedTaskIds
          : [...prev.committedTaskIds, taskId],
      }));
    },
  });

  return {
    ...schedule,
    plannedTasks,
    scheduleBlocks,
    dailyPlan,
  };
}

describe('useScheduleManager', () => {
  beforeEach(() => {
    (window as unknown as { api: typeof window.api }).api = {
      asana: {
        getTasks: vi.fn(),
        addComment: vi.fn(),
      },
      gcal: {
        getEvents: vi.fn(),
        listCalendars: vi.fn(),
        createEvent: vi.fn().mockResolvedValue({ success: false, error: 'Calendar exploded' }),
        updateEvent: vi.fn(),
        deleteEvent: vi.fn(),
        auth: vi.fn(),
      },
      pomodoro: {
        start: vi.fn(),
        pause: vi.fn(),
        stop: vi.fn(),
        skip: vi.fn(),
        onTick: vi.fn(),
      },
      focus: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
      store: {
        get: vi.fn(),
        set: vi.fn(),
      },
      settings: {
        load: vi.fn(),
        save: vi.fn(),
      },
      window: {
        showPomodoro: vi.fn(),
        hidePomodoro: vi.fn(),
        activate: vi.fn(),
        setFocusSize: vi.fn(),
        showMain: vi.fn(),
      },
      ai: {
        chat: vi.fn(),
        streamStart: vi.fn(),
        onToken: vi.fn(),
        onDone: vi.fn(),
      },
      physics: {
        get: vi.fn(),
        update: vi.fn(),
        log: vi.fn(),
      },
      shell: {
        openExternal: vi.fn(),
      },
    };
  });

  it('rolls back optimistic state when calendar creation fails', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.scheduleTaskBlock('task-1', 9, 0, 60);
    });

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toEqual([]);
      expect(result.current.dailyPlan.committedTaskIds).toEqual([]);
      expect(result.current.plannedTasks[0].status).toBe('candidate');
      expect(result.current.plannedTasks[0]).not.toHaveProperty('scheduledEventId');
      expect(result.current.plannedTasks[0]).not.toHaveProperty('scheduledCalendarId');
    });
  });
});
