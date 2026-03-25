import type { LoadedSettings } from '@/types/electron';
import { EditorialRow } from './EditorialRow';
import { EditorialInput } from './EditorialInput';

interface ConnectViewProps {
  settings: LoadedSettings;
  anthropicApiKey: string;
  setAnthropicApiKey: (v: string) => void;
  setAnthropicDirty: (v: boolean) => void;
  asanaToken: string;
  setAsanaToken: (v: string) => void;
  setAsanaDirty: (v: boolean) => void;
  gcalClientId: string;
  setGcalClientId: (v: string) => void;
  gcalClientSecret: string;
  setGcalClientSecret: (v: string) => void;
  setGcalClientSecretDirty: (v: boolean) => void;
  gcalCalendarIds: string[];
  toggleCalendar: (id: string) => void;
  gcalWriteCalendarId: string;
  setGcalWriteCalendarId: (v: string) => void;
  availableCalendars: Array<{ id: string; summary: string; primary?: boolean }>;
  loadingCalendars: boolean;
  authenticating: boolean;
  handleGoogleAuth: () => void;
  loadCalendars: () => void;
}

export function ConnectView(props: ConnectViewProps) {
  const { settings } = props;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Connections <span className="italic text-text-secondary">& APIs</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Bind your external brain to the Ink engine.</p>
      </div>

      <div className="border-t border-solid border-border">
        <EditorialRow kicker="LLM Engine" title="Anthropic API" description="Requires Claude access for full narrative capability.">
          <div className="space-y-2">
            <EditorialInput
              type="password"
              value={props.anthropicApiKey}
              onChange={(v) => { props.setAnthropicApiKey(v); props.setAnthropicDirty(true); }}
              placeholder={settings.anthropic.configured ? 'Saved key' : 'sk-ant-...'}
              badge="Secret"
              mono
              configured={settings.anthropic.configured}
            />
            {settings.anthropic.configured && (
              <p className="text-[11px] text-text-muted max-w-md">Key is configured. Enter a new value to replace it.</p>
            )}
          </div>
        </EditorialRow>

        <EditorialRow kicker="Task Source" title="Asana PAT" description="Generate a Personal Access Token in your Asana Developer Console.">
          <div className="space-y-2">
            <EditorialInput
              type="password"
              value={props.asanaToken}
              onChange={(v) => { props.setAsanaToken(v); props.setAsanaDirty(true); }}
              placeholder={settings.asana.configured ? 'Saved token' : '0/abc123...'}
              badge="Token"
              mono
              configured={settings.asana.configured}
            />
            {settings.asana.configured && (
              <p className="text-[11px] text-text-muted max-w-md">Token is configured. Enter a new value to replace it.</p>
            )}
          </div>
        </EditorialRow>

        <EditorialRow kicker="Time Source" title="Google Calendar" description="Required for schedule optimization and meeting awareness.">
          <div className="space-y-6 w-full max-w-md">
            <EditorialInput
              value={props.gcalClientId}
              onChange={props.setGcalClientId}
              placeholder="xxxx.apps.googleusercontent.com"
              badge="Client ID"
              mono
            />
            <EditorialInput
              type="password"
              value={props.gcalClientSecret}
              onChange={(v) => { props.setGcalClientSecret(v); props.setGcalClientSecretDirty(true); }}
              placeholder={settings.gcal.clientSecretConfigured ? 'Saved secret' : ''}
              badge="Secret"
              mono
              configured={settings.gcal.clientSecretConfigured}
            />

            <div className="flex gap-4 pt-2">
              <button
                onClick={props.handleGoogleAuth}
                disabled={!props.gcalClientId || (!props.gcalClientSecret && !settings.gcal.clientSecretConfigured) || props.authenticating}
                className="px-6 py-2.5 bg-transparent border border-border text-text-primary text-[12px] tracking-wide uppercase hover:bg-surface hover:border-border-hover transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {props.authenticating ? 'Connecting...' : 'Authorize'}
              </button>
              <button
                onClick={props.loadCalendars}
                disabled={props.loadingCalendars}
                className="px-6 py-2.5 bg-transparent text-accent-warm text-[12px] tracking-wide uppercase hover:bg-accent-warm/5 transition-all duration-300 disabled:opacity-30"
              >
                {props.loadingCalendars ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {props.availableCalendars.length > 0 && (
              <>
                <div className="pt-4">
                  <span className="text-[10px] tracking-[0.2em] text-text-muted uppercase mb-3 block">Read Calendars</span>
                  <div className="flex flex-col gap-3">
                    {props.availableCalendars.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
                        <input
                          type="checkbox"
                          checked={props.gcalCalendarIds.includes(c.id)}
                          onChange={() => props.toggleCalendar(c.id)}
                          className="accent-accent-warm"
                        />
                        <span>{c.summary}{c.primary ? ' (primary)' : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] tracking-[0.2em] text-text-muted uppercase mb-3 block">Write Focus Blocks To</span>
                  <select
                    value={props.gcalWriteCalendarId}
                    onChange={(e) => props.setGcalWriteCalendarId(e.target.value)}
                    className="w-full bg-transparent border-b border-dashed border-border py-3 text-text-primary text-sm focus:outline-none focus:border-solid focus:border-accent-warm transition-all"
                  >
                    {props.availableCalendars
                      .filter((c) => props.gcalCalendarIds.includes(c.id) || c.id === props.gcalWriteCalendarId)
                      .map((c) => <option key={c.id} value={c.id} className="bg-bg-card text-text-primary">{c.summary}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </EditorialRow>
      </div>
    </div>
  );
}
