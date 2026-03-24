import { withAlpha } from '@/lib/goalColors';

interface Intention {
  title: string;
  color: string;
  totalTasks?: number;
}

interface IntentionsSummaryProps {
  intentions: Intention[];
}

export function IntentionsSummary({ intentions }: IntentionsSummaryProps) {
  if (intentions.length === 0) return null;

  return (
    <div className="space-y-4">
      {intentions.map((intention, i) => (
        <div key={i} className="relative">
          {/* Large background number */}
          <span className="absolute -left-1 -top-2 text-5xl font-serif italic text-text-whisper opacity-20 select-none pointer-events-none">
            {i + 1}
          </span>

          {/* Content with colored left border */}
          <div
            className="pl-3 ml-4 border-l-2"
            style={{ borderColor: intention.color }}
          >
            <span className="font-sans text-[12px] text-text-secondary leading-snug line-clamp-2 block">
              {intention.title}
            </span>
            <span
              className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium"
              style={{
                background: withAlpha(intention.color, 0.12),
                color: intention.color,
              }}
            >
              {intention.totalTasks ?? 0} TASKS
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
