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
