import type { LoadedSettings } from '@/types/electron';
import { EditorialRow } from './EditorialRow';
import { EditorialSegmentedControl } from './EditorialSegmentedControl';
import { EditorialInput } from './EditorialInput';
import { EditorialComingSoon } from './EditorialComingSoon';

interface MoneyViewProps {
  settings: LoadedSettings;
  stripeSecretKey: string;
  setStripeSecretKey: (v: string) => void;
  setStripeSecretKeyDirty: (v: boolean) => void;
  dueDateWindowDays: number;
  setDueDateWindowDays: (v: number) => void;
  alertSeverity: string;
  setAlertSeverity: (v: string) => void;
  financialSensitivity: string;
  setFinancialSensitivity: (v: string) => void;
  timeHorizonDays: number;
  setTimeHorizonDays: (v: number) => void;
}

export function MoneyView(props: MoneyViewProps) {
  const { settings } = props;

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Money <span className="italic text-text-secondary">Awareness</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Financial visibility, connection settings, and alert thresholds.</p>
      </div>

      <div className="border-t border-solid border-border">

        <EditorialRow kicker="Revenue" title="Stripe" description="Connect your Stripe account to track invoices, charges, and balance.">
          <div className="space-y-2">
            <EditorialInput
              type="password"
              value={props.stripeSecretKey}
              onChange={(v) => { props.setStripeSecretKey(v); props.setStripeSecretKeyDirty(true); }}
              placeholder={settings.stripe.configured ? 'Saved key' : 'sk_live_...'}
              badge="Secret Key"
              mono
              configured={settings.stripe.configured}
            />
            {settings.stripe.configured && (
              <p className="text-[11px] text-text-muted max-w-md">Key is configured. Enter a new value to replace it.</p>
            )}
          </div>
        </EditorialRow>

        {settings.finance.configured && (
          <EditorialRow kicker="Status" title="Plaid Connection" description="Your linked bank account.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between max-w-md">
                <span className="text-text-secondary">Institution</span>
                <span className="text-text-primary font-mono">{settings.finance.institutionName || '—'}</span>
              </div>
              <div className="flex items-center justify-between max-w-md">
                <span className="text-text-secondary">Last sync</span>
                <span className="text-text-primary font-mono">{settings.finance.lastSync || '—'}</span>
              </div>
            </div>
          </EditorialRow>
        )}

        <EditorialRow kicker="Thresholds" title="Due-Date Window" description="How far ahead Ink scans for upcoming bills and obligations.">
          <EditorialSegmentedControl
            options={[
              { value: 1, label: '1 day' },
              { value: 3, label: '3 days' },
              { value: 7, label: '7 days' },
              { value: 14, label: '14 days' },
            ]}
            value={props.dueDateWindowDays}
            onChange={props.setDueDateWindowDays}
          />
        </EditorialRow>

        <EditorialRow kicker="Thresholds" title="Cash-Flow Horizon" description="The look-ahead period for cash-flow projections.">
          <EditorialSegmentedControl
            options={[
              { value: 1, label: '24h' },
              { value: 3, label: '3 days' },
              { value: 7, label: '7 days' },
              { value: 14, label: '14 days' },
            ]}
            value={props.timeHorizonDays}
            onChange={props.setTimeHorizonDays}
          />
        </EditorialRow>

        <EditorialRow kicker="Behavior" title="Alert Severity" description="How aggressively Ink flags financial concerns.">
          <EditorialSegmentedControl
            options={[
              { value: 'quiet', label: 'Quiet Flag' },
              { value: 'warning', label: 'Warning' },
              { value: 'urgent', label: 'Urgent' },
            ]}
            value={props.alertSeverity}
            onChange={props.setAlertSeverity}
          />
        </EditorialRow>

        <EditorialRow kicker="Behavior" title="Coverage Sensitivity" description="How tightly Ink checks your bill coverage against available funds.">
          <EditorialSegmentedControl
            options={[
              { value: 'soft', label: 'Soft — warn if tight' },
              { value: 'hard', label: 'Hard — flag anything borderline' },
            ]}
            value={props.financialSensitivity}
            onChange={props.setFinancialSensitivity}
          />
        </EditorialRow>

        <EditorialComingSoon items={[
          'Plaid bank connection — link accounts directly from settings',
          'Financial sources toggle — bills, invoices, balances separately',
          'Client payment source — Stripe, Dubsado, or manual',
          'Money-narrative mode — risk vs opportunity framing',
        ]} />
      </div>
    </div>
  );
}
