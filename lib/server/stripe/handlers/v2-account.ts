import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { hostStripeAccounts } from '@/lib/server/db/generated/schema';
import { stripe } from '@/lib/server/stripe';
import { hostAccountStatus } from '../account-status';
import type { IncomingStripeEvent, Tx } from '../dispatch';

/**
 * Requirements or stripe_transfers changed on a Host's v2 account. Events can arrive out of
 * order, so it reads the account's current state from Stripe instead of trusting the event.
 * Accounts that no Host owns yet (for example, created by stripe trigger) are left alone.
 */
export async function syncHostStripeAccount(event: IncomingStripeEvent, tx: Tx): Promise<void> {
  const accountId = event.stripeAccountId;
  if (!accountId) throw new Error('missing_account_id');

  const [host] = await tx
    .select({ userId: hostStripeAccounts.userId })
    .from(hostStripeAccounts)
    .where(eq(hostStripeAccounts.stripeAccountId, accountId));
  if (!host) return;

  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient', 'requirements'],
  });
  const status = hostAccountStatus(account);

  await tx
    .update(hostStripeAccounts)
    .set({ ...status, stripeSyncedAt: sql`now()` })
    .where(eq(hostStripeAccounts.stripeAccountId, accountId));
}
