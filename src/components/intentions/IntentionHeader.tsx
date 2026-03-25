import { usePlanner } from '@/context/AppContext';
import { InlineText } from '@/components/InlineText';

export function IntentionHeader() {
  const { monthlyPlan, setMonthlyPlan } = usePlanner();

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  return (
    <header className="flex flex-col items-start mb-10">
      {/* Page identity — cinematic headline */}
      <h1 className="font-serif text-5xl md:text-6xl text-text-emphasis tracking-tight leading-none mb-2">
        Make your story <br className="hidden md:block" />
        <span className="italic text-text-secondary">matter.</span>
      </h1>
      <p className="font-sans text-xs text-text-secondary max-w-sm leading-relaxed mb-8">
        Focus on what moves the story forward. Everything else is just noise.
      </p>

      {/* Monthly declaration */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary shrink-0">
          {monthName} —
        </span>
        <InlineText
          value={monthlyPlan?.oneThing || ''}
          onSave={(next) =>
            setMonthlyPlan({ ...(monthlyPlan || { month: '', reflection: '', oneThing: '', why: '' }), oneThing: next })
          }
          placeholder="What's the one thing this month?"
          className="font-sans text-xl text-text-primary tracking-tight block"
        />
      </div>

      {/* Why line */}
      {monthlyPlan && (
        <div className="flex items-start gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mt-0.5 shrink-0">
            Why
          </span>
          <InlineText
            value={monthlyPlan.why}
            onSave={(next) =>
              setMonthlyPlan({ ...monthlyPlan, why: next })
            }
            placeholder="Because..."
            multiline
            className="font-sans text-base text-text-secondary leading-relaxed"
          />
        </div>
      )}
    </header>
  );
}
