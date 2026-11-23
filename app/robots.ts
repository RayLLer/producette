import type { MetadataRoute } from 'next';
import { appEnv } from '@/lib/app-env';

export default function robots(): MetadataRoute.Robots {
  if (appEnv !== 'production') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
