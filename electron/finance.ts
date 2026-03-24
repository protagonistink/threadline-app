import { ipcMain } from 'electron';
import { getDb, accounts, obligations, revenue, category_spend, action_items } from './db';
import { store } from './store';
import { computeEngineState } from '../engine';
import type { FinancialData } from '../engine';
import type { Obligation, RevenueEntry, EngineState } from '../engine/types';
import * as plaid from './plaid';
import { openPlaidLink } from './plaid-link';
import { eq } from 'drizzle-orm';
import { getFinanceProvider } from './finance-provider';

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysUntil(dateStr: string, today: Date): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = target.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Data assembly
// ---------------------------------------------------------------------------

function assembleFinancialData(): FinancialData {
  const db = getDb();

  // Cash on hand = sum of available balances across all accounts
  const accountRows = db.select().from(accounts).all();
  const cashOnHand = accountRows.reduce((sum, a) => sum + a.available_balance, 0);

  // Obligations
  const obligationRows = db.select().from(obligations).all();
  const mappedObligations: Obligation[] = obligationRows.map(row => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    dueDate: new Date(row.due_date),
    severityTier: row.severity_tier as Obligation['severityTier'],
    timePressure: row.time_pressure as Obligation['timePressure'],
    reliefPerDollar: row.relief_per_dollar,
    negotiability: row.negotiability,
    bestAction: row.best_action as Obligation['bestAction'],
    consequenceIfIgnored: row.consequence_if_ignored,
    cashReserved: 0,
    isPastDue: row.is_past_due,
    daysUntilDue: row.days_until_due,
  }));

  // Revenue
  const revenueRows = db.select().from(revenue).all();
  const mappedRevenue: RevenueEntry[] = revenueRows.map(row => ({
    id: row.id,
    amount: row.amount,
    expectedDate: new Date(row.expected_date),
    confidence: row.confidence as RevenueEntry['confidence'],
    sourceType: row.source_type,
    description: row.description,
    unlocks: (() => {
      try { return JSON.parse(row.unlocks) as string[]; } catch { return []; }
    })(),
  }));

  // Confirmed income for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const income = mappedRevenue
    .filter(r => r.confidence === 'confirmed' && r.expectedDate >= monthStart && r.expectedDate <= monthEnd)
    .reduce((sum, r) => sum + r.amount, 0);

  // Spent from flex = sum of non-business category spend
  const spendRows = db.select().from(category_spend).all();
  const spentFromFlex = spendRows
    .filter(row => !row.is_business_expense)
    .reduce((sum, row) => sum + row.spent, 0);

  // Catch-up needs = sum of past-due obligation amounts
  const catchUpNeeds = mappedObligations
    .filter(o => o.isPastDue)
    .reduce((sum, o) => sum + o.amount, 0);

  // Finance config from store
  const financeConfig = (store.get('financeConfig') as {
    flexPoolTarget: number;
    survivalNeeds: number;
    untouchableNeeds: number;
  }) ?? { flexPoolTarget: 0, survivalNeeds: 0, untouchableNeeds: 0 };

  return {
    obligations: mappedObligations,
    revenue: mappedRevenue,
    transactions: [],
    income,
    cashOnHand,
    flexPoolTarget: financeConfig.flexPoolTarget ?? 0,
    spentFromFlex,
    survivalNeeds: financeConfig.survivalNeeds ?? 0,
    untouchableNeeds: financeConfig.untouchableNeeds ?? 0,
    catchUpNeeds,
    today: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Plaid sync
// ---------------------------------------------------------------------------

async function syncPlaidData(): Promise<void> {
  const db = getDb();
  const provider = getFinanceProvider();
  if (provider.connect) {
    await provider.connect();
  }

  // 1. Fetch and upsert balances
  const balances = await provider.getBalances();
  const now = new Date().toISOString();

  for (const acct of balances) {
    db.insert(accounts)
      .values({
        id: acct.id,
        name: acct.name,
        type: String(acct.type),
        current_balance: acct.currentBalance,
        available_balance: acct.availableBalance,
        institution: acct.institution,
        last_synced: now,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: {
          name: acct.name,
          type: String(acct.type),
          current_balance: acct.currentBalance,
          available_balance: acct.availableBalance,
          institution: acct.institution,
          last_synced: now,
        },
      })
      .run();
  }

  // 2. Get account IDs for recurring lookup
  const accountIds = balances.map(a => a.id);

  // 3. Fetch and upsert recurring outflow streams as obligations
  const today = new Date();
  const todayStr = toIsoDate(today);
  const horizonEnd = toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14));
  const recurring = await provider.getRecurring(accountIds, todayStr, horizonEnd);

  for (const stream of recurring) {
    const id = `${provider.name}-${stream.id}`;
    const name = stream.name;
    const amount = stream.amount;
    const dueDate = stream.nextDate ?? todayStr;
    const daysUntilDue = getDaysUntil(dueDate, today);

    db.insert(obligations)
      .values({
        id,
        name,
        amount,
        due_date: dueDate,
        severity_tier: 'annoyance_reputational',
        time_pressure: daysUntilDue <= 0 ? 'due_today' : daysUntilDue <= 7 ? 'due_this_week' : 'flexible_if_contacted',
        relief_per_dollar: 0.5,
        negotiability: 0.5,
        best_action: 'pay',
        consequence_if_ignored: '',
        is_past_due: daysUntilDue < 0,
        days_until_due: daysUntilDue,
        category: 'personal',
        frequency: stream.frequency ?? 'monthly',
        source: provider.name,
      })
      .onConflictDoUpdate({
        target: obligations.id,
        set: {
          name,
          amount,
          due_date: dueDate,
          time_pressure: daysUntilDue <= 0 ? 'due_today' : daysUntilDue <= 7 ? 'due_this_week' : 'flexible_if_contacted',
          is_past_due: daysUntilDue < 0,
          days_until_due: daysUntilDue,
          frequency: stream.frequency ?? 'monthly',
          source: provider.name,
        },
      })
      .run();
  }

  // 4. Fetch and upsert category spend
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = toIsoDate(monthStart);
  const todayDateStr = toIsoDate(today);

  const categorySpendData = await provider.getCategorySpend(monthStartStr, todayDateStr, accountIds);

  for (const item of categorySpendData) {
    const id = `${provider.name}-${item.category}-${monthStartStr}`;

    db.insert(category_spend)
      .values({
        id,
        category: item.category,
        spent: item.spent,
        budget: null,
        cycle_start: monthStartStr,
        cycle_end: todayDateStr,
        is_business_expense: false,
        last_synced: now,
      })
      .onConflictDoUpdate({
        target: category_spend.id,
        set: {
          spent: item.spent,
          cycle_end: todayDateStr,
          last_synced: now,
        },
      })
      .run();
  }

  // 5. Update store with sync metadata
  store.set('finance.configured', provider.isConfigured());
  store.set('plaid.lastSync', now);

  // Attempt to get institution name from first account
  if (balances.length > 0 && balances[0].institution) {
    store.set('plaid.institutionName', balances[0].institution);
  }
}

// ---------------------------------------------------------------------------
// Engine state
// ---------------------------------------------------------------------------

export function getEngineState(): EngineState & { actionItems: Array<Record<string, unknown>> } {
  const data = assembleFinancialData();
  const engineState = computeEngineState(data);
  const db = getDb();
  const items = db.select().from(action_items).all();
  return { ...engineState, actionItems: items };
}

// ---------------------------------------------------------------------------
// IPC handler registration
// ---------------------------------------------------------------------------

export function registerFinanceHandlers(): void {
  // finance:get-state — assemble data and run engine
  ipcMain.handle('finance:get-state', async () => {
    try {
      return getEngineState();
    } catch (err) {
      console.error('[finance:get-state]', err);
      return null;
    }
  });

  // finance:get-accounts — raw account balances for UI
  ipcMain.handle('finance:get-accounts', async () => {
    try {
      const db = getDb();
      return db.select().from(accounts).all();
    } catch (err) {
      console.error('[finance:get-accounts]', err);
      return [];
    }
  });

  // finance:refresh — sync Plaid then return engine state
  ipcMain.handle('finance:refresh', async () => {
    try {
      await syncPlaidData();
      return getEngineState();
    } catch (err) {
      console.error('[finance:refresh]', err);
      return null;
    }
  });

  // finance:plaid-link — full Plaid Link OAuth flow
  ipcMain.handle('finance:plaid-link', async () => {
    try {
      const provider = getFinanceProvider();
      if (provider.name !== 'plaid') {
        return { success: false };
      }
      const linkToken = await plaid.createLinkToken();
      const publicToken = await openPlaidLink(linkToken);
      await plaid.exchangePublicToken(publicToken);
      await syncPlaidData();
      return { success: true };
    } catch (err) {
      console.error('[finance:plaid-link]', err);
      return { success: false };
    }
  });

  // finance:plaid-exchange — exchange a public token received externally
  ipcMain.handle('finance:plaid-exchange', async (_event, publicToken: string) => {
    try {
      const provider = getFinanceProvider();
      if (provider.name !== 'plaid' || !provider.exchangePublicToken) {
        return { success: false };
      }
      await provider.exchangePublicToken(publicToken);
      await syncPlaidData();
      return { success: true };
    } catch (err) {
      console.error('[finance:plaid-exchange]', err);
      return { success: false };
    }
  });
}
