import { getISOWeek } from 'date-fns';

export function WeekMatrix() {
  const currentWeek = getISOWeek(new Date());
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-warm animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary">
          Week {currentWeek} of 52
        </span>
      </div>
      <div className="flex flex-wrap gap-[3px] w-[280px]">
        {weeks.map((w) => (
          <div
            key={w}
            className={`w-[3px] h-4 rounded-full transition-all duration-500 ${
              w < currentWeek
                ? 'bg-text-secondary/60'
                : w === currentWeek
                  ? 'bg-accent-warm shadow-[0_0_8px_rgba(200,60,47,0.8)] scale-y-125'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
