import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { store } from './store';

type AuditValue = string | number | boolean | null;

const requestTimestamps = new Map<string, number>();

function isAuditEnabled() {
  return Boolean(store.get('userPrefs.privacy.auditLog'));
}

function getAuditLogPath() {
  return path.join(app.getPath('userData'), 'security-audit.log');
}

export function assertRateLimit(scope: string, senderScope: string | number, minIntervalMs: number) {
  const key = `${scope}:${String(senderScope)}`;
  const now = Date.now();
  const lastAt = requestTimestamps.get(key) ?? 0;

  if (now - lastAt < minIntervalMs) {
    throw new Error(`Rate limit exceeded for ${scope}`);
  }

  requestTimestamps.set(key, now);
}

export function logSecurityEvent(action: string, details?: Record<string, AuditValue>) {
  if (!isAuditEnabled()) return;

  const entry = {
    ts: new Date().toISOString(),
    action,
    details,
  };

  try {
    fs.appendFileSync(getAuditLogPath(), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.warn('Failed to append security audit log:', error);
  }
}
