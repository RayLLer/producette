import type Stripe from 'stripe';
import { serverEnv } from '@/lib/env';
import { stripe, stripeErrorCode } from '@/lib/server/stripe';
import { handleStripeEvent } from '@/lib/server/stripe/dispatch';
import { webhookNotConfigured, webhookResponse } from '@/lib/server/stripe/webhook-response';

// Thin events (v2), e.g. Accounts v2 requirements and capability changes.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const secret = serverEnv.STRIPE_V2_WEBHOOK_SECRET;
  if (!secret) return webhookNotConfigured('stripe-v2');
  if (!signature) return new Response('missing signature', { status: 400 });

  let notification: Stripe.V2.Core.EventNotification;
  try {
    notification = stripe.parseEventNotification(body, signature, secret);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  // A thin event only carries ids: fetch the full event to store it.
  let event: unknown;
  try {
    event = await stripe.v2.core.events.retrieve(notification.id);
  } catch (err) {
    console.error(`[stripe] stripe-v2: could not fetch event (${stripeErrorCode(err)})`);
    return new Response('could not fetch event', { status: 500 });
  }

  // Account events point at the account itself; singleton objects have no id.
  const related = ('related_object' in notification ? notification.related_object : undefined) as
    | { id?: string; type?: string }
    | undefined;
  const relatedAccount = related?.type === 'v2.core.account' ? (related.id ?? null) : null;

  const result = await handleStripeEvent({
    id: notification.id,
    type: notification.type,
    source: 'v2',
    // context is the account path (e.g. "acct_x" or "acct_parent/acct_child"); the last one acted.
    stripeAccountId: relatedAccount ?? notification.context?.segments.at(-1) ?? null,
    payload: event,
  });
  return webhookResponse(result);
}
