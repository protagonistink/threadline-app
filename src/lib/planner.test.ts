import { describe, expect, it } from 'vitest';
import { buildFocusEventPayload, compareInboxTasks, eventToBlock, planFocusCascade, snapToCalendarGrid } from './planner';
import type { PlannedTask, ScheduleBlock } from '@/types';

describe('buildFocusEventPayload', () => {
  it('rolls the end date into the next day when a block crosses midnight', () => {
    const event = buildFocusEventPayload('Late session', 'task-1', 23, 30, 90, '2026-03-11');

    expect(event.start.dateTime).toBe('2026-03-11T23:30:00');
    expect(event.end.dateTime).toBe('2026-03-12T01:00:00');
  });
});

describe('eventToBlock', () => {
  it('carries the linked task goal onto focus blocks', () => {
    const tasks: PlannedTask[] = [
      {
        id: 'task-1',
        title: 'Write draft',
        source: 'local',
        weeklyGoalId: 'goal-1',
        status: 'scheduled',
        estimateMins: 60,
        active: false,
        scheduledEventId: 'event-1',
      },
    ];

    const block = eventToBlock({
      id: 'event-1',
      summary: 'Write draft',
      start: { dateTime: '2026-03-11T09:00:00' },
      end: { dateTime: '2026-03-11T10:00:00' },
      calendarId: 'primary',
    }, tasks);

    expect(block).toMatchObject({
      id: 'event-1',
      linkedTaskId: 'task-1',
      linkedGoalId: 'goal-1',
    });
  });

  it('treats Ink events for done tasks as hard calendar blocks', () => {
    const tasks: PlannedTask[] = [
      {
        id: 'task-1',
        title: 'Write draft',
        source: 'local',
        weeklyGoalId: 'goal-1',
        status: 'done',
        estimateMins: 60,
        active: false,
        scheduledEventId: undefined,
      },
    ];

    const block = eventToBlock({
      id: 'event-1',
      summary: 'Write draft',
      start: { dateTime: '2026-03-11T09:00:00' },
      end: { dateTime: '2026-03-11T10:00:00' },
      description: '[Inked]\ntask-1',
      calendarId: 'primary',
    }, tasks);

    expect(block).toMatchObject({
      id: 'event-1',
      kind: 'hard',
      readOnly: true,
      linkedTaskId: undefined,
      linkedGoalId: null,
    });
  });
});

describe('snapToCalendarGrid', () => {
  it('locks to quarter-hour increments', () => {
    expect(snapToCalendarGrid(548)).toBe(555);
    expect(snapToCalendarGrid(552)).toBe(555);
    expect(snapToCalendarGrid(561)).toBe(555);
  });
});

describe('planFocusCascade', () => {
  it('inserts into the first valid slot and cascades later focus blocks', () => {
    const blocks: ScheduleBlock[] = [
      {
        id: 'focus-1',
        title: 'First',
        startHour: 9,
        startMin: 0,
        durationMins: 60,
        kind: 'focus',
        readOnly: false,
        source: 'gcal',
      },
      {
        id: 'focus-2',
        title: 'Second',
        startHour: 10,
        startMin: 0,
        durationMins: 60,
        kind: 'focus',
        readOnly: false,
        source: 'gcal',
      },
    ];

    const plan = planFocusCascade(9, 30, 60, blocks);

    expect(plan.startHour).toBe(10);
    expect(plan.startMin).toBe(0);
    expect(plan.cascadeUpdates.get('focus-2')).toEqual({ startHour: 11, startMin: 0 });
  });

  it('keeps hard calendar blocks immovable when finding the next slot', () => {
    const blocks: ScheduleBlock[] = [
      {
        id: 'hard-1',
        title: 'Meeting',
        startHour: 10,
        startMin: 0,
        durationMins: 60,
        kind: 'hard',
        readOnly: true,
        source: 'gcal',
      },
      {
        id: 'focus-1',
        title: 'Focus',
        startHour: 11,
        startMin: 0,
        durationMins: 60,
        kind: 'focus',
        readOnly: false,
        source: 'gcal',
      },
    ];

    const plan = planFocusCascade(10, 15, 60, blocks);

    expect(plan.startHour).toBe(11);
    expect(plan.startMin).toBe(0);
    expect(plan.cascadeUpdates.get('focus-1')).toEqual({ startHour: 12, startMin: 0 });
  });
});

describe('compareInboxTasks', () => {
  it('puts overdue tasks ahead of objective-matched tasks', () => {
    const overdueTask: PlannedTask = {
      id: 'task-overdue',
      title: 'Overdue filing',
      source: 'asana',
      weeklyGoalId: null,
      status: 'candidate',
      estimateMins: 60,
      dueOn: '2026-03-10',
      active: false,
    };
    const objectiveTask: PlannedTask = {
      id: 'task-goal',
      title: 'Objective task',
      source: 'asana',
      weeklyGoalId: 'goal-1',
      status: 'candidate',
      estimateMins: 60,
      dueOn: null,
      active: false,
    };

    const result = compareInboxTasks(overdueTask, objectiveTask, {
      primaryGoalId: 'goal-1',
      planningDate: '2026-03-24',
    });

    expect(result).toBeLessThan(0);
  });

  it('puts rollover tasks ahead of objective-matched tasks', () => {
    const rolloverTask: PlannedTask = {
      id: 'task-rollover',
      title: 'Rollover task',
      source: 'asana',
      weeklyGoalId: null,
      status: 'candidate',
      estimateMins: 60,
      lastCommittedDate: '2026-03-22',
      active: false,
    };
    const objectiveTask: PlannedTask = {
      id: 'task-goal',
      title: 'Objective task',
      source: 'asana',
      weeklyGoalId: 'goal-1',
      status: 'candidate',
      estimateMins: 60,
      active: false,
    };

    const result = compareInboxTasks(rolloverTask, objectiveTask, {
      primaryGoalId: 'goal-1',
      planningDate: '2026-03-24',
    });

    expect(result).toBeLessThan(0);
  });

  it('orders older overdue tasks before newer overdue tasks', () => {
    const olderOverdue: PlannedTask = {
      id: 'task-older',
      title: 'Old overdue',
      source: 'asana',
      weeklyGoalId: null,
      status: 'candidate',
      estimateMins: 60,
      dueOn: '2026-03-08',
      active: false,
    };
    const newerOverdue: PlannedTask = {
      id: 'task-newer',
      title: 'New overdue',
      source: 'asana',
      weeklyGoalId: null,
      status: 'candidate',
      estimateMins: 60,
      dueOn: '2026-03-20',
      active: false,
    };

    const result = compareInboxTasks(olderOverdue, newerOverdue, {
      primaryGoalId: null,
      planningDate: '2026-03-24',
    });

    expect(result).toBeLessThan(0);
  });
});
