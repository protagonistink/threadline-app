import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { inferPlanningDateFromContent, parseCommitChips, parseRitualSuggestions, parseScheduleProposal, type CommitChip, type ScheduleChip } from '@/components/ink/morningBriefingUtils';
import type { ChatMessage } from '@/types/electron';
import type { PlannedTask, DailyPlan, InboxItem } from '@/types';

export interface ProposalState {
  commitChips: CommitChip[];
  scheduleChips: ScheduleChip[];
  committed: boolean;
  pendingRituals: string[];
  proposalDate: string;
  proposalLabel: string;
}

export interface ProposalActions {
  showCommitChips: (messages: ChatMessage[], viewDate: Date) => void;
  executeCommit: (params: {
    dailyPlan: DailyPlan;
    bringForward: (taskId: string, goalId?: string, date?: string) => void;
    addLocalTask: (title: string, goalId?: string, date?: string) => string;
    setViewDate: (d: Date) => void;
    onClose: () => void;
  }) => void;
  executeSchedule: (params: {
    addLocalTask: (title: string, goalId?: string, date?: string) => string;
    scheduleTaskBlock: (taskId: string, startHour: number, startMin: number, durationMins: number, title?: string, date?: string) => Promise<void>;
    clearFocusBlocks: () => Promise<void>;
    setViewDate: (d: Date) => void;
    onClose: () => void;
  }) => Promise<void>;
  toggleChip: (index: number) => void;
  toggleScheduleChip: (index: number) => void;
  /** Parse an assistant message for schedule/commit proposals. Returns true if proposals were found. */
  parseProposalFromMessage: (
    content: string,
    plannedTasks: PlannedTask[],
    candidateItems: InboxItem[],
    viewDate: Date,
    setViewDate: (d: Date) => void,
  ) => boolean;
  parseRitualsFromMessage: (content: string) => void;
  skipRitual: (index: number) => void;
  clearProposal: () => void;
  setProposalDate: (date: string) => void;
}

export function useProposalExecution(
  plannedTasks: PlannedTask[],
  candidateItems: InboxItem[],
): { state: ProposalState; actions: ProposalActions } {
  const [commitChips, setCommitChips] = useState<CommitChip[]>([]);
  const [scheduleChips, setScheduleChips] = useState<ScheduleChip[]>([]);
  const [committed, setCommitted] = useState(false);
  const [pendingRituals, setPendingRituals] = useState<string[]>([]);
  const [proposalDate, setProposalDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const proposalLabel = proposalDate === format(new Date(), 'yyyy-MM-dd')
    ? 'today'
    : format(parseISO(proposalDate), 'EEEE').toLowerCase();

  const parseProposalFromMessage = useCallback((
    content: string,
    tasks: PlannedTask[],
    candidates: InboxItem[],
    viewDate: Date,
    setViewDate: (d: Date) => void,
  ): boolean => {
    const chips = parseScheduleProposal(content, tasks, candidates);
    if (chips.length === 0) return false;

    const currentViewDateKey = format(viewDate, 'yyyy-MM-dd');
    const inferredDate = inferPlanningDateFromContent(content, currentViewDateKey);
    setProposalDate(inferredDate);
    if (inferredDate !== currentViewDateKey) {
      setViewDate(new Date(`${inferredDate}T12:00:00`));
    }
    setScheduleChips(chips);
    return true;
  }, []);

  const parseRitualsFromMessage = useCallback((content: string) => {
    const rituals = parseRitualSuggestions(content);
    if (rituals.length > 0) {
      setPendingRituals(rituals);
    }
  }, []);

  const showCommitChips = useCallback((messages: ChatMessage[], viewDate: Date) => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    const chips = parseCommitChips(lastAssistant.content, plannedTasks, candidateItems);
    if (chips.length > 0) {
      const currentViewDateKey = format(viewDate, 'yyyy-MM-dd');
      const inferredDate = inferPlanningDateFromContent(lastAssistant.content, currentViewDateKey);
      setProposalDate(inferredDate);
      setScheduleChips([]);
      setCommitChips(chips);
    }
  }, [plannedTasks, candidateItems]);

  const executeCommit = useCallback((params: {
    dailyPlan: DailyPlan;
    bringForward: (taskId: string, goalId?: string, date?: string) => void;
    addLocalTask: (title: string, goalId?: string, date?: string) => string;
    setViewDate: (d: Date) => void;
    onClose: () => void;
  }) => {
    const toCommit = commitChips.filter((chip) => chip.selected);
    params.setViewDate(new Date(`${proposalDate}T12:00:00`));
    toCommit.forEach((chip) => {
      if (chip.matchedTaskId) {
        if (!params.dailyPlan.committedTaskIds.includes(chip.matchedTaskId)) {
          params.bringForward(chip.matchedTaskId, chip.matchedGoalId || undefined, proposalDate);
        }
      } else {
        params.addLocalTask(chip.title, chip.matchedGoalId || undefined, proposalDate);
      }
    });
    setCommitted(true);
    window.setTimeout(() => { params.onClose(); }, 1500);
  }, [commitChips, proposalDate]);

  const executeSchedule = useCallback(async (params: {
    addLocalTask: (title: string, goalId?: string, date?: string) => string;
    scheduleTaskBlock: (taskId: string, startHour: number, startMin: number, durationMins: number, title?: string, date?: string) => Promise<void>;
    clearFocusBlocks: () => Promise<void>;
    setViewDate: (d: Date) => void;
    onClose: () => void;
  }) => {
    const toSchedule = scheduleChips.filter((chip) => chip.selected);
    params.setViewDate(new Date(`${proposalDate}T12:00:00`));
    await params.clearFocusBlocks();
    for (const chip of toSchedule) {
      const taskId = chip.matchedTaskId || params.addLocalTask(chip.title, chip.matchedGoalId || undefined, proposalDate);
      await params.scheduleTaskBlock(taskId, chip.startHour, chip.startMin, chip.durationMins, chip.title, proposalDate);
    }
    setCommitted(true);
    window.setTimeout(() => { params.onClose(); }, 1500);
  }, [proposalDate, scheduleChips]);

  const toggleChip = useCallback((index: number) => {
    setCommitChips((prev) => prev.map((chip, i) => (i === index ? { ...chip, selected: !chip.selected } : chip)));
  }, []);

  const toggleScheduleChip = useCallback((index: number) => {
    setScheduleChips((prev) => prev.map((chip, i) => (i === index ? { ...chip, selected: !chip.selected } : chip)));
  }, []);

  const skipRitual = useCallback((index: number) => {
    setPendingRituals((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const clearProposal = useCallback(() => {
    setCommitChips([]);
    setScheduleChips([]);
    setPendingRituals([]);
    setCommitted(false);
  }, []);

  return {
    state: { commitChips, scheduleChips, committed, pendingRituals, proposalDate, proposalLabel },
    actions: {
      showCommitChips,
      executeCommit,
      executeSchedule,
      toggleChip,
      toggleScheduleChip,
      parseProposalFromMessage,
      parseRitualsFromMessage,
      skipRitual,
      clearProposal,
      setProposalDate,
    },
  };
}
