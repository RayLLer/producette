---
name: producette-deploy
description: Entornos y despliegue de Producette - GitHub Free con ci.yml, deploy.yml (verificación de PR con CI en verde, migración de staging, desde el Paso 9 despliegue a Vercel staging y producción por etiqueta v*), seed-staging.yml, Supabase CLI v3 en Actions, Vercel CLI (entorno personalizado staging, --target, --prod, variables sensibles), lib/app-env.ts con VERCEL_TARGET_ENV, protecciones al arrancar y contraseña de staging. Úsala al tocar .github/workflows, vercel.json, variables de entorno, lib/env.ts, lib/app-env.ts o docs/despliegue.md, o al preparar el Paso 7 o el Paso 9.
---

# Entornos y despliegue

## Lo que Claude Code no hace nunca

Hacer merge, crear etiquetas, desplegar a producción, cargar variables de Production en Vercel, vincular el CLI de Supabase a staging o producción, ni leer o pedir sus credenciales. Cualquier cambio en `.github/workflows/` pide confirmación y se explica arriba del PR, porque en GitHub Free cualquier workflow puede leer los secretos del repositorio.

## Entornos

| | Local | Staging | Producción |
| --- | --- | --- | --- |
| Rama / etiqueta | `feat/*` | `main` | `v*` |
| Supabase | producette-dev | producette-staging | producette-prod (Paso 9) |
| Web | `npm run dev` | Vercel, entorno personalizado `staging` (Paso 9) | Vercel Production (Paso 9) |
| Migraciones | Claude Code (`--remote`, con dry-run) | Solo Actions | Solo Actions |

Hasta el Paso 9 no hay ninguna web desplegada (Vercel Hobby no admite uso comercial); staging existe solo como base de datos.

## `lib/app-env.ts`

```ts
export type AppEnv = 'local' | 'staging' | 'production';

export function getAppEnv(): AppEnv {
  const target = process.env.VERCEL_TARGET_ENV; // 'production' | 'preview' | 'development' | nombre del entorno personalizado
  if (target === 'production') return 'production';
  if (target === 'staging') return 'staging';
  if (process.env.VERCEL) throw new Error(`Entorno de Vercel no esperado: ${target}`);
  return 'local';
}
```

- En un entorno personalizado, `VERCEL_ENV` vale `preview`; por eso se lee `VERCEL_TARGET_ENV`.
- En el navegador, expón el resultado como `NEXT_PUBLIC_APP_ENV` (variable nueva, una por entorno de Vercel; `local` en `.env.local`), o activa la exposición automática de variables del sistema y lee `NEXT_PUBLIC_VERCEL_TARGET_ENV`.
- Protecciones al arrancar (Paso 3): URL de Supabase coherente con el entorno, `sk_live_`/`pk_live_` solo en producción, `DEADLINE_SCALE` igual a 1 en producción, franja LOCAL/STAGING y `noindex` fuera de producción.

## `ci.yml` (cada pull request)

```yaml
name: CI
on: pull_request
permissions:
  contents: read
concurrency:
  group: ci-${{ github.event.pull_request.number }}
  cancel-in-progress: true
jobs:
  checks:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      # Valores ficticios con formato válido: el build valida la forma, no la conexión.
      NEXT_PUBLIC_SUPABASE_URL: https://ci-placeholder.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci
      SUPABASE_SECRET_KEY: sb_secret_ci
      STRIPE_SECRET_KEY: sk_test_ci
      # …el resto de variables obligatorias
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

Las protecciones de `lib/env.ts` deben aceptar estos valores de CI (por ejemplo, reconociendo `CI=true` y un proyecto ficticio) sin desactivarse en local ni en Vercel.

## `deploy.yml` (push a `main` y etiquetas `v*`)

Estructura:

1. **gate**: solo continúa si el commit viene de un pull request integrado a `main` con el CI en verde.
2. **staging** (push a `main`): migra producette-staging; desde el Paso 9, despliega `--target=staging` si la migración terminó bien.
3. **production** (etiqueta `v*`, Paso 9): comprueba que el commit está en `main` y que ya pasó por staging; migra producette-prod; despliega `--prod`.

```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
permissions:
  contents: read
  pull-requests: read
  checks: read
  actions: read
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false   # nunca cortar una migración a medias
jobs:
  gate:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    env: { GH_TOKEN: '${{ github.token }}' }
    steps:
      - name: Commit integrado desde un PR con CI en verde
        run: |
          PR=$(gh api "repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA/pulls" \
            --jq '[.[] | select(.merged_at != null and .base.ref == "main")][0]')
          [ -n "$PR" ] && [ "$PR" != "null" ] || { echo "No viene de un PR integrado"; exit 1; }
          HEAD_SHA=$(echo "$PR" | jq -r '.head.sha')
          FAILED=$(gh api "repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs" \
            --jq '[.check_runs[] | select(.name == "checks" and .conclusion != "success")] | length')
          OK=$(gh api "repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs" \
            --jq '[.check_runs[] | select(.name == "checks" and .conclusion == "success")] | length')
          [ "$FAILED" = "0" ] && [ "$OK" -ge 1 ] || { echo "CI no está en verde"; exit 1; }
  staging:
    needs: gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: '<3.x.x fijada>' }
      - name: Migrar staging
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_YES: '1'
          DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
        run: |
          supabase link --project-ref "<ref de producette-staging>" --password "$DB_PASSWORD"
          supabase db push --remote --password "$DB_PASSWORD"
      # Paso 9: despliegue de la web de staging
      # - run: npx vercel@<versión fijada> deploy --target=staging --yes --token "$VERCEL_TOKEN"
      #   env: { VERCEL_TOKEN: '${{ secrets.VERCEL_TOKEN }}', VERCEL_ORG_ID: '${{ secrets.VERCEL_ORG_ID }}', VERCEL_PROJECT_ID: '${{ secrets.VERCEL_PROJECT_ID }}' }
```

- El nombre del check (`checks`) debe coincidir con el job de `ci.yml`.
- Si staging está pausado (proyecto Free), el paso falla sin efectos: la persona lo restaura y relanza (`docs/despliegue.md`).
- Confirma con `supabase db push --help` y `supabase link --help` dónde va `--password` en la versión fijada del CLI.

## Vercel (Paso 9)

- `vercel.json` con `{ "git": { "deploymentEnabled": false } }`: solo despliega la Action.
- **Construye en Vercel, no en GitHub**: usa `vercel deploy --target=staging` y `vercel deploy --prod` sin `--prebuilt`. Las variables sensibles no se pueden descargar con `vercel pull`, así que un `vercel build` en el runner de GitHub no las tendría.
- Variables de staging: Claude Code puede cargarlas con `vercel env add <NOMBRE> staging` (sin escribir el valor en el chat: la persona lo pega en el prompt del CLI). `vercel env add` las crea como sensibles por defecto en Production, Preview y entornos personalizados.
- Variables de producción: solo la persona, como sensibles.
- Rollback: `vercel rollback` (documentado y probado una vez en staging).
- Fluid compute está activo por defecto en proyectos nuevos; el pool de base de datos se registra con `attachDatabasePool` (ver `producette-drizzle`).

## Contraseña de staging (Paso 9)

En el proxy, solo si `getAppEnv() === 'staging'`:

- Sin la cookie `staging_auth` válida → redirige a `/staging-login?next=<url original>`.
- La cookie guarda un HMAC de la contraseña (no la contraseña), `httpOnly`, `secure`, `sameSite: 'lax'`.
- `next` se valida como ruta interna.
- Quedan abiertas `/api/webhooks/*`, `/api/internal/*` y la propia página de login de staging.

## `seed-staging.yml`

Solo `workflow_dispatch`. Corre `scripts/seed.ts` con la URL y la clave secreta de staging desde secretos del repositorio. El script se niega a correr si la URL es la de producción.
