declare module 'monarch-money-api' {
  export function setToken(token: string): void;
  export function getAccounts(): Promise<{
    accounts: Array<{
      id: string;
      displayName: string;
      currentBalance: number;
      institution?: { name?: string | null } | null;
      type?: { name?: string | null; display?: string | null } | null;
      subtype?: { name?: string | null; display?: string | null } | null;
    }>;
  }>;
  export function getTransactions(input?: {
    limit?: number;
    offset?: number;
    startDate?: string | null;
    endDate?: string | null;
    isRecurring?: boolean | null;
    accountIds?: string[];
  }): Promise<{
    allTransactions: {
      totalCount: number;
      results: Array<{
        id: string;
        amount: number;
        date: string;
        isRecurring: boolean;
        category?: { name?: string | null } | null;
        merchant?: { name?: string | null } | null;
        account?: { id?: string | null; displayName?: string | null } | null;
      }>;
    };
  }>;
  export function getRecurringTransactions(startDate?: string | null, endDate?: string | null): Promise<{
    recurringTransactionItems: Array<{
      date: string;
      amount: number;
      isPast: boolean;
      stream: {
        id: string;
        amount: number;
        frequency?: string | null;
        recurringType?: string | null;
        name?: string | null;
      };
      category?: { name?: string | null } | null;
      account?: { id?: string | null; displayName?: string | null } | null;
    }>;
  }>;
  export function requestAccountsRefreshAndWait(
    accountIds?: string[] | null,
    timeout?: number,
    delay?: number
  ): Promise<boolean>;
}
