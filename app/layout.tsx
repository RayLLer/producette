import type { ReactNode } from 'react';
import './globals.css';

// Root layout delegates html/body to [locale]/layout.tsx and admin/layout.tsx.
// next-intl requires this pattern so each locale layout can set lang="es|en".
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
