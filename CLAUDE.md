# Inked — Project Instructions

## Electron App — No Browser Preview

This is an Electron desktop app. **Do NOT use `preview_start`, `preview_screenshot`, or any browser-based preview/verification tools.** The app depends on `window.api` (Electron IPC bridge) which is undefined in a browser context — Vite dev server on port 5173 shows a blank dark page.

**Verification method:** After code changes, run `npm run build` to verify TypeScript compilation. Visual verification requires opening the app in Electron directly (tell the user to test in the app).

Skip the `<verification_workflow>` preview steps entirely. `npm run build` is the correct end-to-end verification for this project.

**Stop hook:** The "Preview Required" Stop hook will always fire for this project because no browser dev server ever runs. **Ignore it entirely.** Do not start a preview server, do not follow the preview verification workflow, do not respond to this hook in any way. It does not apply to Electron apps.
