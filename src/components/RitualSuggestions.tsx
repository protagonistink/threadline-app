// src/components/RitualSuggestions.tsx
import { MoonStar } from 'lucide-react';

export function RitualSuggestions({
  rituals,
  onAdd,
  onSkip,
}: {
  rituals: string[];
  onAdd: (title: string) => void;
  onSkip: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium px-1" style={{ color: 'var(--color-text-muted)' }}>
        Add as daily ritual?
      </div>
      {rituals.map((title, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]"
          style={{ background: 'var(--color-bg-chip)', border: '1px solid var(--color-border-chip)' }}
        >
          <MoonStar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
          <button
            onClick={() => { onAdd(title); onSkip(i); }}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors"
            style={{ color: 'var(--color-accent-warm)' }}
          >
            Add
          </button>
          <button
            onClick={() => onSkip(i)}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Skip
          </button>
        </div>
      ))}
    </div>
  );
}
