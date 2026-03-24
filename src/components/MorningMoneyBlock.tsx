import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useFinance } from '@/hooks/useFinance';
import {
  buildDailyCall,
  buildPositionLine,
  buildWorkTieIn,
  formatMoneyCurrency,
  getNextObligations,
} from './moneyBriefingCopy';

export function MorningMoneyBlock() {
  const { state, actionItems, loading } = useFinance();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    void window.api.settings.load().then((settings) => {
        setConfigured(settings.finance.configured);
        if (settings.finance?.lastSync) {
          setLastSync(new Date(settings.finance.lastSync));
        }
      });
  }, []);

  if (configured !== true || loading || !state) return null;

  const nextObligations = getNextObligations(state, 2);
  const nextObligation = nextObligations[0];
  const dailyCall = buildDailyCall(state, actionItems);
  const workTieIn = buildWorkTieIn(state);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-widest" style={{ color: '#64748B' }}>
          Money
        </h3>
        {lastSync && (
          <span className="text-[10px]" style={{ color: '#475569' }}>
            {formatDistanceToNow(lastSync, { addSuffix: true })}
          </span>
        )}
      </div>

      <div
        className="rounded-[18px] px-4 py-4"
        style={{
          border: '1px solid #1E293B',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))',
        }}
      >
        <div className="text-[28px] font-display font-semibold leading-none" style={{ color: '#F8FAFC' }}>
          {formatMoneyCurrency(state.permissionNumber)}
        </div>
        <div className="text-[11px] mt-1" style={{ color: '#64748B' }}>
          Available today
        </div>

        <p className="text-[12px] mt-3 leading-relaxed" style={{ color: '#CBD5E1' }}>
          {buildPositionLine(state, nextObligation)}
        </p>

        {nextObligations.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {nextObligations.map((obligation) => (
              <div key={obligation.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px]" style={{ color: '#E2E8F0' }}>
                    {obligation.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                    {obligation.daysUntilDue === 0
                      ? 'Due today'
                      : obligation.daysUntilDue === 1
                      ? 'Due tomorrow'
                      : `Due in ${obligation.daysUntilDue} days`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px]" style={{ color: '#E2E8F0' }}>
                    {formatMoneyCurrency(obligation.amount)}
                  </p>
                  <p className="text-[10px] mt-0.5 uppercase tracking-[0.12em]" style={{ color: '#64748B' }}>
                    {obligation.cashReserved >= obligation.amount ? 'Covered' : 'Watch'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1E293B' }}>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#64748B' }}>
            Today&apos;s Call
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: '#E2E8F0' }}>
            {dailyCall}
          </p>
          {workTieIn && (
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#94A3B8' }}>
              {workTieIn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
