-- Registro de webhooks de Stripe. Cada evento se guarda una sola vez (id de Stripe como clave)
-- y lib/server/stripe/dispatch.ts lo procesa dentro de una transacción.
--   processed_at nulo + error nulo   -> recibido, sin procesar todavía
--   processed_at nulo + error        -> el manejador falló; se reintenta cuando Stripe lo reenvía
--   processed_at no nulo             -> procesado (o ignorado si no hay manejador); no se repite
-- El contenido puede llevar datos personales (emails): tabla interna, sin grants al navegador.

create table public.stripe_events (
  id text primary key,
  type text not null,
  source text not null check (source in ('platform', 'connect', 'v2')),
  stripe_account_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text check (outcome in ('processed', 'ignored')),
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  check ((processed_at is null) = (outcome is null))
);

comment on column public.stripe_events.stripe_account_id is
  'Cuenta conectada que originó el evento (eventos connect y v2). Nulo en eventos de la plataforma.';
comment on column public.stripe_events.error is
  'Código corto del último fallo, sin datos personales.';

create index stripe_events_pending_idx on public.stripe_events (received_at)
  where processed_at is null;
create index stripe_events_type_idx on public.stripe_events (type);

alter table public.stripe_events enable row level security;
revoke all on table public.stripe_events from anon, authenticated;
