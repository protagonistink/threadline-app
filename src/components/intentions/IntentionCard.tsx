import { cn } from '@/lib/utils';
import { usePlanner } from '@/context/AppContext';
import { resolveGoalColor } from '@/lib/goalColors';
import { InlineText } from '@/components/InlineText';
import type { WeeklyGoal } from '@/types';
import type { GoalAttention } from '@/hooks/useWeeklyMode';
import { formatActivityLine } from '@/hooks/useWeeklyMode';

const ENERGY_LABELS: Record<string, string> = {
  warm: 'Active',
  steady: 'Steady',
  quiet: 'Quiet',
};

interface IntentionCardProps {
  goal: WeeklyGoal;
  attention: GoalAttention;
  index: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export function IntentionCard({
  goal,
  attention,
  index,
  isHovered,
  isAnyHovered,
  onHoverStart,
  onHoverEnd,
}: IntentionCardProps) {
  const { renameWeeklyGoal, updateGoalWhy, plannedTasks } = usePlanner();
  const rgb = resolveGoalColor(goal.color, index);

  // Tasks linked to this goal (active only)
  const linkedTasks = plannedTasks.filter(
    (t) =>
      t.weeklyGoalId === goal.id &&
      t.status !== 'cancelled' &&
      t.status !== 'migrated'
  );
  const taskCount = linkedTasks.length;
  const doneCount = linkedTasks.filter((t) => t.status === 'done').length;
  const progressPct = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

  // Top 3 active task titles for preview
  const previewTasks = linkedTasks
    .filter((t) => t.status !== 'done')
    .slice(0, 3);

  return (
    <div
      className={cn(
        'group flex gap-6 lg:gap-8 transition-all duration-500 ease-out cursor-default',
        isAnyHovered && !isHovered && 'opacity-20 blur-[2px] scale-[0.98]',
        isAnyHovered && isHovered && 'opacity-100 scale-100'
      )}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Color bar */}
      <div
        className={cn(
          'w-[3px] rounded-full shrink-0 transition-all duration-500',
          isHovered ? 'shadow-[0_0_15px_var(--bar-glow)]' : ''
        )}
        style={{
          backgroundColor: isHovered ? rgb : `color-mix(in srgb, ${rgb} 60%, transparent)`,
          '--bar-glow': `color-mix(in srgb, ${rgb} 50%, transparent)`,
        } as React.CSSProperties}
      />

      <div className="flex-1 flex flex-col sm:flex-row justify-between gap-6 lg:gap-12">
        <div className="flex-1">
          {/* Title + Energy badge */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <InlineText
              value={goal.title}
              onSave={(next) => renameWeeklyGoal(goal.id, next)}
              placeholder="Intention title"
              className={cn(
                'font-sans text-2xl font-medium tracking-tight transition-colors duration-500 block flex-1',
                isHovered ? 'text-text-emphasis' : 'text-text-primary'
              )}
            />
            {/* Energy badge */}
            <div className="flex items-center gap-1.5 shrink-0 mt-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${rgb} 60%, transparent)` }}
              />
              <span className="font-mono text-[8px] uppercase tracking-widest text-text-muted">
                {ENERGY_LABELS[attention.energyLevel] ?? 'Quiet'}
              </span>
            </div>
          </div>

          {/* Why */}
          <InlineText
            value={goal.why || ''}
            onSave={(next) => updateGoalWhy(goal.id, next)}
            placeholder="Why this holds."
            multiline
            className="font-sans text-sm text-text-secondary leading-relaxed max-w-md block"
          />

          {/* Task preview */}
          {previewTasks.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {previewTasks.map((t) => (
                <span
                  key={t.id}
                  className="font-mono text-[11px] text-text-muted truncate max-w-sm"
                >
                  → {t.title}
                </span>
              ))}
            </div>
          )}

          {/* Activity nudge */}
          {attention.tasksThisWeek > 0 && (
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              <span
                className={cn(
                  'italic',
                  attention.nudgeUrgent ? 'text-accent-warm' : 'text-text-secondary'
                )}
              >
                {attention.nudgeLine}
              </span>
              <span className="text-text-muted">&middot;</span>
              <span className="font-mono text-text-secondary">
                {formatActivityLine(attention)}
              </span>
            </div>
          )}
        </div>

        {/* Task progress */}
        <div className="flex sm:flex-col gap-8 sm:gap-4 sm:text-right shrink-0 pt-2">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-text-secondary mb-1">
              {doneCount > 0 ? 'Progress' : 'Tasks'}
            </div>
            <div className="font-mono text-sm text-text-primary">
              {doneCount > 0 ? `${doneCount}/${taskCount}` : taskCount}
            </div>
            {/* Progress bar */}
            {taskCount > 0 && (
              <div className="mt-1.5 w-16 h-[3px] rounded-full bg-border overflow-hidden sm:ml-auto">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: rgb,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
