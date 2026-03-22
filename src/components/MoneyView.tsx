import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFinance } from '@/hooks/useFinance';
import type { ConfidenceLevel, EngineState } from '../../engine/types';

interface ActionItem {
  id: string;
  description: string;
  status: string;
  dueDate: string | null;
  amount: number | null;
  createdAt: string;
  completedAt: string | null;
}

function useExpandedSections(cognitiveState: string) {
  return {
    cashJobs: cognitiveState === 'compressed',
    upcoming: cognitiveState !== 'calm',
    actionItems: cognitiveState !== 'calm',
    recommendations: cognitiveState === 'compressed',
    pipeline: cognitiveState === 'compressed',
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  confirmed: 'Confirmed',
  invoiced: 'Invoiced',
  verbal: 'Verbal',
  speculative: 'Speculative',
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  confirmed: 'text-green-400',
  invoiced: 'text-accent-warm',
  verbal: 'text-yellow-400',
  speculative: 'text-text-muted',
};

interface DashboardProps {
  state: EngineState;
  actionItems: ActionItem[];
  loading: boolean;
  lastSync: Date | null;
  onRefresh: () => void;
}

function MoneyDashboard({ state, actionItems, loading, lastSync, onRefresh }: DashboardProps) {
  const expanded = useExpandedSections(state.cognitiveState);
  const pendingActions = actionItems.filter((a) => a.status === 'pending');
  const upcomingObligations = state.obligations
    .filter((o) => o.daysUntilDue >= 0 && o.daysUntilDue <= 14)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const cashJobBuckets: Array<{ key: keyof typeof state.cashJobs; label: string }> = [
    { key: 'survival', label: 'Survival' },
    { key: 'operating', label: 'Operating' },
    { key: 'catchUp', label: 'Catch-Up' },
    { key: 'untouchable', label: 'Untouchable' },
    { key: 'trulyFree', label: 'Truly Free' },
  ];

  const revenueByConfidence = state.revenue.reduce<Record<ConfidenceLevel, number>>(
    (acc, entry) => {
      acc[entry.confidence] = (acc[entry.confidence] ?? 0) + entry.amount;
      return acc;
    },
    { confirmed: 0, invoiced: 0, verbal: 0, speculative: 0 }
  );

  const billsCovered = state.obligations.filter((o) => o.cashReserved >= o.amount).length;

  return (
    <div className="flex flex-1 flex-col h-full overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-text-muted/60" />
          <h1 className="text-[15px] font-display text-text-primary">Money</h1>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-[11px] text-text-muted">
              Updated {formatDistanceToNow(lastSync, { addSuffix: true })}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 py-5">
        {/* The Number */}
        <section className="flex flex-col items-center gap-2 py-4">
          <div className="text-[48px] font-display font-semibold text-text-emphasis leading-none">
            {formatCurrency(state.permissionNumber)}
          </div>
          <p className="text-[13px] text-text-muted text-center">
            {billsCovered > 0
              ? `Covers ${billsCovered} bill${billsCovered !== 1 ? 's' : ''} — safe to spend today`
              : 'Your spendable amount today'}
          </p>
          <span
            className={cn(
              'text-[11px] uppercase tracking-widest font-medium mt-1',
              state.cognitiveState === 'calm' && 'text-green-400',
              state.cognitiveState === 'alert' && 'text-yellow-400',
              state.cognitiveState === 'compressed' && 'text-red-400'
            )}
          >
            {state.cognitiveState}
          </span>
        </section>

        {/* Cash Jobs */}
        {expanded.cashJobs && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-text-muted font-medium">Cash Jobs</h3>
            <div className="flex flex-wrap gap-2">
              {cashJobBuckets
                .filter(({ key }) => (state.cashJobs[key] as number) > 0)
                .map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-card border border-border-subtle min-w-[90px]"
                  >
                    <span className="text-[10px] text-text-muted">{label}</span>
                    <span className="text-[14px] font-medium text-text-primary">
                      {formatCurrency(state.cashJobs[key] as number)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Upcoming Obligations */}
        {expanded.upcoming && upcomingObligations.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-text-muted font-medium">Upcoming</h3>
            <div className="flex flex-col gap-1.5">
              {upcomingObligations.map((obligation) => (
                <div
                  key={obligation.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card border border-border-subtle"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-text-primary">{obligation.name}</span>
                    <span className="text-[11px] text-text-muted">
                      {obligation.daysUntilDue === 0
                        ? 'Due today'
                        : obligation.daysUntilDue === 1
                        ? 'Due tomorrow'
                        : `Due in ${obligation.daysUntilDue}d`}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[13px] font-medium',
                      obligation.isPastDue ? 'text-red-400' : 'text-text-primary'
                    )}
                  >
                    {formatCurrency(obligation.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Items */}
        {expanded.actionItems && pendingActions.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-text-muted font-medium">Action Items</h3>
            <div className="flex flex-col gap-1.5">
              {pendingActions.map((item) => {
                const isOverdue = item.dueDate != null && new Date(item.dueDate) < new Date();
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between px-3 py-2 rounded-lg bg-bg-card border border-border-subtle gap-3"
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-[13px] text-text-primary leading-snug">{item.description}</span>
                      {isOverdue && <span className="text-[11px] text-red-400">Overdue</span>}
                    </div>
                    {item.amount != null && (
                      <span className="text-[13px] font-medium text-text-primary shrink-0">
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Business Pipeline */}
        {expanded.pipeline && state.revenue.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-text-muted font-medium">Business Pipeline</h3>
            <div className="flex flex-col gap-1.5">
              {(Object.entries(revenueByConfidence) as Array<[ConfidenceLevel, number]>)
                .filter(([, total]) => total > 0)
                .map(([confidence, total]) => (
                  <div
                    key={confidence}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card border border-border-subtle"
                  >
                    <span className={cn('text-[13px]', CONFIDENCE_COLORS[confidence])}>
                      {CONFIDENCE_LABELS[confidence]}
                    </span>
                    <span className="text-[13px] font-medium text-text-primary">{formatCurrency(total)}</span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {expanded.recommendations && state.recommendations.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-widest text-text-muted font-medium">Recommendations</h3>
            <div className="flex flex-col gap-1.5">
              {state.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-bg-card border border-border-subtle"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-text-primary capitalize">
                      {rec.actionVerb} {rec.target}
                    </span>
                    <span className="text-[13px] font-medium text-text-primary shrink-0">
                      {formatCurrency(rec.amount)}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">Protects: {rec.protects}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function MoneyView() {
  const { state, actionItems, loading, refresh } = useFinance();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void Promise.all([
      window.api.store.get('finance.configured'),
      window.api.settings.load(),
    ]).then(([isConfigured, settings]) => {
      setConfigured(Boolean(isConfigured));
      if (settings.finance?.lastSync) {
        setLastSync(new Date(settings.finance.lastSync));
      }
    });
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await window.api.finance.plaidLink();
      if (result.success) {
        setConfigured(true);
        void refresh();
      }
    } catch (err) {
      console.error('Plaid link failed:', err);
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  const handleRefresh = useCallback(async () => {
    await refresh();
    const settings = await window.api.settings.load();
    if (settings.finance?.lastSync) {
      setLastSync(new Date(settings.finance.lastSync));
    }
  }, [refresh]);

  // Unconnected state
  if (configured === false) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-6 px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Wallet className="w-10 h-10 text-text-muted/40" />
          <h2 className="text-[18px] font-display text-text-emphasis">Connect your bank</h2>
          <p className="text-[13px] text-text-muted max-w-xs leading-relaxed">
            Link your accounts to see your Permission Number — the one figure that tells you exactly what you can spend
            today without risking tomorrow.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className={cn(
            'px-6 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
            'bg-accent-warm/10 hover:bg-accent-warm text-accent-warm hover:text-white border border-accent-warm/30',
            connecting && 'opacity-50 cursor-not-allowed'
          )}
        >
          {connecting ? 'Connecting…' : 'Connect Bank Account'}
        </button>
      </div>
    );
  }

  // Loading / initializing state
  if (configured === null || loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-3">
        <RefreshCw className="w-5 h-5 text-text-muted/40 animate-spin" />
        <p className="text-[13px] text-text-muted">Loading financial data…</p>
      </div>
    );
  }

  // Configured but no data returned
  if (!state) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full gap-3">
        <p className="text-[13px] text-text-muted">No financial data available. Try refreshing.</p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <MoneyDashboard
      state={state}
      actionItems={actionItems}
      loading={loading}
      lastSync={lastSync}
      onRefresh={handleRefresh}
    />
  );
}
