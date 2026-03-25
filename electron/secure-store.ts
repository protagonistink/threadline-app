import { safeStorage } from 'electron';
import { store } from './store';

// Keys that must be encrypted at rest
const SENSITIVE_KEYS = [
  'anthropic.apiKey',
  'asana.token',
  'gcal.clientId',
  'gcal.clientSecret',
  'gcal.accessToken',
  'gcal.refreshToken',
  'plaid.clientId',
  'plaid.secret',
  'plaid.accessToken',
  'stripe.secretKey',
] as const;

function encryptedKey(key: string): string {
  return `_encrypted.${key}`;
}

/**
 * Store a sensitive value encrypted, removing any plaintext version.
 */
export function setSecure(key: string, value: string): void {
  if (!value) {
    store.delete(encryptedKey(key) as never);
    store.delete(key as never);
    return;
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    store.set(encryptedKey(key), encrypted.toString('base64'));
    // Remove plaintext
    store.delete(key as never);
  } else {
    // Fallback: store plaintext (shouldn't happen on macOS)
    store.set(key, value);
  }
}

/**
 * Retrieve a sensitive value, decrypting if stored encrypted.
 */
export function getSecure(key: string): string {
  // Try encrypted first
  const encrypted = store.get(encryptedKey(key)) as string | undefined;
  if (encrypted) {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
  }

  // Fall back to plaintext (pre-migration or encryption unavailable)
  return (store.get(key) as string) ?? '';
}

/**
 * Migrate existing plaintext secrets to encrypted storage.
 * Call once at app startup after safeStorage is ready.
 */
export function migrateToEncrypted(): void {
  if (!safeStorage.isEncryptionAvailable()) return;

  for (const key of SENSITIVE_KEYS) {
    const existing = store.get(encryptedKey(key)) as string | undefined;
    if (existing) continue; // Already migrated

    const plaintext = store.get(key) as string | undefined;
    if (plaintext) {
      setSecure(key, plaintext);
    }
  }
}
