import path from 'node:path';
import { BrowserWindow, ipcMain } from 'electron';

export function openPlaidLink(linkToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const win = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Connect your bank',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Plaid SDK uses iframes that may break with sandbox: true
        preload: path.join(__dirname, 'plaid-link-preload.js'),
      },
    });

    // Use JSON.stringify for safe injection of the link token
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; background: #0A0A0A; }</style>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"><\/script>
</head>
<body>
  <script>
    const handler = Plaid.create({
      token: ${JSON.stringify(linkToken)},
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
      if (settled) return;
      settled = true;
      cleanup();
      win.close();
      resolve(publicToken);
    };

    const onExit = (_event: unknown, errorMessage: string | null) => {
      if (settled) return;
      settled = true;
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
      if (settled) return;
      settled = true;
      reject(new Error('Window closed'));
    });
  });
}
