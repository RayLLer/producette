---
name: producette-testing
description: Pruebas en Producette - Vitest para reglas de negocio puras en lib/domain (comisiones, plazos, estados, cancelaciones), tests de RLS contra producette-dev con usuarios de prueba, tests de concurrencia de procesos de vencimiento, y Playwright en local para /es y /en en teléfono y escritorio. Úsala al escribir o cambiar cualquier regla de negocio (los tests van antes que el código), al crear una tabla o política, al tocar interfaz, al preparar un PR o cuando un test falle.
---

# Pruebas

## Qué se prueba con qué

| Qué | Herramienta | Dónde corre |
| --- | --- | --- |
| Reglas puras (`lib/domain`): comisiones, plazos, estados, cancelaciones | Vitest | CI y local (`npm test`) |
| Validaciones Zod, utilidades, DTO | Vitest | CI y local |
| RLS, grants y triggers | Vitest contra `producette-dev` | Solo local (`npm run test:rls`): el CI no tiene credenciales de dev |
| Procesos de `sweep` (idempotencia, `skip locked`) | Vitest contra `producette-dev` | Solo local |
| Páginas y recorridos | Playwright | Solo local (`npm run test:e2e`), para no gastar minutos de Actions |

Los Server Components asíncronos no se prueban con Vitest: se cubren con Playwright.

## Vitest

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    exclude: ['tests/rls/**', 'tests/e2e/**'],
  },
});
```

- Un archivo `*.test.ts` junto a cada módulo de `lib/domain`.
- **Los tests van antes que el código** (regla del plan). Empieza por los ejemplos literales del alcance: $3,400 → $3,570 y $3,060.
- Fechas: inyecta el "ahora" como parámetro en las funciones de dominio en lugar de leer `Date.now()`; si no se puede, `vi.useFakeTimers()` y `vi.setSystemTime()`.
- Plazos en días hábiles: casos con fin de semana, cambio de horario de verano en `America/New_York` y feriados si el alcance los define.
- `DEADLINE_SCALE`: un test demuestra que escala horas pero no días hábiles ni la tabla de cancelaciones.
- `server-only` rompe al importarse en Vitest: mantén `lib/domain` libre de él, o crea un alias vacío para tests.

## Tests de RLS (contra producette-dev)

```ts
// tests/rls/accounts.rls.test.ts
import { createClient } from '@supabase/supabase-js';

async function signedInClient(email: string, password: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

it('un cliente no lee la cuenta de otro', async () => {
  const a = await signedInClient(USERS.client1.email, USERS.client1.password);
  const { data } = await a.from('accounts').select('id').eq('id', USERS.client2.id);
  expect(data).toEqual([]);
});

it('authenticated no puede leer audit_log', async () => {
  const a = await signedInClient(USERS.client1.email, USERS.client1.password);
  const { error } = await a.from('audit_log').select('id').limit(1);
  expect(error).not.toBeNull(); // sin grant: error de permiso, no solo cero filas
});
```

- Usa los usuarios del seed (`tu+cliente1@…`), nunca usuarios reales.
- El script `test:rls` se detiene si la URL no es la de `producette-dev`.
- Por cada tabla nueva: anónimo, dueño, otro usuario y, si aplica, rol del panel.

## Concurrencia de `sweep`

Un test crea filas vencidas, lanza dos ejecuciones a la vez (`Promise.all`) y comprueba que cada fila se procesó una sola vez y que `job_runs` registra ambas ejecuciones.

## Playwright

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000/es', reuseExistingServer: true },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
  ],
});
```

- Selectores por rol y texto accesible (`getByRole('button', { name: … })`), no por clases.
- Cada recorrido corre en `/es` y `/en`; los textos esperados salen de `messages/*.json`, no se escriben en el test.
- Login: un `setup` que inicia sesión con un usuario del seed y guarda `storageState`.
- Pagos: tarjetas de prueba de Stripe en la sandbox dev; el Payment Element vive en un iframe (`page.frameLocator`). Espera el estado que deja el webhook, no la redirección.
- Si un test necesita datos, créalos con el seed o una función de ayuda; no dependas del orden de los tests.

## Antes de abrir un PR

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:rls      # si hubo migraciones o políticas
npm run test:e2e      # si tocaste interfaz
```

Si algo falla, la tarea no está terminada: arréglalo o explica en el PR por qué no se puede y qué falta.
