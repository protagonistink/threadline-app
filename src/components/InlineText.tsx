import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Inline editable text field — displays as plain text, double-click to edit.
 */
export function InlineText({
  value,
  onSave,
  placeholder,
  className,
  multiline = false,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder}
          className={cn(
            'w-full resize-none bg-transparent border-none outline-none placeholder:text-text-muted/30',
            className
          )}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full bg-transparent border-none outline-none placeholder:text-text-muted/30',
          className
        )}
      />
    );
  }

  // When empty: show placeholder only on hover (via group-hover), otherwise invisible spacer
  if (!value) {
    return (
      <span
        onDoubleClick={() => setEditing(true)}
        className={cn('cursor-text block', className)}
      >
        <span className="text-white/0 group-hover:text-white/20 italic transition-colors duration-300">
          {placeholder || '—'}
        </span>
      </span>
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={cn('cursor-text', className)}
    >
      {value}
    </span>
  );
}
