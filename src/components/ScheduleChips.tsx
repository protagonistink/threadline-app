// src/components/ScheduleChips.tsx
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleChip } from '@/components/ink/morningBriefingUtils';

export function ScheduleChips({
  chips,
  proposalLabel,
  isOverlay,
  onToggle,
  onExecute,
}: {
  chips: ScheduleChip[];
  proposalLabel: string;
  isOverlay: boolean;
  onToggle: (index: number) => void;
  onExecute: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium px-1" style={{ color: '#64748B' }}>
        Proposed schedule for {proposalLabel}
      </div>
      {chips.map((chip, i) => {
        const timeLabel = `${chip.startHour}:${String(chip.startMin).padStart(2, '0')}`;
        const endMin = chip.startHour * 60 + chip.startMin + chip.durationMins;
        const endLabel = `${Math.floor(endMin / 60)}:${String(endMin % 60).padStart(2, '0')}`;
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-[13px]',
              chip.selected ? 'border' : 'border border-transparent'
            )}
            style={{
              background: chip.selected ? 'rgba(229,85,71,0.15)' : 'rgba(30,41,59,0.5)',
              borderColor: chip.selected ? 'rgba(229,85,71,0.3)' : 'transparent',
              color: chip.selected ? '#F8FAFC' : '#94A3B8',
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{
                borderColor: chip.selected ? '#E55547' : '#475569',
                background: chip.selected ? '#E55547' : 'transparent',
              }}
            >
              {chip.selected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="flex-1 min-w-0 truncate">{chip.title}</span>
            <span className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: '#475569' }}>
              <Clock className="w-3 h-3" />
              {timeLabel}–{endLabel}
            </span>
          </button>
        );
      })}
      <button
        onClick={onExecute}
        disabled={chips.every((c) => !c.selected)}
        className={cn('mt-2 rounded-lg text-[13px] font-medium transition-all', isOverlay ? 'px-3.5 py-2' : 'px-4 py-2')}
        style={{
          background: chips.some((c) => c.selected) ? '#E55547' : '#1E293B',
          color: chips.some((c) => c.selected) ? '#FFFFFF' : '#475569',
          cursor: chips.some((c) => c.selected) ? 'pointer' : 'not-allowed',
        }}
      >
        Lock it in
      </button>
    </div>
  );
}
