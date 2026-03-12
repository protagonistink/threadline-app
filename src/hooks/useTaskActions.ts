import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { DailyPlan, PlannedTask, ScheduleBlock, WeeklyGoal } from '@/types';
import { currentWeekStart, TODAY } from '@/lib/planner';

interface TaskActionsOptions {
  weeklyGoals: WeeklyGoal[];
  scheduleBlocks: ScheduleBlock[];
  setPlannedTasks: Dispatch<SetStateAction<PlannedTask[]>>;
  setScheduleBlocks: Dispatch<SetStateAction<ScheduleBlock[]>>;
  setDailyPlan: Dispatch<SetStateAction<DailyPlan>>;
  setSelectedInboxId: Dispatch<SetStateAction<string | null>>;
  setLastCommitTimestamp: Dispatch<SetStateAction<number>>;
}

export function useTaskActions({
  weeklyGoals,
  scheduleBlocks,
  setPlannedTasks,
  setScheduleBlocks,
  setDailyPlan,
  setSelectedInboxId,
  setLastCommitTimestamp,
}: TaskActionsOptions) {
  const removeLinkedScheduleBlock = useCallback(async (taskId: string) => {
    const linkedBlock = scheduleBlocks.find((block) => block.linkedTaskId === taskId);
    if (!linkedBlock) return;

    if (linkedBlock.eventId) {
      const result = await window.api.gcal.deleteEvent(linkedBlock.eventId, linkedBlock.calendarId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove linked calendar event');
      }
    }

    setScheduleBlocks((prev) => prev.filter((block) => block.id !== linkedBlock.id));
  }, [scheduleBlocks, setScheduleBlocks]);

  const migrateOldTasks = useCallback((): PlannedTask[] => {
    const weekStart = currentWeekStart();
    const stale: PlannedTask[] = [];

    setPlannedTasks((prev) => prev.map((task) => {
      if (
        (task.status === 'committed' || task.status === 'scheduled') &&
        task.lastCommittedDate &&
        task.lastCommittedDate < weekStart
      ) {
        stale.push(task);
        return { ...task, status: 'candidate' };
      }
      return task;
    }));

    setDailyPlan((prev) => ({
      ...prev,
      committedTaskIds: prev.committedTaskIds.filter((id) => !stale.some((task) => task.id === id)),
    }));

    return stale;
  }, [setDailyPlan, setPlannedTasks]);

  const dropTask = useCallback((taskId: string) => {
    setPlannedTasks((prev) =>
      prev.map((task) => task.id === taskId ? { ...task, status: 'cancelled' } : task)
    );
  }, [setPlannedTasks]);

  const nestTask = useCallback((childId: string, parentTaskId: string) => {
    setPlannedTasks((prev) => {
      const parent = prev.find((t) => t.id === parentTaskId);
      if (!parent) return prev;
      return prev.map((task) => {
        if (task.id === childId) {
          return {
            ...task,
            parentId: parentTaskId,
            weeklyGoalId: parent.weeklyGoalId,
            status: task.status === 'done' ? 'done' : 'committed',
            lastCommittedDate: TODAY,
          };
        }
        if (
          task.id === parentTaskId &&
          task.status !== 'committed' &&
          task.status !== 'scheduled' &&
          task.status !== 'done'
        ) {
          return { ...task, status: 'committed', lastCommittedDate: TODAY };
        }
        return task;
      });
    });

    setDailyPlan((prev) => {
      let ids = prev.committedTaskIds;
      if (!ids.includes(childId)) ids = [...ids, childId];
      if (!ids.includes(parentTaskId)) ids = [...ids, parentTaskId];
      return { ...prev, committedTaskIds: ids };
    });

    setSelectedInboxId(null);
    setLastCommitTimestamp(Date.now());
  }, [setDailyPlan, setLastCommitTimestamp, setPlannedTasks, setSelectedInboxId]);

  const unnestTask = useCallback((childId: string) => {
    setPlannedTasks((prev) =>
      prev.map((task) =>
        task.id === childId ? { ...task, parentId: undefined } : task
      )
    );
  }, [setPlannedTasks]);

  const bringForward = useCallback((taskId: string, goalId?: string) => {
    const targetGoal = goalId || weeklyGoals[0]?.id || null;

    setPlannedTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              weeklyGoalId: targetGoal,
              status: task.status === 'done' ? 'done' : 'committed',
              lastCommittedDate: TODAY,
            }
          : task
      )
    );

    setDailyPlan((prev) => ({
      ...prev,
      committedTaskIds: prev.committedTaskIds.includes(taskId)
        ? prev.committedTaskIds
        : [...prev.committedTaskIds, taskId],
    }));

    setSelectedInboxId(null);
    setLastCommitTimestamp(Date.now());
  }, [setDailyPlan, setLastCommitTimestamp, setPlannedTasks, setSelectedInboxId, weeklyGoals]);

  const addLocalTask = useCallback((title: string, goalId?: string) => {
    if (!title.trim()) return;

    const nextId = `local-${Date.now()}`;
    const targetGoal = goalId || weeklyGoals[0]?.id || null;
    const task: PlannedTask = {
      id: nextId,
      title: title.trim(),
      source: 'local',
      weeklyGoalId: targetGoal,
      status: 'committed',
      estimateMins: 45,
      active: false,
      lastCommittedDate: TODAY,
    };

    setPlannedTasks((prev) => [...prev, task]);
    setDailyPlan((prev) => ({ ...prev, committedTaskIds: [...prev.committedTaskIds, nextId] }));
  }, [setDailyPlan, setPlannedTasks, weeklyGoals]);

  const assignTaskToGoal = useCallback((taskId: string, goalId: string) => {
    setPlannedTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              weeklyGoalId: goalId,
              lastCommittedDate: TODAY,
            }
          : task
      )
    );
  }, [setPlannedTasks]);

  const moveForward = useCallback(async (taskId: string) => {
    await removeLinkedScheduleBlock(taskId);

    setPlannedTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return { ...task, status: 'migrated', active: false, scheduledEventId: undefined, scheduledCalendarId: undefined };
        }
        if (task.parentId === taskId) {
          return { ...task, parentId: undefined };
        }
        return task;
      })
    );

    setDailyPlan((prev) => ({
      ...prev,
      committedTaskIds: prev.committedTaskIds.filter((id) => id !== taskId),
    }));
  }, [removeLinkedScheduleBlock, setDailyPlan, setPlannedTasks]);

  const releaseTask = useCallback(async (taskId: string) => {
    await removeLinkedScheduleBlock(taskId);

    setPlannedTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return { ...task, status: 'cancelled', active: false, scheduledEventId: undefined, scheduledCalendarId: undefined };
        }
        if (task.parentId === taskId) {
          return { ...task, parentId: undefined };
        }
        return task;
      })
    );

    setDailyPlan((prev) => ({
      ...prev,
      committedTaskIds: prev.committedTaskIds.filter((id) => id !== taskId),
    }));
  }, [removeLinkedScheduleBlock, setDailyPlan, setPlannedTasks]);

  const toggleTask = useCallback(async (id: string) => {
    const linkedBlock = scheduleBlocks.find((block) => block.linkedTaskId === id);
    if (linkedBlock) {
      await removeLinkedScheduleBlock(id);
    }

    setPlannedTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const nextDone = task.status !== 'done';
        return {
          ...task,
          status: nextDone ? 'done' : 'committed',
          active: false,
        };
      })
    );
  }, [removeLinkedScheduleBlock, scheduleBlocks, setPlannedTasks]);

  const setActiveTask = useCallback((id: string) => {
    setPlannedTasks((prev) =>
      prev.map((task) => ({
        ...task,
        active: task.id === id,
      }))
    );
  }, [setPlannedTasks]);

  const updateTaskEstimate = useCallback((id: string, mins: number) => {
    setPlannedTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, estimateMins: Math.max(15, Math.min(480, mins)) } : t)
    );
  }, [setPlannedTasks]);

  return {
    migrateOldTasks,
    dropTask,
    nestTask,
    unnestTask,
    bringForward,
    addLocalTask,
    assignTaskToGoal,
    moveForward,
    releaseTask,
    toggleTask,
    setActiveTask,
    updateTaskEstimate,
  };
}
