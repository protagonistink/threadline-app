import { ipcMain } from 'electron';
import { store } from './store';
import crypto from 'node:crypto';
import type { CaptureColor } from '../src/types';

const COLORS: CaptureColor[] = ['yellow', 'pink', 'blue', 'green', 'orange', 'lavender'];

interface StoredCapture {
  id: string;
  text: string;
  color: CaptureColor;
  createdAt: string;
}

function todayPrefix(): string {
  return new Date().toISOString().split('T')[0];
}

function getEntries(): StoredCapture[] {
  const raw = store.get('scratch.entries') as StoredCapture[] | undefined;
  return Array.isArray(raw) ? raw : [];
}

function setEntries(entries: StoredCapture[]) {
  store.set('scratch.entries', entries);
}

export function purgeStaleCapturesOnWake() {
  const prefix = todayPrefix();
  const entries = getEntries();
  const fresh = entries.filter((e) => e.createdAt.startsWith(prefix));
  if (fresh.length !== entries.length) setEntries(fresh);
}

export function registerCaptureHandlers() {
  ipcMain.handle('capture:list', () => {
    const prefix = todayPrefix();
    return getEntries().filter((e) => e.createdAt.startsWith(prefix));
  });

  ipcMain.handle('capture:add', (_event, text: string) => {
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Capture text must be a non-empty string');
    }
    const trimmed = text.trim().slice(0, 500);
    const entry: StoredCapture = {
      id: crypto.randomUUID(),
      text: trimmed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      createdAt: new Date().toISOString(),
    };
    const entries = getEntries();
    entries.push(entry);
    setEntries(entries);
    return entry;
  });

  ipcMain.handle('capture:remove', (_event, id: string) => {
    if (typeof id !== 'string') throw new Error('Invalid capture ID');
    const entries = getEntries();
    setEntries(entries.filter((e) => e.id !== id));
    return true;
  });

  ipcMain.handle('capture:purge-stale', () => {
    purgeStaleCapturesOnWake();
    return true;
  });
}
