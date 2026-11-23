# pg_cron + pg_net + Vault (Paso 6)

Staging y producción llaman cada minuto a `POST /api/internal/sweep` y cada noche a `POST /api/internal/nightly`. La misma migración se aplica en los tres proyectos; en dev no hace nada porque no existe `app_url` en Vault.

## Secretos (los carga la persona, nunca una migración)

En el SQL Editor de staging y de producción (Paso 9):

```sql
select vault.create_secret('https://staging.producette.com', 'app_url');
select vault.create_secret('<mismo valor que CRON_SECRET en Vercel staging>', 'cron_secret');
```

Para cambiar un valor: `select vault.update_secret(id, 'nuevo valor') from vault.secrets where name = 'cron_secret';`

## Migración

```sql
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog; -- así lo instala Supabase

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
    return; -- dev, o un entorno sin web todavía: no hace nada
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';

  perform net.http_post(
    url := base_url || path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end $$;

revoke all on function private.call_internal(text) from public;

select cron.schedule('producette-sweep', '* * * * *', $$select private.call_internal('/api/internal/sweep')$$);
select cron.schedule('producette-nightly', '0 8 * * *', $$select private.call_internal('/api/internal/nightly')$$); -- 08:00 UTC
```

## Precauciones

- **El secreto queda un rato en una tabla**: pg_net guarda cada petición pendiente, con sus cabeceras ya descifradas, en `net.http_request_queue` hasta enviarla, y cualquier rol con login puede leerla. Por eso `CRON_SECRET` solo autoriza los endpoints internos, que son idempotentes, y se rota si alguien más obtiene acceso a la base.
- **pg_net no espera la respuesta**: la llamada es asíncrona. El resultado queda en `net._http_response` por un tiempo limitado; el registro fiable es `job_runs`, que escribe el endpoint.
- **El endpoint tiene que ser rápido e idempotente**: si un minuto se solapa con el siguiente, dos ejecuciones pueden correr a la vez. Cada proceso usa `for update skip locked` y una transacción por lote.
- **Límite de duración**: el endpoint en Vercel tiene un tiempo máximo por función; procesa lotes acotados (por ejemplo, 100 filas por proceso) y deja el resto para el minuto siguiente.

## Revisar el estado (dev o staging, solo lectura)

```sql
select jobname, schedule, active from cron.job;
select jobid, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 20;
```

`cron.job_run_details` crece sin límite: agrega una tarea semanal que borre filas de más de 7 días, o hazlo dentro de `nightly`.

## Dev

`npm run sweep` y `npm run sweep:watch` llaman al endpoint local con el `CRON_SECRET` de `.env.local`. El script se detiene si la URL no es `http://localhost`.
