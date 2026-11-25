import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { anonClient, signedIn, withRollback } from './helpers';

const PERMISSION_DENIED = '42501';

let c1: SupabaseClient;
let c1Id: string;
let c2Id: string;

beforeAll(async () => {
  ({ client: c1, userId: c1Id } = await signedIn('cliente1'));
  ({ userId: c2Id } = await signedIn('cliente2'));
});

describe('accounts', () => {
  it('un usuario lee su cuenta', async () => {
    const { data, error } = await c1.from('accounts').select('id').eq('id', c1Id);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: c1Id }]);
  });

  it('un usuario no lee la cuenta de otro', async () => {
    const { data, error } = await c1.from('accounts').select('id').eq('id', c2Id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('un usuario no puede cambiar columnas sin grant (stripe_customer_id)', async () => {
    const { error } = await c1.from('accounts').update({ stripe_customer_id: 'cus_x' }).eq('id', c1Id);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it('anon no tiene permiso sobre accounts', async () => {
    const { error } = await anonClient().from('accounts').select('id').limit(1);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe('profiles', () => {
  it('un usuario lee su perfil Cliente', async () => {
    const { data } = await c1.from('profiles').select('segment').eq('user_id', c1Id);
    expect(data).toContainEqual({ segment: 'client' });
  });

  it('un usuario no lee los perfiles de otro', async () => {
    const { data, error } = await c1.from('profiles').select('id').eq('user_id', c2Id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('un usuario no puede cambiar su tasa de comisión', async () => {
    const { error } = await c1.from('profiles').update({ host_fee_bps: 0 }).eq('user_id', c1Id);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe('tablas internas sin permisos para el navegador', () => {
  for (const table of ['panel_users', 'audit_log', 'fee_settings'] as const) {
    it(`authenticated recibe permission denied en ${table}`, async () => {
      const { error } = await c1.from(table).select('*').limit(1);
      expect(error?.code).toBe(PERMISSION_DENIED);
    });

    it(`anon recibe permission denied en ${table}`, async () => {
      const { error } = await anonClient().from(table).select('*').limit(1);
      expect(error?.code).toBe(PERMISSION_DENIED);
    });
  }
});

describe('audit_log es solo de inserción', () => {
  it('ni el dueño de la base puede modificar o borrar una fila', async () => {
    await withRollback(async (pg) => {
      const { rows } = await pg.query(
        `insert into public.audit_log (actor_user_id, actor_role, action, entity_type, reason)
         values ($1, 'system', 'test', 'test', 'test de RLS') returning id`,
        [c1Id],
      );
      const id = rows[0].id;
      await pg.query('savepoint s');
      await expect(pg.query('update public.audit_log set reason = $1 where id = $2', ['x', id])).rejects.toThrow(
        /solo de inserción/,
      );
      await pg.query('rollback to savepoint s');
      await expect(pg.query('delete from public.audit_log where id = $1', [id])).rejects.toThrow(/solo de inserción/);
    });
  });

  it('el motivo es obligatorio', async () => {
    await withRollback(async (pg) => {
      await expect(
        pg.query(
          `insert into public.audit_log (actor_user_id, actor_role, action, entity_type, reason)
           values ($1, 'system', 'test', 'test', '  ')`,
          [c1Id],
        ),
      ).rejects.toThrow(/check/);
    });
  });
});

describe('registro', () => {
  it('crear un usuario en auth crea su cuenta y su perfil Cliente', async () => {
    await withRollback(async (pg) => {
      const id = randomUUID();
      await pg.query(
        `insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
         values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '{"full_name":"Nuevo"}')`,
        [id, `rls-${id}@example.com`],
      );
      const account = await pg.query('select preferred_locale from public.accounts where id = $1', [id]);
      expect(account.rows).toEqual([{ preferred_locale: 'es' }]);
      const profiles = await pg.query('select segment, display_name from public.profiles where user_id = $1', [id]);
      expect(profiles.rows).toEqual([{ segment: 'client', display_name: 'Nuevo' }]);
    });
  });
});
