import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/types/electron';

interface InterviewContextPayload {
  weeklyContext?: string;
  hierarchy?: string;
  musts?: string;
  currentPriority?: string;
  protectedBlocks?: string;
  tells?: string;
  honestAudit?: string;
  weeklyGoals?: Array<{ title: string; why?: string }>;
}

function extractInterviewContext(content: string): InterviewContextPayload | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (typeof parsed !== 'object' || !parsed) return null;
    const fields = ['weeklyContext', 'hierarchy', 'musts', 'currentPriority', 'protectedBlocks', 'tells', 'honestAudit'] as const;
    const result: InterviewContextPayload = {};
    for (const key of fields) {
      if (parsed[key]) result[key] = String(parsed[key]);
    }
    if (Array.isArray(parsed.weeklyGoals)) {
      const goals = parsed.weeklyGoals
        .map((goal: unknown) => {
          if (!goal || typeof goal !== 'object') return null;
          const title = 'title' in goal ? String(goal.title ?? '').trim() : '';
          const why = 'why' in goal && goal.why != null ? String(goal.why).trim() : undefined;
          return title ? { title, why } : null;
        })
        .filter((goal: { title: string; why?: string } | null): goal is { title: string; why?: string } => goal !== null);
      if (goals.length > 0) result.weeklyGoals = goals;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export interface InterviewFlowState {
  interviewStepRef: React.RefObject<number>;
  interviewAnswersRef: React.RefObject<string[]>;
}

export interface InterviewFlowActions {
  advanceInterview: (answer: string) => void;
  resetInterview: () => void;
  /** Process an assistant message during interview phase. Returns true if interview completed. */
  handleInterviewMessage: (
    content: string,
    replaceWeeklyGoals: (goals: Array<{ title: string; why?: string }>) => void,
    markWeeklyPlanningComplete: () => void,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    onComplete: () => void,
  ) => boolean;
}

export function useInterviewFlow(): { state: InterviewFlowState; actions: InterviewFlowActions } {
  const [interviewStep, setInterviewStep] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>([]);

  const interviewStepRef = useRef(0);
  const interviewAnswersRef = useRef<string[]>([]);

  useEffect(() => { interviewStepRef.current = interviewStep; }, [interviewStep]);
  useEffect(() => { interviewAnswersRef.current = interviewAnswers; }, [interviewAnswers]);

  const advanceInterview = useCallback((answer: string) => {
    const nextAnswers = [...interviewAnswersRef.current, answer];
    const nextStep = nextAnswers.length;
    interviewAnswersRef.current = nextAnswers;
    interviewStepRef.current = nextStep;
    setInterviewAnswers(nextAnswers);
    setInterviewStep(nextStep);
  }, []);

  const resetInterview = useCallback(() => {
    interviewStepRef.current = 0;
    interviewAnswersRef.current = [];
    setInterviewStep(0);
    setInterviewAnswers([]);
  }, []);

  const handleInterviewMessage = useCallback((
    content: string,
    replaceWeeklyGoals: (goals: Array<{ title: string; why?: string }>) => void,
    markWeeklyPlanningComplete: () => void,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    onComplete: () => void,
  ): boolean => {
    const contextJson = extractInterviewContext(content);
    if (!contextJson) return false;

    const { weeklyGoals: nextWeeklyGoals = [], ...inkContextPatch } = contextJson;
    void window.api.ink.writeContext({
      ...inkContextPatch,
      weekUpdatedAt: new Date().toISOString(),
    }).then(() => {
      if (nextWeeklyGoals.length > 0) {
        replaceWeeklyGoals(nextWeeklyGoals);
      }
      markWeeklyPlanningComplete();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Weekly context saved. I've got what I need — see you in the morning." },
      ]);
      setTimeout(() => {
        resetInterview();
        onComplete();
      }, 2500);
    });
    return true;
  }, [resetInterview]);

  return {
    state: { interviewStepRef, interviewAnswersRef },
    actions: { advanceInterview, resetInterview, handleInterviewMessage },
  };
}
