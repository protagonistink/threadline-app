import { getISOWeek } from 'date-fns';
import { Zap } from 'lucide-react';

export function WeekMatrix() {
  const currentWeek = getISOWeek(new Date());
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Zap size={10} className="text-accent-warm" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          Week {currentWeek} of 52
        </span>
      </div>
      <div className="flex flex-wrap gap-[3px] w-[180px]">
        {weeks.map((w) => (
          <div
            key={w}
            className={`w-[2px] h-3 rounded-full transition-all duration-500 ${
              w < currentWeek
                ? 'bg-white/20'
                : w === currentWeek
                  ? 'bg-accent-warm shadow-[0_0_8px_rgba(200,60,47,0.8)] scale-y-125'
                  : 'bg-white/5'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
