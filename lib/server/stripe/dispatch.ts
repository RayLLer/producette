import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/server/db';
import { stripeEvents } from '@/lib/server/db/generated/schema';
import { stripeErrorCode } from '@/lib/server/stripe';
import { syncHostStripeAccount } from './handlers/v2-account';

export type StripeEventSource = 'platform' | 'connect' | 'v2';

export interface IncomingStripeEvent {
  id: string;
  type: string;
  source: StripeEventSource;
  /** Connected account behind the event (connect and v2 events). */
  stripeAccountId: string | null;
  /** Full event as Stripe sent it (snapshot) or as fetched (thin). */
  payload: unknown;
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type StripeEventHandler = (event: IncomingStripeEvent, tx: Tx) => Promise<void>;
export type DispatchResult = 'processed' | 'ignored' | 'duplicate' | 'failed';

// One file per handler under ./handlers. Payments, Identity, transfers and disputes come later.
export const STRIPE_EVENT_HANDLERS: Readonly<Record<string, StripeEventHandler>> = {
  'v2.core.account[requirements].updated': syncHostStripeAccount,
  'v2.core.account[configuration.recipient].capability_status_updated': syncHostStripeAccount,
};

/**
 * Records the event once and processes it at most once:
 * - already processed → 'duplicate', nothing runs again (the route answers 200);
 * - no handler → stored as 'ignored';
 * - handler throws → its savepoint rolls back, the error code is saved and the route
 *   answers 500 so Stripe retries; the retry runs the handler again.
 */
export async function handleStripeEvent(
  event: IncomingStripeEvent,
  handlers: Readonly<Record<string, StripeEventHandler>> = STRIPE_EVENT_HANDLERS,
): Promise<DispatchResult> {
  await db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      source: event.source,
      stripeAccountId: event.stripeAccountId,
      payload: event.payload,
    })
    .onConflictDoNothing({ target: stripeEvents.id });

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ processedAt: stripeEvents.processedAt })
      .from(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .for('update');
    if (row?.processedAt) return 'duplicate';

    const handler = handlers[event.type];
    if (!handler) {
      await markDone(tx, event.id, 'ignored');
      return 'ignored';
    }

    try {
      await tx.transaction((savepoint) => handler(event, savepoint));
    } catch (err) {
      await tx
        .update(stripeEvents)
        .set({ attempts: sql`${stripeEvents.attempts} + 1`, error: stripeErrorCode(err) })
        .where(eq(stripeEvents.id, event.id));
      return 'failed';
    }

    await markDone(tx, event.id, 'processed');
    return 'processed';
  });
}

async function markDone(tx: Tx, id: string, outcome: 'processed' | 'ignored') {
  await tx
    .update(stripeEvents)
    .set({
      processedAt: sql`now()`,
      outcome,
      attempts: sql`${stripeEvents.attempts} + 1`,
      error: null,
    })
    .where(eq(stripeEvents.id, id));
}
