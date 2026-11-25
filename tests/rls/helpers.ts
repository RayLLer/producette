import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

try {
  process.loadEnvFile('.env.local');
} catch {
  // env provided externally
}

const DEV_REF = 'aeypdriubewywzngjzgf';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[test:rls] Falta la variable ${name}`);
  return value;
}

export const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseUrl.includes(DEV_REF) || !required('DATABASE_URL').includes(DEV_REF)) {
  throw new Error('[test:rls] Solo corre contra producette-dev.');
}
const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

export function seedEmail(tag: string): string {
  const [local, domain] = required('SEED_EMAIL').split('@');
  return `${local}+${tag}@${domain}`;
}

export function anonClient(): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
}

export async function signedIn(tag: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: seedEmail(tag),
    password: required('SEED_PASSWORD'),
  });
  if (error) throw new Error(`[test:rls] Login de ${tag} falló (¿corriste npm run seed?): ${error.message}`);
  return { client, userId: data.user.id };
}

// Owner connection; every test using it rolls back so dev keeps no residue.
export async function withRollback<T>(fn: (pg: Client) => Promise<T>): Promise<T> {
  const pg = new Client({ connectionString: required('DATABASE_URL') });
  await pg.connect();
  try {
    await pg.query('begin');
    return await fn(pg);
  } finally {
    await pg.query('rollback').catch(() => {});
    await pg.end();
  }
}
