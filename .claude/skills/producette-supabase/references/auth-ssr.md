# Auth con @supabase/ssr en Next.js 16

Basado en la guía oficial de Supabase para Next.js (App Router). La plantilla `with-supabase` ya trae estos archivos; esta referencia dice qué conservar y qué cambiar.

Reglas de la guía oficial que no se tocan:

- Usa solo `getAll` y `setAll` en las cookies; nunca `get`, `set` ni `remove`.
- Nunca importes `@supabase/auth-helpers-nextjs`.
- Crea un cliente nuevo en cada petición; no lo guardes en una variable global.
- En el proxy no pongas código entre `createServerClient` y `getClaims()`.
- Devuelve la respuesta que construyó `setAll`, o copia sus cookies a la respuesta que devuelvas. Si no, la sesión se pierde en la siguiente petición.

## Cliente del navegador

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

## Cliente del servidor

```ts
// lib/supabase/server.ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: se ignora porque el proxy refresca la sesión.
          }
        },
      },
    },
  );
}
```

## Cliente secreto (salta RLS)

```ts
// lib/server/supabase-admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

Úsalo solo en: seed, webhooks, procesos de `sweep`, subidas a buckets, creación de URLs firmadas tras verificar permisos y la API de administración de usuarios. Cada uso lleva un comentario que explica por qué no basta con el cliente de sesión.

## Refresco de sesión en el proxy

```ts
// lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Las versiones recientes pasan cabeceras anti-caché (cache-control, expires, pragma).
          // Confirma la firma de setAll en la versión instalada de @supabase/ssr.
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value as string),
          );
        },
      },
    },
  );

  // No pongas nada entre createServerClient y getClaims.
  const { data } = await supabase.auth.getClaims();
  return { supabaseResponse, claims: data?.claims ?? null };
}
```

**Por qué las cabeceras anti-caché importan**: si una respuesta que lleva cookies de sesión queda guardada en una caché compartida, otra persona puede recibir la sesión de alguien más. Ninguna página con sesión se cachea, y el proxy respeta las cabeceras que manda Supabase.

## Proxy combinado: Supabase + next-intl (+ contraseña de staging)

next-intl crea su propia respuesta (redirección o reescritura por idioma). El orden seguro es: primero Supabase (refresca y escribe las cookies en la petición), después next-intl, y al final se copian las cookies y cabeceras de Supabase a la respuesta de next-intl.

```ts
// proxy.ts
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/proxy';

const handleI18nRouting = createIntlMiddleware(routing);
const CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const;

function carrySupabase(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const h of CACHE_HEADERS) {
    const v = from.headers.get(h);
    if (v) to.headers.set(h, v);
  }
  return to;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Paso 9: contraseña de staging (fuera de producción), antes de cualquier otra cosa.

  // Rutas sin idioma: panel y rutas de auth del servidor.
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth/')) {
    if (pathname.startsWith('/admin') && !claims) {
      const url = request.nextUrl.clone();
      url.pathname = '/es/login';
      url.searchParams.set('next', pathname);
      return carrySupabase(supabaseResponse, NextResponse.redirect(url));
    }
    return supabaseResponse;
  }

  return carrySupabase(supabaseResponse, handleI18nRouting(request));
}

export const config = {
  matcher: [
    // Fuera: estáticos, imágenes, webhooks e internos (no necesitan sesión ni idioma).
    '/((?!api/webhooks|api/internal|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
```

- La redirección por falta de sesión en `/admin` es solo comodidad. La autorización real es `requireRole()` en el layout del panel y en cada acción.
- Ajusta `/es/login` y el prefijo `/auth/` a las rutas reales de la plantilla una vez movidas.
- Prueba (Paso 2, "Hecho cuando"): login, recarga en /es y /en, cambio de idioma con sesión abierta y expiración del token (baja la duración del JWT en dev para probarlo).

## Confirmación de email y Google

- **Email**: la plantilla trae `app/auth/confirm/route.ts`, que usa `verifyOtp({ type, token_hash })`. La plantilla del email debe apuntar a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=…`.
- **Google (OAuth con PKCE)**: el botón llama a `signInWithOAuth({ provider: 'google', options: { redirectTo: `${siteUrl}/auth/callback?next=…` } })` y `app/auth/callback/route.ts` hace `exchangeCodeForSession(code)`.
- En ambas rutas, antes de redirigir:
  1. Valida `next` contra una lista de rutas internas (empieza por `/` y no por `//`) para evitar redirecciones abiertas.
  2. Llama a `ensureStripeCustomer(userId)` (Paso 5).
  3. Si falta la aceptación de Términos o la casilla de mayor de 18 años, redirige al onboarding común.

## Errores típicos

| Síntoma | Causa probable |
| --- | --- |
| La sesión se pierde al navegar | El proxy devuelve una respuesta distinta de la que escribió `setAll` sin copiar cookies |
| Usuario logueado en el navegador pero `null` en el servidor | Se llamó a `getSession()` o el proxy no cubre esa ruta en el `matcher` |
| Bucle de redirecciones /es ↔ /login | La ruta de login está protegida por el proxy o falta en la lista de públicas |
| Un usuario ve datos de otro | Página con sesión cacheada (`'use cache'`, ISR o CDN). Nunca caches lo que depende de cookies |
