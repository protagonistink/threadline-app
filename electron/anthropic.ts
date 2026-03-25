import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { store } from './store';
import { getSecure } from './secure-store';
import type { BriefingContext, ChatMessage, UserPhysics } from '../src/types';
import { INK_TOKEN_LIMITS } from '../src/lib/ink-mode';
import { buildSystemPrompt, injectFinanceContext, loadUserPhysics } from './ink-prompts';
import { assertRateLimit, logSecurityEvent } from './security';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Default model — update here or override via store key 'anthropic.model'
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const AI_DEBUG = process.env.DEBUG_INKED_AI === '1';

// Max conversation turns to send per request (prevents token bloat in long sessions)
const MAX_HISTORY_TURNS = 80;

function logAI(message: string, ...args: unknown[]) {
  if (!AI_DEBUG) return;
  console.log(message, ...args);
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/webp';
        data: string;
      };
    };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

function dataUrlToBase64Parts(dataUrl: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  return {
    mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp',
    data: match[2],
  };
}

function toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
  return messages.map((message) => {
    if (message.role === 'assistant' || !message.attachments?.length) {
      return {
        role: message.role,
        content: message.content,
      };
    }

    const contentBlocks: AnthropicContentBlock[] = [];

    for (const attachment of message.attachments) {
      const image = dataUrlToBase64Parts(attachment.dataUrl);
      if (!image) continue;
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }

    if (message.content.trim()) {
      contentBlocks.push({ type: 'text', text: message.content.trim() });
    }

    if (contentBlocks.length === 0) {
      return {
        role: message.role,
        content: message.content,
      };
    }

    return {
      role: message.role,
      content: contentBlocks,
    };
  });
}

function extractTextFromAnthropicResponse(data: { content?: Array<{ type?: string; text?: string }> }): string {
  if (!Array.isArray(data.content)) return '';
  return data.content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}


// Prompt templates, context helpers, and finance injection extracted to ./ink-prompts.ts

export function registerAnthropicHandlers() {
  // Non-streaming chat
  ipcMain.handle('ai:chat', async (event, messages: ChatMessage[], context: BriefingContext) => {
    try {
      assertRateLimit('ai:chat', event.sender.id, 400);
      logSecurityEvent('ai.chat', {
        senderId: event.sender.id,
        messageCount: Array.isArray(messages) ? messages.length : 0,
        hasInkMode: Boolean(context?.inkMode),
      });
      const apiKey = getSecure('anthropic.apiKey');
      if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

      const model = (store.get('anthropic.model') as string | undefined) ?? DEFAULT_MODEL;
      const ctxWithPhysics: BriefingContext = { ...context, userPhysics: loadUserPhysics() };

      injectFinanceContext(ctxWithPhysics);

      const maxTokens = ctxWithPhysics.inkMode ? INK_TOKEN_LIMITS[ctxWithPhysics.inkMode] : 1200;

      // Window the conversation to avoid token bloat in long sessions
      const windowedMessages = toAnthropicMessages(messages.slice(-MAX_HISTORY_TURNS));

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: buildSystemPrompt(ctxWithPhysics),
          messages: windowedMessages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return { success: true, content: extractTextFromAnthropicResponse(data) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Streaming variant — pushes tokens to renderer in real time
  ipcMain.handle('ai:stream:start', async (event: IpcMainInvokeEvent, messages: ChatMessage[], context: BriefingContext) => {
    try {
      assertRateLimit('ai:stream:start', event.sender.id, 800);
      logSecurityEvent('ai.streamStart', {
        senderId: event.sender.id,
        messageCount: Array.isArray(messages) ? messages.length : 0,
        hasInkMode: Boolean(context?.inkMode),
      });
      logAI('[AI] stream:start handler called');
      const apiKey = getSecure('anthropic.apiKey');
      logAI('[AI] API key present:', !!apiKey);
      if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

      const model = (store.get('anthropic.model') as string | undefined) ?? DEFAULT_MODEL;
      logAI('[AI] Using model:', model);
      const ctxWithPhysics: BriefingContext = { ...context, userPhysics: loadUserPhysics() };

      injectFinanceContext(ctxWithPhysics);

      const maxTokens = ctxWithPhysics.inkMode ? INK_TOKEN_LIMITS[ctxWithPhysics.inkMode] : 1200;

      // Window the conversation to avoid token bloat in long sessions
      const windowedMessages = toAnthropicMessages(messages.slice(-MAX_HISTORY_TURNS));

      logAI('[AI] Sending fetch to Anthropic API...');
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          system: buildSystemPrompt(ctxWithPhysics),
          messages: windowedMessages,
        }),
      });

      logAI('[AI] Response received. Status:', response.status, '| OK:', response.ok, '| Has body:', !!response.body);
      if (!response.ok || !response.body) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
      }

      // Read SSE stream and push tokens to renderer
      logAI('[AI] Starting SSE stream read...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logAI('[AI] Stream reader done. Chunks read:', chunkCount, '| Tokens sent:', tokenCount);
          break;
        }

        chunkCount++;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              event.sender.send('ai:stream:token', parsed.delta.text);
              tokenCount++;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      logAI('[AI] Sending ai:stream:done to renderer');
      event.sender.send('ai:stream:done');
      return { success: true };
    } catch (error) {
      const message = (error as Error).message;
      console.error('[AI] Error in stream:start handler:', message);
      event.sender.send('ai:stream:error', message);
      event.sender.send('ai:stream:done');
      return { success: false, error: message };
    }
  });

  // Read current physics + log
  ipcMain.handle('physics:get', () => {
    return {
      physics: loadUserPhysics(),
      log: (store.get('physicsLog') as unknown[]) ?? [],
    };
  });

  // Patch individual physics fields (e.g. from weekly review)
  ipcMain.handle('physics:update', (_event, patch: Partial<UserPhysics>) => {
    const current = loadUserPhysics();
    const updated = { ...current, ...patch };
    store.set('userPhysics', updated);
    return updated;
  });

  // Append a raw observation to the pattern log
  ipcMain.handle('physics:log', (_event, entry: {
    source: 'morning' | 'session' | 'eod' | 'weekly';
    observation: string;
    data?: Record<string, unknown>;
  }) => {
    const log = (store.get('physicsLog') as Array<Record<string, unknown>>) ?? [];
    const newEntry = { date: new Date().toISOString().split('T')[0], ...entry };
    // Keep last 180 entries (~6 months of daily use)
    const trimmed = [...log, newEntry].slice(-180);
    store.set('physicsLog', trimmed);
    return newEntry;
  });
}
