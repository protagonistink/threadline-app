/**
 * Pure utility functions for the RightRail.
 * No React dependencies — fully testable.
 */

export interface FocusCapacityResult {
  hoursRemaining: number;
  scheduledHours: number;
  totalHours: number;
  occupancyRatio: number;
  label: string;
}

export function computeFocusCapacity(params: {
  workdayStartHour: number;
  workdayEndHour: number;
  scheduledMinutes: number;
  currentHour: number;
}): FocusCapacityResult {
  const { workdayStartHour, workdayEndHour, scheduledMinutes, currentHour } = params;

  const totalWorkdayHours = workdayEndHour - workdayStartHour;
  const hoursFromNow = workdayEndHour - currentHour;
  const effectiveHours = Math.min(hoursFromNow, totalWorkdayHours) - scheduledMinutes / 60;
  const hoursRemaining = Math.max(0, effectiveHours);
  const scheduledHours = Math.max(0, scheduledMinutes / 60);
  const occupancyRatio = totalWorkdayHours > 0
    ? Math.min(1, scheduledHours / totalWorkdayHours)
    : 0;

  // Round to nearest half-hour for the label
  const roundedHalf = Math.round(hoursRemaining * 2) / 2;

  let label: string;
  if (roundedHalf <= 0) {
    label = 'Your day is fully booked';
  } else if (hoursFromNow <= 2) {
    const display = roundedHalf === 1 ? '1 hour' : `${roundedHalf} hours`;
    label = `About ${display} left — use them well`;
  } else {
    const display = roundedHalf === 1 ? '1 hour' : `${roundedHalf} hours`;
    label = `You have about ${display} of deep work today`;
  }

  return { hoursRemaining, scheduledHours, totalHours: totalWorkdayHours, occupancyRatio, label };
}

export interface BalanceAwarenessResult {
  neglected: string[];
  message: string | null;
}

export function computeBalanceAwareness(params: {
  intentions: Array<{ id: string; title: string; tasksCompletedToday: number }>;
}): BalanceAwarenessResult {
  const { intentions } = params;

  if (intentions.length === 0) {
    return { neglected: [], message: null };
  }

  const completedCounts = intentions.map((i) => i.tasksCompletedToday);
  const maxCompleted = Math.max(...completedCounts);

  // If nobody has completed anything, no imbalance to report
  if (maxCompleted === 0) {
    return { neglected: [], message: null };
  }

  const neglected = intentions
    .filter((i) => i.tasksCompletedToday === 0)
    .map((i) => i.title);

  if (neglected.length === 0) {
    return { neglected: [], message: null };
  }

  const active = intentions
    .filter((i) => i.tasksCompletedToday > 0)
    .map((i) => i.title);

  let message: string;
  if (active.length === 1) {
    const neglectedList = neglected.join(' and ');
    message = `${active[0]} is getting love today. ${neglectedList} hasn't moved yet.`;
  } else {
    const neglectedList = neglected.join(' and ');
    message = `${neglectedList} hasn't moved yet today.`;
  }

  return { neglected, message };
}
