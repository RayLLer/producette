import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';

// Pinned to the version the installed stripe package expects. Changing it is its own task,
// with a read of the API changelog.
export const STRIPE_API_VERSION = '2026-11-18.endive' as const;

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  maxNetworkRetries: 2,
  appInfo: { name: 'Producette' },
});

// Short, PII-free code for logs and stripe_events.error.
export function stripeErrorCode(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) return err.code ?? err.type;
  if (err instanceof Error) return err.name;
  return 'unknown_error';
}
