import { ipcMain } from 'electron';
import { store } from './store';
import type { InkContext, InkJournalEntry } from '../src/types';

const DEFAULT_INK_CONTEXT: InkContext = {
  journalEntries: [],
  lastUpdated: new Date().toISOString(),
};
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeString(value: unknown, maxLength = 4000): string | undefined {
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

function sanitizeJournalEntry(entry: InkJournalEntry): InkJournalEntry | null {
  if (!entry || typeof entry !== 'object' || !DATE_RE.test(entry.date) || typeof entry.createdAt !== 'string') {
    return null;
  }

  return {
    date: entry.date,
    excites: sanitizeString(entry.excites, 4000) ?? '',
    needleMovers: Array.isArray(entry.needleMovers)
      ? entry.needleMovers
          .filter((item) => item && typeof item === 'object')
          .slice(0, 10)
          .map((item) => ({
            goalTitle: sanitizeString(item.goalTitle, 240) ?? '',
            action: sanitizeString(item.action, 1000) ?? '',
          }))
      : [],
    artistDate: sanitizeString(entry.artistDate, 2000) ?? '',
    eveningReflection: sanitizeString(entry.eveningReflection, 4000),
    createdAt: entry.createdAt,
  };
}

function sanitizeContextPatch(data: Partial<InkContext>): Partial<InkContext> {
  const patch: Partial<InkContext> = {};
  const stringKeys: Array<keyof Omit<InkContext, 'journalEntries' | 'lastUpdated'>> = [
    'weeklyContext',
    'hierarchy',
    'musts',
    'currentPriority',
    'protectedBlocks',
    'tells',
    'artistDate',
    'honestAudit',
    'weekUpdatedAt',
    'threadsRaw',
  ];

  for (const key of stringKeys) {
    const value = sanitizeString(data[key], key === 'threadsRaw' ? 20_000 : 4000);
    if (value !== undefined) patch[key] = value;
  }

  if (Array.isArray(data.journalEntries)) {
    patch.journalEntries = data.journalEntries
      .map((entry) => sanitizeJournalEntry(entry))
      .filter((entry): entry is InkJournalEntry => Boolean(entry))
      .slice(-7);
  }

  return patch;
}

function readContext(): InkContext {
  const raw = store.get('inkContext') as InkContext | undefined;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_INK_CONTEXT };
  // Ensure journalEntries is always an array
  if (!Array.isArray(raw.journalEntries)) {
    raw.journalEntries = [];
  }
  return raw;
}

function writeContext(data: Partial<InkContext>): InkContext {
  const current = readContext();
  const patch = sanitizeContextPatch(data);
  const merged: InkContext = {
    ...current,
    ...patch,
    // Preserve journalEntries unless explicitly passed
    journalEntries: patch.journalEntries ?? current.journalEntries,
    lastUpdated: new Date().toISOString(),
  };
  store.set('inkContext', merged);
  return merged;
}

function appendJournalEntry(entry: InkJournalEntry): InkJournalEntry[] {
  const sanitizedEntry = sanitizeJournalEntry(entry);
  if (!sanitizedEntry) {
    throw new Error('Invalid ink journal entry');
  }
  const context = readContext();
  const entries = context.journalEntries;

  // Upsert: replace existing entry for the same date
  const existingIndex = entries.findIndex((e) => e.date === sanitizedEntry.date);
  if (existingIndex >= 0) {
    entries[existingIndex] = sanitizedEntry;
  } else {
    entries.push(sanitizedEntry);
  }

  // Trim: keep only entries from the last 7 calendar days
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const trimmed = entries.filter((e) => e.date >= cutoffStr);

  context.journalEntries = trimmed;
  context.lastUpdated = new Date().toISOString();
  store.set('inkContext', context);

  return trimmed;
}

export function registerInkContextHandlers() {
  ipcMain.handle('ink:read-context', () => {
    return readContext();
  });

  ipcMain.handle('ink:write-context', (_event, data: Partial<InkContext>) => {
    return writeContext(data);
  });

  ipcMain.handle('ink:append-journal', (_event, entry: InkJournalEntry) => {
    return appendJournalEntry(entry);
  });
}
