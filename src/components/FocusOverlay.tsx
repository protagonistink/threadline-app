import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { PomodoroTimer } from './PomodoroTimer';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';

export function FocusOverlay() {
  const { mode } = useTheme();
  const { currentTask, nextBlock } = useApp();
  const isFocus = mode === 'focus';
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isFocus) return null;

  return (
    <div
      className={cn(
        'fixed bottom-8 right-8 z-[60] transition-all duration-700 ease-in-out',
        isExpanded ? 'inset-0 flex items-center justify-center bg-[#0B0C10]/90 backdrop-blur-xl bottom-0 right-0' : 'scale-100'
      )}
    >
      <div
        className={cn(
          'relative bg-bg-card border border-border shadow-2xl rounded-[24px] p-6 transition-all duration-700',
          isExpanded ? 'w-full max-w-4xl flex flex-col items-center gap-12 bg-transparent border-none shadow-none mt-[-10vh]' : 'w-[260px]'
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <div className={cn('flex flex-col items-center gap-4 text-center', isExpanded ? 'scale-125' : 'scale-100')}>
          <PomodoroTimer />

          <div className="flex flex-col gap-1 items-center">
            <span className={cn('text-[10px] uppercase tracking-[0.2em] font-semibold', isExpanded ? 'text-text-muted/70 mb-4' : 'text-accent-warm')}>
              Here Now
            </span>
            <h3 className={cn('text-text-emphasis leading-tight px-4 text-center', isExpanded ? 'text-4xl md:text-5xl lg:text-[4.5rem] font-display italic font-normal max-w-3xl' : 'text-[14px] font-medium truncate max-w-[220px]')}>
              {currentTask?.title || 'No active thread'}
            </h3>
          </div>
        </div>

        {!isExpanded && (
          <div className="w-full rounded-2xl border border-border-subtle bg-bg px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Next</div>
            <div className="text-[13px] text-text-primary mt-1 truncate">
              {nextBlock?.title || 'No next block yet'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
