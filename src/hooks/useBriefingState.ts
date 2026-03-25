// src/hooks/useBriefingState.ts
import { useState, useEffect, useRef, useCallback, type RefObject, type KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { usePlanner } from '@/context/AppContext';
import { useBriefingStream } from '@/hooks/useBriefingStream';
import { useInterviewFlow } from '@/hooks/useInterviewFlow';
import { useAttachments } from '@/hooks/useAttachments';
import { useProposalExecution } from '@/hooks/useProposalExecution';
import { detectInkMode } from '@/lib/ink-mode';
import { stripStructuredAssistantBlocks, buildBriefingContext } from '@/components/ink/morningBriefingUtils';
import type { CommitChip, ScheduleChip } from '@/components/ink/morningBriefingUtils';
import type { ChatMessage } from '@/types/electron';
import type { InkMode } from '@/types';
import type { Phase, BriefingVariant } from '@/types/briefing';

export interface BriefingStateValues {
  phase: Phase;
  messages: ChatMessage[];
  inputValue: string;
  attachments: NonNullable<ChatMessage['attachments']>;
  isDraggingFiles: boolean;
  setInputValue: (v: string) => void;
  commitChips: CommitChip[];
  scheduleChips: ScheduleChip[];
  committed: boolean;
  pendingRituals: string[];
  proposalDate: string;
  proposalLabel: string;
  resolvedInkMode: InkMode | null;
  promptInkMode: InkMode;
  streamingContent: string;
  visibleStreamingContent: string;
  isStreaming: boolean;
  error: string | null;
  isWelcomeScreen: boolean;
  isOverlay: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  viewDate: Date;
  addRitual: (title: string) => void;
  skipRitual: (index: number) => void;
}

export interface BriefingActions {
  handleStartDay: (intention: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  showCommitChips: () => void;
  executeCommit: () => void;
  executeSchedule: () => Promise<void>;
  toggleChip: (index: number) => void;
  toggleScheduleChip: (index: number) => void;
  openRevision: (seed?: string) => void;
  clearPersistedConversation: () => Promise<void>;
  addImageAttachments: (files: FileList | null) => Promise<void>;
  removeAttachment: (index: number) => void;
  setDraggingFiles: (dragging: boolean) => void;
}

export function useBriefingState({
  onClose,
  onStreamingChange,
  mode = 'briefing',
  variant = 'fullscreen',
}: {
  onClose: () => void;
  onStreamingChange?: (streaming: boolean) => void;
  mode?: 'briefing' | 'chat';
  variant?: BriefingVariant;
}): { state: BriefingStateValues; actions: BriefingActions } {
  const {
    weeklyGoals,
    replaceWeeklyGoals,
    markWeeklyPlanningComplete,
    candidateItems,
    committedTasks,
    dailyPlan,
    viewDate,
    setViewDate,
    bringForward,
    addLocalTask,
    addRitual,
    workdayStart,
    workdayEnd,
    scheduleBlocks,
    plannedTasks,
    monthlyPlan,
    scheduleTaskBlock,
    clearFocusBlocks,
  } = usePlanner();

  // --- Sub-hooks ---
  const interview = useInterviewFlow();
  const attach = useAttachments();
  const proposal = useProposalExecution(plannedTasks, candidateItems);

  // --- Local state ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [resolvedInkMode, setResolvedInkMode] = useState<InkMode | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedBriefingRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');

  const [todayStr, setTodayStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const shouldPersistHistory = mode === 'briefing' && variant === 'fullscreen';

  // Keep todayStr current if the date rolls over while the component is mounted
  useEffect(() => {
    const interval = setInterval(() => {
      const now = format(new Date(), 'yyyy-MM-dd');
      setTodayStr((prev) => (prev !== now ? now : prev));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    if (!shouldPersistHistory || messages.length === 0) return;
    void window.api.chat.save(todayStr, messages);
  }, [messages, todayStr, shouldPersistHistory]);

  useEffect(() => {
    void window.api.ink.readContext().then((ctx) => {
      setResolvedInkMode(detectInkMode(new Date(), ctx.weekUpdatedAt));
    });
  }, []);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'briefing' || phase === 'conversation') {
      proposal.actions.setProposalDate(format(viewDate, 'yyyy-MM-dd'));
    }
  }, [phase, viewDate, proposal.actions]);

  const promptInkMode: InkMode = phase === 'interview'
    ? 'sunday-interview'
    : (resolvedInkMode && resolvedInkMode !== 'sunday-interview' ? resolvedInkMode : detectInkMode());

  const doneTasks = plannedTasks.filter(
    (t) => t.status === 'done' && dailyPlan.committedTaskIds.includes(t.id)
  );

  const buildContext = useCallback(() => buildBriefingContext({
    weeklyGoals,
    committedTasks,
    doneTasks,
    workdayStart,
    workdayEnd,
    scheduleBlocks,
    planningDate: format(viewDate, 'yyyy-MM-dd'),
    monthlyPlan,
    inkMode: promptInkMode,
    interviewStep: interview.state.interviewStepRef.current ?? undefined,
    interviewAnswers: interview.state.interviewAnswersRef.current ?? undefined,
  }), [weeklyGoals, committedTasks, doneTasks, workdayStart, workdayEnd, scheduleBlocks, viewDate, monthlyPlan, promptInkMode, interview.state.interviewStepRef, interview.state.interviewAnswersRef]);

  const {
    streamingContent,
    isStreaming,
    error,
    streamMessage,
  } = useBriefingStream({
    buildContext,
    onAssistantMessage: (content) => {
      setMessages((prev) => [...prev, { role: 'assistant', content }]);

      if (phaseRef.current === 'interview') {
        interview.actions.handleInterviewMessage(
          content,
          replaceWeeklyGoals,
          markWeeklyPlanningComplete,
          setMessages,
          () => {
            setResolvedInkMode('morning');
            setMessages([]);
            setPhase('idle');
          },
        );
      }

      if (phaseRef.current === 'briefing' || phaseRef.current === 'conversation') {
        const found = proposal.actions.parseProposalFromMessage(
          content, plannedTasks, candidateItems, viewDate, setViewDate,
        );
        if (found) setPhase('committing');
      }

      proposal.actions.parseRitualsFromMessage(content);
    },
  });

  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Auto-start briefing or interview
  useEffect(() => {
    if (mode !== 'briefing' || resolvedInkMode === null) return;
    if (hasStartedBriefingRef.current) return;
    hasStartedBriefingRef.current = true;

    if (resolvedInkMode === 'sunday-interview') {
      setPhase('interview');
      interview.actions.resetInterview();
      const initialMsg: ChatMessage = { role: 'user', content: 'Start the weekly interview.' };
      setMessages([initialMsg]);
      void streamMessage([initialMsg]);
    }
  }, [streamMessage, mode, resolvedInkMode, interview.actions]);

  // --- Actions ---

  const handleStartDay = useCallback((intention: string) => {
    if (isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: intention };
    const newMessages = [userMsg];
    setMessages(newMessages);
    setPhase('briefing');
    void streamMessage(newMessages);
  }, [isStreaming, streamMessage]);

  const startConversation = useCallback((prompt: string, nextAttachments: NonNullable<ChatMessage['attachments']> = []) => {
    if ((!prompt.trim() && nextAttachments.length === 0) || isStreaming) return;
    const nextPhase = phase === 'interview'
      ? 'interview'
      : prompt === 'Run my morning briefing.'
        ? 'briefing'
        : 'conversation';
    const userMsg: ChatMessage = {
      role: 'user',
      content: prompt.trim(),
      attachments: nextAttachments.length > 0 ? nextAttachments : undefined,
    };
    const newMessages = [...messages, userMsg];
    if (phase === 'interview') {
      interview.actions.advanceInterview(prompt.trim());
    }
    setMessages(newMessages);
    setPhase(nextPhase);
    void streamMessage(newMessages);
  }, [isStreaming, messages, phase, streamMessage, interview.actions]);

  const openRevision = useCallback((seed = '') => {
    setPhase('conversation');
    proposal.actions.clearProposal();
    if (seed) setInputValue(seed);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (seed) {
        const length = seed.length;
        inputRef.current?.setSelectionRange(length, length);
      }
    });
  }, [proposal.actions]);

  const clearPersistedConversation = useCallback(async () => {
    setMessages([]);
    proposal.actions.clearProposal();
    setInputValue('');
    attach.actions.clearAttachments();
    setPhase('idle');
    interview.actions.resetInterview();
    await window.api.chat.clear(todayStr);
  }, [todayStr, proposal.actions, attach.actions, interview.actions]);

  const sendMessage = useCallback(() => {
    if ((!inputValue.trim() && attach.state.attachments.length === 0) || isStreaming) return;
    const prompt = inputValue.trim();
    setInputValue('');
    const nextAttachments = attach.actions.consumeAttachments();
    if (phase === 'committing') {
      proposal.actions.clearProposal();
    }
    startConversation(prompt, nextAttachments);
  }, [attach.state.attachments.length, attach.actions, inputValue, isStreaming, phase, proposal.actions, startConversation]);

  const handleShowCommitChips = useCallback(() => {
    proposal.actions.showCommitChips(messages, viewDate);
    setPhase('committing');
  }, [messages, viewDate, proposal.actions]);

  const handleExecuteCommit = useCallback(() => {
    proposal.actions.executeCommit({
      dailyPlan, bringForward, addLocalTask, setViewDate, onClose,
    });
  }, [proposal.actions, dailyPlan, bringForward, addLocalTask, setViewDate, onClose]);

  const handleExecuteSchedule = useCallback(async () => {
    await proposal.actions.executeSchedule({
      addLocalTask, scheduleTaskBlock, clearFocusBlocks, setViewDate, onClose,
    });
  }, [proposal.actions, addLocalTask, scheduleTaskBlock, clearFocusBlocks, setViewDate, onClose]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isWelcomeScreen = phase === 'idle' && !isStreaming && !streamingContent;
  const isOverlay = variant === 'overlay';
  const visibleStreamingContent = stripStructuredAssistantBlocks(streamingContent);

  return {
    state: {
      phase,
      messages,
      inputValue,
      attachments: attach.state.attachments,
      isDraggingFiles: attach.state.isDraggingFiles,
      setInputValue,
      commitChips: proposal.state.commitChips,
      scheduleChips: proposal.state.scheduleChips,
      committed: proposal.state.committed,
      pendingRituals: proposal.state.pendingRituals,
      proposalDate: proposal.state.proposalDate,
      proposalLabel: proposal.state.proposalLabel,
      resolvedInkMode,
      promptInkMode,
      streamingContent,
      visibleStreamingContent,
      isStreaming,
      error,
      isWelcomeScreen,
      isOverlay,
      messagesEndRef,
      inputRef,
      fileInputRef: attach.state.fileInputRef,
      viewDate,
      addRitual,
      skipRitual: proposal.actions.skipRitual,
    },
    actions: {
      handleStartDay,
      sendMessage,
      handleKeyDown,
      showCommitChips: handleShowCommitChips,
      executeCommit: handleExecuteCommit,
      executeSchedule: handleExecuteSchedule,
      toggleChip: proposal.actions.toggleChip,
      toggleScheduleChip: proposal.actions.toggleScheduleChip,
      openRevision,
      clearPersistedConversation,
      addImageAttachments: attach.actions.addImageAttachments,
      removeAttachment: attach.actions.removeAttachment,
      setDraggingFiles: attach.actions.setDraggingFiles,
    },
  };
}
