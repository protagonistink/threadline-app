// src/components/AfterHoursVeil.tsx
import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { timeToTop, formatTime } from './timelineUtils';

export function AfterHoursVeil({
  workdayEnd,
  onEdit,
  onDragBoundaryStart,
  isLight,
  isPastClose,
  minutesPastClose,
  dayStartMins,
  hourHeight,
}: {
  workdayEnd: { hour: number; min: number };
  onEdit: () => void;
  onDragBoundaryStart: (event: MouseEvent<HTMLElement>) => void;
  isLight: boolean;
  isPastClose: boolean;
  minutesPastClose: number;
  dayStartMins: number;
  hourHeight: number;
}) {
  const endMinutes = workdayEnd.hour * 60 + workdayEnd.min;
  const top = timeToTop(endMinutes, dayStartMins, hourHeight);
  const overrunHours = Math.floor(minutesPastClose / 60);
  const overrunMinutes = minutesPastClose % 60;
  const overrunLabel = overrunHours > 0 ? `${overrunHours}h ${overrunMinutes}m` : `${overrunMinutes}m`;

  return (
    <div
      className="absolute left-14 right-0 bottom-0 pointer-events-none z-[5]"
      style={{ top: `${top}px` }}
    >
      <button
        onClick={onEdit}
        onMouseDown={onDragBoundaryStart}
        className={cn(
          'pointer-events-auto absolute left-4 -top-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-all hover:text-text-primary',
          isLight
            ? 'border-stone-300/70 bg-white/92 text-stone-500 hover:border-stone-400/80'
            : 'border-border bg-bg-elevated/90 text-text-muted hover:border-border'
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', isPastClose ? 'bg-accent-warm' : 'bg-accent-warm/70')} />
        {isPastClose ? `Day closed ${overrunLabel} ago` : `Day closes ${formatTime(workdayEnd.hour, workdayEnd.min)}`}
      </button>
      <div className="absolute inset-x-0 top-0 h-0.5 mt-[0px]">
        <svg className="absolute top-[-5px] left-0 right-0 w-full h-[10px] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 10">
          <path
            d="M0 5 Q 25 4.5, 50 6 T 100 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.6"
            strokeLinecap="round"
            className={cn(
              isLight
                ? isPastClose
                  ? 'text-amber-400'
                  : 'text-stone-300'
                : isPastClose
                  ? 'text-accent-warm'
                  : 'text-border'
            )}
          />
        </svg>
      </div>
      <div
        onMouseDown={onDragBoundaryStart}
        className="pointer-events-auto absolute inset-x-0 top-[-8px] h-4 cursor-row-resize"
        title="Drag to move day close"
      />
      <div
        className={cn(
          'absolute inset-0',
          isLight
            ? isPastClose ? 'bg-[rgba(196,132,78,0.04)]' : 'bg-[rgba(176,112,88,0.03)]'
            : isPastClose ? 'bg-[rgba(200,60,47,0.06)]' : 'bg-[rgba(10,10,10,0.55)]'
        )}
      />
    </div>
  );
}
