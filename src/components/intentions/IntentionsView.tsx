import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import {
  useAttentionBalance,
  formatActivityLine,
  type GoalAttention,
} from '@/hooks/useWeeklyMode';
import { useFinance } from '@/hooks/useFinance';
import type { WeeklyGoal } from '@/types';

const THREAD_HEX: Record<string, string> = {
  'bg-accent-warm': '#E55547',
  'bg-done': '#828282',
  'bg-accent-green': '#5B8A5E',
};

// ---------------------------------------------------------------------------
// Inline editable field — looks like text until clicked
// ---------------------------------------------------------------------------

function InlineText({
  value,
  onSave,
  placeholder,
  className,
  multiline = false,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder}
          className={cn(
            'w-full resize-none bg-transparent border-none outline-none placeholder:text-text-muted/30',
            className
          )}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent border-none outline-none placeholder:text-text-muted/30',
          className
        )}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn('cursor-text', !value && 'text-text-muted/30 italic', className)}
    >
      {value || placeholder || '—'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Monthly section — one-thing + why, editable inline
// ---------------------------------------------------------------------------

function MonthlySection() {
  const { monthlyPlan, setMonthlyPlan } = useApp();
  const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (!monthlyPlan) {
    return (
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted/50 mb-3">
          This Month
        </div>
        <p className="text-[14px] text-text-muted/40 italic">
          No monthly aim set yet. Ask Ink to help you plan the month.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted/50 mb-3">
        {monthYear}
      </div>

      <div className="space-y-2">
        {/* One thing */}
        <InlineText
          value={monthlyPlan.oneThing}
          onSave={(next) =>
            setMonthlyPlan({ ...monthlyPlan, oneThing: next })
          }
          placeholder="What's the one thing this month?"
          className="font-display font-bold text-[26px] tracking-[-0.02em] text-text-primary leading-snug"
        />

        {/* Why */}
        <div className="flex items-start gap-1.5">
          <span className="text-[12px] text-text-muted/40 font-mono uppercase tracking-widest mt-0.5 shrink-0">
            Why
          </span>
          <InlineText
            value={monthlyPlan.why}
            onSave={(next) =>
              setMonthlyPlan({ ...monthlyPlan, why: next })
            }
            placeholder="Because..."
            multiline
            className="text-[15px] text-text-muted leading-relaxed"
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Weekly thread card — editable title + why, with task/activity data
// ---------------------------------------------------------------------------

function ThreadCard({
  goal,
  attention,
  index,
}: {
  goal: WeeklyGoal;
  attention: GoalAttention;
  index: number;
}) {
  const { renameWeeklyGoal, updateGoalWhy, plannedTasks } = useApp();
  const hex = THREAD_HEX[goal.color] || '#E55547';

  // Tasks linked to this goal (candidate + committed + scheduled)
  const linkedTasks = plannedTasks.filter(
    (t) =>
      t.weeklyGoalId === goal.id &&
      t.status !== 'cancelled' &&
      t.status !== 'migrated'
  );
  const doneTasks = linkedTasks.filter((t) => t.status === 'done');
  const openTasks = linkedTasks.filter((t) => t.status !== 'done');

  return (
    <div
      className="rounded-r-lg bg-bg-card/25 pl-5 pr-5 py-4 border-l-[3px]"
      style={{ borderLeftColor: hex }}
    >
      {/* Index + title */}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="text-[10px] font-mono uppercase tracking-[0.18em] shrink-0"
          style={{ color: hex + '80' }}
        >
          {index + 1}
        </span>
        <InlineText
          value={goal.title}
          onSave={(next) => renameWeeklyGoal(goal.id, next)}
          placeholder="Intention title"
          className="text-[18px] font-medium text-text-primary leading-snug"
        />
      </div>

      {/* Why */}
      <div className="ml-5">
        <InlineText
          value={goal.why || ''}
          onSave={(next) => updateGoalWhy(goal.id, next)}
          placeholder="Why this holds."
          multiline
          className="text-[13px] text-text-muted/70 italic leading-relaxed"
        />
      </div>

      {/* Activity nudge */}
      {attention.tasksThisWeek > 0 && (
        <div className="ml-5 mt-2 flex items-center gap-3 text-[11px]">
          <span
            className={cn(
              'italic',
              attention.nudgeUrgent ? 'text-accent-warm' : 'text-text-muted/50'
            )}
          >
            {attention.nudgeLine}
          </span>
          <span className="text-text-muted/20">·</span>
          <span className="font-mono text-text-muted/35">
            {formatActivityLine(attention)}
          </span>
        </div>
      )}

      {/* Task list — compact */}
      {linkedTasks.length > 0 && (
        <div className="ml-5 mt-3 space-y-1">
          {openTasks.map((task) => (
            <div key={task.id} className="flex items-baseline gap-2 text-[13px]">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted/25 shrink-0 mt-1.5" />
              <span className="text-text-muted/70 leading-snug">{task.title}</span>
            </div>
          ))}
          {doneTasks.map((task) => (
            <div key={task.id} className="flex items-baseline gap-2 text-[13px]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: hex + '60' }} />
              <span className="text-text-muted/35 line-through leading-snug">{task.title}</span>
            </div>
          ))}
        </div>
      )}

      {linkedTasks.length === 0 && (
        <p className="ml-5 mt-2 text-[12px] text-text-muted/30 italic">
          No tasks linked — ask Ink to help you plan.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly section — 3 intentions with tasks
// ---------------------------------------------------------------------------

function WeeklySection() {
  const { weeklyGoals } = useApp();
  const attentionData = useAttentionBalance();
  const weekLabel = `Week of ${format(new Date(), 'MMMM d')}`;

  if (weeklyGoals.length === 0) {
    return (
      <section>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted/50 mb-3">
          This Week
        </div>
        <p className="text-[14px] text-text-muted/40 italic">
          No weekly intentions set yet. Ask Ink to help you plan the week.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted/50 mb-4">
        {weekLabel}
      </div>

      <div className="flex flex-col gap-3">
        {weeklyGoals.map((goal, i) => {
          const attention = attentionData.find((a) => a.goalId === goal.id);
          if (!attention) return null;
          return (
            <ThreadCard
              key={goal.id}
              goal={goal}
              attention={attention}
              index={i}
            />
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Money section — weekly budget, compact, only when finance is configured
// ---------------------------------------------------------------------------

function MoneySection() {
  const { state, loading } = useFinance();

  if (loading || !state) return null;

  // Finance not configured if permissionNumber is 0 or missing
  if (!state.permissionNumber && state.permissionNumber !== 0) return null;

  const { permissionNumber, cognitiveState, cashJobs } = state;
  const trulyFree = cashJobs?.trulyFree ?? 0;

  const stateColor: Record<string, string> = {
    calm: '#5B8A5E',
    alert: '#E55547',
    compressed: '#C08A3E',
  };
  const color = stateColor[cognitiveState] ?? '#828282';

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <section>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-muted/50 mb-3">
        Money This Week
      </div>

      <div
        className="rounded-lg px-5 py-4 border-l-[3px] bg-bg-card/20"
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="text-[22px] font-medium"
            style={{ color }}
          >
            {formatCurrency(trulyFree)}
          </span>
          <span className="text-[13px] text-text-muted/60">
            truly free to spend
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-[12px]">
          <span
            className="px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider text-[10px]"
            style={{ backgroundColor: color + '18', color }}
          >
            {cognitiveState}
          </span>
          <span className="text-text-muted/40">
            {formatCurrency(permissionNumber)} safe to spend this week
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// IntentionsView — combined weekly + monthly
// ---------------------------------------------------------------------------

export function IntentionsView() {
  return (
    <div className="flex flex-col h-full bg-bg">
      {/* macOS title bar drag region */}
      <div
        className="h-12 shrink-0 flex items-center px-6 border-b border-border-subtle"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <h1 className="font-display font-bold text-[20px] text-text-emphasis tracking-[-0.02em]">
          Your Intentions
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="max-w-2xl mx-auto px-10 py-10 space-y-12">
          <MonthlySection />
          <WeeklySection />
          <MoneySection />
        </div>
      </div>
    </div>
  );
}
