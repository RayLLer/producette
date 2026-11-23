import { setRequestLocale, getTranslations } from 'next-intl/server';
import { alternatesFor } from '@/lib/seo';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home.meta' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: alternatesFor('/', locale as 'es' | 'en'),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Home');

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
    </main>
  );
}
