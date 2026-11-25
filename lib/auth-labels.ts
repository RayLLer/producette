import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { ResendConfirmationLabels } from '@/components/resend-confirmation';

// /auth pages live outside [locale] and are still in English; switch when they move under it.
export const AUTH_LOCALE = 'en';

export async function getResendLabels(): Promise<ResendConfirmationLabels> {
  const t = await getTranslations({ locale: AUTH_LOCALE, namespace: 'Auth' });
  return {
    title: t('resend.title'),
    description: t('resend.description'),
    email: t('resend.email'),
    button: t('resend.button'),
    sending: t('resend.sending'),
    sent: t('resend.sent'),
    wait: t.raw('resend.wait') as string,
    rateLimited: t('errors.rate_limited'),
    unknown: t('errors.unknown'),
  };
}
