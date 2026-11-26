// Test data for producette-dev (and staging, only via the manual GitHub Action of Paso 7).
// Idempotent: re-running reuses existing users and rows.
// Env: SEED_EMAIL (base address; users become base+cliente1@…), SEED_ADMIN_EMAIL (Patricia),
// SEED_PASSWORD (shared known password for test users).
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

try {
  process.loadEnvFile('.env.local');
} catch {
  // CI passes env vars directly.
}

const ALLOWED_REFS = ['aeypdriubewywzngjzgf', 'ukbzkobdkzolftvpdqfo']; // dev, staging

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[seed] Falta la variable ${name}`);
  return value;
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
const ref = new URL(supabaseUrl).hostname.split('.')[0];
if (!ALLOWED_REFS.includes(ref ?? '')) {
  throw new Error(`[seed] Se niega a correr contra ${supabaseUrl}: solo dev o staging.`);
}
const databaseUrl = required('DATABASE_URL');
if (!ALLOWED_REFS.some((r) => databaseUrl.includes(r))) {
  throw new Error('[seed] DATABASE_URL no apunta a dev ni a staging.');
}

const baseEmail = required('SEED_EMAIL');
const adminEmail = required('SEED_ADMIN_EMAIL');
const password = required('SEED_PASSWORD');

function alias(tag: string): string {
  const [local, domain] = baseEmail.split('@');
  return `${local}+${tag}@${domain}`;
}

const supabase = createClient(supabaseUrl, required('SUPABASE_SECRET_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureUser(email: string, fullName: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (data.user) return data.user.id;
  if (error && !/already been registered|already exists/i.test(error.message)) throw error;

  for (let page = 1; ; page++) {
    const list = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (list.error) throw list.error;
    const found = list.data.users.find((u) => u.email === email);
    if (found) return found.id;
    // No email in the message: this script also runs in GitHub Actions logs.
    if (list.data.users.length < 200) throw new Error(`[seed] No se encontró el usuario "${fullName}"`);
  }
}

async function main() {
  const users = {
    admin: await ensureUser(adminEmail, 'Patricia'),
    cliente1: await ensureUser(alias('cliente1'), 'Cliente Uno'),
    cliente2: await ensureUser(alias('cliente2'), 'Cliente Dos'),
    host1: await ensureUser(alias('host1'), 'Host Uno'),
    fundador1: await ensureUser(alias('fundador1'), 'Host Fundador'),
    soporte1: await ensureUser(alias('soporte1'), 'Soporte Uno'),
    finanzas1: await ensureUser(alias('finanzas1'), 'Finanzas Uno'),
  };

  const pg = new Client({ connectionString: databaseUrl });
  await pg.connect();
  try {
    await pg.query('begin');

    await pg.query(
      `insert into public.profiles (user_id, segment, display_name, founder_number)
       values ($1, 'host', 'Host Uno', null), ($2, 'host', 'Host Fundador', 1)
       on conflict (user_id, segment) do nothing`,
      [users.host1, users.fundador1],
    );

    await pg.query(
      `update public.accounts set referred_by_host_id = $1
       where id = $2 and referred_by_host_id is null`,
      [users.host1, users.cliente2],
    );

    await pg.query(
      `insert into public.panel_users (user_id, role)
       values ($1, 'admin'), ($2, 'soporte'), ($3, 'finanzas')
       on conflict (user_id) do nothing`,
      [users.admin, users.soporte1, users.finanzas1],
    );

    await pg.query(
      `insert into public.fee_settings (provider_bps, client_bps, founder_bps, referral_bps, created_by)
       select 1000, 500, 800, 300, $1
       where not exists (select 1 from public.fee_settings)`,
      [users.admin],
    );

    await pg.query('commit');
  } catch (err) {
    await pg.query('rollback');
    throw err;
  } finally {
    await pg.end();
  }

  console.log(`[seed] Listo en ${ref}: ${Object.keys(users).length} usuarios, panel y fee_settings.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
