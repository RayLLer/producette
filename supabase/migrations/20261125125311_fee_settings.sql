-- Comisiones versionadas. La fila vigente es la de effective_from más reciente <= now().
-- Cada cotización copia las tasas al crearse. El 5% del cliente no tiene tope.
-- Si la tasa de enlace y otra tasa aplican a la vez, gana la más baja (lib/domain/fees.ts).
-- La primera fila la crea scripts/seed.ts. Sin grants al navegador.

create table public.fee_settings (
  id bigint generated always as identity primary key,
  provider_bps integer not null check (provider_bps between 0 and 10000),
  client_bps integer not null check (client_bps between 0 and 10000),
  founder_bps integer not null check (founder_bps between 0 and 10000),
  referral_bps integer not null check (referral_bps between 0 and 10000),
  effective_from timestamptz not null default now(),
  created_by uuid references public.accounts (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index fee_settings_effective_from_idx on public.fee_settings (effective_from desc);
create index fee_settings_created_by_idx on public.fee_settings (created_by);

alter table public.fee_settings enable row level security;
revoke all on table public.fee_settings from anon, authenticated;
