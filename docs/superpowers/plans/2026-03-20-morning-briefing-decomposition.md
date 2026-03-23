# MorningBriefing Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `MorningBriefing.tsx` (725 lines) into `useBriefingState` hook + 5 focused sub-components + shared types, reducing the main file to ~110 lines with no behavior changes.

**Architecture:** Extract all state/effects/callbacks into `useBriefingState` returning `{ state, actions }`. Extract four inline JSX sections into dedicated components. Move `MessageBubble` from file bottom to its own file. Move `Phase`/`BriefingVariant` types to a shared `src/types/briefing.ts` to avoid circular imports.

**Tech Stack:** React 18, TypeScript, Electron (no browser preview — verify with `npm run build` only)

**Spec:** `docs/superpowers/specs/2026-03-20-morning-briefing-decomposition-design.md`

---

## File Map

| File | Action | Lines |
|------|--------|-------|
| `src/types/briefing.ts` | Create | ~5 |
| `src/components/MessageBubble.tsx` | Create (move from MorningBriefing bottom) | ~30 |
| `src/components/ScheduleChips.tsx` | Create | ~65 |
| `src/components/CommitChips.tsx` | Create | ~65 |
| `src/components/RitualSuggestions.tsx` | Create | ~45 |
| `src/components/BriefingInput.tsx` | Create | ~85 |
| `src/hooks/useBriefingState.ts` | Create | ~230 |
| `src/components/MorningBriefing.tsx` | Rewrite | 725 → ~115 |

---

## Task 1: Create shared types

**Files:**
- Create: `src/types/briefing.ts`

- [ ] Create the file with the two types extracted from `MorningBriefing.tsx` lines 24–25:

```typescript
// src/types/briefing.ts
export type Phase = 'idle' | 'interview' | 'briefing' | 'conversation' | 'committing';
export type BriefingVariant = 'fullscreen' | 'overlay';
```

- [ ] Verify the file exists with correct content (read it back)

---

## Task 2: Create MessageBubble.tsx

**Files:**
- Create: `src/components/MessageBubble.tsx`

- [ ] Create the file — move the `MessageBubble` function from lines 696–724 of `MorningBriefing.tsx`. Add the missing import for `stripStructuredAssistantBlocks`:

```typescript
// src/components/MessageBubble.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripStructuredAssistantBlocks } from './morningBriefingUtils';
import type { ChatMessage } from '@/types/electron';

export function MessageBubble({ message, isFirst }: { message: ChatMessage; isFirst: boolean }) {
  if (message.role === 'user' && isFirst) {
    return null;
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed"
          style={{ background: 'rgba(30,41,59,0.6)', color: '#E2E8F0' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const visibleContent = stripStructuredAssistantBlocks(message.content);
  if (!visibleContent) return null;

  return (
    <div className="flex gap-4 animate-fade-in">
      <div className="flex-1 min-w-0 pr-2 prose-briefing text-[15px] leading-[1.8]" style={{ color: '#CBD5E1' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{visibleContent}</ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] Verify the file exists

---

## Task 3: Create ScheduleChips.tsx

**Files:**
- Create: `src/components/ScheduleChips.tsx`

- [ ] Create the file — extracted from `MorningBriefing.tsx` lines 449–505 (schedule chips section):

```typescript
// src/components/ScheduleChips.tsx
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleChip } from './morningBriefingUtils';

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
```

- [ ] Verify the file exists

---

## Task 4: Create CommitChips.tsx

**Files:**
- Create: `src/components/CommitChips.tsx`

- [ ] Create the file — extracted from `MorningBriefing.tsx` lines 507–561 (commit chips section):

```typescript
// src/components/CommitChips.tsx
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommitChip } from './morningBriefingUtils';

export function CommitChips({
  chips,
  proposalLabel,
  isOverlay,
  onToggle,
  onExecute,
}: {
  chips: CommitChip[];
  proposalLabel: string;
  isOverlay: boolean;
  onToggle: (index: number) => void;
  onExecute: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium px-1" style={{ color: '#64748B' }}>
        Commit to {proposalLabel}
      </div>
      {chips.map((chip, i) => (
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
          {chip.matchedTaskId ? (
            <span className="text-[9px] uppercase tracking-wider font-medium shrink-0" style={{ color: '#E55547' }}>
              matched
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-wider font-medium shrink-0" style={{ color: '#475569' }}>
              new
            </span>
          )}
        </button>
      ))}
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
```

- [ ] Verify the file exists

---

## Task 5: Create RitualSuggestions.tsx

**Files:**
- Create: `src/components/RitualSuggestions.tsx`

- [ ] Create the file — extracted from `MorningBriefing.tsx` lines 563–597 (ritual suggestions section).
Note: Add button calls `onAdd(title)` then `onSkip(i)`. Skip button calls `onSkip(i)` only.

```typescript
// src/components/RitualSuggestions.tsx
import { MoonStar } from 'lucide-react';

export function RitualSuggestions({
  rituals,
  onAdd,
  onSkip,
}: {
  rituals: string[];
  onAdd: (title: string) => void;
  onSkip: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium px-1" style={{ color: '#64748B' }}>
        Add as daily ritual?
      </div>
      {rituals.map((title, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]"
          style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #1E293B' }}
        >
          <MoonStar className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
          <span className="flex-1 min-w-0 truncate" style={{ color: '#E2E8F0' }}>{title}</span>
          <button
            onClick={() => { onAdd(title); onSkip(i); }}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors"
            style={{ color: '#E55547' }}
          >
            Add
          </button>
          <button
            onClick={() => onSkip(i)}
            className="text-[10px] uppercase tracking-wider font-medium shrink-0 transition-colors hover:text-white"
            style={{ color: '#64748B' }}
          >
            Skip
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] Verify the file exists

---

## Task 6: Create BriefingInput.tsx

**Files:**
- Create: `src/components/BriefingInput.tsx`

- [ ] Create the file — extracted from `MorningBriefing.tsx` lines 612–686 (the full input area: commit trigger + "Rework with Ink" block + textarea + send button). The outer `{!committed && ...}` guard stays in the parent; this component renders its contents unconditionally.

```typescript
// src/components/BriefingInput.tsx
import { type RefObject, type KeyboardEvent } from 'react';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Phase } from '@/types/briefing';

export function BriefingInput({
  inputValue,
  isStreaming,
  phase,
  messagesLength,
  isOverlay,
  inputRef,
  onChange,
  onKeyDown,
  onSend,
  onShowCommit,
  onOpenRevision,
}: {
  inputValue: string;
  isStreaming: boolean;
  phase: Phase;
  messagesLength: number;
  isOverlay: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onSend: () => void;
  onShowCommit: () => void;
  onOpenRevision: (seed?: string) => void;
}) {
  return (
    <div className={cn('shrink-0', isOverlay ? 'pt-3' : 'pt-4')} style={{ borderTop: '1px solid #1E293B' }}>
      {/* Commit trigger */}
      {messagesLength > 2 && !isStreaming && phase !== 'interview' && phase !== 'committing' && (
        <button
          onClick={onShowCommit}
          className="w-full mb-2 px-3 py-1.5 rounded-md text-[11px] transition-colors"
          style={{ color: '#64748B', border: '1px dashed #1E293B', background: 'transparent' }}
        >
          Ready to commit? Pull tasks from the last reply
        </button>
      )}

      {/* Rework with Ink */}
      {phase === 'committing' && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[#1E293B] bg-[rgba(30,41,59,0.35)] px-3 py-2">
          <div className="text-[11px] leading-relaxed" style={{ color: '#94A3B8' }}>
            Push back here if the plan is off. Cut, swap, add, or move things before you lock it in.
          </div>
          <button
            onClick={() => onOpenRevision('Cut two things. Keep the essential work and rework the schedule.')}
            className="shrink-0 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors hover:text-white"
            style={{ color: '#CBD5E1', border: '1px solid #334155', background: 'transparent' }}
          >
            Rework with Ink
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isStreaming
              ? 'Thinking...'
              : phase === 'interview'
                ? 'Answer honestly...'
                : phase === 'committing'
                  ? 'Push back, add, cut, swap, or re-scope...'
                  : 'Push back, add, cut, or re-scope...'
          }
          rows={1}
          disabled={isStreaming}
          className={cn(
            'flex-1 resize-none rounded-lg px-4 text-[15px] focus:outline-none transition-colors disabled:opacity-50',
            isOverlay ? 'min-h-[40px] py-2.5 leading-[1.45]' : 'min-h-[44px] py-3 leading-relaxed'
          )}
          style={{
            background: 'rgba(30,41,59,0.4)',
            border: '1px solid #1E293B',
            color: '#CBD5E1',
          }}
        />
        <button
          onClick={onSend}
          disabled={!inputValue.trim() || isStreaming}
          className="p-3 rounded-lg transition-all shrink-0"
          style={{
            background: inputValue.trim() && !isStreaming ? '#E55547' : '#1E293B',
            color: inputValue.trim() && !isStreaming ? '#FFFFFF' : '#475569',
            cursor: inputValue.trim() && !isStreaming ? 'pointer' : 'not-allowed',
          }}
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] Verify the file exists

---

## Task 7: Create useBriefingState.ts

**Files:**
- Create: `src/hooks/useBriefingState.ts`

This is the main extraction — all state, refs, effects, and callbacks moved out of `MorningBriefing.tsx`. `extractInterviewContext` also moves here (it's only used inside `onAssistantMessage`).

- [ ] Create the file:

```typescript
// src/hooks/useBriefingState.ts
import { useState, useEffect, useRef, useCallback, type RefObject, type KeyboardEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { useBriefingStream } from '@/hooks/useBriefingStream';
import { detectInkMode } from '@/lib/ink-mode';
import { stripStructuredAssistantBlocks, buildBriefingContext, inferPlanningDateFromContent, parseCommitChips, parseRitualSuggestions, parseScheduleProposal, type CommitChip, type ScheduleChip } from '@/components/morningBriefingUtils';
import type { ChatMessage } from '@/types/electron';
import type { InkMode } from '@/types';
import type { Phase, BriefingVariant } from '@/types/briefing';

// Private — only used inside onAssistantMessage to detect interview completion
function extractInterviewContext(content: string): Record<string, string> | null {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (typeof parsed !== 'object' || !parsed) return null;
    const fields = ['weeklyContext', 'hierarchy', 'musts', 'currentPriority', 'protectedBlocks', 'tells', 'honestAudit'] as const;
    const result: Record<string, string> = {};
    for (const key of fields) {
      if (parsed[key]) result[key] = String(parsed[key]);
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export interface BriefingStateValues {
  phase: Phase;
  messages: ChatMessage[];
  inputValue: string;
  setInputValue: (v: string) => void;
  commitChips: CommitChip[];
  scheduleChips: ScheduleChip[];
  committed: boolean;
  pendingRituals: string[];
  proposalDate: string;
  proposalLabel: string;
  resolvedInkMode: InkMode | null;
  promptInkMode: InkMode;
  streamingContent: string;
  visibleStreamingContent: string;
  isStreaming: boolean;
  error: string | null;
  isWelcomeScreen: boolean;
  isOverlay: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement>;
  viewDate: Date;
  addRitual: (title: string) => void;
  skipRitual: (index: number) => void;
}

export interface BriefingActions {
  handleStartDay: (intention: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  showCommitChips: () => void;
  executeCommit: () => void;
  executeSchedule: () => Promise<void>;
  toggleChip: (index: number) => void;
  toggleScheduleChip: (index: number) => void;
  openRevision: (seed?: string) => void;
}

export function useBriefingState({
  onClose,
  onStreamingChange,
  mode = 'briefing',
  variant = 'fullscreen',
}: {
  onClose: () => void;
  onStreamingChange?: (streaming: boolean) => void;
  mode?: 'briefing' | 'chat';
  variant?: BriefingVariant;
}): { state: BriefingStateValues; actions: BriefingActions } {
  const {
    weeklyGoals,
    candidateItems,
    committedTasks,
    dailyPlan,
    viewDate,
    setViewDate,
    bringForward,
    addLocalTask,
    addRitual,
    workdayStart,
    workdayEnd,
    scheduleBlocks,
    plannedTasks,
    monthlyPlan,
    scheduleTaskBlock,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [commitChips, setCommitChips] = useState<CommitChip[]>([]);
  const [scheduleChips, setScheduleChips] = useState<ScheduleChip[]>([]);
  const [committed, setCommitted] = useState(false);
  const [pendingRituals, setPendingRituals] = useState<string[]>([]);
  const [proposalDate, setProposalDate] = useState(format(viewDate, 'yyyy-MM-dd'));
  const [resolvedInkMode, setResolvedInkMode] = useState<InkMode | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedBriefingRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('idle');

  useEffect(() => {
    void window.api.ink.readContext().then((ctx) => {
      setResolvedInkMode(detectInkMode(new Date(), ctx.weekUpdatedAt));
    });
  }, []);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'idle' || phase === 'briefing' || phase === 'conversation') {
      setProposalDate(format(viewDate, 'yyyy-MM-dd'));
    }
  }, [phase, viewDate]);

  const promptInkMode: InkMode = phase === 'interview'
    ? 'sunday-interview'
    : (resolvedInkMode && resolvedInkMode !== 'sunday-interview' ? resolvedInkMode : detectInkMode());

  const doneTasks = plannedTasks.filter(
    (t) => t.status === 'done' && dailyPlan.committedTaskIds.includes(t.id)
  );

  const buildContext = useCallback(() => buildBriefingContext({
    weeklyGoals,
    committedTasks,
    doneTasks,
    workdayStart,
    workdayEnd,
    scheduleBlocks,
    planningDate: format(viewDate, 'yyyy-MM-dd'),
    monthlyPlan,
    inkMode: promptInkMode,
  }), [weeklyGoals, committedTasks, doneTasks, workdayStart, workdayEnd, scheduleBlocks, viewDate, monthlyPlan, promptInkMode]);

  const {
    streamingContent,
    isStreaming,
    error,
    streamMessage,
  } = useBriefingStream({
    buildContext,
    onAssistantMessage: (content) => {
      setMessages((prev) => [...prev, { role: 'assistant', content }]);

      if (phaseRef.current === 'interview') {
        const contextJson = extractInterviewContext(content);
        if (contextJson) {
          void window.api.ink.writeContext({
            ...contextJson,
            weekUpdatedAt: new Date().toISOString(),
          }).then(() => {
            setResolvedInkMode('morning');
            setMessages([]);
            setPhase('idle');
          });
        }
      }

      if (phaseRef.current === 'briefing' || phaseRef.current === 'conversation') {
        const chips = parseScheduleProposal(content, plannedTasks, candidateItems);
        if (chips.length > 0) {
          const currentViewDateKey = format(viewDate, 'yyyy-MM-dd');
          const inferredDate = inferPlanningDateFromContent(content, currentViewDateKey);
          setProposalDate(inferredDate);
          if (inferredDate !== currentViewDateKey) {
            setViewDate(new Date(`${inferredDate}T12:00:00`));
          }
          setScheduleChips(chips);
          setPhase('committing');
        }
      }

      const rituals = parseRitualSuggestions(content);
      if (rituals.length > 0) {
        setPendingRituals(rituals);
      }
    },
  });

  useEffect(() => {
    onStreamingChange?.(isStreaming);
  }, [isStreaming, onStreamingChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (mode !== 'briefing' || resolvedInkMode === null) return;
    if (hasStartedBriefingRef.current) return;
    hasStartedBriefingRef.current = true;

    if (resolvedInkMode === 'sunday-interview') {
      setPhase('interview');
      const initialMsg: ChatMessage = { role: 'user', content: 'Start the weekly interview.' };
      setMessages([initialMsg]);
      void streamMessage([initialMsg]);
    }
  }, [streamMessage, mode, resolvedInkMode]);

  const handleStartDay = useCallback((intention: string) => {
    if (isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: intention };
    const newMessages = [userMsg];
    setMessages(newMessages);
    setPhase('briefing');
    void streamMessage(newMessages);
  }, [isStreaming, streamMessage]);

  const startConversation = useCallback((prompt: string) => {
    if (!prompt.trim() || isStreaming) return;
    const nextPhase = prompt === 'Run my morning briefing.' ? 'briefing' : 'conversation';
    const userMsg: ChatMessage = { role: 'user', content: prompt.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setPhase(nextPhase);
    void streamMessage(newMessages);
  }, [isStreaming, messages, streamMessage]);

  const openRevision = useCallback((seed = '') => {
    setPhase('conversation');
    setCommitChips([]);
    setScheduleChips([]);
    if (seed) setInputValue(seed);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (seed) {
        const length = seed.length;
        inputRef.current?.setSelectionRange(length, length);
      }
    });
  }, []);

  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || isStreaming) return;
    const prompt = inputValue.trim();
    setInputValue('');
    if (phase === 'committing') {
      setCommitChips([]);
      setScheduleChips([]);
    }
    startConversation(prompt);
  }, [inputValue, isStreaming, phase, startConversation]);

  const parseTasksFromMessage = useCallback((content: string): CommitChip[] => {
    return parseCommitChips(content, plannedTasks, candidateItems);
  }, [plannedTasks, candidateItems]);

  const showCommitChips = useCallback(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    const chips = parseTasksFromMessage(lastAssistant.content);
    if (chips.length > 0) {
      const currentViewDateKey = format(viewDate, 'yyyy-MM-dd');
      const inferredDate = inferPlanningDateFromContent(lastAssistant.content, currentViewDateKey);
      setProposalDate(inferredDate);
      if (inferredDate !== currentViewDateKey) {
        setViewDate(new Date(`${inferredDate}T12:00:00`));
      }
      setScheduleChips([]);
      setCommitChips(chips);
      setPhase('committing');
    }
  }, [messages, parseTasksFromMessage, setViewDate, viewDate]);

  const executeCommit = useCallback(() => {
    const toCommit = commitChips.filter((chip) => chip.selected);
    setViewDate(new Date(`${proposalDate}T12:00:00`));
    toCommit.forEach((chip) => {
      if (chip.matchedTaskId) {
        if (!dailyPlan.committedTaskIds.includes(chip.matchedTaskId)) {
          bringForward(chip.matchedTaskId, chip.matchedGoalId || undefined, proposalDate);
        }
      } else {
        addLocalTask(chip.title, chip.matchedGoalId || undefined, proposalDate);
      }
    });
    setCommitted(true);
    closeTimeoutRef.current = window.setTimeout(() => { onClose(); }, 1500);
  }, [addLocalTask, bringForward, commitChips, dailyPlan.committedTaskIds, onClose, proposalDate, setViewDate]);

  const toggleChip = (index: number) => {
    setCommitChips((prev) => prev.map((chip, i) => (i === index ? { ...chip, selected: !chip.selected } : chip)));
  };

  const toggleScheduleChip = (index: number) => {
    setScheduleChips((prev) => prev.map((chip, i) => (i === index ? { ...chip, selected: !chip.selected } : chip)));
  };

  const executeSchedule = useCallback(async () => {
    const toSchedule = scheduleChips.filter((chip) => chip.selected);
    setViewDate(new Date(`${proposalDate}T12:00:00`));
    for (const chip of toSchedule) {
      const taskId = chip.matchedTaskId || addLocalTask(chip.title, chip.matchedGoalId || undefined, proposalDate);
      await scheduleTaskBlock(taskId, chip.startHour, chip.startMin, chip.durationMins, chip.title, proposalDate);
    }
    setCommitted(true);
    closeTimeoutRef.current = window.setTimeout(() => { onClose(); }, 1500);
  }, [addLocalTask, onClose, proposalDate, scheduleChips, scheduleTaskBlock, setViewDate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const skipRitual = useCallback((index: number) => {
    setPendingRituals((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const isWelcomeScreen = phase === 'idle' && !isStreaming && !streamingContent;
  const isOverlay = variant === 'overlay';
  const proposalLabel = proposalDate === format(new Date(), 'yyyy-MM-dd')
    ? 'today'
    : format(parseISO(proposalDate), 'EEEE').toLowerCase();
  const visibleStreamingContent = stripStructuredAssistantBlocks(streamingContent);

  return {
    state: {
      phase,
      messages,
      inputValue,
      setInputValue,
      commitChips,
      scheduleChips,
      committed,
      pendingRituals,
      proposalDate,
      proposalLabel,
      resolvedInkMode,
      promptInkMode,
      streamingContent,
      visibleStreamingContent,
      isStreaming,
      error,
      isWelcomeScreen,
      isOverlay,
      messagesEndRef,
      inputRef,
      viewDate,
      addRitual,
      skipRitual,
    },
    actions: {
      handleStartDay,
      sendMessage,
      handleKeyDown,
      showCommitChips,
      executeCommit,
      executeSchedule,
      toggleChip,
      toggleScheduleChip,
      openRevision,
    },
  };
}
```

- [ ] Verify the file exists

---

## Task 8: Rewrite MorningBriefing.tsx

**Files:**
- Modify: `src/components/MorningBriefing.tsx`

Replace the entire file with the slimmed-down version. The existing file is at `src/components/MorningBriefing.tsx` (725 lines).

- [ ] Write the new file content:

```typescript
// src/components/MorningBriefing.tsx
import { format } from 'date-fns';
import { AlertCircle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { BriefingVariant } from '@/types/briefing';
import { useBriefingState } from '@/hooks/useBriefingState';
import { MorningWelcome } from './MorningWelcome';
import { MorningSidebar } from './MorningSidebar';
import { MessageBubble } from './MessageBubble';
import { ScheduleChips } from './ScheduleChips';
import { CommitChips } from './CommitChips';
import { RitualSuggestions } from './RitualSuggestions';
import { BriefingInput } from './BriefingInput';

export function MorningBriefing({
  onClose,
  onNewChat,
  onStreamingChange,
  mode = 'briefing',
  variant = 'fullscreen',
}: {
  onClose: () => void;
  onNewChat: () => void;
  onStreamingChange?: (streaming: boolean) => void;
  mode?: 'briefing' | 'chat';
  variant?: BriefingVariant;
}) {
  const { state, actions } = useBriefingState({ onClose, onStreamingChange, mode, variant });

  return (
    <div
      className={cn('flex h-full w-full', state.isOverlay && 'rounded-[28px]')}
      style={{
        backgroundColor: '#0B1120',
        backgroundImage: 'radial-gradient(ellipse at 20% 20%, #1E293B, #0B1120 70%)',
        color: '#CBD5E1',
      }}
    >
      {!state.isOverlay && <div className="drag-region" />}

      {/* Left Column */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full"
        style={{ padding: state.isOverlay ? '1.5rem' : '4rem' }}
      >
        {state.isWelcomeScreen ? (
          <MorningWelcome
            onStartDay={actions.handleStartDay}
            compact={state.isOverlay}
            inkMode={state.promptInkMode}
            mode={mode}
          />
        ) : (
          <>
            {/* Header */}
            <div className={cn('flex items-center justify-between shrink-0', state.isOverlay ? 'mb-4' : 'mb-6')}>
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: '#64748B' }}>
                  {format(state.viewDate, 'EEEE, MMM d')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNewChat}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md text-[10px] uppercase tracking-[0.14em] transition-colors hover:text-white',
                    state.isOverlay ? 'px-2 py-1.5' : 'px-2.5 py-1.5'
                  )}
                  style={{ color: '#64748B', border: '1px solid #1E293B', background: 'transparent' }}
                  title="Start a new chat"
                >
                  <RotateCcw className="w-3 h-3" />
                  New chat
                </button>
                <button
                  onClick={onClose}
                  className={cn(
                    'rounded-md text-[10px] uppercase tracking-[0.14em] transition-colors hover:text-white',
                    state.isOverlay ? 'px-2 py-1.5' : 'px-2.5 py-1.5'
                  )}
                  style={{ color: '#64748B', background: 'transparent' }}
                  title="Close"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className={cn('flex-1 overflow-y-auto flex flex-col hide-scrollbar', state.isOverlay ? 'gap-4' : 'gap-6')}>
              {state.phase === 'interview' && state.messages.length <= 1 && !state.streamingContent && (
                <div className="pb-5" style={{ borderBottom: '1px solid #1E293B' }}>
                  <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: '#94A3B8' }}>
                    Weekly interview
                  </div>
                  <div className={cn('mt-3 font-display italic font-light leading-snug', state.isOverlay ? 'text-[20px]' : 'text-[24px]')} style={{ color: '#F8FAFC' }}>
                    Let&apos;s see the week.
                  </div>
                </div>
              )}

              {state.messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} isFirst={i === 0} />
              ))}

              {/* Streaming */}
              {state.streamingContent && (
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className={cn('prose-briefing', state.isOverlay ? 'text-[14px] leading-[1.65]' : 'text-[15px] leading-relaxed')} style={{ color: '#CBD5E1' }}>
                      {state.visibleStreamingContent ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.visibleStreamingContent}</ReactMarkdown>
                      ) : null}
                      <span className="inline-block w-[2px] h-[14px] bg-accent-warm animate-pulse ml-0.5 align-text-bottom" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {state.error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-[12px] text-red-300 leading-relaxed">{state.error}</div>
                </div>
              )}

              {/* Schedule chips */}
              {state.phase === 'committing' && state.scheduleChips.length > 0 && !state.committed && (
                <ScheduleChips
                  chips={state.scheduleChips}
                  proposalLabel={state.proposalLabel}
                  isOverlay={state.isOverlay}
                  onToggle={actions.toggleScheduleChip}
                  onExecute={() => void actions.executeSchedule()}
                />
              )}

              {/* Commit chips */}
              {state.phase === 'committing' && state.commitChips.length > 0 && state.scheduleChips.length === 0 && !state.committed && (
                <CommitChips
                  chips={state.commitChips}
                  proposalLabel={state.proposalLabel}
                  isOverlay={state.isOverlay}
                  onToggle={actions.toggleChip}
                  onExecute={actions.executeCommit}
                />
              )}

              {/* Ritual suggestions */}
              {state.pendingRituals.length > 0 && (
                <RitualSuggestions
                  rituals={state.pendingRituals}
                  onAdd={state.addRitual}
                  onSkip={state.skipRitual}
                />
              )}

              {/* Committed confirmation */}
              {state.committed && (
                <div className="flex items-center justify-center py-6">
                  <div className="text-center animate-fade-in">
                    <div className="font-display italic text-[22px]" style={{ color: '#F8FAFC' }}>Held.</div>
                    <div className="text-[11px] mt-1" style={{ color: '#64748B' }}>Plan locked in</div>
                  </div>
                </div>
              )}

              <div ref={state.messagesEndRef} />
            </div>

            {/* Input area */}
            {!state.committed && (
              <BriefingInput
                inputValue={state.inputValue}
                isStreaming={state.isStreaming}
                phase={state.phase}
                messagesLength={state.messages.length}
                isOverlay={state.isOverlay}
                inputRef={state.inputRef}
                onChange={state.setInputValue}
                onKeyDown={actions.handleKeyDown}
                onSend={actions.sendMessage}
                onShowCommit={actions.showCommitChips}
                onOpenRevision={actions.openRevision}
              />
            )}
          </>
        )}
      </div>

      {!state.isOverlay && <MorningSidebar />}
    </div>
  );
}
```

- [ ] Verify the new file has fewer than 150 lines (run `wc -l src/components/MorningBriefing.tsx`)

---

## Task 9: Build verify and commit

- [ ] Run build:

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && npm run build 2>&1
```

Expected: clean TypeScript compile, Vite build succeeds, electron-builder completes. Zero TypeScript errors.

- [ ] If errors: fix them before committing. Common issues to check:
  - Missing imports in `useBriefingState.ts` (e.g., `React` namespace for `React.KeyboardEvent`)
  - `RefObject` import — use `import { type RefObject } from 'react'` in `BriefingInput.tsx`
  - Unused imports in `MorningBriefing.tsx` (TypeScript will flag them)

- [ ] Once build passes, commit all new files:

```bash
cd "/Users/pat/Sites/Protagonist Ink/inked_app" && git add src/types/briefing.ts src/hooks/useBriefingState.ts src/components/MessageBubble.tsx src/components/ScheduleChips.tsx src/components/CommitChips.tsx src/components/RitualSuggestions.tsx src/components/BriefingInput.tsx src/components/MorningBriefing.tsx && git commit -m "$(cat <<'EOF'
Decompose MorningBriefing into useBriefingState hook + sub-components

MorningBriefing.tsx: 725 → ~115 lines
- Extract all state/effects/callbacks into useBriefingState hook
- Extract ScheduleChips, CommitChips, RitualSuggestions, BriefingInput, MessageBubble
- Move Phase/BriefingVariant types to src/types/briefing.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

Open the Inked app in Electron and confirm:
1. Morning briefing welcome screen renders
2. Clicking "Plan my day" starts streaming
3. Commit chips appear and "Lock it in" works
4. "Rework with Ink" button resets to conversation mode
5. Ritual suggestion Add/Skip buttons work
6. Overlay mode (pinned assistant) renders correctly
