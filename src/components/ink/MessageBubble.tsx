// src/components/MessageBubble.tsx
import { lazy, Suspense } from 'react';
import { stripStructuredAssistantBlocks } from './morningBriefingUtils';
import type { ChatMessage } from '@/types/electron';

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })));

export function MessageBubble({ message, isFirst }: { message: ChatMessage; isFirst: boolean }) {
  if (message.role === 'user' && isFirst && !message.attachments?.length) {
    return null;
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[88%] rounded-xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed"
          style={{
            background: 'color-mix(in srgb, var(--color-bg-card) 78%, var(--color-text-primary) 8%)',
            color: 'var(--color-text-primary)',
            border: '1px solid color-mix(in srgb, var(--color-border) 88%, transparent)',
          }}
        >
          {message.attachments?.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => (
                <img
                  key={`${attachment.name}-${index}`}
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="max-h-52 rounded-lg border object-cover"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              ))}
            </div>
          ) : null}
          {message.content ? <div>{message.content}</div> : null}
        </div>
      </div>
    );
  }

  const visibleContent = stripStructuredAssistantBlocks(message.content);
  if (!visibleContent) return null;

  return (
    <div className="flex gap-4 animate-fade-in">
      <div
        className="flex-1 min-w-0 pr-2 prose-briefing text-[15px] leading-[1.8]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <Suspense fallback={<div>{visibleContent}</div>}>
          <MarkdownRenderer content={visibleContent} />
        </Suspense>
      </div>
    </div>
  );
}
