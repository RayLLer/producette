# Comisiones: `lib/domain/fees.ts`

Única función de cálculo de dinero. Pura (sin base, sin Stripe, sin fechas), con tests escritos antes que el código.

## Reglas (alcance + decisiones del 26 de octubre)

- El cliente paga **precio + 5%**, **sin tope**.
- La comisión del Host es **10%**; **8%** si es fundador.
- **3%** si el cliente se registró desde el enlace de ese Host (`accounts.referred_by_host_id` = ese Host). Depende del registro del cliente, no de la reserva.
- Si coinciden fundador y enlace, aplica **la menor** (3%).
- Montos en **centavos enteros**; redondeo **al centavo, la mitad hacia arriba**.
- Las tasas vienen de `fee_settings` (puntos básicos) y se guardan en la cotización.
- Si se acuerda un monto menor, **no se recalculan** el 5% ni la comisión (regla del plan; confirma con el alcance el caso exacto antes de implementarlo).

## Implementación de referencia

```ts
// lib/domain/fees.ts
export type FeeRates = {
  clientBps: number;   // 500
  hostBps: number;     // 1000
  founderBps: number;  // 800
  referralBps: number; // 300
};

export type FeeInput = {
  priceCents: number;
  rates: FeeRates;
  hostIsFounder: boolean;
  clientReferredByThisHost: boolean;
};

export type FeeBreakdown = {
  priceCents: number;
  clientFeeCents: number;
  clientTotalCents: number;
  hostFeeCents: number;
  hostNetCents: number;
  appliedClientBps: number;
  appliedHostBps: number;
};

/** Porcentaje en puntos básicos, redondeado al centavo con la mitad hacia arriba. Solo enteros no negativos. */
export function applyBps(amountCents: number, bps: number): number {
  assertCents(amountCents);
  if (!Number.isInteger(bps) || bps < 0) throw new RangeError('bps inválido');
  return Math.floor((amountCents * bps + 5_000) / 10_000);
}

export function hostRateBps(input: Pick<FeeInput, 'rates' | 'hostIsFounder' | 'clientReferredByThisHost'>): number {
  const base = input.hostIsFounder ? input.rates.founderBps : input.rates.hostBps;
  return input.clientReferredByThisHost ? Math.min(base, input.rates.referralBps) : base;
}

export function computeFees(input: FeeInput): FeeBreakdown {
  assertCents(input.priceCents);
  const appliedClientBps = input.rates.clientBps;
  const appliedHostBps = hostRateBps(input);
  const clientFeeCents = applyBps(input.priceCents, appliedClientBps); // sin tope
  const hostFeeCents = applyBps(input.priceCents, appliedHostBps);
  return {
    priceCents: input.priceCents,
    clientFeeCents,
    clientTotalCents: input.priceCents + clientFeeCents,
    hostFeeCents,
    hostNetCents: input.priceCents - hostFeeCents,
    appliedClientBps,
    appliedHostBps,
  };
}

function assertCents(n: number) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('monto en centavos inválido');
}
```

`amountCents * bps` cabe con holgura en un entero seguro de JavaScript para cualquier reserva realista (hasta unos 9,000 millones de dólares con 10,000 bps).

## Tests mínimos (Vitest)

```ts
const rates = { clientBps: 500, hostBps: 1000, founderBps: 800, referralBps: 300 };

it('caso del alcance: $3,400 → cliente $3,570 y Host $3,060', () => {
  const r = computeFees({ priceCents: 340_000, rates, hostIsFounder: false, clientReferredByThisHost: false });
  expect(r.clientTotalCents).toBe(357_000);
  expect(r.hostNetCents).toBe(306_000);
});

it('fundador al 8%', () => { /* 340_000 → hostFee 27_200 */ });
it('enlace al 3%', () => { /* 340_000 → hostFee 10_200 */ });
it('fundador + enlace: la menor (3%)', () => { /* … */ });
it('5% sin tope en montos grandes', () => { /* 10_000_000 → clientFee 500_000 */ });
it('redondeo mitad hacia arriba', () => {
  expect(applyBps(10, 500)).toBe(1);   // 0.5 → 1
  expect(applyBps(9, 500)).toBe(0);    // 0.45 → 0
  expect(applyBps(30, 500)).toBe(2);   // 1.5 → 2
});
it('rechaza decimales y negativos', () => { /* RangeError */ });
```

## Uso

- La cotización guarda el resultado completo de `computeFees` (incluidas las tasas aplicadas).
- El PaymentIntent cobra `clientTotalCents` de la cotización guardada; la Transfer envía `hostNetCents` de la misma fila. Nunca se recalcula al cobrar ni al liberar.
- Formatear para la UI: `format.number(cents / 100, { style: 'currency', currency: 'USD' })` con next-intl, solo en la capa de presentación.
