---
name: producette-sentry
description: Configuración de Sentry (@sentry/nextjs) en Producette con Next.js 16 - instrumentation-client.ts, sentry.server.config.ts, sentry.edge.config.ts, instrumentation.ts con onRequestError, global-error.tsx, withSentryConfig y mapas de código, etiqueta de entorno desde lib/app-env.ts, activo solo en staging y producción y sin datos personales (sendDefaultPii en false y beforeSend que limpia). Úsala al instalar o tocar Sentry, al capturar errores a mano, al revisar qué datos salen hacia terceros o cuando un error no aparezca en Sentry.
---

# Sentry

## Reglas

- **Sin datos personales**: `sendDefaultPii: false` (el asistente de instalación lo pone en `true`: cámbialo), sin Session Replay y un `beforeSend` que borra emails, nombres, direcciones, cuerpos de petición y cookies.
- **Solo en staging y producción**: en local queda apagado salvo que `SENTRY_LOCAL=1` (para la prueba del Paso 8). El plan Developer da 5,000 errores al mes.
- **Etiqueta de entorno** desde `lib/app-env.ts` (`local`, `staging`, `production`), no desde `NODE_ENV`.
- **Usuario**: si hace falta, solo `{ id }` del usuario; nunca email ni nombre.

## Archivos

```ts
// sentry.shared.ts (sin 'server-only': lo usan los tres entornos)
import type { ErrorEvent } from '@sentry/nextjs';

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;

export function scrub(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
  }
  if (event.user) event.user = { id: event.user.id };
  if (event.message) event.message = event.message.replace(EMAIL, '[email]');
  event.exception?.values?.forEach((v) => {
    if (v.value) v.value = v.value.replace(EMAIL, '[email]');
  });
  return event;
}
```

```ts
// instrumentation-client.ts (navegador)
import * as Sentry from '@sentry/nextjs';
import { scrub } from './sentry.shared';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NEXT_PUBLIC_APP_ENV !== 'local' || process.env.NEXT_PUBLIC_SENTRY_LOCAL === '1',
  environment: process.env.NEXT_PUBLIC_APP_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrub,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

`NEXT_PUBLIC_APP_ENV` lo calcula el build a partir de `VERCEL_TARGET_ENV` (o se define en cada entorno de Vercel); en local vale `local`.

```ts
// sentry.server.config.ts y sentry.edge.config.ts (mismo contenido)
import * as Sentry from '@sentry/nextjs';
import { getAppEnv } from '@/lib/app-env';
import { scrub } from './sentry.shared';

const appEnv = getAppEnv();
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: appEnv !== 'local' || process.env.SENTRY_LOCAL === '1',
  environment: appEnv,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrub,
});
```

```ts
// instrumentation.ts
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config');
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config');
}

export const onRequestError = Sentry.captureRequestError; // errores de Server Components, acciones y rutas
```

```tsx
// app/[locale]/global-error.tsx y app/admin/global-error.tsx
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html><body>{/* mensaje genérico, sin detalles técnicos */}</body></html>
  );
}
```

```ts
// next.config.ts (por fuera de todo)
export default withSentryConfig(withNextIntl(nextConfig), {
  org: '<org>',
  project: '<project>',
  authToken: process.env.SENTRY_AUTH_TOKEN, // solo en el build; nunca NEXT_PUBLIC_
  silent: !process.env.CI,
});
```

Confirma los nombres de archivo y opciones con la guía de instalación manual de Sentry para Next.js y la versión instalada; el asistente `npx @sentry/wizard@latest -i nextjs` genera estos archivos y después hay que aplicar las reglas de arriba.

## Capturar a mano

- Errores esperados de negocio (`DomainError`) **no** se envían: se muestran al usuario.
- Fallos de servicios externos (Stripe, Resend, pg_net) sí, con contexto mínimo:

```ts
Sentry.captureException(err, { tags: { area: 'stripe', op: 'transfer' }, extra: { bookingId } });
```

  Ids internos sí; emails, nombres, direcciones, montos asociados a una persona o cuerpos de webhook, no.

## Prueba (Paso 8)

Ruta `/api/internal/sentry-test` (o una página) que lanza un error, disponible solo fuera de producción. Con `SENTRY_LOCAL=1` en local, el error aparece con la etiqueta `local`; desde el Paso 9, con `staging`.

## Si se usa `tunnelRoute`

Si activas `tunnelRoute` para esquivar bloqueadores de anuncios, excluye esa ruta del `matcher` del proxy y de la contraseña de staging.
