# Supabase CLI v3 y migraciones

## Qué cambió en la v3

- Los comandos de base de datos apuntan **al stack local por defecto**. Para un proyecto en la nube se agrega `--remote` (el proyecto vinculado) o `--remote=<ref|url>` (uno concreto).
- `--linked` queda obsoleto; `supabase link --project-ref <ref>` no cambia.
- En CI, `SUPABASE_YES=1` confirma los cambios en proyectos alojados.
- `SUPABASE_PROJECT_ID` solo define a qué proyecto apunta un `--remote` sin valor.
- `SUPABASE_DB_PASSWORD` ya no se envía a un proyecto distinto del vinculado. Pasa `--password` o usa un token de acceso.

Producette no tiene stack local, así que **todo comando de base lleva `--remote`**. Un comando sin `--remote` que intenta conectarse a localhost:54322 es una señal de que olvidaste la bandera, no de que falte Docker.

Antes de usar un comando, confirma con `supabase <comando> --help` que la bandera existe en la versión instalada. Si el CLI es v2, usa `--linked` donde aquí dice `--remote`.

## Flujo en dev (Claude Code)

```bash
supabase migration new listings_base        # crea supabase/migrations/<timestamp>_listings_base.sql
# escribe el SQL
supabase db push --remote --dry-run         # muestra qué aplicaría; pega la salida en el PR
supabase db push --remote                   # pide confirmación (está en "ask" de settings.json)
supabase migration list --remote            # comprueba que quedó aplicada
npm run db:types                            # supabase gen types typescript --remote > lib/supabase/database.types.ts
npx drizzle-kit pull                        # esquema de Drizzle
```

Scripts sugeridos en `package.json`:

```json
{
  "db:new": "supabase migration new",
  "db:types": "supabase gen types typescript --remote > lib/supabase/database.types.ts",
  "db:reset:dev": "node scripts/db-reset-dev.mjs"
}
```

`scripts/db-reset-dev.mjs` debe:

1. Leer el `project-ref` vinculado (`supabase/.temp/project-ref`) y detenerse si no es el de `producette-dev`.
2. Pedir confirmación escrita.
3. Ejecutar `supabase db reset --remote` y después el seed.

Nunca lo ejecutes sin que la persona lo confirme en la sesión.

## Reglas de migración

- Una migración aplicada nunca se edita. Si está mal, se corrige con otra nueva.
- Solo aditivas. Para borrar o renombrar: primero se deja de usar en el código desplegado; después, en otra migración, se elimina.
- Una por tema, con nombre descriptivo en inglés y `snake_case`.
- Idempotentes donde sea barato: `create … if not exists`, `create or replace function`, `drop policy if exists` antes de recrear.
- Ningún valor que dependa del entorno: nada de URLs, dominios, claves ni ids de Stripe. Eso va en Vault o en variables de entorno.
- Datos de ejemplo: nunca en migraciones; van en `scripts/seed.ts`.
- `cron.schedule` con nombre fijo: al reprogramar con el mismo nombre se actualiza la tarea, no se duplica.

## Si una migración falla en dev

1. No edites el archivo ya aplicado parcialmente sin revisar: `supabase migration list --remote` dice si quedó registrada.
2. Si no quedó registrada, corrige el archivo y repite el dry-run.
3. Si quedó registrada a medias (muy raro en Postgres, porque cada migración corre en una transacción), describe el estado en el PR y pide a la persona decidir entre `migration repair … --status reverted --remote` o una migración correctiva.

## En GitHub Actions (staging y producción)

Esto lo ejecuta el workflow `deploy.yml`, nunca tu máquina:

```yaml
- uses: supabase/setup-cli@v1
  with:
    version: 3.x.x   # fija una versión concreta; actualízala a propósito, no por accidente
- name: Migrar staging
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_YES: '1'
  run: |
    supabase link --project-ref "$STAGING_REF" --password "${{ secrets.STAGING_DB_PASSWORD }}"
    supabase db push --remote --password "${{ secrets.STAGING_DB_PASSWORD }}"
```

Comprueba con `supabase db push --help` en esa versión si `--password` va en `link`, en `db push` o en ambos. El workflow completo está en `producette-deploy`.

## Proyectos Free pausados

`producette-staging` se pausa tras una semana sin actividad. Si la Action falla por eso, no reintentes en bucle: la persona lo restaura desde el panel y relanza el workflow (`docs/despliegue.md`).
