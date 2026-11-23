---
name: producette-drizzle
description: Uso de Drizzle ORM en Producette - conexión al pooler de Supabase desde Vercel/Next.js, driver recomendado, prepared statements, transacciones, FOR UPDATE SKIP LOCKED, drizzle-kit pull como única forma de generar el esquema y la regla de que Drizzle se salta RLS. Úsala cada vez que escribas o cambies una consulta en lib/server, configures la conexión a la base, generes el esquema o escribas un proceso de vencimiento, aunque solo sea un select.
---

# Drizzle en Producette

Drizzle se usa **solo para consultas tipadas en el servidor**. El esquema lo definen las migraciones SQL de Supabase; Drizzle lo lee con `drizzle-kit pull`.

## Regla de seguridad

Drizzle entra con el usuario dueño de la base: **se salta RLS y los grants**. Por eso:

- Solo se importa desde archivos con `import 'server-only'` dentro de `lib/server/`.
- Toda función que consulta recibe el `viewer` (de `requireUser()` o `requireRole()`) y filtra por él de forma explícita.
- Nunca expongas una función genérica tipo `getRow(table, id)` a una Server Action.
- Nunca devuelvas la fila entera al cliente: selecciona columnas y arma un DTO.

```ts
export async function getMyQuotes(viewer: Viewer) {
  return db
    .select({ id: quotes.id, status: quotes.status, clientTotalCents: quotes.clientTotalCents })
    .from(quotes)
    .where(eq(quotes.clientUserId, viewer.id))
    .orderBy(desc(quotes.createdAt));
}
```

## Conexión: cambio respecto del plan

El plan v2 dice "driver postgres (postgres.js) en modo transacción con `prepare: false`". Supabase documenta que **el modo transacción no admite pipelining de consultas**, y postgres.js las encadena por defecto: el pooler devuelve la conexión al pool en cuanto ve terminar una respuesta, aunque el cliente ya haya encolado más consultas. El resultado posible son consultas colgadas o filas que llegan a otra consulta. `prepare: false` evita el error de prepared statements, pero no ese problema.

Recomendación (propónla en el PR del Paso 2 y anótala para el plan):

- Driver **node-postgres (`pg`)**, que no encadena consultas por defecto, con el pooler compartido en **modo transacción** (puerto 6543).
- Sin prepared statements con nombre: no uses `.prepare('nombre')` de Drizzle.
- En Vercel (Fluid compute), registra el pool con `attachDatabasePool` de `@vercel/functions` para que cierre las conexiones ociosas antes de suspender la función.

```ts
// lib/server/db/index.ts
import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@vercel/functions';
import { serverEnv } from '@/lib/env';
import * as schema from './generated/schema';

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: serverEnv.DATABASE_URL, // pooler, modo transacción, puerto 6543
    max: 5,
    idleTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool; // evita fugas con el recargado en dev
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
```

- **SSL**: la conexión va cifrada. Si `pg` rechaza el certificado, descarga el certificado de Supabase (Database Settings → SSL) y pásalo en `ssl: { ca }`. Nunca `rejectUnauthorized: false` fuera de dev.
- Confirma en la documentación de `@vercel/functions` que `attachDatabasePool` no hace nada fuera de Vercel (en tu máquina).
- Si en algún momento se decide mantener postgres.js, la alternativa documentada es el pooler en **modo sesión** (puerto 5432), con un pool pequeño por instancia.

## Esquema: solo `drizzle-kit pull`

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './lib/server/db/generated', // schema.ts y relations.ts generados
  schemaFilter: ['public'],
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- Después de cada migración: `npx drizzle-kit pull` y commit del resultado.
- **Nunca** `drizzle-kit generate`, `migrate` ni `push`: las migraciones son SQL de Supabase. Agrega estos comandos a la lista `deny` de `.claude/settings.json`.
- No edites a mano los archivos generados; si un tipo sale mal (por ejemplo `tstzrange` o `geography`), crea un `customType` en un archivo aparte y documéntalo.

## Transacciones

Toda escritura de dinero, estado de reserva o panel va en una transacción, junto con su `audit_log` cuando corresponda:

```ts
await db.transaction(async (tx) => {
  const [quote] = await tx
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.status, 'sent')))
    .for('update');
  if (!quote) throw new DomainError('quote_not_available');

  await tx.update(quotes).set({ status: 'accepted', acceptedAt: new Date() }).where(eq(quotes.id, quoteId));
  await logAudit(tx, { /* … */ }); // si la acción viene del panel
});
```

- Las llamadas a Stripe **no** van dentro de una transacción abierta: primero se registra la intención en la base (estado `pending_*` con clave de idempotencia), se confirma la transacción, se llama a Stripe con esa clave y el webhook cierra el estado.
- Los errores de negocio son `DomainError` con un código que la UI traduce.

## Procesos de vencimiento (`sweep`)

```ts
await db.transaction(async (tx) => {
  const due = await tx
    .select({ id: quotes.id })
    .from(quotes)
    .where(and(eq(quotes.status, 'sent'), lte(quotes.expiresAt, new Date())))
    .limit(100)
    .for('update', { skipLocked: true });

  for (const row of due) {
    await tx.update(quotes).set({ status: 'expired' }).where(and(eq(quotes.id, row.id), eq(quotes.status, 'sent')));
  }
});
```

- `skipLocked` evita que dos ejecuciones simultáneas tomen la misma fila.
- La condición de estado se repite en el `update`: si otra transacción cambió la fila, no pasa nada.
- Lotes acotados; el resto queda para el minuto siguiente.

## Rendimiento

- Selecciona columnas, no `select()` sin argumentos en listas.
- Paginación por cursor (`where createdAt < cursor`) en listas largas como Explorar o mensajes.
- Para búsquedas geográficas usa SQL de PostGIS con `sql\`…\`` parametrizado; nunca concatenes texto del usuario.
