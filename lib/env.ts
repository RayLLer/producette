import 'server-only';
import { z } from 'zod';
import { appEnv } from './app-env';

// ── Supabase project refs (not secrets) ──────────────────────────────────────
const SUPABASE_DEV_REF = 'aeypdriubewywzngjzgf';
const SUPABASE_STAGING_REF = 'ukbzkobdkzolftvpdqfo';
// SUPABASE_PROD_REF will be added in Paso 9 when the production project exists.

// ── Schema ───────────────────────────────────────────────────────────────────

const PublicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ error: 'NEXT_PUBLIC_SITE_URL must be a valid URL' }),
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production'], {
    error: "NEXT_PUBLIC_APP_ENV must be 'local', 'staging', or 'production'",
  }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL' }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, {
    error: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required',
  }),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_(test|live)_/, {
    error: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_',
  }),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
});

const SecretSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_', {
    error: 'SUPABASE_SECRET_KEY must start with sb_secret_',
  }),
  SUPABASE_JWKS_URL: z.url().optional(),
  DATABASE_URL: z.url({ error: 'DATABASE_URL must be a valid URL' }),
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/, {
    error: 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_',
  }),
  // Webhook secrets are set by `stripe listen` during local dev (Paso 5).
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  STRIPE_V2_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  CRON_SECRET: z.string().min(32, { error: 'CRON_SECRET must be at least 32 characters' }),
  STAGING_PASSWORD: z.string().optional(),
  // Paso 8:
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_ALLOWLIST: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  // Paso 6:
  DEADLINE_SCALE: z.coerce.number().optional(),
});

// ── Parse and throw with clear message on failure ─────────────────────────────

// Empty strings from .env.local (`VAR=`) must be treated as undefined so .optional()
// works correctly. Required fields will still fail (empty string ≠ a valid value).
function normalizeEnv(
  env: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
}

function parseOrThrow<T>(schema: z.ZodType<T>, values: unknown, label: string): T {
  const result = schema.safeParse(values);
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    const lines = Object.entries(errors).map(
      ([k, v]) => `  ${k}: ${(v as string[] | undefined)?.join(', ')}`,
    );
    throw new Error(
      `[env] Missing or invalid ${label} environment variables:\n${lines.join('\n')}`,
    );
  }
  return result.data;
}

const normalizedEnv = normalizeEnv(process.env);

parseOrThrow(PublicSchema, normalizedEnv, 'public');
export const serverEnv = parseOrThrow(SecretSchema, normalizedEnv, 'secret');

// ── Startup protections ───────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

if (appEnv === 'local') {
  if (supabaseUrl.includes(SUPABASE_STAGING_REF)) {
    throw new Error(
      `[env] Local env is pointing to producette-STAGING Supabase.\n` +
        `Revisa NEXT_PUBLIC_SUPABASE_URL en .env.local.`,
    );
  }
  if (supabaseUrl && !supabaseUrl.includes(SUPABASE_DEV_REF)) {
    throw new Error(
      `[env] Local env must point to producette-DEV Supabase (ref ${SUPABASE_DEV_REF}).\n` +
        `Revisa NEXT_PUBLIC_SUPABASE_URL en .env.local.`,
    );
  }
}

// Guard for staging/local: reject prod Supabase URL.
// (SUPABASE_PROD_REF check will be added in Paso 9.)

// Guard: Stripe key/environment mismatch.
const sk = serverEnv.STRIPE_SECRET_KEY;
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

if (appEnv !== 'production') {
  if (sk.startsWith('sk_live_') || pk.startsWith('pk_live_')) {
    throw new Error(
      `[env] Live Stripe keys detected outside production environment.\n` +
        `Revisa STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.`,
    );
  }
} else {
  if (sk.startsWith('sk_test_') || pk.startsWith('pk_test_')) {
    throw new Error(
      `[env] Test Stripe keys detected in production environment.\n` +
        `Revisa STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.`,
    );
  }
  // Guard: DEADLINE_SCALE must equal 1 in production (Paso 6).
  const scale = serverEnv.DEADLINE_SCALE;
  if (scale !== undefined && scale !== 1) {
    throw new Error(
      `[env] DEADLINE_SCALE=${scale} in production. Only 1 is allowed.`,
    );
  }
}
