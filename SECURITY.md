# Security Notes

This app runs as an Electron desktop application with a default-deny posture.

## Electron posture

- `contextIsolation` is enabled.
- `nodeIntegration` is disabled.
- Main-window `sandbox` is enabled.
- `webSecurity` is enabled.
- Insecure content is not allowed.
- Permission requests are denied by default.
- New windows are denied by default.
- `webview` attachment is blocked.
- In-window navigation is blocked unless it stays inside the local app shell.

## Secrets and local storage

- API tokens and credentials are stored through Electron `safeStorage` via the secure-store layer.
- Renderer access to the app store is whitelisted by key and validated before persistence.
- Sensitive IPC write paths sanitize payloads before they touch local disk or third-party APIs.

## Plaid

- Plaid Link runs in its own dedicated BrowserWindow.
- The Plaid renderer is scoped so success and exit IPC messages are only accepted from that window.
- Plaid navigation and popup creation are denied.
- The injected Plaid page uses a constrained Content Security Policy.
- Plaid remains the one compatibility carveout where `sandbox` is disabled for SDK behavior.

## Audit logging

- Audit logging is optional and controlled by `Settings > Privacy > Audit Log`.
- When enabled, sensitive actions append JSON lines to:
  - `app.getPath("userData")/security-audit.log`
- Logged actions are intentionally narrow and operational:
  - external link opens
  - Asana writes
  - Google Calendar writes
  - Plaid connect and exchange events
  - AI request starts

## Rate limiting

- Sensitive IPC handlers apply lightweight per-renderer cooldowns.
- The goal is abuse resistance and accidental-spam protection, not user-visible throttling.
