import { useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { cn } from '@/lib/utils';

interface FocusViewProps {
  taskId: string;
  onExit: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatMinsLeft(minsLeft: number): string {
  if (minsLeft <= 1) return 'less than a minute left in this block';
  return `${minsLeft} minute${minsLeft === 1 ? '' : 's'} left in this block`;
}

export function FocusView({ taskId, onExit }: FocusViewProps) {
  const { plannedTasks, weeklyGoals, scheduleBlocks, toggleTask } = useApp();

  const task = useMemo(
    () => plannedTasks.find((t) => t.id === taskId) ?? null,
    [plannedTasks, taskId]
  );

  const linkedGoal = useMemo(() => {
    if (!task?.weeklyGoalId) return null;
    return weeklyGoals.find((g) => g.id === task.weeklyGoalId) ?? null;
  }, [task, weeklyGoals]);

  const timeInfo = useMemo(() => {
    const now = new Date();
    const timeStr = formatTime(now);

    const block = scheduleBlocks.find((b) => b.linkedTaskId === taskId);
    if (!block) return { timeStr, minsLeft: null };

    const blockEndMins = block.startHour * 60 + block.startMin + block.durationMins;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const minsLeft = Math.max(0, blockEndMins - nowMins);

    return { timeStr, minsLeft };
  }, [scheduleBlocks, taskId]);

  // ESC key exits focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onExit();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  async function handleDone() {
    await toggleTask(taskId);
    onExit();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg">
      {/* Center stage */}
      <div className="flex flex-col items-center gap-8 max-w-xl w-full px-8 text-center">

        {/* Task title — the hero */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-3xl text-text-emphasis leading-tight">
            {task?.title ?? 'Focus'}
          </h1>

          {/* Intention badge */}
          {linkedGoal && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1',
                'text-[11px] uppercase tracking-[0.16em] font-medium',
                'border border-border-subtle'
              )}
              style={{
                color: linkedGoal.color,
                borderColor: `${linkedGoal.color}40`,
                backgroundColor: `${linkedGoal.color}18`,
              }}
            >
              {linkedGoal.title}
            </span>
          )}
        </div>

        {/* Pomodoro timer — prominent, centered */}
        <div className="scale-125 origin-center">
          <PomodoroTimer />
        </div>

        {/* Time-of-day awareness */}
        <div className="text-[13px] text-text-muted tabular-nums">
          {timeInfo.timeStr}
          {timeInfo.minsLeft !== null && (
            <span className="text-text-muted/60 ml-1">
              — {formatMinsLeft(timeInfo.minsLeft)}
            </span>
          )}
        </div>

        {/* I'm done button */}
        <button
          onClick={() => void handleDone()}
          className={cn(
            'rounded-full px-6 py-2.5',
            'text-[13px] uppercase tracking-[0.16em] font-medium',
            'bg-accent-warm/20 text-accent-warm',
            'border border-accent-warm/30',
            'hover:bg-accent-warm/30 transition-colors'
          )}
        >
          I&apos;m done
        </button>
      </div>

      {/* ESC hint */}
      <p className="absolute bottom-8 text-[11px] uppercase tracking-[0.18em] text-text-muted/40 select-none">
        Press ESC to exit focus
      </p>
    </div>
  );
}
