import type Stripe from 'stripe';
import { serverEnv } from '@/lib/env';
import { stripe } from '@/lib/server/stripe';
import { handleStripeEvent } from '@/lib/server/stripe/dispatch';
import { webhookNotConfigured, webhookResponse } from '@/lib/server/stripe/webhook-response';

// Platform events (snapshot): payments, charges, disputes, transfers, Identity, customers.
export async function POST(request: Request) {
  const body = await request.text(); // raw body, before anything else touches it
  const signature = request.headers.get('stripe-signature');
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;
  if (!secret) return webhookNotConfigured('stripe');
  if (!signature) return new Response('missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  const result = await handleStripeEvent({
    id: event.id,
    type: event.type,
    source: 'platform',
    stripeAccountId: event.account ?? null,
    payload: event,
  });
  return webhookResponse(result);
}
