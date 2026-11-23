---
name: producette-stripe
description: Stripe en Producette - comisiones en lib/domain/fees.ts (5% cliente sin tope, 10% Host, 8% fundador, 3% enlace, la menor si coinciden, centavos y redondeo mitad hacia arriba), Connect con Accounts v2 (configuración recipient, panel Express), cargos y transferencias separados con transfer_group y source_transaction, Payment Element, Stripe Identity, webhooks idempotentes (eventos snapshot y thin) y Stripe CLI. Úsala para cualquier cosa que toque dinero, cotizaciones, pagos, liberaciones, reembolsos, cuentas de Host, verificación de identidad o webhooks de Stripe, aunque la tarea solo pida "mostrar un precio".
---

# Stripe en Producette

Referencias de esta skill:

- `references/comisiones.md`: `lib/domain/fees.ts` y sus tests.
- `references/connect-accounts-v2.md`: cuentas de Host, onboarding, cobro, liberación y reembolsos.
- `references/webhooks.md`: rutas, repartidor, idempotencia, eventos thin y Stripe CLI.
- `references/identity.md`: verificación de identidad.

## Reglas no negociables

1. **Montos en centavos enteros** (`number` entero, nunca `float` de dólares). Toda cifra que ve el usuario sale de `lib/domain/fees.ts`.
2. **Las tasas se congelan en la cotización**: cada cotización guarda las tasas que usó; un cambio en `fee_settings` solo afecta cotizaciones nuevas.
3. **Cargos y transferencias separados**: el cliente paga a la plataforma; al liberar, la plataforma transfiere el neto al Host. Nunca `application_fee_amount`, nunca cargos directos ni destination charges, nunca `capture_method: 'manual'`.
4. **Idempotencia en todo**: cada llamada de escritura a Stripe lleva `idempotencyKey` derivada de un id de la base (`pi-${quoteId}`, `transfer-${bookingId}`); cada webhook se registra y se procesa una sola vez.
5. **El navegador nunca decide un monto ni un estado de pago**. Confirmar un pago en el cliente no cambia nada en la base: lo cambia el webhook.
6. **Producette nunca toca datos de tarjeta**: solo Payment Element de Stripe.
7. **Entornos**: en tu máquina, solo la sandbox **dev**. El servidor se niega a arrancar con `sk_live_` fuera de producción (Paso 3). El Stripe CLI nunca apunta a live.
8. **Lenguaje**: "Pago Protegido", nunca "escrow".

## Cliente de Stripe

```ts
// lib/server/stripe.ts
import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';

// Fija la versión que pide el paquete stripe instalado (TypeScript avisa si no coincide).
// Cambiarla es una tarea propia, con lectura del changelog de la API.
export const STRIPE_API_VERSION = '<versión fijada>' as const;

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  maxNetworkRetries: 2,
  appInfo: { name: 'Producette' },
});
```

- Las versiones de la API de Stripe se nombran por fecha (por ejemplo `2026-09-30.endive`). No copies una versión de un ejemplo: usa la del paquete instalado.
- Las APIs v2 (cuentas, enlaces de cuenta, eventos) usan la misma instancia: `stripe.v2.core.*`.

## Flujo del dinero (Fase 1)

```
Cliente acepta cotización
  → servidor crea PaymentIntent (monto = precio + 5%, transfer_group = booking_<id>)
  → Payment Element confirma
  → webhook payment_intent.succeeded: pago confirmado, reserva confirmada, dirección exacta visible
Host marca "Trabajo completado"
  → plazo de liberación de 48 h (lib/domain/deadlines.ts)
  → sweep: si no hay disputa, Transfer al Host (neto) con source_transaction = cargo
  → webhook transfer.*: liberación registrada
Cancelación o disputa resuelta
  → Refund total o parcial según la tabla del alcance
  → si ya se transfirió, reversión de la transferencia por la parte que corresponda
```

Cada flecha que cambia estado escribe en la base dentro de una transacción y, si viene del panel, con `audit_log`.

## Stripe CLI en dev

```bash
stripe listen \
  --forward-to localhost:3000/api/webhooks/stripe \
  --forward-connect-to localhost:3000/api/webhooks/stripe-connect
```

Para eventos thin de cuentas v2, mira `references/webhooks.md`. Antes de cualquier comando, `stripe config --list` debe mostrar la sandbox dev.

## Checklist de un cambio con dinero

- [ ] Regla primero en `lib/domain` con tests (montos de ejemplo del alcance incluidos).
- [ ] Ningún monto llega desde el navegador.
- [ ] Clave de idempotencia derivada de un id estable.
- [ ] Estado intermedio en la base antes de llamar a Stripe; estado final en el webhook.
- [ ] Manejador de webhook idempotente y probado con `stripe trigger` o un evento reenviado dos veces.
- [ ] Textos con "Pago Protegido".
