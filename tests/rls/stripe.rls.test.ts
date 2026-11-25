import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, signedIn } from './helpers';
import { handleStripeEvent, type StripeEventHandler } from '@/lib/server/stripe/dispatch';

const PERMISSION_DENIED = '42501';
const RUN = randomUUID().slice(0, 8);

let owner: Client;
let c1: SupabaseClient;
let c1Id: string;
let c2Id: string;
const eventIds: string[] = [];

beforeAll(async () => {
  ({ client: c1, userId: c1Id } = await signedIn('cliente1'));
  ({ userId: c2Id } = await signedIn('cliente2'));
  owner = new Client({ connectionString: process.env.DATABASE_URL });
  await owner.connect();
  // Committed rows (the browser client cannot see an open transaction); removed in afterAll.
  await owner.query(
    `insert into public.host_stripe_accounts (user_id, stripe_account_id)
     values ($1, $2), ($3, $4)`,
    [c1Id, `acct_test_${RUN}_1`, c2Id, `acct_test_${RUN}_2`],
  );
});

afterAll(async () => {
  await owner.query('delete from public.host_stripe_accounts where stripe_account_id like $1', [
    `acct_test_${RUN}_%`,
  ]);
  if (eventIds.length) {
    await owner.query('delete from public.stripe_events where id = any($1)', [eventIds]);
  }
  await owner.end();
});

describe('host_stripe_accounts', () => {
  it('el Host lee su propia fila', async () => {
    const { data, error } = await c1.from('host_stripe_accounts').select('stripe_account_id');
    expect(error).toBeNull();
    expect(data).toEqual([{ stripe_account_id: `acct_test_${RUN}_1` }]);
  });

  it('no lee la fila de otro', async () => {
    const { data } = await c1.from('host_stripe_accounts').select('user_id').eq('user_id', c2Id);
    expect(data).toEqual([]);
  });

  it('no puede marcar su cuenta como lista para transferencias', async () => {
    const { error } = await c1
      .from('host_stripe_accounts')
      .update({ transfers_status: 'active' })
      .eq('user_id', c1Id);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('no puede crear filas', async () => {
    const { error } = await c1
      .from('host_stripe_accounts')
      .insert({ user_id: c1Id, stripe_account_id: `acct_test_${RUN}_x` });
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('anon no tiene permiso', async () => {
    const { error } = await anonClient().from('host_stripe_accounts').select('user_id').limit(1);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe('repartidor de webhooks (stripe_events)', () => {
  function testEvent(type = 'test.event') {
    const id = `evt_test_${RUN}_${eventIds.length}`;
    eventIds.push(id);
    return { id, type, source: 'platform' as const, stripeAccountId: null, payload: { id } };
  }

  async function row(id: string) {
    const { rows } = await owner.query(
      'select processed_at, outcome, attempts, error from public.stripe_events where id = $1',
      [id],
    );
    return rows[0];
  }

  it('procesa un evento una sola vez aunque llegue dos veces', async () => {
    let calls = 0;
    const handlers: Record<string, StripeEventHandler> = { 'test.event': async () => void calls++ };
    const event = testEvent();

    expect(await handleStripeEvent(event, handlers)).toBe('processed');
    expect(await handleStripeEvent(event, handlers)).toBe('duplicate');
    expect(calls).toBe(1);
    expect(await row(event.id)).toMatchObject({ outcome: 'processed', attempts: 1, error: null });
  });

  it('un manejador que falla deja el evento sin procesar y se procesa en el reintento', async () => {
    let fail = true;
    const handlers: Record<string, StripeEventHandler> = {
      'test.event': async (_event, tx) => {
        // This write must roll back with the failed savepoint.
        await tx.execute(`select 1`);
        if (fail) throw new TypeError('boom');
      },
    };
    const event = testEvent();

    expect(await handleStripeEvent(event, handlers)).toBe('failed');
    expect(await row(event.id)).toMatchObject({ processed_at: null, attempts: 1, error: 'TypeError' });

    fail = false;
    expect(await handleStripeEvent(event, handlers)).toBe('processed');
    expect(await row(event.id)).toMatchObject({ outcome: 'processed', attempts: 2, error: null });
  });

  it('un evento sin manejador queda como ignorado', async () => {
    const event = testEvent('customer.created');
    expect(await handleStripeEvent(event, {})).toBe('ignored');
    expect(await row(event.id)).toMatchObject({ outcome: 'ignored' });
  });
});
