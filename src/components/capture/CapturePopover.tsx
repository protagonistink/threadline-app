import { useState, useRef } from 'react';
import { CaptureCard } from './CaptureCard';
import type { CaptureEntry } from '@/types';

interface CapturePopoverProps {
  captures: CaptureEntry[];
  onAdd: (text: string) => void;
  onMakeTask: (entry: CaptureEntry) => void;
  onSendToNotion: (entry: CaptureEntry) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export function CapturePopover({ captures, onAdd, onMakeTask, onSendToNotion, onDismiss, onClose }: CapturePopoverProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  return (
    <div
      className="fixed left-12 top-0 bottom-0 z-[60] w-[280px] bg-bg-elevated/95 backdrop-blur-[16px] border-r border-border shadow-[4px_0_24px_rgba(0,0,0,0.18)] flex flex-col animate-slide-in-left"
    >
      {/* Header */}
      <div className="pt-[52px] px-4 pb-3 border-b border-border-subtle">
        <h2 className="text-[13px] font-medium text-text-secondary mb-2">Quick Captures</h2>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Jot something down..."
          className="w-full px-3 py-2 rounded-lg bg-surface/50 border border-border-subtle text-[13px] text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-accent-warm/30"
          maxLength={500}
          autoFocus
        />
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {captures.length === 0 ? (
          <p className="text-[12px] text-text-muted/50 text-center mt-8">Nothing captured today</p>
        ) : (
          captures.map((entry) => (
            <CaptureCard
              key={entry.id}
              entry={entry}
              onMakeTask={onMakeTask}
              onSendToNotion={onSendToNotion}
              onDismiss={onDismiss}
            />
          ))
        )}
      </div>
    </div>
  );
}
