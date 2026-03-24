import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('plaidBridge', {
  onSuccess: (publicToken: string) => ipcRenderer.send('plaid-link:success', publicToken),
  onExit: (errorMessage: string | null) => ipcRenderer.send('plaid-link:exit', errorMessage),
});
