import { notFound } from 'next/navigation';

// Sends unknown /es/* and /en/* paths to app/[locale]/not-found.tsx inside the locale layout.
export default function CatchAll() {
  notFound();
}
