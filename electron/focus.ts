import { ipcMain } from 'electron';
import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { store } from './store';

const HOSTS_PATH = '/etc/hosts';
const HOSTS_MARKER = '# Inked Focus Mode';

// Strict hostname validation — only allow valid DNS names through to shell commands
const VALID_HOSTNAME = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function runPrivilegedShell(command: string) {
  const script = `do shell script ${JSON.stringify(command)} with administrator privileges`;

  return new Promise<void>((resolve, reject) => {
    exec(`osascript -e ${shellQuote(script)}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function blockSites() {
  const rawSites = (store.get('focus.blockedSites') as string[]) || [];
  const sites = rawSites.filter(site => VALID_HOSTNAME.test(site) && site.length <= 253);
  if (sites.length === 0) return;

  const hostsContent = await readFile(HOSTS_PATH, 'utf-8');

  // Don't add if already present
  if (hostsContent.includes(HOSTS_MARKER)) return;

  const block = [
    '',
    HOSTS_MARKER,
    ...sites.flatMap((site) => [`127.0.0.1 ${site}`, `127.0.0.1 www.${site}`]),
    `${HOSTS_MARKER} END`,
    '',
  ].join('\n');

  await runPrivilegedShell(
    `printf %s ${shellQuote(block)} >> ${shellQuote(HOSTS_PATH)} && dscacheutil -flushcache && killall -HUP mDNSResponder`
  );
}

async function unblockSites() {
  const hostsContent = await readFile(HOSTS_PATH, 'utf-8');

  if (!hostsContent.includes(HOSTS_MARKER)) return;

  const removalScript = String.raw`\n?\Q# Inked Focus Mode\E[\s\S]*?\Q# Inked Focus Mode END\E\n?`;
  await runPrivilegedShell(
    `/usr/bin/perl -0pi -e ${shellQuote(`s/${removalScript}//g`)} ${shellQuote(HOSTS_PATH)} && dscacheutil -flushcache && killall -HUP mDNSResponder`
  );
}

export function registerFocusHandlers() {
  ipcMain.handle('focus:enable', async () => {
    try {
      await blockSites();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('focus:disable', async () => {
    try {
      await unblockSites();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
