-- Cuentas y perfiles. Toda cuenta nace como Cliente (trigger sobre auth.users).
-- Borrar una cuenta = anonimizarla (anonymized_at); por eso las FK no borran en cascada.

create table public.accounts (
  id uuid primary key references auth.users (id) on delete restrict,
  preferred_locale text not null default 'es' check (preferred_locale in ('es', 'en')),
  stripe_customer_id text unique,
  referred_by_host_id uuid references public.accounts (id) on delete restrict,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.accounts.referred_by_host_id is
  'Host cuyo enlace usó el cliente al registrarse. Activa la tasa de enlace (fee_settings.referral_bps) solo con ese Host; si otra tasa también aplica, gana la más baja.';

create index accounts_referred_by_host_id_idx on public.accounts (referred_by_host_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function private.set_updated_at();

alter table public.accounts enable row level security;

create policy "accounts: cada usuario lee la suya"
  on public.accounts for select to authenticated
  using (id = (select auth.uid()));

create policy "accounts: cada usuario actualiza la suya"
  on public.accounts for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on table public.accounts from anon, authenticated;
grant select on table public.accounts to authenticated;
grant update (preferred_locale) on table public.accounts to authenticated;


create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.accounts (id) on delete restrict,
  segment text not null check (segment in ('client', 'host')),
  display_name text,
  bio text,
  host_fee_bps integer check (host_fee_bps between 0 and 10000),
  founder_number integer unique check (founder_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, segment),
  check (segment = 'host' or (host_fee_bps is null and founder_number is null))
);

-- host_fee_bps: tasa propia del Host. Nulo = usar la vigente de fee_settings (provider_bps, o
-- founder_bps si founder_number no es nulo). Se llena para fijar la tasa de un fundador o una
-- excepción pactada desde el panel (con audit_log). Cada cotización copia las tasas al crearse,
-- así que cambiarla no altera cotizaciones existentes. No decide la tasa de enlace: esa depende
-- de la pareja Cliente–Host (accounts.referred_by_host_id) y, si aplica, gana la más baja.
-- Lógica en lib/domain/fees.ts.
comment on column public.profiles.host_fee_bps is
  'Tasa propia del Host en puntos básicos. Nulo = usar fee_settings. No decide la tasa de enlace; si ambas aplican, gana la más baja. Cada cotización copia la tasa al crearse. Ver lib/domain/fees.ts.';
comment on column public.profiles.founder_number is
  'Número de Host fundador. No nulo = aplica fee_settings.founder_bps (salvo host_fee_bps).';

create index profiles_user_id_idx on public.profiles (user_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: cada usuario lee los suyos"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles: cada usuario actualiza los suyos"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, bio) on table public.profiles to authenticated;


create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (id, preferred_locale)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'es' end
  );

  insert into public.profiles (user_id, segment, display_name)
  values (new.id, 'client', nullif(new.raw_user_meta_data ->> 'full_name', ''));

  return new;
end $$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
