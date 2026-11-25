-- Cuenta de Stripe (Accounts v2, configuración recipient) de cada Host.
-- La fila la crea el onboarding del Host; los webhooks v2 actualizan su estado.
-- Antes de transferir dinero, transfers_status debe ser 'active' (CLAUDE.md).
-- El Host lee su propia fila para ver su estado; solo el servidor escribe.

create table public.host_stripe_accounts (
  user_id uuid primary key references public.accounts (id) on delete restrict,
  stripe_account_id text not null unique,
  transfers_status text not null default 'pending'
    check (transfers_status in ('active', 'pending', 'rejected', 'restricted', 'unsupported')),
  requirements_status text
    check (requirements_status in ('currently_due', 'eventually_due', 'past_due')),
  stripe_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.host_stripe_accounts.transfers_status is
  'Estado de la capacidad stripe_balance.stripe_transfers de la configuración recipient.';
comment on column public.host_stripe_accounts.requirements_status is
  'requirements.summary.minimum_deadline.status de la cuenta; nulo si no tiene requisitos pendientes.';
comment on column public.host_stripe_accounts.stripe_synced_at is
  'Momento en que el servidor leyó el estado desde Stripe por última vez.';

create trigger host_stripe_accounts_set_updated_at
  before update on public.host_stripe_accounts
  for each row execute function private.set_updated_at();

alter table public.host_stripe_accounts enable row level security;

create policy "host_stripe_accounts: el Host lee la suya"
  on public.host_stripe_accounts for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.host_stripe_accounts from anon, authenticated;
grant select on table public.host_stripe_accounts to authenticated;
