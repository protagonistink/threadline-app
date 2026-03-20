import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarListEntry } from '@/types';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [appVersion, setAppVersion] = useState('');
  const [buildDate, setBuildDate] = useState<string | null>(null);
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [anthropicDirty, setAnthropicDirty] = useState(false);
  const [asanaToken, setAsanaToken] = useState('');
  const [asanaConfigured, setAsanaConfigured] = useState(false);
  const [asanaDirty, setAsanaDirty] = useState(false);
  const [gcalClientId, setGcalClientId] = useState('');
  const [gcalClientSecret, setGcalClientSecret] = useState('');
  const [gcalClientSecretConfigured, setGcalClientSecretConfigured] = useState(false);
  const [gcalClientSecretDirty, setGcalClientSecretDirty] = useState(false);
  const [gcalCalendarIds, setGcalCalendarIds] = useState<string[]>(['primary']);
  const [gcalWriteCalendarId, setGcalWriteCalendarId] = useState('primary');
  const [availableCalendars, setAvailableCalendars] = useState<Array<{ id: string; summary: string; primary?: boolean }>>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [blockedSites, setBlockedSites] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCalendars() {
    setLoadingCalendars(true);
    const result = await window.api.gcal.listCalendars();
    if (result.success && result.data) {
      const calendars = result.data.map((calendar: CalendarListEntry) => ({
        id: calendar.id,
        summary: calendar.summary,
        primary: calendar.primary,
      }));
      const todayCalendarId = calendars.find((calendar) => calendar.summary.trim().toLowerCase() === 'today')?.id;
      setAvailableCalendars(calendars);
      setGcalCalendarIds((prev) => {
        const validSelections = prev.filter((id) => calendars.some((calendar) => calendar.id === id));
        if (todayCalendarId && (validSelections.length === 0 || (validSelections.length === 1 && validSelections[0] === 'primary'))) {
          return [todayCalendarId];
        }
        return validSelections.length > 0 ? validSelections : [todayCalendarId || calendars[0]?.id || 'primary'];
      });
      setGcalWriteCalendarId((prev) => {
        if (todayCalendarId && (!prev || prev === 'primary')) return todayCalendarId;
        return calendars.some((calendar) => calendar.id === prev) ? prev : todayCalendarId || calendars[0]?.id || 'primary';
      });
    }
    setLoadingCalendars(false);
  }

  useEffect(() => {
    async function load() {
      const settings = await window.api.settings.load();
      setAppVersion(settings.app.version);
      setBuildDate(settings.app.buildDate);
      setAnthropicConfigured(settings.anthropic.configured);
      setAsanaConfigured(settings.asana.configured);
      setGcalClientId(settings.gcal.clientId);
      setGcalClientSecretConfigured(settings.gcal.clientSecretConfigured);
      if (settings.gcal.calendarIds.length > 0) {
        setGcalCalendarIds(settings.gcal.calendarIds);
      } else if (settings.gcal.calendarId) {
        setGcalCalendarIds([settings.gcal.calendarId]);
      }
      if (settings.gcal.writeCalendarId) {
        setGcalWriteCalendarId(settings.gcal.writeCalendarId);
      } else if (settings.gcal.calendarId) {
        setGcalWriteCalendarId(settings.gcal.calendarId);
      }
      if (settings.pomodoro.workMins) setWorkMins(settings.pomodoro.workMins);
      if (settings.pomodoro.breakMins) setBreakMins(settings.pomodoro.breakMins);
      if (settings.pomodoro.longBreakMins) setLongBreakMins(settings.pomodoro.longBreakMins);
      if (settings.focus.blockedSites) setBlockedSites(settings.focus.blockedSites.join('\n'));

      if (settings.gcal.clientId && settings.gcal.clientSecretConfigured) {
        await loadCalendars();
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!gcalCalendarIds.includes(gcalWriteCalendarId)) {
      setGcalWriteCalendarId(gcalCalendarIds[0] || 'primary');
    }
  }, [gcalCalendarIds, gcalWriteCalendarId]);

  function toggleCalendar(calendarId: string) {
    setGcalCalendarIds((prev) => {
      if (prev.includes(calendarId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== calendarId);
      }
      return [...prev, calendarId];
    });
  }

  async function handleGoogleAuth() {
    setAuthenticating(true);
    await window.api.settings.save({
      gcalClientId,
      ...(gcalClientSecretDirty ? { gcalClientSecret } : {}),
    });
    const result = await window.api.gcal.auth();
    if (result.success) {
      await loadCalendars();
    }
    setAuthenticating(false);
  }

  async function handleSave() {
    setSaving(true);
    const calendarIds = gcalCalendarIds.length > 0 ? gcalCalendarIds : ['primary'];
    const writeCalendarId = gcalWriteCalendarId || calendarIds[0] || 'primary';
    await window.api.settings.save({
      ...(anthropicDirty ? { anthropicApiKey } : {}),
      ...(asanaDirty ? { asanaToken } : {}),
      gcalClientId,
      ...(gcalClientSecretDirty ? { gcalClientSecret } : {}),
      gcalCalendarIds: calendarIds,
      gcalWriteCalendarId: writeCalendarId,
      workMins,
      breakMins,
      longBreakMins,
      blockedSites: blockedSites
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setSaving(false);
    onClose();
  }

  const formattedBuildDate = buildDate
    ? new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(buildDate))
    : 'Unavailable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] max-h-[80vh] bg-bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 className="font-display italic text-[18px] font-light text-text-emphasis">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 hide-scrollbar">
          {/* AI (Morning Briefing) */}
          <Section title="AI — Morning Briefing">
            <Field label="Anthropic API Key">
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => {
                  setAnthropicApiKey(e.target.value);
                  setAnthropicDirty(true);
                }}
                placeholder={anthropicConfigured ? 'Saved key' : 'sk-ant-...'}
                className="input-field"
              />
              <span className="text-[11px] text-text-muted">
                Get your key at{' '}
                <span className="text-accent-warm">console.anthropic.com</span>
              </span>
            </Field>
          </Section>

          {/* Asana */}
          <Section title="Asana">
            <Field label="Personal Access Token">
              <input
                type="password"
                value={asanaToken}
                onChange={(e) => {
                  setAsanaToken(e.target.value);
                  setAsanaDirty(true);
                }}
                placeholder={asanaConfigured ? 'Saved token' : '0/abc123...'}
                className="input-field"
              />
            </Field>
          </Section>

          {/* Google Calendar */}
          <Section title="Google Calendar">
            <Field label="Client ID">
              <input
                value={gcalClientId}
                onChange={(e) => setGcalClientId(e.target.value)}
                placeholder="xxxx.apps.googleusercontent.com"
                className="input-field"
              />
            </Field>
            <Field label="Client Secret">
              <input
                type="password"
                value={gcalClientSecret}
                onChange={(e) => {
                  setGcalClientSecret(e.target.value);
                  setGcalClientSecretDirty(true);
                }}
                placeholder={gcalClientSecretConfigured ? 'Saved secret' : ''}
                className="input-field"
              />
            </Field>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoogleAuth}
                disabled={!gcalClientId || (!gcalClientSecret && !gcalClientSecretConfigured) || authenticating}
                className={cn(
                  'px-3 py-2 rounded-md text-[12px] font-medium transition-colors',
                  !gcalClientId || (!gcalClientSecret && !gcalClientSecretConfigured) || authenticating
                    ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                    : 'bg-bg-elevated text-text-primary hover:bg-border/30'
                )}
              >
                {authenticating ? 'Connecting...' : 'Connect Google'}
              </button>
              <button
                onClick={loadCalendars}
                disabled={loadingCalendars}
                className={cn(
                  'px-3 py-2 rounded-md text-[12px] font-medium transition-colors',
                  loadingCalendars
                    ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                    : 'bg-bg-elevated text-text-primary hover:bg-border/30'
                )}
              >
                {loadingCalendars ? 'Refreshing...' : 'Refresh calendars'}
              </button>
            </div>
            <Field label="Read calendars">
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-bg">
                {availableCalendars.length === 0 ? (
                  <div className="text-[12px] text-text-muted">
                    Google calendars show up here after you connect. iCloud is a separate integration.
                  </div>
                ) : (
                  availableCalendars.map((calendar) => (
                    <label key={calendar.id} className="flex items-center gap-3 text-[12px] text-text-primary">
                      <input
                        type="checkbox"
                        checked={gcalCalendarIds.includes(calendar.id)}
                        onChange={() => toggleCalendar(calendar.id)}
                      />
                      <span>{calendar.summary}{calendar.primary ? ' (primary)' : ''}</span>
                    </label>
                  ))
                )}
              </div>
            </Field>
            <Field label="Write focus blocks to">
              <select
                value={gcalWriteCalendarId}
                onChange={(e) => setGcalWriteCalendarId(e.target.value)}
                className="input-field"
              >
                {(availableCalendars.length > 0 ? availableCalendars : [{ id: 'primary', summary: 'Primary' }])
                  .filter((calendar) => gcalCalendarIds.includes(calendar.id) || calendar.id === gcalWriteCalendarId)
                  .map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
              </select>
            </Field>
          </Section>

          {/* Pomodoro */}
          <Section title="Pomodoro">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Work (min)">
                <input
                  type="number"
                  value={workMins}
                  onChange={(e) => setWorkMins(Number(e.target.value))}
                  className="input-field"
                />
              </Field>
              <Field label="Break (min)">
                <input
                  type="number"
                  value={breakMins}
                  onChange={(e) => setBreakMins(Number(e.target.value))}
                  className="input-field"
                />
              </Field>
              <Field label="Long Break (min)">
                <input
                  type="number"
                  value={longBreakMins}
                  onChange={(e) => setLongBreakMins(Number(e.target.value))}
                  className="input-field"
                />
              </Field>
            </div>
          </Section>

          {/* Focus Mode */}
          <Section title="Quiet Focus — Blocked Sites">
            <textarea
              value={blockedSites}
              onChange={(e) => setBlockedSites(e.target.value)}
              rows={6}
              placeholder="reddit.com&#10;twitter.com&#10;youtube.com"
              className="input-field resize-none font-mono text-[12px]"
            />
          </Section>

          <Section title="About">
            <div className="rounded-lg border border-border bg-bg px-4 py-3 text-[12px] text-text-muted">
              <div className="flex items-center justify-between gap-4">
                <span>Version</span>
                <span className="font-mono text-text-primary">{appVersion || 'Unknown'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span>Build date</span>
                <span className="font-mono text-text-primary">{formattedBuildDate}</span>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-colors',
              'bg-accent-warm text-white hover:bg-accent-warm/90',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[11px] uppercase tracking-widest font-semibold text-text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] text-text-muted font-medium">{label}</label>
      {children}
    </div>
  );
}
