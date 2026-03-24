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

function dotColor(dueDate: string): string {
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days <= 0) return '#C83C2F';
  if (days === 1) return '#E8825A';
  return 'rgba(148,163,184,0.5)';
}

export function HardDeadlines({ deadlines }: HardDeadlinesProps) {
  if (deadlines.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {deadlines.map((deadline, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="w-[4px] h-[4px] rounded-full mt-[5px] flex-shrink-0"
            style={{ background: dotColor(deadline.dueDate) }}
          />
          <div>
            <p className="font-sans text-[12px] text-text-muted/60 leading-tight line-clamp-1">
              {deadline.title}
            </p>
            <span
              className="font-sans text-[10px]"
              style={{
                color: differenceInCalendarDays(parseISO(deadline.dueDate), new Date()) <= 1
                  ? 'rgba(200,60,47,0.8)'
                  : 'rgba(255,255,255,0.25)',
              }}
            >
              {relativeDate(deadline.dueDate)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
