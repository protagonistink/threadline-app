import { useMemo, useState } from 'react';
import { usePlanner } from '@/context/AppContext';
import { useFinance } from '@/hooks/useFinance';
import { useStripe } from '@/hooks/useStripe';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

const STATE_COLORS: Record<string, string> = {
  calm: '#5B8A5E',
  alert: '#C83C2F',
  compressed: '#C08A3E',
};

const EVENT_ICONS: Record<string, typeof ArrowUp> = {
  income: ArrowDown, // money coming in
  bill: ArrowUp,     // money going out
  sinking_fund: Minus,
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCurrencyFull(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) return target.toLocaleDateString('en-US', { weekday: 'short' });
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-widest text-text-secondary mb-3">
      {children}
    </div>
  );
}

export function TheLedger() {
  const { monthlyPlan, setMonthlyPlan } = usePlanner();
  const { state, loading } = useFinance();
  const { dashboard: stripe } = useStripe();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');
  const [targetError, setTargetError] = useState('');
  const hasStripe = Boolean(stripe);

  // Monthly revenue breakdown by confidence
  const monthlyRevenue = useMemo(() => {
    if (!state?.revenue) return { total: 0, confirmed: 0, invoiced: 0, verbal: 0, speculative: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const buckets = { confirmed: 0, invoiced: 0, verbal: 0, speculative: 0 };
    let total = 0;

    for (const entry of state.revenue) {
      const d = entry.expectedDate instanceof Date
        ? entry.expectedDate
        : new Date(entry.expectedDate);
      if (d >= monthStart && d <= monthEnd) {
        total += entry.amount;
        const conf = entry.confidence as keyof typeof buckets;
        if (conf in buckets) buckets[conf] += entry.amount;
      }
    }

    return { total, ...buckets };
  }, [state?.revenue]);

  // Money Moves: next 7 days from bridgeNodes
  const moneyMoves = useMemo(() => {
    if (!state?.bridgeNodes) return [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return state.bridgeNodes
      .filter((node) => {
        const d = node.date instanceof Date ? node.date : new Date(node.date);
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= weekFromNow;
      })
      .slice(0, 5);
  }, [state?.bridgeNodes]);

  const trulyFree = state?.cashJobs?.trulyFree ?? 0;
  const cognitiveState = state?.cognitiveState ?? 'calm';
  const color = STATE_COLORS[cognitiveState] ?? '#828282';
  const target = monthlyPlan?.monthlyTarget;

  const handleTargetSave = () => {
    const normalized = targetDraft.replace(/[^0-9.]/g, '');
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0 || !monthlyPlan) {
      setTargetError('Enter a monthly target above 0');
      return false;
    }
    setMonthlyPlan({ ...monthlyPlan, monthlyTarget: val });
    setTargetError('');
    setEditingTarget(false);
    return true;
  };

  // When Stripe is available, use received as progress toward target
  const receivedAmount = hasStripe ? stripe!.received : monthlyRevenue.confirmed;
  const expectedAmount = hasStripe
    ? stripe!.received + stripe!.pending + stripe!.upcoming
    : monthlyRevenue.total;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  if (loading && !state && !stripe) return null;

  return (
    <section className="relative z-10 flex flex-col gap-10">
      {/* ═══ STRIPE / REVENUE DASHBOARD ═══ */}
      {hasStripe ? (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#635BFF] animate-pulse" />
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
              Stripe Live Data
            </h2>
          </div>

          {/* Gross Volume — hero number */}
          <div className="mb-8">
            <SectionLabel>Gross Volume ({monthName})</SectionLabel>
            <div className="font-serif text-6xl font-light tracking-tighter text-text-emphasis leading-none mb-5">
              {formatCurrency(stripe!.received + stripe!.pending)}
            </div>

            {/* Progress to target */}
            {target && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-text-secondary">
                  <span>Pacing</span>
                  <span>Target: {formatCurrency(target)}</span>
                </div>
                <div className="w-full h-[1px] bg-border relative">
                  <div
                    className="absolute left-0 top-0 h-[1px] bg-[#635BFF] shadow-[0_0_8px_rgba(99,91,255,0.6)]"
                    style={{ width: `${Math.min(100, (receivedAmount / target) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <SectionLabel>MRR</SectionLabel>
              <div className="font-serif text-3xl font-light tracking-tighter text-text-primary leading-none mb-1">
                {formatCurrency(stripe!.received)}
              </div>
              <div className="font-sans text-[9px] text-text-secondary">Active Subscriptions</div>
            </div>

            <div>
              <SectionLabel>Available to Payout</SectionLabel>
              <div className="font-serif text-3xl font-light tracking-tighter text-text-emphasis leading-none mb-1">
                {formatCurrency(stripe!.availableBalance)}
              </div>
              {stripe!.availableBalance > 0 && (
                <div className="font-sans text-[9px] text-emerald-400/80 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
                  Ready
                </div>
              )}
            </div>
          </div>

          {/* Monthly target editor */}
          {!target && (
            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={() => { setTargetDraft(''); setEditingTarget(true); }}
                className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Set your monthly target →
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ═══ COMPASS FINANCIAL FALLBACK ═══ */
        <div>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
              The Ledger
            </h2>
            <div className="h-[1px] flex-1 bg-border" />
          </div>

          {/* Monthly Target */}
          <div>
            <SectionLabel>Monthly Target</SectionLabel>
            {target ? (
              <div>
                <div className="font-serif text-6xl font-light tracking-tighter text-text-emphasis leading-none mb-5">
                  {formatCurrency(target)}
                </div>
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-text-secondary">
                    <span>Pacing</span>
                    <span>{formatCurrency(receivedAmount)} received</span>
                  </div>
                  <div className="w-full h-[1px] bg-border relative">
                    <div
                      className="absolute left-0 top-0 h-[1px] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (receivedAmount / target) * 100)}%`,
                        backgroundColor: receivedAmount >= target ? '#5B8A5E' : '#C08A3E',
                        boxShadow: `0 0 8px ${receivedAmount >= target ? 'rgba(91,138,94,0.6)' : 'rgba(192,138,62,0.6)'}`,
                      }}
                    />
                  </div>
                </div>
                {expectedAmount > receivedAmount && (
                  <div className="font-mono text-[9px] text-text-muted">
                    {formatCurrency(expectedAmount)} expected
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => { setTargetDraft(''); setEditingTarget(true); }}
                className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Set your monthly target →
              </button>
            )}
          </div>

          {/* Revenue pipeline (non-Stripe) */}
          {monthlyRevenue.total > 0 && (
            <div className="mt-8">
              <SectionLabel>Expected This Month</SectionLabel>
              <div className="grid grid-cols-2 gap-6">
                {monthlyRevenue.confirmed > 0 && (
                  <div>
                    <div className="font-serif text-3xl font-light tracking-tighter text-text-primary leading-none mb-1">
                      {formatCurrency(monthlyRevenue.confirmed)}
                    </div>
                    <div className="font-sans text-[9px] text-text-secondary">Confirmed</div>
                  </div>
                )}
                {monthlyRevenue.invoiced > 0 && (
                  <div>
                    <div className="font-serif text-3xl font-light tracking-tighter text-text-primary leading-none mb-1">
                      {formatCurrency(monthlyRevenue.invoiced)}
                    </div>
                    <div className="font-sans text-[9px] text-text-secondary">Invoiced</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target editor (shared) */}
      {editingTarget && (
        <div className="-mt-4">
          <div className="flex items-center gap-2">
            <span className="text-white/30 font-mono text-sm">$</span>
            <input
              autoFocus
              type="text"
              value={targetDraft}
              onChange={(e) => {
                setTargetDraft(e.target.value);
                if (targetError) setTargetError('');
              }}
              onBlur={() => { void handleTargetSave(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleTargetSave();
                }
                if (e.key === 'Escape') {
                  setTargetError('');
                  setTargetDraft(target ? String(Math.round(target)) : '');
                  setEditingTarget(false);
                }
              }}
              placeholder="10000"
              className="bg-transparent border-b border-white/10 font-mono text-sm text-white/70 outline-none w-24 pb-1"
            />
          </div>
          {targetError && (
            <div className="mt-2 text-[10px] text-accent-warm/80">
              {targetError}
            </div>
          )}
        </div>
      )}

      {/* ═══ LIQUID ASSETS (Plaid accounts) ═══ */}
      <LiquidAssets />

      {/* ═══ MONEY MOVES ═══ */}
      {moneyMoves.length > 0 && (
        <div>
          <SectionLabel>Money Moves</SectionLabel>
          <div className="flex flex-col gap-3">
            {moneyMoves.map((node, i) => {
              const Icon = EVENT_ICONS[node.eventType] ?? Minus;
              const d = node.date instanceof Date ? node.date : new Date(node.date);
              const isIncome = node.eventType === 'income';

              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${isIncome ? 'text-emerald-400/50' : 'text-white/20'}`}>
                    <Icon size={10} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-sans text-[11px] text-white/50 truncate">
                        {node.name}
                      </span>
                      <span className={`font-mono text-[11px] shrink-0 ${isIncome ? 'text-emerald-400/60' : 'text-white/35'}`}>
                        {isIncome ? '+' : '−'}{formatCurrency(Math.abs(node.amount))}
                      </span>
                    </div>
                    <span className="font-mono text-[8px] uppercase tracking-widest text-white/20">
                      {formatRelativeDate(d)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SAFE TO SPEND ═══ */}
      {state && state.permissionNumber !== undefined && (
        <div>
          <SectionLabel>Safe to Spend</SectionLabel>
          <div className={`font-serif ${trulyFree === 0 ? 'text-3xl' : 'text-4xl'} font-light tracking-tighter text-white/90 leading-none mb-2`}>
            {formatCurrency(trulyFree)}
          </div>
          <div
            className="font-sans text-[9px] uppercase tracking-widest mt-2 flex items-center gap-1.5"
            style={{ color: `${color}99` }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: `${color}99` }}
            />
            {cognitiveState}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Liquid Assets — Plaid-connected bank accounts.
 * Currently mock data; will wire to Plaid when ready.
 */
function LiquidAssets() {
  // Mock data — replace with real Plaid data when available
  const accounts = [
    { name: 'Mercury Business', type: 'Checking', last4: '4092', balance: 24500.00 },
    { name: 'Chase Sapphire', type: 'Credit', last4: '8821', balance: -3240.50 },
    { name: 'Wealthfront Cash', type: 'Savings', last4: '1109', balance: 82400.25 },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Liquid Assets
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {accounts.map((acct, i) => (
          <div
            key={acct.last4}
            className={`flex justify-between items-end ${i < accounts.length - 1 ? 'border-b border-white/5 pb-2.5' : 'pb-1.5'}`}
          >
            <div>
              <div className="font-sans text-xs text-white/80 mb-0.5">{acct.name}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                {acct.type} •••• {acct.last4}
              </div>
            </div>
            <div className="font-serif text-lg text-white/90">
              {formatCurrencyFull(acct.balance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
