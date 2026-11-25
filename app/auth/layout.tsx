import type { ReactNode } from 'react';
import { Geist } from 'next/font/google';
import '../globals.css';
import { EnvBanner } from '@/components/env-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

// Template auth pages live outside [locale] and are still in English.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="antialiased">
        {children}
        <EnvBanner />
      </body>
    </html>
  );
}
