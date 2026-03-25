import { ipcMain } from 'electron';
import Stripe from 'stripe';
import { getSecure } from './secure-store';

function getStripeClient(): Stripe {
  const key = getSecure('stripe.secretKey');
  if (!key) throw new Error('Stripe secret key not configured. Go to Settings.');
  return new Stripe(key);
}

export interface StripeDashboardData {
  received: number;
  pending: number;
  overdue: number;
  upcoming: number;
  availableBalance: number;
  pendingBalance: number;
  recentCharges: Array<{
    id: string;
    amount: number;
    description: string | null;
    created: number;
    status: string;
    customerEmail: string | null;
  }>;
  openInvoices: Array<{
    id: string;
    amount: number;
    description: string | null;
    dueDate: number | null;
    status: string;
    customerEmail: string | null;
    isOverdue: boolean;
  }>;
}

export function registerStripeHandlers(): void {
  ipcMain.handle('stripe:get-dashboard', async () => {
    try {
      const stripe = getStripeClient();
      const now = Math.floor(Date.now() / 1000);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartUnix = Math.floor(monthStart.getTime() / 1000);

      const [charges, invoices, balance] = await Promise.all([
        stripe.charges.list({
          created: { gte: monthStartUnix },
          limit: 100,
        }),
        stripe.invoices.list({
          status: 'open',
          limit: 100,
        }),
        stripe.balance.retrieve(),
      ]);

      // Received this month: succeeded charges
      const received = charges.data
        .filter(c => c.status === 'succeeded')
        .reduce((sum, c) => sum + c.amount, 0) / 100;

      // Overdue: open invoices past due date
      const overdueInvoices = invoices.data.filter(
        inv => inv.due_date && inv.due_date < now
      );
      const overdue = overdueInvoices.reduce(
        (sum, inv) => sum + (inv.amount_due - inv.amount_paid), 0
      ) / 100;

      // Pending: open invoices not yet overdue
      const pendingInvoices = invoices.data.filter(
        inv => !inv.due_date || inv.due_date >= now
      );
      const pending = pendingInvoices.reduce(
        (sum, inv) => sum + (inv.amount_due - inv.amount_paid), 0
      ) / 100;

      // Upcoming: draft invoices (fetch separately)
      let upcoming = 0;
      try {
        const draftInvoices = await stripe.invoices.list({
          status: 'draft',
          limit: 100,
        });
        upcoming = draftInvoices.data.reduce(
          (sum, inv) => sum + (inv.amount_due - inv.amount_paid), 0
        ) / 100;
      } catch {
        // Draft invoices not available — that's fine
      }

      // Balance
      const availableBalance = balance.available.reduce(
        (sum, b) => sum + b.amount, 0
      ) / 100;
      const pendingBalance = balance.pending.reduce(
        (sum, b) => sum + b.amount, 0
      ) / 100;

      // Recent charges for detail view
      const recentCharges = charges.data
        .filter(c => c.status === 'succeeded')
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          amount: c.amount / 100,
          description: c.description,
          created: c.created,
          status: c.status,
          customerEmail: typeof c.billing_details?.email === 'string'
            ? c.billing_details.email : null,
        }));

      // Open invoices for detail view
      const openInvoices = invoices.data.map(inv => ({
        id: inv.id,
        amount: (inv.amount_due - inv.amount_paid) / 100,
        description: inv.description,
        dueDate: inv.due_date,
        status: inv.status ?? 'open',
        customerEmail: typeof inv.customer_email === 'string'
          ? inv.customer_email : null,
        isOverdue: Boolean(inv.due_date && inv.due_date < now),
      }));

      const result: StripeDashboardData = {
        received,
        pending,
        overdue,
        upcoming,
        availableBalance,
        pendingBalance,
        recentCharges,
        openInvoices,
      };

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('stripe:test-connection', async () => {
    try {
      const stripe = getStripeClient();
      const balance = await stripe.balance.retrieve();
      return { success: true, data: { currency: balance.available[0]?.currency ?? 'usd' } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
