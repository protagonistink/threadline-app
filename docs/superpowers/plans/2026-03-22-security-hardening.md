# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Electron app's credential storage, Plaid Link window isolation, OAuth flow, shell command safety, and gitignore coverage before real financial data flows through.

**Architecture:** Use Electron's `safeStorage` API (available in Electron 33) to encrypt all API keys/tokens at rest, replacing the plaintext electron-store approach. Fix the Plaid Link BrowserWindow to use proper isolation. Validate shell inputs with a strict allowlist. Update .gitignore for defense-in-depth.

**Tech Stack:** Electron 33 (`safeStorage`), `electron-store`, `better-sqlite3`, TypeScript

---

### Task 1: Update .gitignore with sensitive file patterns

**Files:**
- Modify: `.gitignore`

This is standalone and protects against future accidents.

- [ ] **Step 1: Add sensitive patterns to .gitignore**

Append these patterns to `.gitignore`:

```
# Secrets & credentials
.env
.env.*
*.pem
*.key
credentials*

# Database files
*.db
*.sqlite

# Editor/tool local state
.claude/
.superpowers/
```

- [ ] **Step 2: Verify no tracked files match new patterns**

Run: `git ls-files -i --exclude-from=.gitignore`
Expected: Empty output (no currently tracked files match)

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: harden .gitignore with sensitive file patterns"
```

---

### Task 2: Encrypt credentials at rest with safeStorage

**Files:**
- Create: `electron/secure-store.ts`
- Modify: `electron/store.ts`
- Modify: `electron/plaid.ts`
- Modify: `electron/gcal.ts`
- Modify: `electron/asana.ts` (imports token from store)
- Modify: `electron/anthropic.ts` (imports key from store)
- Test: Manual — verify settings save/load still works, existing plaintext keys migrate on first launch

This is the biggest task. The approach: create a `SecureStore` wrapper that uses `safeStorage.encryptString()` / `decryptString()` to store sensitive values as base64-encoded encrypted blobs inside electron-store. Non-sensitive values stay plaintext. On first launch after upgrade, migrate any existing plaintext values.

**Sensitive keys** (encrypt these):
- `anthropic.apiKey`
- `asana.token`
- `gcal.clientId`, `gcal.clientSecret`, `gcal.accessToken`, `gcal.refreshToken`
- `plaid.clientId`, `plaid.secret`, `plaid.accessToken`

- [ ] **Step 1: Create electron/secure-store.ts**

```typescript
import { safeStorage } from 'electron';
import { store } from './store';

// Keys that must be encrypted at rest
const SENSITIVE_KEYS = new Set([
  'anthropic.apiKey',
  'asana.token',
  'gcal.clientId',
  'gcal.clientSecret',
  'gcal.accessToken',
  'gcal.refreshToken',
  'plaid.clientId',
  'plaid.secret',
  'plaid.accessToken',
]);

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
    // Remove plaintext if it exists
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
```

- [ ] **Step 2: Update electron/store.ts settings:save handler to use setSecure**

Replace the credential writes in the `settings:save` handler. Import `setSecure` from `./secure-store` and replace:
- `store.set('anthropic.apiKey', ...)` → `setSecure('anthropic.apiKey', ...)`
- `store.set('asana.token', ...)` → `setSecure('asana.token', ...)`
- `store.set('gcal.clientId', ...)` → `setSecure('gcal.clientId', ...)`
- `store.set('gcal.clientSecret', ...)` → `setSecure('gcal.clientSecret', ...)`
- `store.set('plaid.clientId', ...)` → `setSecure('plaid.clientId', ...)`
- `store.set('plaid.secret', ...)` → `setSecure('plaid.secret', ...)`

- [ ] **Step 3: Update electron/store.ts settings:load to use getSecure**

In the `settings:load` handler, replace reads of sensitive keys:
- `store.get('anthropic.apiKey')` → `getSecure('anthropic.apiKey')`
- `store.get('asana.token')` → `getSecure('asana.token')`
- etc.

The `settings:load` handler only exposes `configured: Boolean(...)` for most keys, so this is straightforward.

- [ ] **Step 4: Update electron/plaid.ts to use getSecure**

Import `getSecure` and replace:
- `store.get('plaid.clientId')` → `getSecure('plaid.clientId')`
- `store.get('plaid.secret')` → `getSecure('plaid.secret')`
- `store.get('plaid.accessToken')` → `getSecure('plaid.accessToken')`

For `store.set('plaid.accessToken', ...)` in `exchangePublicToken()`, use `setSecure`.

- [ ] **Step 5: Update electron/gcal.ts to use getSecure/setSecure**

Import `getSecure` and `setSecure`. Replace:
- `store.get('gcal.clientId')` → `getSecure('gcal.clientId')`
- `store.get('gcal.clientSecret')` → `getSecure('gcal.clientSecret')`
- `store.get('gcal.accessToken')` → `getSecure('gcal.accessToken')`
- `store.get('gcal.refreshToken')` → `getSecure('gcal.refreshToken')`
- `store.set('gcal.accessToken', ...)` → `setSecure('gcal.accessToken', ...)`
- `store.set('gcal.refreshToken', ...)` → `setSecure('gcal.refreshToken', ...)`

- [ ] **Step 6: Update electron/asana.ts to use getSecure**

Import `getSecure`. Replace `store.get('asana.token')` → `getSecure('asana.token')`.

- [ ] **Step 7: Update electron/anthropic.ts to use getSecure**

Import `getSecure`. Replace `store.get('anthropic.apiKey')` → `getSecure('anthropic.apiKey')`.

- [ ] **Step 8: Call migrateToEncrypted() at app startup**

In `electron/main.ts`, after `app.whenReady()` and before registering handlers:
```typescript
import { migrateToEncrypted } from './secure-store';
// ... inside whenReady callback, before registerXxxHandlers():
migrateToEncrypted();
```

- [ ] **Step 9: Build and verify**

Run: `npm run build:app`
Expected: Clean TypeScript compilation, no errors.

- [ ] **Step 10: Commit**

```bash
git add electron/secure-store.ts electron/store.ts electron/plaid.ts electron/gcal.ts electron/asana.ts electron/anthropic.ts electron/main.ts
git commit -m "security: encrypt credentials at rest using Electron safeStorage

API keys, tokens, and secrets are now encrypted via macOS Keychain
(safeStorage). Existing plaintext values auto-migrate on first launch."
```

---

### Task 3: Fix Plaid Link window isolation

**Files:**
- Modify: `electron/plaid-link.ts`

The current implementation uses `contextIsolation: false` + `nodeIntegration: true` so inline `<script>` can `require('electron')`. Fix: use `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and communicate via `postMessage` + the main process listening on the webContents.

- [ ] **Step 1: Rewrite plaid-link.ts with proper isolation**

```typescript
import { BrowserWindow, ipcMain } from 'electron';

export function openPlaidLink(linkToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Connect your bank',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // The HTML uses window.postMessage instead of ipcRenderer
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; background: #0A0A0A; }</style>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"><\/script>
</head>
<body>
  <script>
    const handler = Plaid.create({
      token: '${linkToken}',
      onSuccess: (publicToken) => {
        window.postMessage({ type: 'plaid-success', publicToken }, '*');
      },
      onExit: (err) => {
        window.postMessage({ type: 'plaid-exit', error: err ? err.error_message : null }, '*');
      },
    });
    handler.open();
  <\/script>
</body>
</html>`;

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Listen for postMessage from the renderer via webContents
    win.webContents.on('console-message', () => { /* ignore */ });

    win.webContents.on('ipc-message', () => { /* not used */ });

    // Intercept window.postMessage via did-create-window or preload
    // Actually, the clean approach: inject a tiny preload that forwards postMessage
    // But since we want sandbox: true with no preload, use webContents event:

    // Listen to messages via the main frame's JS
    const pollInterval = setInterval(() => {
      if (win.isDestroyed()) {
        clearInterval(pollInterval);
        return;
      }
      win.webContents.executeJavaScript(`
        (() => {
          if (window.__plaidResult) {
            const r = window.__plaidResult;
            window.__plaidResult = null;
            return r;
          }
          return null;
        })()
      `).then(result => {
        if (result) {
          clearInterval(pollInterval);
          win.close();
          if (result.type === 'plaid-success') {
            resolve(result.publicToken);
          } else {
            reject(new Error(result.error || 'User cancelled'));
          }
        }
      }).catch(() => { /* window may be closed */ });
    }, 200);

    win.on('closed', () => {
      clearInterval(pollInterval);
      reject(new Error('Window closed'));
    });
  });
}
```

Wait — `executeJavaScript` polling is ugly. Better approach: use a **minimal preload** that only exposes a message bridge, no Node APIs.

**Revised approach:** Create a tiny preload for the Plaid window that uses `contextBridge` to expose only a callback setter.

- [ ] **Step 1 (revised): Create electron/plaid-link-preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('plaidBridge', {
  onSuccess: (publicToken: string) => ipcRenderer.send('plaid-link:success', publicToken),
  onExit: (errorMessage: string | null) => ipcRenderer.send('plaid-link:exit', errorMessage),
});
```

- [ ] **Step 2: Update plaid-link.ts to use isolation + preload**

```typescript
import path from 'node:path';
import { BrowserWindow, ipcMain } from 'electron';

export function openPlaidLink(linkToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Connect your bank',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'plaid-link-preload.js'),
      },
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; background: #0A0A0A; }</style>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"><\/script>
</head>
<body>
  <script>
    const handler = Plaid.create({
      token: '${linkToken}',
      onSuccess: (publicToken) => {
        window.plaidBridge.onSuccess(publicToken);
      },
      onExit: (err) => {
        window.plaidBridge.onExit(err ? err.error_message : null);
      },
    });
    handler.open();
  <\/script>
</body>
</html>`;

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    const onSuccess = (_event: unknown, publicToken: string) => {
      cleanup();
      win.close();
      resolve(publicToken);
    };

    const onExit = (_event: unknown, errorMessage: string | null) => {
      cleanup();
      win.close();
      if (errorMessage) reject(new Error(errorMessage));
      else reject(new Error('User cancelled'));
    };

    function cleanup() {
      ipcMain.removeListener('plaid-link:success', onSuccess);
      ipcMain.removeListener('plaid-link:exit', onExit);
    }

    ipcMain.once('plaid-link:success', onSuccess);
    ipcMain.once('plaid-link:exit', onExit);

    win.on('closed', () => {
      cleanup();
      reject(new Error('Window closed'));
    });
  });
}
```

- [ ] **Step 3: Add plaid-link-preload to Vite electron build config**

Check `vite.config.ts` — the Vite electron plugin needs to know about this new entry point so it gets compiled to `dist-electron/plaid-link-preload.js`.

- [ ] **Step 4: Build and verify**

Run: `npm run build:app`
Expected: Clean compilation. `dist-electron/plaid-link-preload.js` exists.

- [ ] **Step 5: Commit**

```bash
git add electron/plaid-link.ts electron/plaid-link-preload.ts vite.config.ts
git commit -m "security: isolate Plaid Link window with contextIsolation + sandbox

Plaid Link window now uses contextIsolation: true, nodeIntegration: false,
sandbox: true. Communication via a minimal preload bridge instead of
direct require('electron')."
```

---

### Task 4: Harden focus mode shell input validation

**Files:**
- Modify: `electron/focus.ts`

The current `shellQuote()` is decent but blocked sites come from user-configurable store. Add a strict domain validation regex that rejects anything that isn't a valid hostname.

- [ ] **Step 1: Add domain validation to blockSites()**

In `electron/focus.ts`, add validation before using sites in shell commands:

```typescript
const VALID_HOSTNAME = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

async function blockSites() {
  const rawSites = (store.get('focus.blockedSites') as string[]) || [];
  const sites = rawSites.filter(site => VALID_HOSTNAME.test(site) && site.length <= 253);
  if (sites.length === 0) return;
  // ... rest unchanged
}
```

- [ ] **Step 2: Build and verify**

Run: `npm run build:app`
Expected: Clean compilation.

- [ ] **Step 3: Commit**

```bash
git add electron/focus.ts
git commit -m "security: validate hostnames before passing to shell in focus mode"
```

---

### Task 5: Fix Google Calendar OAuth redirect

**Files:**
- Modify: `electron/gcal.ts`

Replace the `http://localhost:8234/callback` redirect with Electron's custom protocol handler (`inked://oauth/callback`). This avoids the port-racing vulnerability.

- [ ] **Step 1: Register custom protocol in main.ts**

In `electron/main.ts`, before `app.whenReady()`:
```typescript
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('inked', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('inked');
}
```

- [ ] **Step 2: Update gcal.ts OAuth config and flow**

Change `redirectUri` to `inked://oauth/callback`.

In the `gcal:auth` handler, replace the `will-redirect` listener approach:
- Instead of listening for redirect on the BrowserWindow, handle the `open-url` event on `app` (macOS) or `second-instance` event (Windows/Linux) that fires when the custom protocol is invoked.
- Since this is macOS-only currently, use `app.on('open-url')`.

```typescript
// In getOAuthConfig():
redirectUri: 'inked://oauth/callback',
```

In the auth handler, listen for the protocol callback:
```typescript
return new Promise((resolve) => {
  const handleUrl = (_event: Electron.Event, url: string) => {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    if (code) {
      app.removeListener('open-url', handleUrl);
      authWindow.close();
      // ... exchange code for tokens (same as current)
    }
  };
  app.on('open-url', handleUrl);

  authWindow.on('closed', () => {
    app.removeListener('open-url', handleUrl);
    resolve({ success: false, error: 'Auth window closed' });
  });
});
```

**Note:** Google OAuth requires the redirect URI to be registered in the Google Cloud Console. The user will need to update their Google Cloud project's authorized redirect URIs from `http://localhost:8234/callback` to `inked://oauth/callback`. Document this in the commit message.

- [ ] **Step 3: Build and verify**

Run: `npm run build:app`
Expected: Clean compilation.

- [ ] **Step 4: Commit**

```bash
git add electron/gcal.ts electron/main.ts
git commit -m "security: use custom protocol for GCal OAuth instead of HTTP localhost

Replaces http://localhost:8234/callback with inked://oauth/callback.
Eliminates port-racing vulnerability on localhost.

NOTE: Update Google Cloud Console authorized redirect URIs to
inked://oauth/callback."
```

---

### Task 6: Final build verification

- [ ] **Step 1: Run full build**

Run: `npm run build:app`
Expected: Clean TypeScript compilation, no errors.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All existing tests pass.
