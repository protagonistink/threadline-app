import { useEffect, useRef, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlanner } from '@/context/AppContext';
import { DaySwitcherDropdown } from './DaySwitcherDropdown';

function formatEditorialWeekday(date: Date) {
  const abbreviated = format(date, 'EEE');
  if (abbreviated === 'Tue') return 'Tues';
  if (abbreviated === 'Thu') return 'Thurs';
  return abbreviated;
}

export function DateHeader() {
  const { viewDate, setViewDate } = usePlanner();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const yesterday = subDays(viewDate, 1);
  const tomorrow = addDays(viewDate, 1);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full py-5 select-none">
      {/* Left chevron */}
      <button
        onClick={() => setViewDate(subDays(viewDate, 1))}
        className="p-2 text-text-secondary/30 hover:text-text-secondary transition-colors select-none"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Yesterday */}
      <button
        onClick={() => setViewDate(yesterday)}
        className="flex flex-col items-center opacity-30 hover:opacity-50 transition-opacity min-w-[80px] select-none"
      >
        <span className="text-[9px] uppercase tracking-[0.2em] text-text-muted font-sans">
          {formatEditorialWeekday(yesterday)}
        </span>
        <span className="text-3xl font-serif font-light text-text-secondary tracking-tight mt-1">
          {format(yesterday, 'd')}
        </span>
      </button>

      {/* Today (hero) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center px-12 mx-5 select-none"
      >
        <span className="text-[64px] font-serif font-light text-text-emphasis tracking-[-0.02em] leading-none">
          {format(viewDate, 'EEEE')}
        </span>
        <span className="mt-1 text-[13px] uppercase tracking-[0.18em] text-accent-warm/85 font-sans">
          {format(viewDate, 'MMM d')}
        </span>
      </button>

      {/* Tomorrow */}
      <button
        onClick={() => setViewDate(tomorrow)}
        className="flex flex-col items-center opacity-30 hover:opacity-50 transition-opacity min-w-[80px] select-none"
      >
        <span className="text-[9px] uppercase tracking-[0.2em] text-text-muted font-sans">
          {formatEditorialWeekday(tomorrow)}
        </span>
        <span className="text-3xl font-serif font-light text-text-secondary tracking-tight mt-1">
          {format(tomorrow, 'd')}
        </span>
      </button>

      {/* Right chevron */}
      <button
        onClick={() => setViewDate(addDays(viewDate, 1))}
        className="p-2 text-text-secondary/30 hover:text-text-secondary transition-colors select-none"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dropdown */}
      {open && <DaySwitcherDropdown onSelect={() => setOpen(false)} />}
    </div>
  );
}
