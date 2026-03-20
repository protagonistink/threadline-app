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
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium px-1" style={{ color: '#64748B' }}>
        Add as daily ritual?
      </div>
      {rituals.map((title, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]"
          style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #1E293B' }}
        >
          <MoonStar className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
          <span className="flex-1 min-w-0 truncate" style={{ color: '#E2E8F0' }}>{title}</span>
          <button
            onClick={() => { onAdd(title); onSkip(i); }}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors"
            style={{ color: '#E55547' }}
          >
            Add
          </button>
          <button
            onClick={() => onSkip(i)}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors hover:text-white"
            style={{ color: '#64748B' }}
          >
            Skip
          </button>
        </div>
      ))}
    </div>
  );
}
