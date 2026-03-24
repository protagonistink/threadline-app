import type { EngineState, Obligation } from '../../engine/types';

export interface FinanceActionItem {
  id: string;
  description: string;
  status: string;
  dueDate: string | null;
  amount: number | null;
  createdAt: string;
  completedAt: string | null;
}

export function formatMoneyCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getNextObligations(state: EngineState, limit = 3) {
  return state.obligations
    .filter((o) => o.daysUntilDue >= 0 && o.daysUntilDue <= 14)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, limit);
}

export function getNextWeekObligations(state: EngineState, limit = 4): Obligation[] {
  return state.obligations
    .filter((o) => o.daysUntilDue >= 0 && o.daysUntilDue <= 7)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, limit);
}

export function getNextWeekTotal(obligations: Obligation[]): number {
  return obligations.reduce((sum, obligation) => sum + obligation.amount, 0);
}

export function buildYnabPositionLine(obligations: Obligation[]): string {
  const nextObligation = obligations[0];
  const nextWeekTotal = getNextWeekTotal(obligations);

  if (!nextObligation) {
    return 'Nothing is scheduled in the next 7 days.';
  }

  const dueLabel =
    nextObligation.daysUntilDue === 0
      ? 'comes out today'
      : nextObligation.daysUntilDue === 1
      ? 'comes out tomorrow'
      : `comes out in ${nextObligation.daysUntilDue} days`;

  if (nextWeekTotal <= 75) {
    return `Nothing heavy is coming up this week. ${nextObligation.name} ${dueLabel}.`;
  }

  if (nextWeekTotal <= 250) {
    return `${formatMoneyCurrency(nextWeekTotal)} is coming up this week. ${nextObligation.name} ${dueLabel}.`;
  }

  return `This week has some weight to it. ${nextObligation.name} ${dueLabel}.`;
}

export function buildYnabDailyCall(obligations: Obligation[]): string {
  const nextObligation = obligations[0];

  if (!nextObligation) {
    return 'No money action needed today.';
  }

  if (nextObligation.daysUntilDue === 0) {
    return `Review ${nextObligation.name} today and make sure the category is ready.`;
  }

  if (nextObligation.daysUntilDue === 1) {
    return `Check ${nextObligation.name} now so tomorrow does not sneak up on you.`;
  }

  return 'Stay with the next scheduled item, not the whole month.';
}

export function shouldShowYnabWorkTieIn(obligations: Obligation[]): boolean {
  return getNextWeekTotal(obligations) >= 250;
}

export function buildDailyCall(state: EngineState, actionItems: FinanceActionItem[]): string {
  const overdueAction = actionItems.find(
    (item) => item.status === 'pending' && item.dueDate && new Date(item.dueDate) < new Date()
  );
  if (overdueAction) return overdueAction.description;

  const urgentRecommendation = state.recommendations[0];
  if (urgentRecommendation) {
    return `${urgentRecommendation.actionVerb} ${urgentRecommendation.target}${
      urgentRecommendation.amount > 0 ? ` for ${formatMoneyCurrency(urgentRecommendation.amount)}` : ''
    }`;
  }

  if (state.cognitiveState === 'compressed') {
    return 'Hold discretionary spending until the next obligation is covered.';
  }

  return 'No money action needed today.';
}

export function buildPositionLine(
  state: EngineState,
  nextObligation: EngineState['obligations'][number] | undefined
): string {
  if (state.cognitiveState === 'compressed') {
    return nextObligation
      ? `Cash is tight. ${nextObligation.name} is the next pressure point.`
      : 'Cash is tight. Keep today lean.';
  }

  if (state.cognitiveState === 'alert') {
    return nextObligation
      ? `Position is watchful. ${nextObligation.name} is the next pressure point.`
      : 'Position is watchful. Keep an eye on the next 7 days.';
  }

  return nextObligation
    ? `Position is fine. Next pressure point is ${
        nextObligation.daysUntilDue <= 1 ? 'tomorrow' : `in ${nextObligation.daysUntilDue} days`
      }.`
    : 'Position is fine. Nothing immediate is pressing.';
}

export function buildWorkTieIn(state: EngineState): string | null {
  const invoicedRevenue = state.revenue
    .filter((entry) => entry.confidence === 'invoiced')
    .sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime())[0];

  if (state.cognitiveState === 'compressed' && invoicedRevenue) {
    return `Cash is thin relative to the next week. Prioritize follow-up on ${
      invoicedRevenue.description || 'the outstanding invoice'
    }.`;
  }

  if (state.cognitiveState === 'compressed') {
    return 'Money pressure is real today. Protect the work most likely to move cash or remove near-term risk.';
  }

  if (state.cognitiveState === 'alert' && invoicedRevenue) {
    return `Stay on the revenue path today. ${
      invoicedRevenue.description || 'An invoiced payment'
    } is still part of the picture.`;
  }

  return null;
}
