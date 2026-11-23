---
name: producette-i18n-seo
description: Idiomas y SEO de Producette con next-intl v4 en Next.js 16 - rutas /es y /en siempre visibles, defineRouting, proxy combinado con Supabase, setRequestLocale, getTranslations, formato de moneda y fechas en America/New_York, mensajes ICU, panel admin en español sin idioma en la URL, generateMetadata con hreflang y x-default, canonical, sitemap y robots por entorno. Úsala cuando agregues o cambies cualquier texto visible, una página pública, metadatos, enlaces internos, fechas o precios mostrados, emails con idioma o el sitemap, aunque sea un solo botón.
---

# Idiomas y SEO

## Reglas

- Ningún texto de interfaz escrito en un componente: todo va en `messages/es.json` y `messages/en.json`, con las mismas claves en ambos.
- Tú escribes el inglés completo; la persona corrige a mano lo que encuentre mal.
- Listings, chat y reviews se muestran en su idioma original, sin traducción automática.
- El panel `/admin` va en español y sin idioma en la URL.
- Las claves se agrupan por pantalla (`Explore.filters.price`), no por tipo de componente.

## Configuración

```ts
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',        // confirma con la persona el idioma por defecto si el navegador no pide ninguno de los dos
  localePrefix: 'always',     // /es y /en siempre visibles
});
```

```ts
// i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

```ts
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'America/New_York', // Miami; evita diferencias entre servidor y navegador
  };
});
```

- En `next.config.ts`: `createNextIntlPlugin()` envolviendo la configuración (y `withSentryConfig` por fuera de todo).
- El proxy combinado con Supabase está en `producette-supabase/references/auth-ssr.md`. Sin idioma: `/admin`, `/api`, `/auth/*` (rutas de servidor) y los archivos estáticos.
- Para `/admin`, `requestLocale` llega vacío y se usa `es` (si cambias `defaultLocale`, fuerza `es` para las rutas del panel).

## Layout y páginas

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- Cada página y layout bajo `[locale]` llama a `setRequestLocale(locale)` antes de usar traducciones, para que pueda renderizarse estática.
- Servidor: `const t = await getTranslations('Explore')`. Cliente: `const t = useTranslations('Explore')`.
- Dentro de funciones con `'use cache'`, pasa el idioma explícito: `getTranslations({ locale, namespace: 'Listing' })`.
- Enlaces internos con el `Link` de `@/i18n/navigation`, nunca `<a href="/es/...">` escrito a mano.
- El selector de idioma usa `useRouter().replace(pathname, { locale })` y conserva los parámetros de búsqueda.

## Mensajes ICU y formato

```json
{
  "Booking": {
    "hours": "{count, plural, one {# hora} other {# horas}}",
    "total": "Total: {amount}"
  }
}
```

```ts
const format = useFormatter(); // o getFormatter() en el servidor
format.number(cents / 100, { style: 'currency', currency: 'USD' });
format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
```

- Nunca concatenes frases ni pluralices con `if`.
- Nunca uses `toLocaleString` suelto: la zona horaria y el idioma salen de next-intl.
- Los errores de Zod devuelven claves (`errors.required`) que se traducen en el componente.

## SEO de páginas públicas

```ts
// lib/seo.ts
import type { Metadata } from 'next';

export function alternatesFor(path: string, locale: 'es' | 'en'): Metadata['alternates'] {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: { es: `/es${clean}`, en: `/en${clean}`, 'x-default': `/es${clean}` },
  };
}
```

```ts
export async function generateMetadata({ params }: { params: Promise<{ locale: 'es' | 'en' }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home.meta' });
  return { title: t('title'), description: t('description'), alternates: alternatesFor('/', locale) };
}
```

- `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!)` en el layout raíz de `[locale]`.
- next-intl también puede añadir enlaces alternos como cabecera `Link`. Si los mantienes, deben coincidir con los de `generateMetadata`; si no, desactívalos con `alternateLinks: false` en `routing`.
- La redirección por idioma solo ocurre en rutas sin prefijo (la raíz). Una URL con `/es` o `/en` nunca se redirige según el navegador, para que Google pueda rastrear ambos catálogos.
- Fichas de listing: título y descripción del propio listing, imagen Open Graph de su primera foto, y datos estructurados solo con información pública (área aproximada, nunca la dirección exacta).

## robots y sitemap (Paso 3)

- `app/robots.ts`: en producción permite la web pública y bloquea `/admin` y `/api`; fuera de producción lo prohíbe todo. Además, el proxy o `next.config` agrega `X-Robots-Tag: noindex` fuera de producción.
- `app/sitemap.ts`: páginas públicas en ambos idiomas, con `alternates.languages` en cada entrada; las fichas salen de los listings publicados.
- Decide el entorno con `lib/app-env.ts`, no con `NODE_ENV`.

## Antes de terminar

- [ ] Las claves nuevas existen en `es.json` y `en.json` (un test puede comparar las claves de ambos archivos).
- [ ] La página funciona en `/es` y `/en`, y el cambio de idioma conserva la ruta.
- [ ] Las páginas públicas tienen `generateMetadata` con canonical y alternos.
