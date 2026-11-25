-- Una fila por ejecución de cada proceso programado (lib/server/jobs), escrita por los
-- endpoints /api/internal/sweep y /api/internal/nightly. Es el registro fiable de que
-- un proceso corrió: pg_net no espera la respuesta del endpoint.
--   finished_at nulo           -> en curso (o abandonado si pasó mucho tiempo)
--   finished_at + error nulo   -> terminó bien; processed = filas procesadas
--   finished_at + error        -> falló; error es un código corto sin datos personales
-- Tabla interna: sin grants al navegador.

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  processed integer check (processed >= 0),
  error text,
  check (finished_at is not null or (processed is null and error is null))
);

create index job_runs_job_started_at_idx on public.job_runs (job, started_at desc);
create index job_runs_running_idx on public.job_runs (started_at) where finished_at is null;

alter table public.job_runs enable row level security;
revoke all on table public.job_runs from anon, authenticated;
