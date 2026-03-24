import { getFinanceProvider } from './finance-provider';

export async function connectMonarch(): Promise<void> {
  const provider = getFinanceProvider();
  if (provider.name !== 'monarch' || !provider.connect) {
    throw new Error('Monarch provider not active');
  }
  await provider.connect();
}
