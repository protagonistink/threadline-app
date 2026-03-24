import { getSecure } from './secure-store';
import { store } from './store';

const YNAB_API_BASE = 'https://api.ynab.com/v1';

interface YnabPlan {
  id: string;
  name: string;
}

interface YnabAccount {
  id: string;
  name: string;
  type: string;
  closed: boolean;
  deleted: boolean;
  balance: number;
}

interface YnabScheduledTransaction {
  id: string;
  amount: number;
  frequency?: string | null;
  date_next?: string | null;
  payee_name?: string | null;
  memo?: string | null;
  category_name?: string | null;
  deleted?: boolean;
}

interface YnabTransaction {
  id: string;
  amount: number;
  date: string;
  deleted: boolean;
  transfer_transaction_id?: string | null;
  category_name?: string | null;
}

function toUnits(milliunits: number): number {
  return milliunits / 1000;
}

async function ynabFetch<T>(path: string): Promise<T> {
  const token = getSecure('ynab.token');
  if (!token) {
    throw new Error('YNAB token not configured');
  }

  const response = await fetch(`${YNAB_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YNAB request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getPrimaryPlan(): Promise<YnabPlan> {
  const response = await ynabFetch<{ data: { plans: YnabPlan[] } }>('/plans');
  const configuredPlanId = String(store.get('finance.ynabPlanId') || '');
  const plan =
    response.data.plans.find((item) => item.id === configuredPlanId) ??
    response.data.plans[0];
  if (!plan) {
    throw new Error('No YNAB plans found');
  }
  store.set('finance.ynabPlanId', plan.id);
  store.set('finance.ynabPlanName', plan.name);
  return plan;
}

export async function getAccountsForPlan(planId: string): Promise<YnabAccount[]> {
  const response = await ynabFetch<{ data: { accounts: YnabAccount[] } }>(`/plans/${planId}/accounts`);
  return response.data.accounts.filter((account) => !account.closed && !account.deleted);
}

export async function getScheduledTransactionsForPlan(planId: string): Promise<YnabScheduledTransaction[]> {
  const response = await ynabFetch<{ data: { scheduled_transactions: YnabScheduledTransaction[] } }>(
    `/plans/${planId}/scheduled_transactions`
  );
  return response.data.scheduled_transactions.filter((transaction) => !transaction.deleted);
}

export async function getTransactionsForPlan(
  planId: string,
  sinceDate: string
): Promise<YnabTransaction[]> {
  const response = await ynabFetch<{ data: { transactions: YnabTransaction[] } }>(
    `/plans/${planId}/transactions?since_date=${sinceDate}`
  );
  return response.data.transactions.filter((transaction) => !transaction.deleted);
}

export function mapYnabAccountBalance(balance: number): number {
  return toUnits(balance);
}

export function mapYnabAmount(amount: number): number {
  return Math.abs(toUnits(amount));
}
