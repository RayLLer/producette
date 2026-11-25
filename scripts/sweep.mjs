// Dev only: calls the internal jobs endpoint of the local server with the CRON_SECRET of
// .env.local, like pg_cron does in staging and production.
//   npm run sweep               -> one call to /api/internal/sweep
//   npm run sweep:watch         -> one call per minute until Ctrl+C
//   node scripts/sweep.mjs --path /api/internal/nightly
try {
  process.loadEnvFile('.env.local');
} catch {
  // env provided externally
}

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const pathIndex = args.indexOf('--path');
const path = pathIndex >= 0 ? args[pathIndex + 1] : '/api/internal/sweep';
const base = process.env.SWEEP_BASE_URL ?? 'http://localhost:3000';

const url = new URL(path, base);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error(`[sweep] Solo se llama a http://localhost. URL rechazada: ${url.origin}`);
  process.exit(1);
}
if (!path.startsWith('/api/internal/')) {
  console.error(`[sweep] Solo rutas /api/internal/*. Ruta rechazada: ${path}`);
  process.exit(1);
}
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error('[sweep] Falta CRON_SECRET en .env.local');
  process.exit(1);
}

async function callOnce() {
  const time = new Date().toLocaleTimeString();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`[sweep ${time}] ${res.status} ${body}`);
    return res.ok;
  } catch (err) {
    console.error(`[sweep ${time}] sin respuesta de ${url.origin} (${err.cause?.code ?? err.name}). ¿Está corriendo npm run dev?`);
    return false;
  }
}

if (watch) {
  await callOnce();
  setInterval(callOnce, 60_000);
} else {
  process.exitCode = (await callOnce()) ? 0 : 1;
}
