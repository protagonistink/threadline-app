import { getSecure } from './secure-store';
import { store } from './store';
import * as plaid from './plaid';
import { getAccounts, getRecurringTransactions, getTransactions, requestAccountsRefreshAndWait, setToken } from 'monarch-money-api';
import {
  getAccountsForPlan,
  getPrimaryPlan,
  getScheduledTransactionsForPlan,
  getTransactionsForPlan,
  mapYnabAccountBalance,
  mapYnabAmount,
} from './ynab';

export type FinanceProviderName = 'plaid' | 'monarch' | 'ynab';

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
  getRecurring: (accountIds: string[], startDate: string, endDate: string) => Promise<ProviderRecurringItem[]>;
  getCategorySpend: (startDate: string, endDate: string, accountIds: string[]) => Promise<ProviderCategorySpend[]>;
}

function getConfiguredProviderName(): FinanceProviderName {
  const provider = String(store.get('finance.provider') || 'plaid');
  if (provider === 'monarch') return 'monarch';
  if (provider === 'ynab') return 'ynab';
  return 'plaid';
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

const monarchProvider: FinanceProvider = {
  name: 'monarch',
  isConfigured: () => Boolean(getSecure('monarch.token')),
  connect: async () => {
    const token = getSecure('monarch.token');
    if (!token) throw new Error('Monarch token not configured');
    setToken(token);
    await requestAccountsRefreshAndWait(null, 60, 5);
  },
  getBalances: async () => {
    const token = getSecure('monarch.token');
    if (!token) throw new Error('Monarch token not configured');
    setToken(token);
    const response = await getAccounts();
    return response.accounts.map((account) => ({
      id: account.id,
      name: account.displayName,
      type: account.subtype?.display ?? account.type?.display ?? account.type?.name ?? 'account',
      currentBalance: account.currentBalance ?? 0,
      availableBalance: account.currentBalance ?? 0,
      institution: account.institution?.name ?? 'Monarch',
    }));
  },
  getRecurring: async (_accountIds, startDate, endDate) => {
    const token = getSecure('monarch.token');
    if (!token) throw new Error('Monarch token not configured');
    setToken(token);
    const response = await getRecurringTransactions(startDate, endDate);
    const seen = new Set<string>();

    return response.recurringTransactionItems
      .filter((item) => {
        const id = item.stream.id;
        if (seen.has(id)) return false;
        seen.add(id);
        return item.amount > 0;
      })
      .map((item) => ({
        id: item.stream.id,
        name: item.stream.name ?? item.category?.name ?? 'Recurring',
        amount: Math.abs(item.amount ?? item.stream.amount ?? 0),
        nextDate: item.date ?? null,
        frequency: item.stream.frequency ?? item.stream.recurringType ?? null,
        category: item.category?.name ?? null,
      }));
  },
  getCategorySpend: async (startDate, endDate, accountIds) => {
    const token = getSecure('monarch.token');
    if (!token) throw new Error('Monarch token not configured');
    setToken(token);

    const byCategory = new Map<string, number>();
    let offset = 0;
    let total = 0;

    do {
      const response = await getTransactions({
        startDate,
        endDate,
        limit: 100,
        offset,
        accountIds,
      });
      const transactions = response.allTransactions.results;
      total = response.allTransactions.totalCount;

      for (const txn of transactions) {
        if (txn.amount <= 0) continue;
        const category = txn.category?.name ?? 'UNCATEGORIZED';
        byCategory.set(category, (byCategory.get(category) ?? 0) + Math.abs(txn.amount));
      }

      offset += transactions.length;
      if (transactions.length === 0) break;
    } while (offset < total);

    return Array.from(byCategory.entries()).map(([category, spent]) => ({ category, spent }));
  },
};

const ynabProvider: FinanceProvider = {
  name: 'ynab',
  isConfigured: () => Boolean(getSecure('ynab.token')),
  getBalances: async () => {
    const plan = await getPrimaryPlan();
    const accounts = await getAccountsForPlan(plan.id);
    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      currentBalance: mapYnabAccountBalance(account.balance),
      availableBalance: mapYnabAccountBalance(account.balance),
      institution: 'YNAB',
    }));
  },
  getRecurring: async () => {
    const plan = await getPrimaryPlan();
    const scheduled = await getScheduledTransactionsForPlan(plan.id);
    return scheduled
      .filter((transaction) => transaction.amount < 0)
      .map((transaction) => ({
        id: transaction.id,
        name: transaction.payee_name ?? transaction.memo ?? transaction.category_name ?? 'Scheduled transaction',
        amount: mapYnabAmount(transaction.amount),
        nextDate: transaction.date_next ?? null,
        frequency: transaction.frequency ?? null,
        category: transaction.category_name ?? null,
      }));
  },
  getCategorySpend: async (startDate) => {
    const plan = await getPrimaryPlan();
    const transactions = await getTransactionsForPlan(plan.id, startDate);
    const byCategory = new Map<string, number>();

    for (const txn of transactions) {
      if (txn.amount >= 0) continue;
      if (txn.transfer_transaction_id) continue;
      const category = txn.category_name ?? 'UNCATEGORIZED';
      byCategory.set(category, (byCategory.get(category) ?? 0) + mapYnabAmount(txn.amount));
    }

    return Array.from(byCategory.entries()).map(([category, spent]) => ({ category, spent }));
  },
};

export function getFinanceProvider(): FinanceProvider {
  const provider = getConfiguredProviderName();
  if (provider === 'monarch') return monarchProvider;
  if (provider === 'ynab') return ynabProvider;
  return plaidProvider;
}
