import type { ReactNode } from 'react';
import { Geist } from 'next/font/google';
import '../globals.css';
import { EnvBanner } from '@/components/env-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
});

// Admin panel: Spanish only, no locale prefix in URL.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className="antialiased">
        {children}
        <EnvBanner />
      </body>
    </html>
  );
}
