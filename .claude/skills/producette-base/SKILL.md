---
name: producette-base
description: Reglas transversales del repositorio Producette (marketplace audiovisual en Miami, Fase 1 Host + Cliente + panel admin) y mapa de las demás skills del proyecto. Úsala al empezar cualquier tarea en este repo, al planificar un paso del plan de entornos, al dudar sobre qué entorno, credencial, rama o comando está permitido, o antes de tocar dinero, datos personales, migraciones o workflows. Si la tarea menciona Supabase, Next.js, Stripe, idiomas, UI, tests, emails, Sentry, despliegue, fotos o PDF, carga además la skill específica que se indica aquí.
---

# Producette · reglas base

Esta skill resume las reglas que no cambian entre tareas. El detalle de cada tecnología vive en su propia skill. Si algo de aquí choca con `CLAUDE.md` o con `docs/plan-entornos.md`, mandan esos documentos y debes avisarlo en el pull request.

## Fuentes de verdad (en este orden)

1. `docs/alcance-fase-1.md`: reglas de negocio. El 5% del cliente **no tiene tope**.
2. `docs/plan-entornos.md`: entornos, pasos y criterios de "Hecho cuando".
3. `docs/prototipo-fase-1.html`: interfaz de referencia (una sola web responsive).
4. `docs/manual-marca.html`: colores y tipografía.
5. `CLAUDE.md`: reglas operativas.

Si el alcance no resuelve una duda de negocio, **pregunta**. No inventes reglas, plazos ni porcentajes.

## Qué skill cargar

| Si la tarea toca… | Carga |
| --- | --- |
| Páginas, layouts, Server Actions, caché, proxy, validación con Zod | `producette-nextjs` |
| Auth, RLS, grants, migraciones, Storage, Realtime, pg_cron, Vault | `producette-supabase` |
| Consultas tipadas desde el servidor | `producette-drizzle` |
| Cobros, transferencias, Connect, Identity, webhooks, comisiones | `producette-stripe` |
| Textos, rutas /es y /en, metadatos, hreflang, sitemap | `producette-i18n-seo` |
| Componentes, Tailwind, shadcn, responsive, mapa | `producette-ui` |
| Vitest, Playwright, tests de RLS | `producette-testing` |
| Emails transaccionales y plantillas de Auth | `producette-email` |
| Errores y trazas | `producette-sentry` |
| GitHub Actions, Vercel, variables de entorno | `producette-deploy` |
| Fotos (sharp), contratos PDF, subidas a Storage | `producette-archivos` |

Junto a estas skills del proyecto pueden estar instaladas las oficiales de Supabase, Vercel, Next.js y Stripe. Úsalas como referencia general; cuando contradigan una regla de Producette, gana la de Producette.

## Entornos y credenciales

- Trabajas **solo** contra `producette-dev` (Supabase) y la sandbox **dev** de Stripe.
- Nunca vincules el CLI de Supabase a staging ni a producción, ni pidas, uses o guardes sus credenciales. Esos entornos solo cambian por GitHub Actions.
- El Stripe CLI nunca apunta al modo live.
- Ningún secreto en código, commits, logs, mensajes de chat ni salidas de comandos. Si un comando imprime una clave, no la repitas.
- Si necesitas una cuenta, una clave o un clic en un panel, **detente y pídelo**. No inventes valores.

## Git y pull requests

- Una tarea = una rama `feat/*` = un pull request hacia `main` con la plantilla llena.
- Nunca: `gh pr merge`, `git tag`, `git push` a `main`, `--no-verify`, `vercel --prod`.
- Una sola rama con migraciones abierta a la vez (dev es una base compartida).
- No modifiques `.github/workflows/` si la tarea no lo pide; si lo haces, explícalo arriba del PR.

## Reglas de negocio que se repiten

- **Dinero**: centavos enteros; comisiones solo con `lib/domain/fees.ts`; redondeo al centavo, mitad hacia arriba; tasas guardadas en cada cotización. Detalle en `producette-stripe`.
- **Escrituras sensibles** (cotizaciones, contratos, pagos, liberaciones, reembolsos, comisiones, mensajes de chat): solo en el servidor, dentro de una transacción. RLS niega escribirlas desde el navegador.
- **Panel admin**: roles `admin`, `soporte`, `finanzas`; `requireRole()` en cada acción; motivo obligatorio y `audit_log` en la misma transacción.
- **Privacidad**: dirección exacta en tabla aparte, legible solo después del pago; área aproximada en el listing público; fotos sin EXIF; archivos privados con URLs firmadas; nada de datos personales en Sentry ni logs.
- **Retención**: borrar una cuenta = anonimizarla. Sin `ON DELETE CASCADE` desde usuarios hacia contratos, pagos o bitácora.
- **Lenguaje**: "Pago Protegido", nunca "escrow". Los proveedores nunca son "empleados".
- **Plazos**: salen de `lib/domain/deadlines.ts` y se guardan como fecha en la fila.

## Forma de trabajar

1. Lee la parte del alcance y del plan que toca la tarea.
2. Reglas de negocio primero, como funciones puras en `lib/domain` con los tests escritos antes que el código.
3. Implementa con la skill de cada tecnología.
4. Antes de terminar: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; `npm run test:e2e` si tocaste interfaz. Si algo falla, la tarea no está terminada.
5. En el PR: SQL de cada migración, salida del dry-run, resultado de cada criterio de "Hecho cuando" y riesgos abiertos.

## Cambios técnicos detectados respecto del plan v2

Estas skills ya aplican los cambios siguientes. Si `docs/plan-entornos.md` todavía no los recoge, menciónalo en el PR en lugar de seguir el plan al pie de la letra:

- **Supabase CLI v3**: los comandos apuntan al stack local por defecto; contra un proyecto en la nube se usa `--remote` (`--linked` queda obsoleto). Ver `producette-supabase`.
- **Data API sin exposición automática**: cada tabla, vista y función que el navegador use necesita `grant` explícito en su migración.
- **postgres.js y el pooler en modo transacción**: Supabase advierte que el pipelining de postgres.js no funciona en ese modo. Ver `producette-drizzle`.
- **Stripe Connect**: las cuentas nuevas se crean con Accounts v2 (configuración `recipient`, panel Express), no con `type: 'express'`. Ver `producette-stripe`.
- **Next.js 16**: `proxy.ts` reemplaza a `middleware.ts`; `next lint` ya no existe.
