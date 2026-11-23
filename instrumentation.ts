export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Triggers env validation and startup protections at server boot and during build.
    await import('./lib/env');
  }
}
