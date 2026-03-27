import { withAlpha } from '@/lib/goalColors';

interface Intention {
  title: string;
  color: string;
  totalTasks?: number;
  doneTasks?: number;
}

interface IntentionsSummaryProps {
  intentions: Intention[];
}

export function IntentionsSummary({ intentions }: IntentionsSummaryProps) {
  if (intentions.length === 0) return null;

  return (
    <div className="space-y-4 select-none">
      {intentions.map((intention, i) => {
        const total = intention.totalTasks ?? 0;
        const done = intention.doneTasks ?? 0;
        const ratio = total > 0 ? done / total : 0;

        return (
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
              {total > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="flex-1 h-[3px] rounded-full overflow-hidden"
                    style={{ background: withAlpha(intention.color, 0.12) }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${ratio * 100}%`,
                        background: intention.color,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-mono font-medium shrink-0"
                    style={{ color: intention.color }}
                  >
                    {done}/{total}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
