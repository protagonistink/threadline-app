import { getSecure } from './secure-store';
import * as plaid from './plaid';

export type FinanceProviderName = 'plaid';

export interface ProviderBalance {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  availableBalance: number;
  institution: string;
}

export interface ProviderRecurringItem {
  id: string;
  name: string;
  amount: number;
  nextDate: string | null;
  frequency: string | null;
  category: string | null;
}

export interface ProviderCategorySpend {
  category: string;
  spent: number;
}

export interface FinanceProvider {
  name: FinanceProviderName;
  isConfigured: () => boolean;
  connect?: () => Promise<void>;
  exchangePublicToken?: (publicToken: string) => Promise<void>;
  getBalances: () => Promise<ProviderBalance[]>;
  getRecurring: (accountIds: string[]) => Promise<ProviderRecurringItem[]>;
  getCategorySpend: (startDate: string, endDate: string, accountIds: string[]) => Promise<ProviderCategorySpend[]>;
}

const plaidProvider: FinanceProvider = {
  name: 'plaid',
  isConfigured: () => Boolean(getSecure('plaid.accessToken')),
  getBalances: () => plaid.getBalances(),
  getRecurring: async (accountIds) => {
    const recurring = await plaid.getRecurring(accountIds);
    return recurring.outflow.map((stream) => ({
      id: stream.stream_id,
      name: stream.merchant_name ?? stream.description ?? 'Unknown',
      amount: Math.abs(stream.average_amount?.amount ?? 0),
      nextDate: null,
      frequency: stream.frequency ?? null,
      category: null,
    }));
  },
  getCategorySpend: (startDate, endDate) => plaid.getCategorySpend(startDate, endDate),
  exchangePublicToken: (publicToken) => plaid.exchangePublicToken(publicToken),
};

export function getFinanceProvider(): FinanceProvider {
  return plaidProvider;
}
