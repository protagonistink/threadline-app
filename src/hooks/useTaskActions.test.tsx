// @vitest-environment jsdom

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { useTaskActions } from './useTaskActions';
import type { DailyPlan, PlannedTask, ScheduleBlock, WeeklyGoal } from '@/types';
import { installMockApi } from '../test/mockApi';

const weeklyGoals: WeeklyGoal[] = [
  { id: 'goal-1', title: 'Client Work', color: 'bg-accent-warm' },
  { id: 'goal-2', title: 'Writing', color: 'rgb(45,212,191)' },
];

function useHarness(options?: { initialTask?: Partial<PlannedTask>; initialDailyPlan?: Partial<DailyPlan> }) {
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([
    {
      id: 'task-1',
      title: 'Write draft',
      source: 'local',
      weeklyGoalId: 'goal-1',
      status: 'scheduled',
      estimateMins: 60,
      active: true,
      scheduledEventId: 'event-1',
      scheduledCalendarId: 'primary',
      ...options?.initialTask,
    },
  ]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([
    {
      id: 'event-1',
      title: 'Write draft',
      startHour: 9,
      startMin: 0,
      durationMins: 60,
      kind: 'focus',
      readOnly: false,
      linkedTaskId: 'task-1',
      eventId: 'event-1',
      calendarId: 'primary',
      source: 'gcal',
    },
  ]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan>({
    date: '2026-03-11',
    committedTaskIds: ['task-1'],
    ...options?.initialDailyPlan,
  });
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [lastCommitTimestamp, setLastCommitTimestamp] = useState(0);

  const actions = useTaskActions({
    weeklyGoals,
    plannedTasks,
    scheduleBlocks,
    planningDate: '2026-03-11',
    setPlannedTasks,
    setScheduleBlocks,
    setDailyPlanForDate: (_date, value) => {
      setDailyPlan((prev) => typeof value === 'function' ? value(prev) : value);
    },
    setSelectedInboxId,
    setLastCommitTimestamp,
  });

  return {
    ...actions,
    plannedTasks,
    scheduleBlocks,
    dailyPlan,
    selectedInboxId,
    lastCommitTimestamp,
  };
}

describe('useTaskActions', () => {
  beforeEach(() => {
    installMockApi();
  });

  it('moveForward removes the linked calendar block before migrating the task', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.moveForward('task-1');
    });

    expect(window.api.gcal.deleteEvent).toHaveBeenCalledWith('event-1', 'primary');

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.dailyPlan.committedTaskIds).toEqual([]);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'migrated',
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
        active: false,
      });
    });
  });

  it('toggleTask removes the linked calendar block when completing a scheduled task', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.toggleTask('task-1');
    });

    expect(window.api.gcal.deleteEvent).toHaveBeenCalledWith('event-1', 'primary');

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'done',
        active: false,
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
      });
    });
  });

  it('toggleTask restores committed state when reopening a completed scheduled task', async () => {
    const { result } = renderHook(() => useHarness());

    // First toggle: mark done
    await act(async () => {
      await result.current.toggleTask('task-1');
    });

    await waitFor(() => {
      expect(result.current.plannedTasks[0]).toMatchObject({ status: 'done' });
    });

    // Second toggle: restore to scheduled
    await act(async () => {
      await result.current.toggleTask('task-1');
    });

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'committed',
        active: false,
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
      });
    });
  });

  it('releaseTask removes the linked calendar block before cancelling the task', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.releaseTask('task-1');
    });

    expect(window.api.gcal.deleteEvent).toHaveBeenCalledWith('event-1', 'primary');

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.dailyPlan.committedTaskIds).toEqual([]);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'cancelled',
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
        active: false,
      });
    });
  });

  it('returnTaskToInbox removes the linked calendar block and restores candidate status', async () => {
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.returnTaskToInbox('task-1');
    });

    expect(window.api.gcal.deleteEvent).toHaveBeenCalledWith('event-1', 'primary');

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.dailyPlan.committedTaskIds).toEqual([]);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'candidate',
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
        active: false,
      });
    });
  });

  it('does not mutate local task state when calendar deletion fails', async () => {
    window.api.gcal.deleteEvent = vi.fn().mockResolvedValue({ success: false, error: 'Calendar exploded' });
    const { result } = renderHook(() => useHarness());

    await expect(
      act(async () => {
        await result.current.moveForward('task-1');
      })
    ).rejects.toThrow('Calendar exploded');

    expect(result.current.scheduleBlocks).toHaveLength(1);
    expect(result.current.dailyPlan.committedTaskIds).toEqual(['task-1']);
    expect(result.current.plannedTasks[0]).toMatchObject({
      status: 'scheduled',
      scheduledEventId: 'event-1',
      scheduledCalendarId: 'primary',
      active: true,
    });
  });

  it('migrateOldTasks clears stale schedule blocks and scheduling metadata', async () => {
    const { result } = renderHook(() => useHarness({
      initialTask: { lastCommittedDate: '2026-03-01' },
      initialDailyPlan: { date: '2026-03-17' },
    }));

    await act(async () => {
      result.current.migrateOldTasks();
    });

    await waitFor(() => {
      expect(result.current.scheduleBlocks).toHaveLength(0);
      expect(result.current.dailyPlan.committedTaskIds).toEqual([]);
      expect(result.current.plannedTasks[0]).toMatchObject({
        status: 'candidate',
        scheduledEventId: undefined,
        scheduledCalendarId: undefined,
        active: false,
      });
    });
  });

  it('bringForward preserves an existing weeklyGoalId when no explicit goal is provided', async () => {
    const { result } = renderHook(() => useHarness({
      initialTask: { weeklyGoalId: 'goal-2', status: 'candidate', active: false },
      initialDailyPlan: { committedTaskIds: [] },
    }));

    await act(async () => {
      result.current.bringForward('task-1');
    });

    await waitFor(() => {
      expect(result.current.plannedTasks[0]).toMatchObject({
        weeklyGoalId: 'goal-2',
        status: 'committed',
        lastCommittedDate: '2026-03-11',
      });
    });
  });

  it('assignTaskToGoal retags a task without changing the rest of its state', async () => {
    const { result } = renderHook(() => useHarness({
      initialTask: { weeklyGoalId: null, status: 'candidate', active: false },
      initialDailyPlan: { committedTaskIds: [] },
    }));

    act(() => {
      result.current.assignTaskToGoal('task-1', 'goal-2');
    });

    await waitFor(() => {
      expect(result.current.plannedTasks[0]).toMatchObject({
        weeklyGoalId: 'goal-2',
        status: 'candidate',
        lastCommittedDate: '2026-03-11',
      });
    });
  });
});
