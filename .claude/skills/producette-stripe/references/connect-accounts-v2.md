# Connect con Accounts v2

## Cambio respecto del plan

El plan v2 dice "Connect Express". La guía actual de Stripe para marketplaces crea las cuentas con la **API de Accounts v2**: no uses `stripe.accounts.create({ type: 'express' })` en código nuevo. El resultado para el Host es el mismo que esperaba el plan (onboarding alojado por Stripe y panel Express), pero el objeto y los nombres cambian.

Configuración de una cuenta de Host en Producette:

- `configuration.recipient` con la capacidad `stripe_balance.stripe_transfers` solicitada: el Host **recibe transferencias**; no cobra a clientes por su cuenta.
- `dashboard: 'express'`.
- `defaults.responsibilities.fees_collector = 'application'` y `losses_collector = 'application'`: la plataforma cobra las tarifas de Stripe y asume las pérdidas (contracargos).
- **No** solicites la configuración `merchant` ni la capacidad `card_payments`.

Antes de implementar, abre la referencia de `v2/core/accounts` en docs.stripe.com y confirma los nombres de campo con la versión de API fijada. Los ejemplos de abajo marcan con `// confirmar` los campos que conviene revisar.

## Crear la cuenta del Host

```ts
// lib/server/stripe/accounts.ts
import 'server-only';
import { stripe } from '@/lib/server/stripe';

export async function createHostAccount(host: { userId: string; email: string; displayName: string }) {
  const account = await stripe.v2.core.accounts.create(
    {
      contact_email: host.email,         // confirmar
      display_name: host.displayName,    // confirmar
      dashboard: 'express',
      identity: { country: 'us' },       // confirmar
      configuration: {
        recipient: {
          capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
        },
      },
      defaults: {
        currency: 'usd',                 // confirmar
        responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      },
      metadata: { user_id: host.userId },
    },
    { idempotencyKey: `host-account-${host.userId}` },
  );
  // Guarda account.id en la tabla del Host dentro de una transacción.
  return account.id;
}
```

## Onboarding (Account Links v2)

```ts
export async function createOnboardingLink(accountId: string, locale: 'es' | 'en') {
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        refresh_url: `${base}/${locale}/host/pagos/onboarding/renovar`,
        return_url: `${base}/${locale}/host/pagos/onboarding/listo`,
      },
    },
  });
  return link.url; // se usa una sola vez y caduca: créalo en el momento del clic
}
```

- Desde la versión `2026-09-30.endive`, el parámetro `configurations` del enlace ya no existe; si un ejemplo lo usa, está desactualizado.
- `return_url` no significa "terminado": el estado real llega por webhook o se consulta con `retrieve`.
- `refresh_url` debe crear un enlace nuevo y redirigir.
- Para que el Host entre a su panel Express, usa el caso de uso `account_dashboard` (confirma la forma en la referencia).
- Para avisar al Host de requisitos pendientes dentro de Producette, Stripe recomienda el componente embebido `notification_banner`.

## ¿Puede recibir transferencias?

```ts
export async function canReceiveTransfers(accountId: string) {
  const acct = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient'], // confirmar
  });
  return acct.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
}
```

No uses `payouts_enabled` ni `charges_enabled` (son del modelo v1). Guarda el estado en la base cuando llegue el evento (ver `webhooks.md`) y vuelve a consultarlo justo antes de transferir.

## Cobro al cliente (PaymentIntent en la plataforma)

```ts
export async function createBookingPayment(q: {
  quoteId: string; bookingId: string; clientTotalCents: number; customerId: string;
}) {
  const pi = await stripe.paymentIntents.create(
    {
      amount: q.clientTotalCents,
      currency: 'usd',
      customer: q.customerId,
      automatic_payment_methods: { enabled: true },
      transfer_group: `booking_${q.bookingId}`,
      metadata: { booking_id: q.bookingId, quote_id: q.quoteId },
    },
    { idempotencyKey: `pi-${q.quoteId}` },
  );
  return pi.client_secret; // va al Payment Element; no se guarda en el navegador más allá de la sesión
}
```

En el cliente:

```tsx
<Elements stripe={stripePromise} options={{ clientSecret, locale, appearance }}>
  <PaymentForm />  {/* PaymentElement + stripe.confirmPayment({ elements, confirmParams: { return_url } }) */}
</Elements>
```

- `appearance` con los colores del manual (negro `#0D0F14`, coral `#FF7E66` con texto negro).
- La página de `return_url` muestra "procesando" hasta que el webhook marque el pago; no confía en el parámetro de la URL.

## Liberación al Host (Transfer)

```ts
export async function releaseToHost(b: {
  bookingId: string; hostAccountId: string; hostNetCents: number; chargeId: string;
}) {
  if (!(await canReceiveTransfers(b.hostAccountId))) throw new DomainError('host_cannot_receive_transfers');
  return stripe.transfers.create(
    {
      amount: b.hostNetCents,
      currency: 'usd',
      destination: b.hostAccountId,
      source_transaction: b.chargeId,          // ata la transferencia a los fondos de ese cargo
      transfer_group: `booking_${b.bookingId}`,
      metadata: { booking_id: b.bookingId },
    },
    { idempotencyKey: `transfer-${b.bookingId}` },
  );
}
```

- La comisión de Producette es la diferencia entre lo cobrado y lo transferido; no existe `application_fee_amount` en este modelo.
- `chargeId` es `payment_intent.latest_charge`, guardado al procesar `payment_intent.succeeded`.
- La llamada la hace un proceso de `sweep` cuando vence la ventana de 48 h sin disputa, nunca una petición del navegador.
- Si el Host todavía no puede recibir transferencias, la liberación queda pendiente y se reintenta; avisa al Host y al panel.

## Reembolsos y reversiones

- Antes de transferir: `stripe.refunds.create({ payment_intent, amount }, { idempotencyKey: \`refund-${refundId}\` })`.
- Después de transferir: además del reembolso, `stripe.transfers.createReversal(transferId, { amount }, { idempotencyKey })` por la parte que corresponda al Host según la tabla de cancelaciones del alcance.
- Cada reembolso nace como fila en la base (con motivo y, desde el panel, `audit_log`) antes de llamar a Stripe.

## 1099-K

Revisar en Connect la emisión de formularios 1099-K para los Hosts es una tarea de la persona en el Paso 9. No la automatices.
