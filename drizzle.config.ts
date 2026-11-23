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
  schemaFilter: ['public'],
  dbCredentials: { url: process.env['DATABASE_URL']! },
});
