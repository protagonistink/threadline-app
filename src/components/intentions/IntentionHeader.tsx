import { useApp } from '@/context/AppContext';
import { InlineText } from '@/components/InlineText';
import { MonthArc } from './MonthArc';

export function IntentionHeader() {
  const { monthlyPlan, setMonthlyPlan } = useApp();

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  return (
    <header className="flex flex-col items-start mb-14">
      {/* Page identity — fixed, never editable */}
      <h1 className="font-serif text-5xl md:text-6xl text-white/90 tracking-tight leading-none mb-6">
        Making It Matter
      </h1>

      {/* Monthly declaration */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 shrink-0">
          {monthName} —
        </span>
        <InlineText
          value={monthlyPlan?.oneThing || ''}
          onSave={(next) =>
            setMonthlyPlan({ ...(monthlyPlan || { month: '', reflection: '', oneThing: '', why: '' }), oneThing: next })
          }
          placeholder="What's the one thing this month?"
          className="font-sans text-xl text-white/70 tracking-tight block"
        />
      </div>

      {/* Why line */}
      {monthlyPlan && (
        <div className="flex items-start gap-2 mb-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20 mt-0.5 shrink-0">
            Why
          </span>
          <InlineText
            value={monthlyPlan.why}
            onSave={(next) =>
              setMonthlyPlan({ ...monthlyPlan, why: next })
            }
            placeholder="Because..."
            multiline
            className="font-sans text-base text-white/40 leading-relaxed"
          />
        </div>
      )}

      {/* Month Arc */}
      <MonthArc />
    </header>
  );
}
