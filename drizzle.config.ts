import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';

// Load .env.local manually since drizzle-kit runs outside of Next.js.
try {
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    });
} catch { /* .env.local is optional in CI */ }

export default defineConfig({
  dialect: 'postgresql',
  out: './lib/server/db/generated',
  // auth.users is pulled only so FKs to it resolve; every other auth table is excluded by name
  // (pulling them generates invalid TS). If Supabase adds one and typecheck breaks, add it here.
  schemaFilter: ['public', 'auth'],
  tablesFilter: [
    '*',
    '!audit_log_entries', '!custom_oauth_providers', '!flow_state', '!identities', '!instances',
    '!mfa_*', '!oauth_*', '!one_time_tokens', '!refresh_tokens', '!saml_*', '!schema_migrations',
    '!scim_*', '!sessions', '!sso_*', '!webauthn_*',
  ],
  dbCredentials: { url: process.env['DATABASE_URL']! },
});
