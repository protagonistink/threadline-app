// src/components/BriefingInput.tsx
import { type RefObject, type KeyboardEvent, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatImageAttachment } from '@/types';
import type { Phase } from '@/types/briefing';

export function BriefingInput({
  inputValue,
  attachments,
  isStreaming,
  isDraggingFiles,
  phase,
  messagesLength,
  isOverlay,
  inputRef,
  fileInputRef,
  onChange,
  onKeyDown,
  onSend,
  onShowCommit,
  onPickImages,
  onRemoveAttachment,
  onDragStateChange,
}: {
  inputValue: string;
  attachments: ChatImageAttachment[];
  isStreaming: boolean;
  isDraggingFiles: boolean;
  phase: Phase;
  messagesLength: number;
  isOverlay: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onSend: () => void;
  onShowCommit: () => void;
  onPickImages: (files: FileList | null) => void;
  onRemoveAttachment: (index: number) => void;
  onDragStateChange: (dragging: boolean) => void;
}) {
  const canSend = (!!inputValue.trim() || attachments.length > 0) && !isStreaming;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    onPickImages(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isStreaming) return;
    onDragStateChange(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    onDragStateChange(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragStateChange(false);
    if (isStreaming) return;
    onPickImages(event.dataTransfer.files);
  };

  return (
    <div
      className={cn('shrink-0 rounded-xl transition-colors', isOverlay ? 'pt-3' : 'pt-4')}
      style={{
        borderTop: '1px solid var(--color-border)',
        background: isDraggingFiles ? 'rgba(200,60,47,0.08)' : 'transparent',
        boxShadow: isDraggingFiles ? 'inset 0 0 0 1px rgba(200,60,47,0.35)' : 'none',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Commit trigger */}
      {messagesLength > 2 && !isStreaming && phase !== 'interview' && phase !== 'committing' && (
        <button
          onClick={onShowCommit}
          className="w-full mb-2 px-3 py-1.5 rounded-md text-[11px] transition-colors"
          style={{ color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', background: 'transparent' }}
        >
          Ready to commit? Pull tasks from the last reply
        </button>
      )}

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.name}-${index}`}
              className="group relative overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="h-16 w-16 object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveAttachment(index)}
                className="absolute right-1 top-1 rounded-full p-1 opacity-100 transition-opacity group-hover:opacity-100"
                style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-text-emphasis)' }}
                title={`Remove ${attachment.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isDraggingFiles && (
        <div
          className="mb-3 rounded-lg border border-dashed px-3 py-2 text-[12px]"
          style={{ borderColor: 'var(--color-accent-warm)', color: 'var(--color-accent-warm)', background: 'color-mix(in srgb, var(--color-accent-warm) 8%, transparent)' }}
        >
          Drop image to send it to Ink
        </div>
      )}

      <div className="flex items-end gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="shrink-0 rounded-lg p-3 transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          title="Add image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
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
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className="p-3 rounded-lg transition-all shrink-0"
          style={{
            background: canSend
              ? 'var(--color-accent-warm)'
              : 'color-mix(in srgb, var(--color-bg-card) 84%, var(--color-text-primary) 6%)',
            color: canSend ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            border: canSend
              ? '1px solid color-mix(in srgb, var(--color-accent-warm) 78%, black 12%)'
              : '1px solid var(--color-border)',
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
