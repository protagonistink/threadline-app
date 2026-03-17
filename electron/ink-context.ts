import { ipcMain } from 'electron';
import { store } from './store';
import type { InkContext, InkJournalEntry } from '../src/types';

const DEFAULT_INK_CONTEXT: InkContext = {
  journalEntries: [],
  lastUpdated: new Date().toISOString(),
};

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
  const merged: InkContext = {
    ...current,
    ...data,
    // Preserve journalEntries unless explicitly passed
    journalEntries: data.journalEntries ?? current.journalEntries,
    lastUpdated: new Date().toISOString(),
  };
  store.set('inkContext', merged);
  return merged;
}

function appendJournalEntry(entry: InkJournalEntry): InkJournalEntry[] {
  const context = readContext();
  const entries = context.journalEntries;

  // Upsert: replace existing entry for the same date
  const existingIndex = entries.findIndex((e) => e.date === entry.date);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
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
