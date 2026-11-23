export type AppEnv = 'local' | 'staging' | 'production';

function resolveAppEnv(): AppEnv {
  // On Vercel, VERCEL_TARGET_ENV correctly identifies custom environments.
  // VERCEL_ENV returns 'preview' for custom envs too, so we don't use it.
  const vercelTarget = process.env.VERCEL_TARGET_ENV;
  if (vercelTarget === 'production') return 'production';
  if (vercelTarget) return 'staging';

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (appEnv === 'production') return 'production';
  if (appEnv === 'staging') return 'staging';
  return 'local';
}

export const appEnv: AppEnv = resolveAppEnv();
