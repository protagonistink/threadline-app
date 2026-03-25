// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBriefingContext, stripStructuredAssistantBlocks } from './morningBriefingUtils';
import { installMockApi } from '../../test/mockApi';

describe('buildBriefingContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T10:00:00'));
    const api = installMockApi();
    (api.asana.getTasks as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: [] });
    (api.gcal.getEvents as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: [] });
  });

  it('subtracts scheduled blocks from available focus minutes while preserving gross workday time', async () => {
    const context = await buildBriefingContext({
      weeklyGoals: [],
      committedTasks: [],
      doneTasks: [],
      workdayStart: { hour: 9, min: 0 },
      workdayEnd: { hour: 17, min: 0 },
      planningDate: new Date().toISOString().split('T')[0],
      scheduleBlocks: [
        {
          id: 'block-1',
          title: 'Deep work',
          startHour: 13,
          startMin: 0,
          durationMins: 90,
          kind: 'focus',
          readOnly: false,
          linkedTaskId: 'task-1',
          source: 'local',
        },
      ],
    });

    expect(context.remainingWorkdayMinutes).toBe(420);
    expect(context.availableFocusMinutes).toBe(330);
    expect(context.scheduledMinutes).toBe(90);
  });
});

describe('stripStructuredAssistantBlocks', () => {
  it('removes schedule code blocks and ritual directives from visible assistant copy', () => {
    const content = [
      'Here is the plan.',
      '',
      '```schedule',
      '[{"title":"Write draft","startHour":9,"startMin":0,"durationMins":60}]',
      '```',
      '',
      '[RITUAL] LinkedIn post',
      '',
      'Keep the morning clean.',
    ].join('\n');

    expect(stripStructuredAssistantBlocks(content)).toBe('Here is the plan.\n\nKeep the morning clean.');
  });
});
