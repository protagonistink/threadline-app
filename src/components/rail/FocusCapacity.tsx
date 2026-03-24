interface FocusCapacityProps {
  hoursRemaining: number;
  scheduledHours: number;
  totalHours: number;
  occupancyRatio: number;
  label: string;
}

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}h` : `${rounded.toFixed(1)}h`;
}

export function FocusCapacity({
  hoursRemaining,
  scheduledHours,
  occupancyRatio,
}: FocusCapacityProps) {
  return (
    <div className="py-1">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[18px] leading-none font-mono text-text-emphasis">
          {formatHours(hoursRemaining)}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted">open</span>
        <span className="text-[10px] text-text-muted/30">·</span>
        <span className="text-[18px] leading-none font-mono text-text-secondary/50">
          {formatHours(scheduledHours)}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted">booked</span>
      </div>
      <div className="mt-2 h-px overflow-hidden bg-white/8">
        <div
          className="h-full bg-accent-warm/70"
          style={{ width: `${occupancyRatio * 100}%` }}
        />
      </div>
    </div>
  );
}
