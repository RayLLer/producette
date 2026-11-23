import type { Metadata } from 'next';

export function alternatesFor(
  path: string,
  locale: 'es' | 'en',
): Metadata['alternates'] {
  const clean = path === '/' ? '' : path;
  return {
    canonical: `/${locale}${clean}`,
    languages: {
      es: `/es${clean}`,
      en: `/en${clean}`,
      'x-default': `/es${clean}`,
    },
  };
}
