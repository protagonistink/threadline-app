import { ipcMain } from 'electron';
import { store } from './store';
import type { ChatMessage as StoredChatMessage } from '../src/types';

interface ChatHistoryEntry {
  date: string; // YYYY-MM-DD
  messages: StoredChatMessage[];
  updatedAt: string; // ISO timestamp
}

const STORE_KEY = 'chatHistory';
const MAX_DAYS = 3; // Keep chat history for 3 days
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  return DATE_RE.test(value);
}

function sanitizeMessages(messages: StoredChatMessage[]): StoredChatMessage[] {
  return messages
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: message.role,
      content: typeof message.content === 'string' ? message.content.slice(0, 50_000) : '',
      attachments: Array.isArray(message.attachments)
        ? message.attachments
            .filter((attachment) =>
              attachment &&
              attachment.kind === 'image' &&
              typeof attachment.dataUrl === 'string' &&
              typeof attachment.name === 'string' &&
              (attachment.mediaType === 'image/jpeg' || attachment.mediaType === 'image/png' || attachment.mediaType === 'image/webp')
            )
            .slice(0, 8)
            .map((attachment) => ({
              kind: 'image' as const,
              dataUrl: attachment.dataUrl.slice(0, 5_000_000),
              mediaType: attachment.mediaType,
              name: attachment.name.slice(0, 240),
            }))
        : undefined,
    }));
}

function readHistory(): ChatHistoryEntry[] {
  const raw = store.get(STORE_KEY) as ChatHistoryEntry[] | undefined;
  return Array.isArray(raw) ? raw : [];
}

function trimOldEntries(entries: ChatHistoryEntry[]): ChatHistoryEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_DAYS);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return entries.filter((e) => e.date >= cutoffStr);
}

export function registerChatHistoryHandlers() {
  // Load today's chat messages
  ipcMain.handle('chat:load', (_event, date: string) => {
    if (!isValidDate(date)) return [];
    const entries = readHistory();
    const entry = entries.find((e) => e.date === date);
    return entry?.messages ?? [];
  });

  // Save chat messages for a given date
  ipcMain.handle('chat:save', (_event, date: string, messages: StoredChatMessage[]) => {
    if (!isValidDate(date) || !Array.isArray(messages)) {
      throw new Error('Invalid chat history payload');
    }
    const entries = readHistory();
    const existingIndex = entries.findIndex((e) => e.date === date);

    const newEntry: ChatHistoryEntry = {
      date,
      messages: sanitizeMessages(messages),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.push(newEntry);
    }

    store.set(STORE_KEY, trimOldEntries(entries));
    return true;
  });

  // Clear chat history for a given date
  ipcMain.handle('chat:clear', (_event, date: string) => {
    if (!isValidDate(date)) return true;
    const entries = readHistory();
    store.set(STORE_KEY, entries.filter((e) => e.date !== date));
    return true;
  });

  // Clear all chat history except today's date
  ipcMain.handle('chat:clearOld', (_event, today: string) => {
    if (!isValidDate(today)) {
      throw new Error('Invalid chat history date');
    }
    const entries = readHistory();
    store.set(STORE_KEY, entries.filter((e) => e.date === today));
    return true;
  });
}
