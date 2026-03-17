// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBriefingContext } from './morningBriefingUtils';

describe('buildBriefingContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T10:00:00'));

    (window as unknown as { api: typeof window.api }).api = {
      asana: {
        getTasks: vi.fn().mockResolvedValue({ success: true, data: [] }),
        addComment: vi.fn(),
      },
      gcal: {
        getEvents: vi.fn().mockResolvedValue({ success: true, data: [] }),
        listCalendars: vi.fn(),
        createEvent: vi.fn(),
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
      ink: {
        readContext: vi.fn(),
        writeContext: vi.fn(),
        appendJournal: vi.fn(),
      },
    };
  });

  it('reports total remaining minutes before subtracting scheduled blocks', async () => {
    const context = await buildBriefingContext({
      weeklyGoals: [],
      committedTasks: [],
      doneTasks: [],
      workdayEnd: { hour: 17, min: 0 },
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

    expect(context.availableFocusMinutes).toBe(420);
    expect(context.scheduledMinutes).toBe(90);
  });
});
