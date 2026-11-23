'use client';

export function EnvBanner() {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  if (env === 'production') return null;

  const label = env === 'staging' ? 'STAGING' : 'LOCAL';
  const bg = env === 'staging' ? '#B9432C' : '#2A2D34';

  return (
    <div
      style={{ background: bg }}
      className="fixed bottom-0 left-0 right-0 py-1 text-center font-mono text-xs text-white z-50"
    >
      {label} — {process.env.NEXT_PUBLIC_SITE_URL}
    </div>
  );
}
