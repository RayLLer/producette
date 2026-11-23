---
name: producette-supabase
description: Cómo usar Supabase en Producette - clientes SSR con @supabase/ssr y getClaims, claves sb_publishable_/sb_secret_, migraciones con Supabase CLI v3 (--remote) contra producette-dev, RLS con buen rendimiento, grants explícitos de la Data API, funciones security definer en el esquema private, Storage privado, Realtime por broadcast con canales privados y pg_cron + pg_net + Vault. Úsala para cualquier migración, política, trigger, función SQL, cambio de Auth, bucket, canal de tiempo real o tarea programada, y siempre antes de ejecutar un comando `supabase`.
---

# Supabase en Producette

Supabase nunca corre en local: el CLI apunta a `producette-dev` en la nube. Staging y producción solo reciben migraciones por GitHub Actions.

Referencias de esta skill (léelas cuando la tarea entre en su tema):

- `references/auth-ssr.md`: clientes, proxy combinado con next-intl, callback de email y Google.
- `references/rls-y-grants.md`: plantilla de tabla nueva, políticas, grants, funciones `security definer`.
- `references/cli-v3-migraciones.md`: comandos del CLI v3, tipos, reglas de migración.
- `references/storage-realtime.md`: buckets, URLs firmadas, chat en tiempo real.
- `references/cron-vault.md`: pg_cron, pg_net y Vault para `sweep` y `nightly`.

## Reglas que no se negocian

1. **Toda tabla nueva** en `public` nace en la misma migración con: RLS activado, políticas explícitas por operación, `grant` solo de lo que el navegador necesita e índices en las columnas que usan las políticas.
2. **Claves**: `sb_publishable_…` en el navegador y en clientes sin sesión; `sb_secret_…` solo en el servidor y solo cuando haga falta saltarse RLS (seed, webhooks, tareas programadas, subir a buckets). Nunca uses las claves heredadas `anon` / `service_role` en código nuevo.
3. **Auth en el servidor**: `supabase.auth.getClaims()`. Nunca confíes en `getSession()` en código de servidor: no revalida el token.
4. **Escrituras de dinero y chat**: las hace el servidor. RLS niega `insert/update/delete` a `authenticated` en cotizaciones, contratos, pagos, liberaciones, reembolsos, comisiones y mensajes.
5. **Migraciones**: solo nuevas, solo aditivas, una por tema, con `--dry-run` mostrado antes de aplicar. Nunca edites una aplicada. Nunca cambies la estructura desde el panel.
6. **Nada de `ON DELETE CASCADE`** desde usuarios hacia contratos, pagos o bitácora.
7. **Nunca** `supabase link` a staging ni a producción, y nunca `supabase db reset` sin confirmación explícita de la persona.

## Comandos (CLI v3)

Comprueba la versión con `supabase --version`. En la v3 los comandos apuntan al stack local por defecto; como aquí no hay stack local, contra dev siempre va `--remote`:

| Para qué | Comando |
| --- | --- |
| Nueva migración | `supabase migration new <tema>` (o `npm run db:new <tema>`) |
| Ver estado en dev | `supabase migration list --remote` |
| Revisar antes de aplicar | `supabase db push --remote --dry-run` |
| Aplicar a dev | `supabase db push --remote` (pide confirmación) |
| Tipos | `supabase gen types typescript --remote > lib/supabase/database.types.ts` |
| Diferencias contra dev | `supabase db diff --from=remote` |
| Marcar una versión | `supabase migration repair <versión> --status reverted --remote` |

Si el CLI instalado todavía es v2, el equivalente usa `--linked` en lugar de `--remote`. Detalle y CI en `references/cli-v3-migraciones.md`.

## Plantilla mínima de tabla

```sql
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.accounts(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published','paused')),
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
create index listings_host_user_id_idx on public.listings (host_user_id);

create policy "listings: lectura pública de publicados"
  on public.listings for select to anon, authenticated
  using (status = 'published');

create policy "listings: el Host lee los suyos"
  on public.listings for select to authenticated
  using (host_user_id = (select auth.uid()));

grant select on table public.listings to anon, authenticated;
-- sin grant de insert/update/delete: las escrituras van por Server Actions con Drizzle
```

Claves de rendimiento: `(select auth.uid())` entre paréntesis (se evalúa una vez por consulta), `to authenticated`/`to anon` en cada política, índice en cada columna filtrada y, en las consultas desde supabase-js, el mismo filtro explícito (`.eq('host_user_id', userId)`) aunque RLS ya lo imponga.

## Tipos y Drizzle después de cada migración

1. `npm run db:types` (tipos de supabase-js).
2. `npx drizzle-kit pull` (esquema de Drizzle; ver `producette-drizzle`).
3. Commit de ambos junto con la migración.

## Extensiones

Una migración propia al principio: `postgis`, `btree_gist`, `pg_net` en el esquema `extensions` y `pg_cron` donde lo instala Supabase. La reserva por horas usa una restricción de exclusión:

```sql
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (listing_id with =, during with &&)
  where (status in ('confirmed','in_progress'));
-- during es tstzrange '[)': el fin de una reserva puede coincidir con el inicio de la siguiente
```

## Auth

- Email con confirmación y Google. Los clientes, el proxy y la ruta de confirmación están en `references/auth-ssr.md`.
- Un trigger en `auth.users` crea `accounts` y el perfil Cliente. Va en una función `security definer` con `set search_path = ''` y nombres totalmente calificados.
- La URL del sitio y las redirecciones de cada proyecto se configuran en el panel (Paso 4 y Paso 9); no las cambies desde código.

## Qué no hacer

- No uses `postgres_changes` para el chat ni para avisos: usa broadcast con canales privados (`references/storage-realtime.md`).
- No escribas valores de entorno (URLs, secretos) en migraciones: van en Vault y los carga la persona.
- No crees funciones `security definer` en `public`: van en `private`, que no está expuesto.
- No dejes una tabla sin grants "por si acaso" ni con `grant all`.
