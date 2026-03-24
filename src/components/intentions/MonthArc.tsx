import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { resolveGoalColor } from '@/lib/goalColors';

/**
 * MonthArc — horizontal strip showing each day of the current month.
 * Past days with completed intention-tagged tasks get colored fills.
 * Today pulses. Future days are dim.
 */
export function MonthArc() {
  const { plannedTasks, weeklyGoals } = useApp();

  const { days } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    // Build a map of goalId → color
    const goalColorMap = new Map<string, string>();
    weeklyGoals.forEach((g, i) => {
      goalColorMap.set(g.id, resolveGoalColor(g.color, i));
    });

    // Find completed tasks this month, grouped by day
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const dayColors = new Map<number, string>(); // dayOfMonth → color

    for (const task of plannedTasks) {
      if (task.status !== 'done') continue;
      if (!task.lastCommittedDate?.startsWith(monthStr)) continue;
      const dayNum = parseInt(task.lastCommittedDate.split('-')[2], 10);
      if (!dayColors.has(dayNum) && task.weeklyGoalId) {
        const color = goalColorMap.get(task.weeklyGoalId);
        if (color) dayColors.set(dayNum, color);
      }
    }

    // Build day array
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isWeekStart = date.getDay() === 1; // Monday
      result.push({
        day: d,
        isPast: d < todayDate,
        isToday: d === todayDate,
        isFuture: d > todayDate,
        isWeekStart,
        color: dayColors.get(d) || null,
      });
    }

    return { days: result, todayIndex: todayDate - 1 };
  }, [plannedTasks, weeklyGoals]);

  return (
    <div className="flex items-end gap-[2px] mt-6">
      {days.map((d) => (
        <div key={d.day} className="flex flex-col items-center">
          {/* Week boundary label */}
          {d.isWeekStart && d.day > 1 && (
            <span className="font-mono text-[7px] text-white/20 mb-1">
              {d.day}
            </span>
          )}
          <div
            className={`w-[3px] rounded-full transition-all duration-300 ${
              d.isWeekStart && d.day > 1 ? 'ml-1' : ''
            } ${
              d.isToday
                ? 'h-5 bg-accent-warm shadow-[0_0_6px_rgba(200,60,47,0.6)] animate-pulse'
                : d.isPast && d.color
                  ? 'h-4'
                  : d.isPast
                    ? 'h-4 bg-white/8'
                    : 'h-4 bg-white/4'
            }`}
            style={
              d.isPast && d.color
                ? { backgroundColor: d.color }
                : undefined
            }
            title={`Day ${d.day}`}
          />
        </div>
      ))}
    </div>
  );
}
