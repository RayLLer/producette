# RLS, grants y funciones en Producette

## Por qué hacen falta grants explícitos

Desde 2026, Supabase dejó de dar acceso automático a la Data API a las tablas nuevas: los proyectos nuevos desde el 30 de mayo y los existentes desde el 30 de octubre. Además, Producette creó dev y staging con "exponer tablas nuevas" desactivado. Por eso una tabla sin `grant` no se puede leer desde supabase-js, aunque tenga políticas. Es un segundo candado, no un error.

Hay dos capas:

- **Grant**: qué operaciones puede intentar el rol (`anon`, `authenticated`).
- **RLS**: qué filas puede tocar en esas operaciones.

Drizzle entra con el usuario dueño de la base y se salta ambas capas, así que la protección de Drizzle es la DAL (`requireUser()` / `requireRole()`). Los grants y RLS protegen todo lo que pasa por supabase-js: lecturas del navegador, Realtime y Storage.

## Matriz por defecto

| Tipo de tabla | anon | authenticated | Escritura |
| --- | --- | --- | --- |
| Catálogo público (listings publicados, perfiles públicos, reviews visibles) | `select` | `select` | Servidor (Drizzle) |
| Datos del propio usuario (accounts, profiles, borradores) | — | `select` (y `update` de columnas concretas si el alcance lo pide) | Servidor, o `update` con política `with check` |
| Dinero (quotes, contracts, payments, payouts, refunds) | — | `select` de las filas propias | Solo servidor |
| Chat (conversations, messages) | — | `select` de las conversaciones propias | Solo servidor (filtro de contacto) |
| Internas (panel_users, audit_log, fee_settings, stripe_events, job_runs, email_outbox) | — | — | Solo servidor |
| Dirección exacta (listing_private_locations) | — | `select` solo si existe un pago confirmado de ese usuario para ese listing | Solo servidor |

Las tablas internas no llevan **ningún** grant para `anon` ni `authenticated`, y RLS activado sin políticas.

`service_role` (el rol de la clave `sb_secret_`) tampoco recibe acceso automático a las tablas nuevas. Si el servidor lee o escribe una tabla con el cliente secreto de supabase-js (por ejemplo, el seed con `fee_settings` o `panel_users`), esa migración agrega `grant … on table … to service_role` con las operaciones exactas. Drizzle no lo necesita porque entra como dueño de la base.

## Grants de columnas

Si el navegador puede actualizar solo algunas columnas, da el grant por columna:

```sql
grant update (display_name, preferred_locale) on table public.accounts to authenticated;

create policy "accounts: cada uno actualiza la suya"
  on public.accounts for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

## audit_log: solo agregar

```sql
alter table public.audit_log enable row level security;
revoke update, delete, truncate on table public.audit_log from public, anon, authenticated;
-- La inserción la hace el servidor (Drizzle, dueño de la base) dentro de la transacción de la acción.
-- Para impedir cambios incluso al dueño, un trigger:
create function private.audit_log_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log es solo de inserción';
end $$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();
```

## Funciones `security definer`

Sirven para consultas que una política necesita y que el rol no puede hacer por sí mismo (por ejemplo, "¿participa este usuario en esta conversación?"), evitando recursión de RLS.

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;  -- las políticas se evalúan con el rol del usuario

create function private.is_conversation_participant(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = conversation
      and cp.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_participant(uuid) from public;
grant execute on function private.is_conversation_participant(uuid) to authenticated;
```

Reglas:

- Siempre en `private`, que no está en los esquemas expuestos.
- Siempre `set search_path = ''` y nombres totalmente calificados (`public.tabla`, `auth.uid()`).
- Postgres da `EXECUTE` a `PUBLIC` en cada función nueva: revócalo siempre y concede solo al rol que la necesita.
- Una función que el navegador llama por RPC va en `public`, es `security invoker` (por defecto) y lleva `grant execute … to authenticated` explícito.

## Rendimiento de políticas

1. `(select auth.uid())` y `(select private.f(...))` en lugar de llamarlas por fila.
2. Rol explícito en cada política (`to authenticated`), para que Postgres ni la evalúe con otros roles.
3. Índice en cada columna que filtra una política.
4. En supabase-js, repite el filtro (`.eq('user_id', id)`) para que el planificador use el índice.
5. Prefiere `exists (select 1 …)` o `col in (select …)` con la subconsulta del lado del usuario, no joins hacia la tabla de la fila.

## Tests obligatorios de RLS (ver `producette-testing`)

Por cada tabla nueva, como mínimo:

- `anon` no lee nada que no sea público.
- Un usuario no lee las filas de otro.
- Un usuario no puede escribir tablas de dinero ni de chat.
- Las tablas internas devuelven error de permiso (no solo cero filas) para `authenticated`.

## Revisión antes del PR

- [ ] `enable row level security` en la misma migración que el `create table`.
- [ ] Una política por operación y rol, con nombre descriptivo en español.
- [ ] Grants explícitos y mínimos; ningún `grant all`.
- [ ] Índices de las columnas usadas en políticas.
- [ ] Funciones nuevas: esquema, `search_path`, `revoke … from public`.
- [ ] Sin `on delete cascade` desde usuarios hacia dinero o bitácora.
- [ ] Tests de RLS nuevos que pasan contra dev.
