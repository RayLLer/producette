# Webhooks de Stripe

## Rutas

| Ruta | Qué recibe | Formato | Secreto |
| --- | --- | --- | --- |
| `app/api/webhooks/stripe` | Eventos de la plataforma: `payment_intent.*`, `charge.*`, `charge.dispute.*`, `transfer.*`, `identity.verification_session.*`, `customer.*` | Snapshot (v1) | `STRIPE_WEBHOOK_SECRET` |
| `app/api/webhooks/stripe-connect` | Eventos v1 que ocurren en cuentas conectadas (por ejemplo, `payout.failed`) | Snapshot (v1) | `STRIPE_CONNECT_WEBHOOK_SECRET` |
| `app/api/webhooks/stripe-v2` (propuesto) | Eventos de cuentas v2: `v2.core.account[requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated` | Thin | `STRIPE_V2_WEBHOOK_SECRET` (nueva) |

La tercera ruta y su variable no están en el plan v2. Hacen falta porque las cuentas creadas con Accounts v2 avisan sus cambios de requisitos y capacidades con eventos thin, que llegan a un destino de eventos propio. Confirma los nombres exactos de los eventos en la documentación de Connect antes de suscribirte, y propón el cambio en el PR.

## Ruta snapshot (v1)

```ts
// app/api/webhooks/stripe/route.ts
import type Stripe from 'stripe';
import { stripe } from '@/lib/server/stripe';
import { serverEnv } from '@/lib/env';
import { handleStripeEvent } from '@/lib/server/stripe/dispatch';

export async function POST(request: Request) {
  const body = await request.text();              // cuerpo sin procesar: antes de cualquier otra cosa
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  const result = await handleStripeEvent(event, 'platform');
  return new Response(result === 'failed' ? 'error' : 'ok', { status: result === 'failed' ? 500 : 200 });
}
```

## Idempotencia (`stripe_events`)

El plan dice "si ya existía, responde 200 sin repetir nada". Afínalo así para que un fallo no se pierda:

```ts
// lib/server/stripe/dispatch.ts
export async function handleStripeEvent(event: Stripe.Event, source: 'platform' | 'connect' | 'v2') {
  // 1. Registrar (insert … on conflict (id) do nothing).
  await recordEvent(event.id, event.type, source, event);

  return db.transaction(async (tx) => {
    // 2. Bloquear la fila del evento; si ya está procesado, no repetir.
    const [row] = await tx.select().from(stripeEvents).where(eq(stripeEvents.id, event.id)).for('update');
    if (row?.processedAt) return 'duplicate' as const;

    const handler = handlers[event.type];
    if (!handler) {
      await markProcessed(tx, event.id, 'ignored');
      return 'ignored' as const;
    }
    try {
      // Transacción anidada = savepoint: si el manejador falla, se deshace solo lo suyo.
      await tx.transaction(async (sp) => handler(event, sp)); // cada manejador es idempotente por sí mismo
      await markProcessed(tx, event.id);
      return 'processed' as const;
    } catch (err) {
      await markFailed(tx, event.id, errorCode(err)); // código corto, sin datos personales
      return 'failed' as const; // la ruta responde 500 y Stripe reintenta
    }
  });
}
```

- Evento ya **procesado** → 200 sin hacer nada. Evento registrado pero **fallido** → se procesa de nuevo en el reintento.
- Cada manejador comprueba el estado actual antes de cambiarlo (por ejemplo, no confirma dos veces la misma reserva) y guarda los ids de Stripe que recibe.
- Stripe no garantiza el orden de los eventos: un manejador nunca asume que llegó "el anterior". Si necesita el estado real, lo consulta con `retrieve`.
- Responde en pocos segundos. Si un manejador necesita trabajo largo, deja una tarea en la base para `sweep`.
- Nunca registres el cuerpo completo en logs ni en Sentry (lleva emails y datos de pago).

## Manejadores iniciales

| Evento | Qué hace |
| --- | --- |
| `payment_intent.succeeded` | Marca el pago, guarda `latest_charge`, confirma la reserva, habilita la dirección exacta y encola emails |
| `payment_intent.payment_failed` | Marca el intento fallido; la reserva sigue esperando pago dentro de su plazo |
| `charge.refunded` | Concilia el reembolso con su fila |
| `charge.dispute.created` | Abre el caso en el panel y bloquea la liberación |
| `transfer.created` / `transfer.reversed` | Concilia la liberación o la reversión |
| `identity.verification_session.verified` / `.requires_input` | Ver `identity.md` |
| `v2.core.account[...]` (thin) | Actualiza el estado de onboarding y de `stripe_transfers` del Host |

## Ruta de eventos thin (v2)

```ts
// app/api/webhooks/stripe-v2/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });

  let notification;
  try {
    notification = stripe.parseEventNotification(body, signature, serverEnv.STRIPE_V2_WEBHOOK_SECRET);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  // El evento thin solo trae el id y el tipo: pide el evento completo o el objeto relacionado.
  const event = await stripe.v2.core.events.retrieve(notification.id);
  // …registrar en stripe_events con source 'v2' y despachar
  return new Response('ok');
}
```

Confirma en la versión instalada de stripe-node los nombres `parseEventNotification`, `fetchRelatedObject` y `v2.core.events.retrieve`.

## Stripe CLI

```bash
# Eventos v1 de la plataforma y de cuentas conectadas
stripe listen \
  --forward-to localhost:3000/api/webhooks/stripe \
  --forward-connect-to localhost:3000/api/webhooks/stripe-connect

# Eventos thin (comprueba las banderas con: stripe listen --help)
stripe listen \
  --forward-thin-to localhost:3000/api/webhooks/stripe-v2 \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated'
```

- El secreto `whsec_…` que imprime `stripe listen` va a `.env.local` (no lo repitas en el chat).
- `stripe trigger payment_intent.succeeded` para probar; reenvía el mismo evento con `stripe events resend <id>` para comprobar la idempotencia.

## Paso 9

La persona crea en la sandbox staging y en live un destino por ruta, con su propio secreto en el entorno de Vercel correspondiente. Las URL de staging pasan por la contraseña de staging, salvo `/api/webhooks/*`, que el proxy excluye.
