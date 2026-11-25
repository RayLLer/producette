import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// lib/env.ts validates process.env when it is imported, which is how the app refuses to
// start (instrumentation.ts imports it on boot). Each test imports a fresh copy.

const BASE_ENV = {
  NEXT_PUBLIC_SITE_URL: 'https://producette.com',
  NEXT_PUBLIC_SUPABASE_URL: 'https://prodref.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
  SUPABASE_SECRET_KEY: 'sb_secret_x',
  DATABASE_URL: 'postgresql://user:pass@localhost:6543/postgres',
  STRIPE_SECRET_KEY: 'sk_live_x',
  CRON_SECRET: 'x'.repeat(32),
};

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = process.env;
  vi.resetModules();
});

afterEach(() => {
  process.env = saved;
});

function setEnv(extra: Record<string, string>) {
  process.env = { NODE_ENV: 'test', ...BASE_ENV, ...extra } as NodeJS.ProcessEnv;
}

describe('DEADLINE_SCALE al arrancar', () => {
  it('en producción, un valor distinto de 1 detiene la aplicación', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', VERCEL_TARGET_ENV: 'production', DEADLINE_SCALE: '0.0035' });
    await expect(import('./env')).rejects.toThrow(/DEADLINE_SCALE=0.0035 in production/);
  });

  it('en producción, 1 o sin definir arranca', async () => {
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', VERCEL_TARGET_ENV: 'production', DEADLINE_SCALE: '1' });
    await expect(import('./env')).resolves.toBeDefined();
    vi.resetModules();
    setEnv({ NEXT_PUBLIC_APP_ENV: 'production', VERCEL_TARGET_ENV: 'production' });
    await expect(import('./env')).resolves.toBeDefined();
  });

  it('en staging se permite una escala menor que 1', async () => {
    setEnv({
      NEXT_PUBLIC_APP_ENV: 'staging',
      VERCEL_TARGET_ENV: 'staging',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_x',
      STRIPE_SECRET_KEY: 'sk_test_x',
      DEADLINE_SCALE: '0.0035',
    });
    const env = await import('./env');
    expect(env.serverEnv.DEADLINE_SCALE).toBe(0.0035);
  });

  it('cero o negativa no es válida en ningún entorno', async () => {
    setEnv({
      NEXT_PUBLIC_APP_ENV: 'staging',
      VERCEL_TARGET_ENV: 'staging',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_x',
      STRIPE_SECRET_KEY: 'sk_test_x',
      DEADLINE_SCALE: '0',
    });
    await expect(import('./env')).rejects.toThrow(/DEADLINE_SCALE/);
  });
});
