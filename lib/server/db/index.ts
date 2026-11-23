import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from './generated/schema';
import { serverEnv } from '@/lib/env';

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 5_000,
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForDb.pgPool = pool;
}

attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
