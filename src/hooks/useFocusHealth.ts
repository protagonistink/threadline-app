import { useMemo } from 'react';
import { usePlanner } from '@/context/AppContext';
import { useAttentionBalance } from '@/hooks/useWeeklyMode';

/**
 * Computes a 0–1 focus health score used to drive The Bleed gradient.
 *
 * - 1.0 = all tasks mapped to intentions, intentions are active
 * - 0.0 = many untagged tasks, intentions are stale
 *
 * Also exports `distractionCount` so DistractionTax doesn't need to recompute.
 */
export function useFocusHealth() {
  const { plannedTasks } = usePlanner();
  const attentionData = useAttentionBalance();

  return useMemo(() => {
    // Active tasks = not cancelled, migrated, or done
    const activeTasks = plannedTasks.filter(
      (t) =>
        t.status !== 'cancelled' &&
        t.status !== 'migrated' &&
        t.status !== 'done'
    );

    const totalActive = activeTasks.length;
    const taggedCount = activeTasks.filter((t) => t.weeklyGoalId).length;
    const distractionCount = totalActive - taggedCount;

    // Tag ratio: what fraction of active tasks are mapped to an intention
    const tagRatio = totalActive > 0 ? taggedCount / totalActive : 1;

    // Energy weight: how active are the intentions themselves
    const energyScores: Record<string, number> = {
      warm: 1.0,
      steady: 0.7,
      quiet: 0.3,
    };
    const totalEnergy = attentionData.reduce(
      (sum, a) => sum + (energyScores[a.energyLevel] ?? 0.3),
      0
    );
    const maxEnergy = attentionData.length || 1;
    const energyWeight = totalEnergy / maxEnergy;

    // Blend: 70% tag ratio, 30% energy
    const focusHealth = tagRatio * 0.7 + energyWeight * 0.3;

    return { focusHealth, distractionCount, totalActive };
  }, [plannedTasks, attentionData]);
}
