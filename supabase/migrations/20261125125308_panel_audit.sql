-- Panel de administración y bitácora. Solo el servidor (Drizzle) las usa: sin grants al navegador.

create table public.panel_users (
  user_id uuid primary key references public.accounts (id) on delete restrict,
  role text not null check (role in ('admin', 'soporte', 'finanzas')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger panel_users_set_updated_at
  before update on public.panel_users
  for each row execute function private.set_updated_at();

alter table public.panel_users enable row level security;
revoke all on table public.panel_users from anon, authenticated;


create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references public.accounts (id) on delete restrict,
  actor_role text not null check (actor_role in ('admin', 'soporte', 'finanzas', 'system')),
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text not null check (length(trim(reason)) > 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_user_id_idx on public.audit_log (actor_user_id);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;
revoke all on table public.audit_log from anon, authenticated;
revoke update, delete, truncate on table public.audit_log from public;

create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log es solo de inserción';
end $$;

revoke all on function private.audit_log_immutable() from public;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();
