import { EditorialRow } from './EditorialRow';
import { EditorialSegmentedControl } from './EditorialSegmentedControl';
import { useEffect, useState } from 'react';

function FocusMetric({ label, value, onChange, min = 1, max = 120, step = 5 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex flex-col items-start group">
      <span className="text-[10px] tracking-[0.2em] text-text-muted uppercase mb-2 transition-colors group-hover:text-text-primary">{label}</span>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="text-text-muted hover:text-accent-warm transition-colors px-1 py-1 text-lg font-light outline-none"
        >
          —
        </button>
        <span className="text-4xl text-text-emphasis font-light w-10 text-center font-serif">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="text-text-muted hover:text-accent-warm transition-colors px-1 py-1 text-lg font-light outline-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface DayViewProps {
  themeMode: string;
  setThemeMode: (v: 'light' | 'dark') => void;
  dayStartHour: number;
  dayStartMin: number;
  dayEndHour: number;
  dayEndMin: number;
  setDayStartHour: (v: number) => void;
  setDayStartMin: (v: number) => void;
  setDayEndHour: (v: number) => void;
  setDayEndMin: (v: number) => void;
  timeboxDefault: number;
  setTimeboxDefault: (v: number) => void;
  syncFrequencyMins: number;
  setSyncFrequencyMins: (v: number) => void;
  workMins: number;
  breakMins: number;
  longBreakMins: number;
  setWorkMins: (v: number) => void;
  setBreakMins: (v: number) => void;
  setLongBreakMins: (v: number) => void;
  blockedSites: string;
  setBlockedSites: (v: string) => void;
}

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function parseTime12(input: string): { hour: number; min: number } | null {
  const normalized = input.trim().replace(/\s+/g, ' ');
  // Try 12h format first: "9:00 AM", "5:30 PM"
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { hour: h, min: m };
    }
    return null;
  }
  // Try 24h format: "09:00", "17:30"
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1]);
    const m = parseInt(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { hour: h, min: m };
    }
  }
  return null;
}

export function DayView(props: DayViewProps) {
  const [startDraft, setStartDraft] = useState(formatTime12(props.dayStartHour, props.dayStartMin));
  const [endDraft, setEndDraft] = useState(formatTime12(props.dayEndHour, props.dayEndMin));
  const [startError, setStartError] = useState('');
  const [endError, setEndError] = useState('');

  useEffect(() => {
    setStartDraft(formatTime12(props.dayStartHour, props.dayStartMin));
  }, [props.dayStartHour, props.dayStartMin]);

  useEffect(() => {
    setEndDraft(formatTime12(props.dayEndHour, props.dayEndMin));
  }, [props.dayEndHour, props.dayEndMin]);

  function commitTime(
    draft: string,
    fallbackHour: number,
    fallbackMin: number,
    setHour: (v: number) => void,
    setMin: (v: number) => void,
    setDraft: (v: string) => void,
    setError: (v: string) => void,
  ) {
    const parsed = parseTime12(draft);
    if (!parsed) {
      setError('Use 9:00 AM or 17:00');
      setDraft(formatTime12(fallbackHour, fallbackMin));
      return;
    }
    setError('');
    setHour(parsed.hour);
    setMin(parsed.min);
    setDraft(formatTime12(parsed.hour, parsed.min));
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Daily <span className="italic text-text-secondary">Rhythm</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Establish your working hours, focus cycles, and visual environment.</p>
      </div>

      <div className="border-t border-solid border-border">
        <EditorialRow kicker="Boundaries" title="Operating Hours" description="Defines the active canvas for your day. Tasks outside these hours require explicit confirmation.">
          <div className="flex items-start gap-4 text-text-emphasis">
            <div className="relative">
              <input
                type="text"
                value={startDraft}
                onChange={(e) => {
                  setStartDraft(e.target.value);
                  if (startError) setStartError('');
                }}
                onBlur={() => commitTime(
                  startDraft,
                  props.dayStartHour,
                  props.dayStartMin,
                  props.setDayStartHour,
                  props.setDayStartMin,
                  setStartDraft,
                  setStartError,
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitTime(
                      startDraft,
                      props.dayStartHour,
                      props.dayStartMin,
                      props.setDayStartHour,
                      props.setDayStartMin,
                      setStartDraft,
                      setStartError,
                    );
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setStartError('');
                    setStartDraft(formatTime12(props.dayStartHour, props.dayStartMin));
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                aria-invalid={startError ? 'true' : 'false'}
                className="w-32 bg-transparent border-b border-dashed border-border pb-2 text-center text-4xl font-light focus:outline-none focus:border-solid focus:border-accent-warm transition-all font-serif"
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-20px] text-[10px] tracking-[0.2em] text-text-muted uppercase">Start</div>
              {startError && (
                <div className="absolute left-1/2 top-full mt-8 -translate-x-1/2 whitespace-nowrap text-[10px] text-accent-warm">
                  {startError}
                </div>
              )}
            </div>
            <span className="text-text-muted font-light mx-1">—</span>
            <div className="relative">
              <input
                type="text"
                value={endDraft}
                onChange={(e) => {
                  setEndDraft(e.target.value);
                  if (endError) setEndError('');
                }}
                onBlur={() => commitTime(
                  endDraft,
                  props.dayEndHour,
                  props.dayEndMin,
                  props.setDayEndHour,
                  props.setDayEndMin,
                  setEndDraft,
                  setEndError,
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitTime(
                      endDraft,
                      props.dayEndHour,
                      props.dayEndMin,
                      props.setDayEndHour,
                      props.setDayEndMin,
                      setEndDraft,
                      setEndError,
                    );
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setEndError('');
                    setEndDraft(formatTime12(props.dayEndHour, props.dayEndMin));
                    (e.currentTarget as HTMLInputElement).blur();
                  }
                }}
                aria-invalid={endError ? 'true' : 'false'}
                className="w-32 bg-transparent border-b border-dashed border-border pb-2 text-center text-4xl font-light focus:outline-none focus:border-solid focus:border-accent-warm transition-all font-serif"
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-20px] text-[10px] tracking-[0.2em] text-text-muted uppercase">End</div>
              {endError && (
                <div className="absolute left-1/2 top-full mt-8 -translate-x-1/2 whitespace-nowrap text-[10px] text-accent-warm">
                  {endError}
                </div>
              )}
            </div>
          </div>
        </EditorialRow>

        <EditorialRow kicker="Pacing" title="Focus Cycles" description="The intervals used when you engage Deep Work mode. Based on standard Pomodoro lengths.">
          <div className="flex items-center gap-x-6 gap-y-8 w-full">
            <FocusMetric label="Work" value={props.workMins} onChange={props.setWorkMins} />
            <FocusMetric label="Break" value={props.breakMins} onChange={props.setBreakMins} />
            <FocusMetric label="Long Break" value={props.longBreakMins} onChange={props.setLongBreakMins} />
          </div>
        </EditorialRow>

        <EditorialRow kicker="Defaults" title="Timebox Standard" description="The default duration applied when quickly adding new items to your ledger.">
          <EditorialSegmentedControl
            options={[
              { value: 15, label: '15m' },
              { value: 30, label: '30m' },
              { value: 45, label: '45m' },
              { value: 60, label: '60m' },
            ]}
            value={props.timeboxDefault}
            onChange={props.setTimeboxDefault}
          />
        </EditorialRow>

        <EditorialRow kicker="Data" title="Calendar Sync" description="How frequently Ink polls your connected calendars for changes.">
          <EditorialSegmentedControl
            options={[
              { value: 1, label: '1m' },
              { value: 2, label: '2m' },
              { value: 5, label: '5m' },
              { value: 15, label: '15m' },
            ]}
            value={props.syncFrequencyMins}
            onChange={props.setSyncFrequencyMins}
          />
        </EditorialRow>

        <EditorialRow kicker="Environment" title="Appearance" description="Set your preferred lighting.">
          <EditorialSegmentedControl
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={props.themeMode === 'focus' ? 'dark' : props.themeMode}
            onChange={(v) => props.setThemeMode(v as 'light' | 'dark')}
          />
        </EditorialRow>

        <EditorialRow kicker="Focus" title="Blocked Sites" description="Sites blocked during focus sessions. One per line.">
          <textarea
            value={props.blockedSites}
            onChange={(e) => props.setBlockedSites(e.target.value)}
            rows={4}
            placeholder={'reddit.com\ntwitter.com\nyoutube.com'}
            className="w-full max-w-md bg-transparent border border-dashed border-border rounded-[4px] px-4 py-3 text-text-primary font-mono text-[12px] placeholder:text-text-muted focus:outline-none focus:border-solid focus:border-accent-warm transition-all resize-none"
          />
        </EditorialRow>
      </div>
    </div>
  );
}
