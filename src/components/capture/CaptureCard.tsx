import { useState } from 'react';
import { MoreHorizontal, ListTodo, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaptureEntry } from '@/types';

const COLOR_MAP: Record<string, string> = {
  yellow:   'bg-amber-200/90 text-amber-950',
  pink:     'bg-pink-200/90 text-pink-950',
  blue:     'bg-sky-200/90 text-sky-950',
  green:    'bg-emerald-200/90 text-emerald-950',
  orange:   'bg-orange-200/90 text-orange-950',
  lavender: 'bg-violet-200/90 text-violet-950',
};

interface CaptureCardProps {
  entry: CaptureEntry;
  onMakeTask: (entry: CaptureEntry) => void;
  onSendToNotion: (entry: CaptureEntry) => void;
  onDismiss: (id: string) => void;
}

export function CaptureCard({ entry, onMakeTask, onSendToNotion, onDismiss }: CaptureCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const colorClasses = COLOR_MAP[entry.color] ?? COLOR_MAP.yellow;
  const time = new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={cn('relative rounded-lg px-3 py-2.5 shadow-md', colorClasses)}>
      <p className="text-[13px] leading-snug pr-6">{entry.text}</p>
      <span className="block mt-1 text-[11px] opacity-60">{time}</span>

      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="absolute top-2 right-2 p-0.5 rounded hover:bg-black/10 transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {menuOpen && (
        <div className="absolute right-2 top-8 z-10 bg-bg-elevated border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
          <button
            onClick={() => { onMakeTask(entry); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface/70"
          >
            <ListTodo className="w-3.5 h-3.5" /> Make task
          </button>
          <button
            onClick={() => { onSendToNotion(entry); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-surface/70"
          >
            <FileText className="w-3.5 h-3.5" /> Send to Notion
          </button>
          <button
            onClick={() => { onDismiss(entry.id); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-muted hover:bg-surface/70"
          >
            <X className="w-3.5 h-3.5" /> Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
