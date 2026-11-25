import 'server-only';
import type { DispatchResult } from './dispatch';

export function webhookResponse(result: DispatchResult): Response {
  return result === 'failed'
    ? new Response('handler failed', { status: 500 })
    : new Response(result, { status: 200 });
}

export function webhookNotConfigured(route: string): Response {
  console.error(`[stripe] ${route}: webhook signing secret is not set`);
  return new Response('not configured', { status: 500 });
}
