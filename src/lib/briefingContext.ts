import { format } from 'date-fns';
import type { BriefingContext } from '@/types';

/**
 * Build a minimal valid BriefingContext for simple AI calls that
 * don't need the full planning state (e.g., task breakdowns, daily intentions,
 * evening reflections). Provides sensible defaults so buildSystemPrompt
 * doesn't interpolate undefined values.
 */
export function buildMinimalContext(overrides?: Partial<BriefingContext>): BriefingContext {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd');

  return {
    date: dateStr,
    planningDate: dateStr,
    planningDateLabel: 'today',
    planningDateIsToday: true,
    currentTime: format(now, 'h:mm a'),
    currentHour: now.getHours(),
    currentMinute: now.getMinutes(),
    weeklyGoals: [],
    asanaTasks: [],
    gcalEvents: [],
    remainingWorkdayMinutes: 0,
    availableFocusMinutes: 0,
    scheduledMinutes: 0,
    committedTasks: [],
    doneTasks: [],
    countdowns: [],
    workdayStartHour: 9,
    workdayStartMin: 0,
    workdayEndHour: 18,
    workdayEndMin: 0,
    isAfterWorkday: now.getHours() >= 18,
    minutesPastClose: Math.max(0, (now.getHours() * 60 + now.getMinutes()) - 18 * 60),
    ...overrides,
  };
}
