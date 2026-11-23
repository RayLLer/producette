import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/proxy';

const handleI18nRouting = createIntlMiddleware(routing);

const CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const;

function carrySupabase(from: NextResponse, to: NextResponse): NextResponse {
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

  // Paso 9: contraseña de staging se añade aquí.

  // Rutas sin idioma: panel admin y auth del servidor.
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
    '/((?!api/webhooks|api/internal|_next/static|_next/image|_vercel|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
