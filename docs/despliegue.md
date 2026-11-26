# Despliegue

Cómo llega un cambio desde una rama hasta staging, qué secretos usa GitHub y qué hacer cuando algo falla. El Paso 9 agregará la web de staging, la de producción y el rollback.

## 1. Camino de un cambio (hasta el Paso 9)

```
rama feat/*  →  pull request  →  CI (ci.yml)  →  merge a main  →  Deploy (deploy.yml)  →  producette-staging
```

| Workflow | Cuándo corre | Qué hace |
| --- | --- | --- |
| `ci.yml` (job `checks`) | En cada pull request | lint, typecheck, tests unitarios y build, con valores ficticios |
| `deploy.yml` | En cada push a `main` | 1) Comprueba que el commit es el merge de un PR con el CI en verde. 2) Muestra las migraciones pendientes y las aplica a producette-staging |
| `seed-staging.yml` | Solo a mano, desde `main` | Carga los datos de prueba de `scripts/seed.ts` en producette-staging |

Todavía no se despliega ninguna web: staging existe solo como base de datos hasta el Paso 9.

`test:rls` y `test:e2e` no corren en GitHub, porque necesitan credenciales reales de dev. Se ejecutan en local antes de abrir cada PR, como pide la plantilla.

## 2. Por qué existe la comprobación del merge

GitHub Free no protege ramas, así que alguien podría hacer push directo a `main` saltando el hook local (`--no-verify`). Para que eso no migre staging, el primer job de `deploy.yml` (`.github/scripts/deploy-gate.sh`) solo deja pasar el commit si:

1. es el **commit de merge** de un pull request integrado a `main`, y
2. el check `checks` del CI pasó en el último commit de ese PR.

Si no se cumple, la Action falla en ese job y **no se toca staging**. El mensaje dice el motivo.

## 3. Secretos del repositorio

Se cargan en GitHub → Settings → Secrets and variables → Actions, o desde tu terminal con `gh secret set NOMBRE` (pide el valor sin mostrarlo). Claude Code nunca los ve ni los carga.

| Secreto | Para qué | Dónde se obtiene |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | El CLI de Supabase en `deploy.yml` | supabase.com → Account → Access Tokens (token personal) |
| `STAGING_DATABASE_URL` | Migraciones (de aquí sale la contraseña de la base) y seed de staging | Panel de producette-staging → Connect → Transaction pooler (con la contraseña en lugar de `[YOUR-PASSWORD]`) |
| `STAGING_SUPABASE_SECRET_KEY` | Seed de staging | Panel de producette-staging → Project Settings → API Keys (`sb_secret_…`) |
| `SEED_EMAIL`, `SEED_ADMIN_EMAIL`, `SEED_PASSWORD` | Seed de staging: los mismos valores que en `.env.local` | Tu `.env.local` |

La contraseña de la base de staging solo vive dentro de `STAGING_DATABASE_URL`. `deploy.yml` la extrae de ahí, la oculta en el log y comprueba que la URL apunte a producette-staging antes de migrar. Si cambias la contraseña en Supabase, actualizas solo ese secreto.

**Cuidado con GitHub Free**: cualquier workflow puede leer estos secretos, incluso uno modificado en una rama. Por eso todo cambio en `.github/` es lo primero que se revisa en un PR, y Claude Code pide confirmación antes de editar `.github/workflows/`.

## 4. Ajustes del repositorio

En GitHub → Settings → General → Pull Requests:

- Solo **Allow squash merging**, con los otros dos métodos desactivados.
- **Automatically delete head branches** activado.

Así cada PR entra a `main` como un solo commit y su rama se borra sola.

## 5. Si staging está pausado

Supabase pausa los proyectos Free después de una semana sin actividad. Con producette-staging pausado, el job **Migrate producette-staging** falla al conectar y no aplica nada.

1. Entra a supabase.com → producette-staging → **Restore project** y espera a que quede activo (unos minutos).
2. En GitHub → Actions → **Deploy**, abre la ejecución fallida y pulsa **Re-run failed jobs**.
3. Comprueba en el log del paso *Apply migrations* que las migraciones se aplicaron, o que dice que no había pendientes.

Las migraciones son idempotentes respecto del historial: el CLI solo aplica las que staging todavía no tiene, así que relanzar es seguro.

## 6. Si una migración falla en staging

1. Lee el error en el log del paso *Apply migrations*. Las migraciones anteriores del mismo push ya quedaron aplicadas; la que falló no.
2. Arregla el problema con una **migración nueva** en un PR. Nunca edites una migración que ya se aplicó en algún entorno.
3. El merge de ese PR vuelve a lanzar Deploy.

## 7. Cargar datos de prueba en staging

GitHub → Actions → **Seed staging** → **Run workflow** sobre `main`. El seed es idempotente y se niega a correr contra cualquier proyecto que no sea dev o staging.
