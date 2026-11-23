---
name: producette-nextjs
description: Patrones de Next.js 16 (App Router) para Producette - estructura de carpetas, proxy.ts, Data Access Layer con server-only, Server Actions validadas con Zod 4, Cache Components ('use cache', cacheTag, updateTag), params asíncronos, route handlers y variables de entorno. Úsala siempre que crees o cambies una página, layout, Server Action, route handler, el proxy, next.config o lib/env.ts, aunque la tarea parezca solo de UI o solo de datos, y antes de cachear cualquier cosa.
---

# Next.js 16 en Producette

## Antes de escribir código

- Next.js 16 trae su documentación dentro del paquete: `node_modules/next/dist/docs/`. Si dudas de una API, léela ahí antes que tu memoria; `AGENTS.md` (importado desde `CLAUDE.md`) apunta a esa carpeta.
- Cambios de la versión 16 que más se olvidan:
  - `proxy.ts` (función `proxy`) reemplaza a `middleware.ts` y corre en Node. No uses el runtime edge en el proxy.
  - `params`, `searchParams`, `cookies()`, `headers()` y `draftMode()` son asíncronos: siempre `await`.
  - `next lint` ya no existe: `"lint": "eslint ."`.
  - Turbopack es el empaquetador por defecto en dev y build.
  - `revalidateTag(tag, perfil)` pide un perfil de `cacheLife` como segundo argumento; `updateTag(tag)` y `refresh()` solo existen dentro de Server Actions.

## Estructura (del plan, Paso 1)

```
app/[locale]/(public)/   web pública sin cuenta, /es y /en
app/[locale]/(app)/      páginas con sesión: Modo Cliente y Modo Host
app/admin/               panel, solo español, sin idioma en la URL
app/api/                 webhooks e internos, sin idioma
lib/domain/              reglas de negocio puras + tests (fees, deadlines, estados)
lib/server/              acceso a datos y servicios externos ('server-only')
lib/supabase/            clientes de Supabase (navegador, servidor, proxy)
messages/es.json, en.json
```

- `app/[locale]/layout.tsx` y `app/admin/layout.tsx` son layouts raíz independientes (cada uno con `<html>`); no hay `app/layout.tsx` compartido.
- Componentes de servidor por defecto. `'use client'` solo en la hoja interactiva más pequeña posible (formulario, mapa, calendario, chat).

## Seguridad: tres capas, nunca una sola

1. **Proxy** (`proxy.ts`): refresca la sesión de Supabase, aplica el idioma y, desde el Paso 9, la contraseña de staging. Puede redirigir por comodidad, pero **no es la autorización**: un fallo o un bypass del proxy no puede abrir datos.
2. **Data Access Layer** (`lib/server/*`, con `import 'server-only'`): toda lectura y escritura pasa por funciones que verifican quién pide antes de tocar la base.
3. **Base de datos**: RLS en cada tabla y grants mínimos (ver `producette-supabase`).

```ts
// lib/server/auth.ts
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims(); // verifica el JWT; nunca getSession() en el servidor
  if (error || !data?.claims) return null;
  return { id: data.claims.sub as string, email: data.claims.email as string | undefined };
});

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/login'); // ajusta a la ruta con idioma que corresponda
  return viewer;
}
```

`requireRole(roles)` lee `panel_users` (activo = true) con Drizzle después de `requireUser()`. Para responder 403 de verdad, revisa en la documentación empaquetada si `forbidden()` sigue detrás de `experimental.authInterrupts`; si no lo activas, lanza un error controlado y muestra la página de acceso denegado.

Reglas:
- Los objetos que llegan a un componente cliente son DTO mínimos: nunca la fila entera (puede llevar dirección exacta, `stripe_customer_id`, tasas internas).
- Marca con `import 'server-only'` todo archivo que lea secretos, use Drizzle o el cliente secreto de Supabase.
- Las variables secretas solo se importan desde `lib/env.ts` en el servidor (ver abajo).

## Server Actions

Una Server Action es un endpoint público: cualquiera puede llamarla con cualquier cuerpo. Cada una sigue este orden:

```ts
'use server';
import { z } from 'zod';
import { updateTag } from 'next/cache';
import { requireUser } from '@/lib/server/auth';

const Input = z.object({
  listingId: z.uuid(),
  message: z.string().trim().min(1).max(2000),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function sendQuoteRequest(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await requireUser();                       // 1. autenticación
  const parsed = Input.safeParse(Object.fromEntries(formData)); // 2. validación
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  // 3. autorización sobre el recurso concreto (¿puede este viewer hacer esto con ESTE listing?)
  // 4. lógica en lib/domain + escritura en lib/server dentro de una transacción
  updateTag(`listing:${parsed.data.listingId}`);           // 5. el autor ve su cambio al instante
  return { ok: true };
}
```

- En el cliente, `useActionState(action, null)` y `useFormStatus()` para el estado de envío.
- Los mensajes de error que devuelve el servidor son **claves** de `messages/*.json` (por ejemplo `errors.required`), no textos; el componente los traduce.
- Límite de cuerpo de Server Actions: 1 MB por defecto. Los archivos no viajan por una Server Action: se suben a Storage con URL firmada (ver `producette-archivos`).
- Para dinero: la acción nunca recibe montos calculados desde el navegador. Recibe ids y recalcula en el servidor con `lib/domain/fees.ts`.

## Zod 4

- Formatos como funciones de primer nivel: `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`.
- Un solo parámetro de error: `z.string().min(1, { error: 'errors.required' })`. `message`, `required_error` e `invalid_type_error` están obsoletos.
- Errores: `z.flattenError(err)` y `z.treeifyError(err)`; `err.format()` y `err.flatten()` están obsoletos.
- `.extend()` en lugar de `.merge()`. `z.string().min(1)` en lugar de `.nonempty()`.
- Montos: `z.number().int().nonnegative()` en centavos; nunca `z.number()` suelto para dinero.

## Variables de entorno (`lib/env.ts`)

```ts
import 'server-only';
import { z } from 'zod';

const ServerEnv = z.object({
  SUPABASE_SECRET_KEY: z.string().startsWith('sb_secret_'),
  DATABASE_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  CRON_SECRET: z.string().min(32),
  // …el resto de la tabla del Paso 3
});
export const serverEnv = ServerEnv.parse(process.env);
```

- Las públicas (`NEXT_PUBLIC_*`) van en `lib/env.public.ts`, sin `server-only`, y se leen con acceso **literal** (`process.env.NEXT_PUBLIC_SITE_URL`): Next solo inyecta en el navegador las que aparecen escritas así.
- `lib/app-env.ts` devuelve `local | staging | production` leyendo `VERCEL_TARGET_ENV` (en entornos personalizados `VERCEL_ENV` vale `preview`). Las protecciones del Paso 3 (URL de Supabase según entorno, claves live, `DEADLINE_SCALE`) se ejecutan al arrancar, desde `instrumentation.ts` o desde la importación de `lib/env.ts`.

## Caché (Cache Components)

Revisa `next.config.ts`: si tiene `cacheComponents: true`, todo es dinámico salvo lo que marques con `'use cache'`.

Reglas de Producette:
- **Nunca** caches datos de un usuario concreto, ni nada que lea `cookies()` o `headers()` (el cliente de servidor de Supabase lee cookies, así que no puede ir dentro de `'use cache'`).
- Solo se cachea contenido público e idéntico para todos: ficha pública de un listing, catálogo de Explorar con un filtro dado, perfil público de Host, textos legales.
- Para esas lecturas usa un cliente sin cookies (clave publicable, rol `anon`) o Drizzle con un filtro explícito de "solo publicado", nunca la sesión.
- Pasa el idioma como argumento a la función cacheada; no lo leas dentro.

```ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getPublicListing(id: string, locale: 'es' | 'en') {
  'use cache';
  cacheLife('hours');
  cacheTag(`listing:${id}`);
  // lectura pública: solo columnas públicas, área aproximada, nunca dirección exacta
}
```

- Después de una escritura propia: `updateTag('listing:…')` dentro de la Server Action. Desde un webhook o un proceso de `sweep`: `revalidateTag('listing:…', 'max')`.
- El ranking nocturno (endpoint `nightly`) invalida con `revalidateTag('explore', 'max')`.
- Lo dinámico dentro de una página cacheada va envuelto en `<Suspense>` con un esqueleto.

## Route handlers

- Webhooks (`app/api/webhooks/*`): leen el cuerpo con `await request.text()` antes de cualquier otra cosa, verifican la firma y responden rápido. Detalle en `producette-stripe`.
- Internos (`app/api/internal/*`): exigen `Authorization: Bearer <CRON_SECRET>` con comparación en tiempo constante (`crypto.timingSafeEqual`) y devuelven 401 sin él.
- Ningún route handler devuelve stack traces ni mensajes de Postgres al cliente.

## Trabajo después de responder

`after()` (de `next/server`) sirve para tareas no críticas que no deben retrasar la respuesta (registrar métricas, avisos no esenciales). Lo que no puede perderse (emails de contrato, liberaciones, reembolsos) va a una tabla y lo procesa `sweep`.

## Checklist de una página nueva

- [ ] `params` con `await` y tipado `Promise<{ locale: string; … }>`.
- [ ] `setRequestLocale(locale)` y textos desde `messages/*` (ver `producette-i18n-seo`).
- [ ] Datos por la DAL, con DTO mínimos hacia el cliente.
- [ ] `generateMetadata` si es pública.
- [ ] Estados de carga (`loading.tsx` o `<Suspense>`) y de error (`error.tsx`).
- [ ] Responsive en 375, 600 y 900 px (ver `producette-ui`).
