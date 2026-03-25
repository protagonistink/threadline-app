import { ArrowRight } from 'lucide-react';
import { useAppShell } from '@/context/AppContext';

interface DistractionTaxProps {
  distractionCount: number;
}

export function DistractionTax({ distractionCount }: DistractionTaxProps) {
  const { setView } = useAppShell();

  // Positive state when all tasks are mapped
  if (distractionCount === 0) {
    return (
      <section className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
            All tasks mapped to intentions
          </span>
        </div>
      </section>
    );
  }

  // Warning strip — compact, atmospheric
  return (
    <section className="relative z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-warm/60 animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
            <strong className="text-accent-warm/80 font-normal">
              {distractionCount}
            </strong>{' '}
            unmapped task{distractionCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setView('flow')}
          className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors whitespace-nowrap"
        >
          Review <ArrowRight size={9} />
        </button>
      </div>
    </section>
  );
}
