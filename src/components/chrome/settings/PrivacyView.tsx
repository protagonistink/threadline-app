import type { LoadedSettings } from '@/types/electron';
import { EditorialRow } from './EditorialRow';
import { EditorialToggle } from './EditorialToggle';
import { EditorialComingSoon } from './EditorialComingSoon';

interface PrivacyViewProps {
  settings: LoadedSettings;
  sensitiveDataMasking: boolean;
  setSensitiveDataMasking: (v: boolean) => void;
  auditLog: boolean;
  setAuditLog: (v: boolean) => void;
}

export function PrivacyView(props: PrivacyViewProps) {
  const { settings } = props;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Privacy & <span className="italic text-text-secondary">Data</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Control what Ink sees, stores, and surfaces about your work.</p>
      </div>

      <div className="border-t border-solid border-border">
        <EditorialRow kicker="Protection" title="Mask Sensitive Data" description="Hide full account numbers, show only last four digits in financial views.">
          <EditorialToggle checked={props.sensitiveDataMasking} onChange={props.setSensitiveDataMasking} />
        </EditorialRow>

        <EditorialRow kicker="Protection" title="Audit Log" description="Track what changed and why Ink made a recommendation.">
          <EditorialToggle checked={props.auditLog} onChange={props.setAuditLog} />
        </EditorialRow>

        <EditorialComingSoon items={[
          'Data visibility toggles — task, calendar, finance, client views',
          'Memory depth — how far back Ink remembers patterns',
          'Feedback loop — learn from helpful/not-helpful ratings',
          'Export & delete controls',
        ]} />

        <EditorialRow kicker="About" title="Application" description="">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between max-w-md">
              <span className="text-text-secondary">Version</span>
              <span className="text-text-primary font-mono">{settings.app.version || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between max-w-md">
              <span className="text-text-secondary">Build date</span>
              <span className="text-text-primary font-mono">
                {settings.app.buildDate
                  ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(settings.app.buildDate))
                  : 'Unavailable'}
              </span>
            </div>
          </div>
        </EditorialRow>
      </div>
    </div>
  );
}
