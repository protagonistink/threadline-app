import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useFinance } from '@/hooks/useFinance';
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
    <div className="font-mono text-[9px] uppercase tracking-widest text-white/30 mb-3">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/5 my-6" />;
}

export function TheLedger() {
  const { monthlyPlan, setMonthlyPlan } = useApp();
  const { state, loading } = useFinance();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');

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
      .slice(0, 5); // Cap at 5 entries
  }, [state?.bridgeNodes]);

  const trulyFree = state?.cashJobs?.trulyFree ?? 0;
  const cognitiveState = state?.cognitiveState ?? 'calm';
  const color = STATE_COLORS[cognitiveState] ?? '#828282';
  const target = monthlyPlan?.monthlyTarget;

  const handleTargetSave = () => {
    const val = parseFloat(targetDraft.replace(/[^0-9.]/g, ''));
    if (!isNaN(val) && val > 0 && monthlyPlan) {
      setMonthlyPlan({ ...monthlyPlan, monthlyTarget: val });
    }
    setEditingTarget(false);
  };

  if (loading && !state) return null;

  return (
    <section className="relative z-10">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          The Ledger
        </h2>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>

      {/* Monthly Target */}
      <div>
        <SectionLabel>Monthly Target</SectionLabel>
        {target ? (
          <div>
            <div className="font-mono text-3xl font-light tracking-tighter text-white/90 leading-none mb-2">
              {formatCurrency(target)}
            </div>
            {/* Progress bar: expected vs target */}
            <div className="w-full h-[3px] rounded-full bg-white/8 overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (monthlyRevenue.total / target) * 100)}%`,
                  backgroundColor: monthlyRevenue.total >= target ? '#5B8A5E' : '#C08A3E',
                }}
              />
            </div>
            <div className="font-mono text-[9px] text-white/30">
              {formatCurrency(monthlyRevenue.total)} expected ({Math.round((monthlyRevenue.total / target) * 100)}%)
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setTargetDraft('');
              setEditingTarget(true);
            }}
            className="font-sans text-sm text-white/30 hover:text-white/50 transition-colors"
          >
            Set your monthly target →
          </button>
        )}

        {editingTarget && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-white/30 font-mono text-sm">$</span>
            <input
              autoFocus
              type="text"
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
              onBlur={handleTargetSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTargetSave();
                if (e.key === 'Escape') setEditingTarget(false);
              }}
              placeholder="10000"
              className="bg-transparent border-b border-white/10 font-mono text-sm text-white/70 outline-none w-24 pb-1"
            />
          </div>
        )}
      </div>

      <Divider />

      {/* Expected This Month */}
      <div>
        <SectionLabel>Expected This Month</SectionLabel>
        <div className={`font-mono ${monthlyRevenue.total === 0 ? 'text-2xl' : 'text-3xl'} font-light tracking-tighter text-white/70 leading-none mb-2`}>
          {formatCurrency(monthlyRevenue.total)}
        </div>
        {monthlyRevenue.total > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {monthlyRevenue.confirmed > 0 && (
              <span className="font-mono text-[9px] text-white/40">
                Confirmed: {formatCurrency(monthlyRevenue.confirmed)}
              </span>
            )}
            {monthlyRevenue.invoiced > 0 && (
              <span className="font-mono text-[9px] text-white/30">
                Invoiced: {formatCurrency(monthlyRevenue.invoiced)}
              </span>
            )}
            {monthlyRevenue.verbal > 0 && (
              <span className="font-mono text-[9px] text-white/20">
                Verbal: {formatCurrency(monthlyRevenue.verbal)}
              </span>
            )}
            {monthlyRevenue.speculative > 0 && (
              <span className="font-mono text-[9px] text-white/15">
                Speculative: {formatCurrency(monthlyRevenue.speculative)}
              </span>
            )}
          </div>
        )}
        {monthlyRevenue.total === 0 && (
          <div className="font-sans text-xs text-white/25">No revenue entries this month</div>
        )}
      </div>

      <Divider />

      {/* Money Moves — next 7 days */}
      <div>
        <SectionLabel>Money Moves</SectionLabel>
        {moneyMoves.length > 0 ? (
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
        ) : (
          <div className="font-sans text-xs text-white/25">No moves this week</div>
        )}
      </div>

      {/* Safe to Spend */}
      {state && state.permissionNumber !== undefined && (
        <>
          <Divider />
          <div>
            <SectionLabel>Safe to Spend</SectionLabel>
            <div className={`font-mono ${trulyFree === 0 ? 'text-2xl' : 'text-3xl'} font-light tracking-tighter text-white/90 leading-none mb-2`}>
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
        </>
      )}
    </section>
  );
}
