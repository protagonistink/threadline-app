import { useCallback, useEffect, useRef, useState } from 'react';
import type { BriefingContext, ChatMessage } from '@/types/electron';

interface UseBriefingStreamOptions {
  buildContext: () => Promise<BriefingContext>;
  onAssistantMessage: (content: string) => void;
}

export function useBriefingStream({ buildContext, onAssistantMessage }: UseBriefingStreamOptions) {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const streamingRef = useRef('');
  const unsubTokenRef = useRef<(() => void) | null>(null);
  const unsubDoneRef = useRef<(() => void) | null>(null);
  const unsubErrorRef = useRef<(() => void) | null>(null);

  const cleanupStreamListeners = useCallback(() => {
    unsubTokenRef.current?.();
    unsubDoneRef.current?.();
    unsubErrorRef.current?.();
    unsubTokenRef.current = null;
    unsubDoneRef.current = null;
    unsubErrorRef.current = null;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupStreamListeners();
    };
  }, [cleanupStreamListeners]);

  const streamMessage = useCallback(async (messages: ChatMessage[]) => {
    setIsStreaming(true);
    setError(null);
    streamingRef.current = '';
    setStreamingContent('');

    try {
      const context = await buildContext();
      cleanupStreamListeners();

      unsubTokenRef.current = window.api.ai.onToken((token) => {
        if (!isMountedRef.current) return;
        streamingRef.current += token;
        setStreamingContent(streamingRef.current);
      });

      unsubDoneRef.current = window.api.ai.onDone(() => {
        if (!isMountedRef.current) return;
        const finalContent = streamingRef.current;
        if (finalContent) {
          onAssistantMessage(finalContent);
        }
        streamingRef.current = '';
        setStreamingContent('');
        setIsStreaming(false);
        cleanupStreamListeners();
      });

      unsubErrorRef.current = window.api.ai.onError((errorMessage) => {
        if (!isMountedRef.current) return;
        setError(errorMessage);
      });

      const result = await window.api.ai.streamStart(messages, context);
      if (!result.success) {
        throw new Error(result.error || 'Stream failed');
      }
    } catch (streamError) {
      if (!isMountedRef.current) return;
      setIsStreaming(false);
      setError((streamError as Error).message);
      cleanupStreamListeners();
    }
  }, [buildContext, cleanupStreamListeners, onAssistantMessage]);

  return {
    streamingContent,
    isStreaming,
    error,
    streamMessage,
  };
}
