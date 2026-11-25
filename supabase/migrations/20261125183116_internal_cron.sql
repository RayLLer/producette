-- Tareas programadas con pg_cron + pg_net (Paso 6, docs/plazos.md).
-- La misma migración sirve en dev, staging y producción: la URL de la web y el secreto
-- viven en Supabase Vault y los carga la persona (nunca una migración).
--   app_url      p. ej. https://staging.producette.com (sin barra final)
--   cron_secret  igual al CRON_SECRET del entorno de Vercel correspondiente
-- Si app_url no existe (dev, o un entorno sin web todavía), la tarea no hace nada.
--
-- Precaución: pg_net guarda cada petición pendiente, con sus cabeceras ya descifradas, en
-- net.http_request_queue hasta enviarla. Por eso CRON_SECRET solo autoriza los endpoints
-- internos, que son idempotentes, y se rota si alguien más obtiene acceso a la base.

create function private.call_internal(path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'app_url';
  if base_url is null then
    return;
  end if;

  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if secret is null then
    raise exception 'Vault secret cron_secret is missing (app_url is set)';
  end if;

  perform net.http_post(
    url := rtrim(base_url, '/') || path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end;
$$;

comment on function private.call_internal(text) is
  'POST a un endpoint interno de la web con el secreto de Vault. Sin app_url no hace nada.';

revoke all on function private.call_internal(text) from public, anon, authenticated;

-- Cada minuto: plazos vencidos (lib/server/jobs/sweep).
select cron.schedule(
  'producette-sweep',
  '* * * * *',
  $$select private.call_internal('/api/internal/sweep')$$
);

-- 08:00 UTC = 3:00 am en Miami (4:00 am en horario de verano): ranking nocturno de Hosts.
select cron.schedule(
  'producette-nightly',
  '0 8 * * *',
  $$select private.call_internal('/api/internal/nightly')$$
);

-- Domingos 08:30 UTC: cron.job_run_details crece sin límite; se guardan 7 días.
select cron.schedule(
  'producette-cron-history-cleanup',
  '30 8 * * 0',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
