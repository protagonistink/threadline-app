import { useMemo } from 'react';
import type {
  DailyPlan,
  InboxItem,
  PlannedTask,
  ScheduleBlock,
} from '@/types';
import { asInboxItem } from '@/lib/planner';
import { useCurrentMinute } from './useCurrentMinute';

interface PlannerSelectorsOptions {
  plannedTasks: PlannedTask[];
  scheduleBlocks: ScheduleBlock[];
  dailyPlan: DailyPlan;
  planningDate: string;
}

export function usePlannerSelectors({
  plannedTasks,
  scheduleBlocks,
  dailyPlan,
  planningDate,
}: PlannerSelectorsOptions) {
  const currentMinute = useCurrentMinute();
  const isTodayView = planningDate === new Date().toISOString().split('T')[0];

  const taskStatusById = useMemo(() => {
    const statuses = new Map<string, PlannedTask['status']>();
    for (const task of plannedTasks) {
      statuses.set(task.id, task.status);
    }
    return statuses;
  }, [plannedTasks]);

  const { currentBlock, nextBlock } = useMemo(() => {
    if (!isTodayView) return { currentBlock: null, nextBlock: null };

    let current: ScheduleBlock | null = null;
    let next: ScheduleBlock | null = null;

    for (const block of scheduleBlocks) {
      if (block.kind !== 'focus') continue;
      if (block.linkedTaskId && taskStatusById.get(block.linkedTaskId) === 'done') continue;
      const start = block.startHour * 60 + block.startMin;
      const end = start + block.durationMins;
      if (!current && currentMinute >= start && currentMinute < end) {
        current = block;
      } else if (!next && start > currentMinute) {
        next = block;
      }
      if (current && next) break;
    }

    return { currentBlock: current, nextBlock: next };
  }, [currentMinute, isTodayView, scheduleBlocks, taskStatusById]);

  const currentTask = useMemo(() => {
    if (currentBlock?.linkedTaskId) {
      return plannedTasks.find((task) => task.id === currentBlock.linkedTaskId) || null;
    }
    return plannedTasks.find((task) => task.active) || null;
  }, [currentBlock, plannedTasks]);

  const dayTasks = useMemo(() => plannedTasks.filter((task) => (
    dailyPlan.committedTaskIds.includes(task.id) &&
    (task.status === 'committed' || task.status === 'scheduled' || task.status === 'done') &&
    (!task.parentId || !dailyPlan.committedTaskIds.includes(task.parentId))
  )), [dailyPlan.committedTaskIds, plannedTasks]);

  const committedTasks = useMemo(() => plannedTasks.filter((task) => (
    task.status === 'committed' &&
    dailyPlan.committedTaskIds.includes(task.id) &&
    (!task.parentId || !dailyPlan.committedTaskIds.includes(task.parentId))
  )), [dailyPlan.committedTaskIds, plannedTasks]);

  const archiveTasks = useMemo(() => (
    plannedTasks.filter((task) => ['done', 'migrated', 'cancelled'].includes(task.status))
  ), [plannedTasks]);

  const candidateItems = useMemo<InboxItem[]>(() => (
    plannedTasks
      .filter((task) => task.status === 'candidate')
      .map(asInboxItem)
  ), [plannedTasks]);

  return {
    currentBlock,
    nextBlock,
    currentTask,
    dayTasks,
    committedTasks,
    archiveTasks,
    candidateItems,
  };
}
