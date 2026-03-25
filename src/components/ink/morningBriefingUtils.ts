import { format, parseISO } from 'date-fns';
import type { BriefingContext } from '@/types/electron';
import type { InboxItem, InkMode, MonthlyPlan, PlannedTask, ScheduleBlock, WeeklyGoal } from '@/types';

export interface CommitChip {
  title: string;
  matchedTaskId: string | null;
  matchedGoalId: string | null;
  selected: boolean;
}

interface BuildBriefingContextOptions {
  weeklyGoals: WeeklyGoal[];
  committedTasks: PlannedTask[];
  doneTasks: PlannedTask[];
  workdayStart: { hour: number; min: number };
  workdayEnd: { hour: number; min: number };
  scheduleBlocks: ScheduleBlock[];
  planningDate: string;
  monthlyPlan?: MonthlyPlan | null;
  inkMode?: InkMode;
  interviewStep?: number;
  interviewAnswers?: string[];
}

function normalizeTaskTitle(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export async function buildBriefingContext({
  weeklyGoals,
  committedTasks,
  doneTasks,
  workdayStart,
  workdayEnd,
  scheduleBlocks,
  planningDate,
  monthlyPlan,
  inkMode,
  interviewStep,
  interviewAnswers,
}: BuildBriefingContextOptions): Promise<BriefingContext> {
  let asanaTasks: BriefingContext['asanaTasks'] = [];
  try {
    const result = await window.api.asana.getTasks({ daysAhead: 14, limit: 30 });
    if (result.success && result.data) {
      asanaTasks = result.data.map((task) => {
        const priorityField = task.custom_fields?.find(
          (field) => field.name.toLowerCase() === 'priority'
        );

        return {
          title: task.name,
          dueOn: task.due_on,
          priority: priorityField?.display_value || undefined,
          project: task.projects?.[0]?.name || undefined,
          notes: task.notes || undefined,
          tags: task.tags?.map((tag) => tag.name),
        };
      });
    }
  } catch {
    // Asana unavailable. Briefing should still work.
  }

  let gcalEvents: BriefingContext['gcalEvents'] = [];
  try {
    const result = await window.api.gcal.getEvents(planningDate);
    if (result.success && result.data) {
      gcalEvents = result.data.map((event) => ({
        title: event.summary || '(No title)',
        startTime: event.start?.dateTime ? format(new Date(event.start.dateTime), 'h:mm a') : '',
        endTime: event.end?.dateTime ? format(new Date(event.end.dateTime), 'h:mm a') : '',
        isAllDay: !event.start?.dateTime,
      }));
    }
  } catch {
    // Calendar unavailable. Briefing should still work.
  }

  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(workdayEnd.hour, workdayEnd.min, 0, 0);
  const remainingMins = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 60000));
  const minutesPastClose = Math.max(0, Math.floor((now.getTime() - endOfDay.getTime()) / 60000));
  const scheduledMinutes = scheduleBlocks
    .filter((block) => !block.readOnly)
    .reduce((sum, block) => sum + block.durationMins, 0);
  const availableFocusMinutes = Math.max(0, remainingMins - scheduledMinutes);
  const planningDateLabel = format(parseISO(planningDate), 'EEEE, MMMM d, yyyy');
  const today = format(new Date(), 'yyyy-MM-dd');

  return {
    date: planningDateLabel,
    planningDate,
    planningDateLabel,
    planningDateIsToday: planningDate === today,
    currentTime: format(now, 'h:mm a'),
    currentHour: now.getHours(),
    currentMinute: now.getMinutes(),
    weeklyGoals: weeklyGoals.map((goal) => ({ title: goal.title, why: goal.why })),
    interviewStep,
    interviewAnswers,
    asanaTasks,
    gcalEvents,
    remainingWorkdayMinutes: remainingMins,
    availableFocusMinutes,
    scheduledMinutes,
    committedTasks: committedTasks.map((task) => {
      const goal = task.weeklyGoalId ? weeklyGoals.find((item) => item.id === task.weeklyGoalId) : null;
      return {
        title: task.title,
        estimateMins: task.estimateMins || 45,
        weeklyGoal: goal?.title || 'Unassigned',
      };
    }),
    doneTasks: doneTasks.map((task) => {
      const goal = task.weeklyGoalId ? weeklyGoals.find((item) => item.id === task.weeklyGoalId) : null;
      return {
        title: task.title,
        estimateMins: task.estimateMins || 45,
        weeklyGoal: goal?.title || 'Unassigned',
      };
    }),
    countdowns: [],
    workdayStartHour: workdayStart.hour,
    workdayStartMin: workdayStart.min,
    workdayEndHour: workdayEnd.hour,
    workdayEndMin: workdayEnd.min,
    isAfterWorkday: now > endOfDay,
    minutesPastClose,
    monthlyOneThing: monthlyPlan?.oneThing,
    monthlyWhy: monthlyPlan?.why,
    inkMode,
  };
}

export function inferPlanningDateFromContent(content: string, fallbackDate: string): string {
  const normalized = content.toLowerCase();
  if (/\btomorrow\b/.test(normalized)) {
    const date = new Date(`${fallbackDate}T12:00:00`);
    date.setDate(date.getDate() + 1);
    return format(date, 'yyyy-MM-dd');
  }
  if (/\btoday\b|\btonight\b|\bthis evening\b/.test(normalized)) {
    return fallbackDate;
  }
  return fallbackDate;
}

export interface ScheduleChip {
  title: string;
  startHour: number;
  startMin: number;
  durationMins: number;
  matchedTaskId: string | null;
  matchedGoalId: string | null;
  selected: boolean;
}

export function parseScheduleProposal(
  content: string,
  plannedTasks: PlannedTask[],
  candidateItems: InboxItem[]
): ScheduleChip[] {
  const match = content.match(/```schedule\s*\n([\s\S]*?)\n```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];

    const matchableTasks = [
      ...plannedTasks.map((task) => ({ id: task.id, title: task.title, weeklyGoalId: task.weeklyGoalId })),
      ...candidateItems.map((item) => ({ id: item.id, title: item.title, weeklyGoalId: null as string | null })),
    ];

    return parsed
      .filter((item: Record<string, unknown>) => item.title && typeof item.startHour === 'number')
      .map((item: Record<string, unknown>) => {
        const title = String(item.title);
        const normalized = normalizeTaskTitle(title);
        const exactMatch = matchableTasks.find((t) => normalizeTaskTitle(t.title) === normalized);
        const fuzzyMatch = exactMatch
          ? null
          : matchableTasks.find((t) => {
              const nt = normalizeTaskTitle(t.title);
              return nt.includes(normalized) || normalized.includes(nt);
            });
        const matched = exactMatch || fuzzyMatch;

        return {
          title,
          startHour: Number(item.startHour),
          startMin: Number(item.startMin) || 0,
          durationMins: Number(item.durationMins) || 60,
          matchedTaskId: matched?.id || null,
          matchedGoalId: matched?.weeklyGoalId || null,
          selected: true,
        };
      });
  } catch {
    return [];
  }
}

export function parseCommitChips(
  content: string,
  plannedTasks: PlannedTask[],
  candidateItems: InboxItem[]
): CommitChip[] {
  const taskLines = content
    .split('\n')
    .filter((line) => /^[-–•]\s+\S/.test(line.trim()));

  const matchableTasks = [
    ...plannedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      weeklyGoalId: task.weeklyGoalId,
    })),
    ...candidateItems.map((item) => ({
      id: item.id,
      title: item.title,
      weeklyGoalId: null,
    })),
  ];

  return taskLines.map((line) => {
    const title = line.trim().replace(/^[-–•]\s+/, '').replace(/\s*\(.*?\)\s*$/, '').trim();
    const normalizedTitle = normalizeTaskTitle(title);

    const exactMatch = matchableTasks.find((task) => normalizeTaskTitle(task.title) === normalizedTitle);
    const fuzzyMatch = exactMatch
      ? null
      : matchableTasks.find((task) => {
          const normalizedTaskTitle = normalizeTaskTitle(task.title);
          return normalizedTaskTitle.includes(normalizedTitle) || normalizedTitle.includes(normalizedTaskTitle);
        });

    const matched = exactMatch || fuzzyMatch;

    return {
      title,
      matchedTaskId: matched?.id || null,
      matchedGoalId: matched?.weeklyGoalId || null,
      selected: true,
    };
  });
}

export function parseRitualSuggestions(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => /\[RITUAL\]/i.test(line))
    .map((line) => line.replace(/\[RITUAL\]/i, '').replace(/^[-–•*]\s*/, '').trim())
    .filter(Boolean);
}

export function stripStructuredAssistantBlocks(content: string): string {
  return content
    .replace(/```schedule\s*\n[\s\S]*?\n```/g, '')
    .replace(/```json\s*\n[\s\S]*?\n```/g, '')
    .replace(/^\s*\[RITUAL\].*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
