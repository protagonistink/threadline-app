import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { MonthlyPlan } from '@/types';

interface MonthlyPlanningOptions {
  initialMonthlyPlan: MonthlyPlan | null;
  /** Pre-computed at load time in AppContext.loadState() — avoids async store reads in effects. */
  initialPromptState?: boolean;
}

interface MonthlyPlanningResult {
  monthlyPlan: MonthlyPlan | null;
  monthlyPlanPrompt: boolean;
  setMonthlyPlan: (plan: MonthlyPlan) => void;
  dismissMonthlyPlanPrompt: () => void;
}

export function useMonthlyPlanning({
  initialMonthlyPlan,
  initialPromptState,
}: MonthlyPlanningOptions): MonthlyPlanningResult {
  const [monthlyPlan, setMonthlyPlanState] = useState<MonthlyPlan | null>(initialMonthlyPlan);
  const [monthlyPlanPrompt, setMonthlyPlanPrompt] = useState(false);

  useEffect(() => {
    setMonthlyPlanState(initialMonthlyPlan);
  }, [initialMonthlyPlan]);

  // Apply the prompt flag once it's computed by AppContext.loadState().
  // All the logic (plan check + dismissed check) runs there with full store access,
  // so there's no async race condition here.
  useEffect(() => {
    if (initialPromptState !== undefined) {
      setMonthlyPlanPrompt(initialPromptState);
    }
  }, [initialPromptState]);

  const setMonthlyPlan = useCallback((plan: MonthlyPlan) => {
    const planWithTimestamp: MonthlyPlan = { ...plan, completedAt: new Date().toISOString() };
    setMonthlyPlanState(planWithTimestamp);
    setMonthlyPlanPrompt(false);
  }, []);

  const dismissMonthlyPlanPrompt = useCallback(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    void window.api.store.set('monthlyPlanDismissedDate', currentMonth);
    setMonthlyPlanPrompt(false);
  }, []);

  return {
    monthlyPlan,
    monthlyPlanPrompt,
    setMonthlyPlan,
    dismissMonthlyPlanPrompt,
  };
}
