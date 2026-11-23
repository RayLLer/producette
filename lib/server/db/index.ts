import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from './generated/schema';

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    // Replaced with serverEnv.DATABASE_URL in Paso 3 when lib/env.ts is created.
    connectionString: process.env['DATABASE_URL']!,
    max: 5,
    idleTimeoutMillis: 5_000,
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForDb.pgPool = pool;
}

attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
