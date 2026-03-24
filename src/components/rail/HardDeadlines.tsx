import { differenceInCalendarDays, parseISO } from 'date-fns';

interface Deadline {
  title: string;
  dueDate: string; // YYYY-MM-DD
}

interface HardDeadlinesProps {
  deadlines: Deadline[];
}

function relativeDate(dueDate: string): string {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days < 0) return 'past due';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function dateColor(dueDate: string): string {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days <= 0) return 'rgba(200,60,47,0.8)';
  if (days === 1) return 'rgba(232,130,90,0.8)';
  return 'rgba(255,255,255,0.25)';
}

export function HardDeadlines({ deadlines }: HardDeadlinesProps) {
  if (deadlines.length === 0) return null;

  return (
    <div>
      {deadlines.map((deadline, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-border-subtle last:border-b-0"
        >
          <span className="font-sans text-[12px] text-text-muted/60 leading-tight line-clamp-1 flex-1">
            {deadline.title}
          </span>
          <span
            className="font-sans text-[10px] flex-shrink-0"
            style={{ color: dateColor(deadline.dueDate) }}
          >
            {relativeDate(deadline.dueDate)}
          </span>
        </div>
      ))}
    </div>
  );
}
