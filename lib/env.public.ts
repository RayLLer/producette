// No server-only: safe to import from both server and client.
// In browser components, use process.env.NEXT_PUBLIC_* literals directly
// so Next.js inlines the values at build time.

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
export const appEnvPublic = (process.env.NEXT_PUBLIC_APP_ENV ??
  'local') as 'local' | 'staging' | 'production';
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
export const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
