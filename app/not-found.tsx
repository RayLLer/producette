'use client';

import NextError from 'next/error';

// Unmatched URLs outside /es and /en (e.g. /admin/x). The root layout has no <html>,
// so this page renders its own. Localized 404s live in app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body>
        <NextError statusCode={404} />
      </body>
    </html>
  );
}
