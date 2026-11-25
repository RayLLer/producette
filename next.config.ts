import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// ── Build-time env validation ─────────────────────────────────────────────────
// Runs at the start of `next build` and `next dev` before any page is generated.
// Runtime validation (startup protections) is in lib/env.ts via instrumentation.ts.

const REQUIRED_ENV: Array<[string, string]> = [
  ['NEXT_PUBLIC_SITE_URL', 'URL base del entorno'],
  ['NEXT_PUBLIC_APP_ENV', '"local", "staging" o "production"'],
  ['NEXT_PUBLIC_SUPABASE_URL', 'URL del proyecto Supabase'],
  ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'Clave publicable de Supabase'],
  ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Clave publicable de Stripe (pk_test_...)'],
  ['SUPABASE_SECRET_KEY', 'Clave secreta de Supabase (sb_secret_...)'],
  ['DATABASE_URL', 'URL del pooler de Supabase (puerto 6543)'],
  ['STRIPE_SECRET_KEY', 'Clave secreta de Stripe (sk_test_...)'],
  ['CRON_SECRET', 'Secreto para /api/internal (mín. 32 chars)'],
];

const missing = REQUIRED_ENV.filter(([key]) => !process.env[key]).map(
  ([key, desc]) => `  ${key} — ${desc}`,
);

if (missing.length > 0) {
  throw new Error(
    `[env] Faltan variables de entorno obligatorias en este build:\n${missing.join('\n')}\n\n` +
      `Copia .env.example a .env.local y rellena los valores.`,
  );
}

// ── Next.js config ────────────────────────────────────────────────────────────

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
