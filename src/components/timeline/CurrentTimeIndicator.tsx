// src/components/CurrentTimeIndicator.tsx
import { useEffect, useState } from 'react';
import { timeToTop, formatTime } from './timelineUtils';

export function CurrentTimeIndicator({
  dayStartMins,
  dayEndMins,
  hourHeight,
}: {
  dayStartMins: number;
  dayEndMins: number;
  hourHeight: number;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMin;
  if (currentMinutes < dayStartMins || currentMinutes >= dayEndMins) return null;

  const top = timeToTop(currentMinutes, dayStartMins, hourHeight);

  return (
    <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none" style={{ top: `${top}px` }} id="now-indicator">
      <div className="time-lbl bg-bg py-0.5 pl-1" style={{ color: 'rgba(200,60,47,0.4)' }}>
        {formatTime(currentHour, currentMin)}
      </div>
      <div className="flex items-center flex-1 gap-0">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'rgba(200,60,47,0.9)', boxShadow: '0 0 10px rgba(200,60,47,0.5)' }} />
        <div className="flex-1 h-px bg-accent-warm/40" />
      </div>
    </div>
  );
}
