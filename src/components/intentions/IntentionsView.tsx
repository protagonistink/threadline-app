import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useAttentionBalance } from '@/hooks/useWeeklyMode';
import { useFocusHealth } from '@/hooks/useFocusHealth';
import { IntentionHeader } from './IntentionHeader';
import { IntentionCard } from './IntentionCard';
import { TheLedger } from './TheLedger';
import { DistractionTax } from './DistractionTax';
import { WeekMatrix } from './WeekMatrix';

export function IntentionsView() {
  const { weeklyGoals } = useApp();
  const attentionData = useAttentionBalance();
  const { focusHealth, distractionCount } = useFocusHealth();
  const [hoveredIntention, setHoveredIntention] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cinematic entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Dynamic Bleed: interpolate between teal (healthy) and rust (distracted)
  const bleedStyle = useMemo(() => {
    // Teal: rgb(45,212,191), Rust: rgb(200,60,47)
    const t = Math.max(0, Math.min(1, focusHealth));
    const r = Math.round(200 + (45 - 200) * t);
    const g = Math.round(60 + (212 - 60) * t);
    const b = Math.round(47 + (191 - 47) * t);
    const opacity = (0.18 - (0.18 - 0.08) * t).toFixed(2);
    return {
      background: `radial-gradient(circle at bottom right, rgba(${r},${g},${b},${opacity}), transparent 60%)`,
      transition: 'background 2s ease',
    };
  }, [focusHealth]);

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* macOS title bar drag region */}
      <div
        className="h-12 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Scrollable content with dot grid background */}
      <div
        className={cn(
          'flex-1 overflow-y-auto hide-scrollbar paper-texture transition-all duration-1000 ease-out',
          isLoaded ? 'opacity-100 blur-none' : 'opacity-0 blur-sm'
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      >
        {/* The Bleed — dynamic gradient driven by focus health */}
        <div
          className="fixed bottom-0 right-0 w-[800px] h-[800px] pointer-events-none z-0"
          style={bleedStyle}
        />

        {/* Editorial split layout */}
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 pt-12 pb-40 px-8 sm:px-16 relative">
          {/* LEFT COLUMN: Monthly hero + weekly intentions */}
          <div className="w-full lg:w-7/12 flex flex-col">
            <IntentionHeader />

            {/* Section header */}
            <div className="flex items-center gap-4 mb-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                Active Intentions
              </h2>
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="font-mono text-[10px] text-white/30">
                {weeklyGoals.length} ACTIVE
              </span>
            </div>

            {/* Intention cards */}
            {weeklyGoals.length === 0 ? (
              <p className="text-sm text-white/40 italic">
                No weekly intentions set yet. Ask Ink to help you plan the week.
              </p>
            ) : (
              <div className="flex flex-col gap-6 lg:gap-8 relative">
                {weeklyGoals.map((goal, i) => {
                  const attention = attentionData.find(
                    (a) => a.goalId === goal.id
                  );
                  if (!attention) return null;

                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        i > 0 && 'pt-6 lg:pt-8 border-t border-white/5'
                      )}
                    >
                      <IntentionCard
                        goal={goal}
                        attention={attention}
                        index={i}
                        isHovered={hoveredIntention === i}
                        isAnyHovered={hoveredIntention !== null}
                        onHoverStart={() => setHoveredIntention(i)}
                        onHoverEnd={() => setHoveredIntention(null)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Year context footer */}
            <div className="mt-16 pt-8 border-t border-white/5">
              <WeekMatrix />
            </div>
          </div>

          {/* RIGHT COLUMN: The Ledger + Distraction Tax */}
          <div className="w-full lg:w-5/12 flex flex-col gap-12 lg:sticky lg:top-24 h-fit">
            <TheLedger />
            <DistractionTax distractionCount={distractionCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
