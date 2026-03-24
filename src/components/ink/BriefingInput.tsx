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
            background: inputValue.trim() && !isStreaming ? '#C83C2F' : '#1E293B',
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