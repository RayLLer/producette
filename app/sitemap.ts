import type { MetadataRoute } from 'next';
import { appEnv } from '@/lib/app-env';
import { routing } from '@/i18n/routing';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type Locale = (typeof routing.locales)[number];
type Frequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

function localizedEntries(
  path: string,
  priority: number,
  changeFrequency: Frequency,
): MetadataRoute.Sitemap {
  const cleanPath = path === '/' ? '' : path;
  return routing.locales.map((locale: Locale) => ({
    url: `${BASE}/${locale}${cleanPath}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l: Locale) => [l, `${BASE}/${l}${cleanPath}`]),
      ),
    },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (appEnv !== 'production') return [];

  // Add more paths as features are built (Explorar, listados, etc.)
  return [
    ...localizedEntries('/', 1.0, 'weekly'),
  ];
}
