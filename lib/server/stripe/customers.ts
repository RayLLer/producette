import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/server/db';
import { accounts } from '@/lib/server/db/generated/schema';
import { stripe } from '@/lib/server/stripe';
import type { Viewer } from '@/lib/server/auth';

/**
 * Returns the Stripe customer id of the viewer's account, creating it if missing.
 * Call it when the email is confirmed, after Google login and before any money action.
 * The idempotency key makes concurrent calls within 24 h return the same customer.
 */
export async function ensureStripeCustomer(viewer: Viewer): Promise<string> {
  const [account] = await db
    .select({ customerId: accounts.stripeCustomerId, anonymizedAt: accounts.anonymizedAt })
    .from(accounts)
    .where(eq(accounts.id, viewer.id));

  if (!account) throw new Error('account_not_found');
  if (account.anonymizedAt) throw new Error('account_anonymized');
  if (account.customerId) return account.customerId;

  const customer = await stripe.customers.create(
    { email: viewer.email, metadata: { user_id: viewer.id } },
    { idempotencyKey: `customer-${viewer.id}` },
  );

  const [saved] = await db
    .update(accounts)
    .set({ stripeCustomerId: customer.id })
    .where(and(eq(accounts.id, viewer.id), isNull(accounts.stripeCustomerId)))
    .returning({ customerId: accounts.stripeCustomerId });
  if (saved?.customerId) return saved.customerId;

  // Another request saved a customer first: keep the stored one.
  const [current] = await db
    .select({ customerId: accounts.stripeCustomerId })
    .from(accounts)
    .where(eq(accounts.id, viewer.id));
  if (!current?.customerId) throw new Error('stripe_customer_not_saved');
  return current.customerId;
}
