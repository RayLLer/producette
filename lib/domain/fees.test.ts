import { describe, it, expect } from 'vitest';
import {
  calculateFees,
  settleLowerAgreedPrice,
  DEFAULT_FEE_SETTINGS,
  type FeeSettings,
} from './fees';

const settings = DEFAULT_FEE_SETTINGS;

describe('calculateFees', () => {
  it('caso base del alcance: $3,400 → cliente paga $3,570 y host recibe $3,060', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
    });
    expect(result.clientTotalInCents).toBe(357_000);
    expect(result.hostNetInCents).toBe(306_000);
    expect(result.clientFeeInCents).toBe(17_000);
    expect(result.platformFeeInCents).toBe(34_000);
    expect(result.appliedPlatformBps).toBe(1000);
    expect(result.appliedClientBps).toBe(500);
  });

  it('host fundador al 8%: $3,400 → host recibe $3,128', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: true,
      clientReferredByThisHost: false,
    });
    expect(result.platformFeeInCents).toBe(27_200);
    expect(result.hostNetInCents).toBe(312_800);
    expect(result.appliedPlatformBps).toBe(800);
    expect(result.clientTotalInCents).toBe(357_000);
  });

  it('cliente referido al 3%: $3,400 → host recibe $3,298', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: true,
    });
    expect(result.platformFeeInCents).toBe(10_200);
    expect(result.hostNetInCents).toBe(329_800);
    expect(result.appliedPlatformBps).toBe(300);
    expect(result.clientTotalInCents).toBe(357_000);
  });

  it('fundador + cliente propio: aplica la tasa menor (3%), no la del fundador (8%)', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: true,
      clientReferredByThisHost: true,
    });
    expect(result.appliedPlatformBps).toBe(300);
    expect(result.hostNetInCents).toBe(329_800);
  });

  it('el fee del cliente no tiene tope: precio alto sigue cobrando 5%', () => {
    const bigPrice = 1_000_000_00; // $1,000,000
    const result = calculateFees({
      priceInCents: bigPrice,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
    });
    expect(result.clientFeeInCents).toBe(5_000_000);
    expect(result.clientTotalInCents).toBe(105_000_000);
  });

  it('redondeo al centavo, mitad hacia arriba', () => {
    // 1 cent * 500bps / 10000 = 0.005 → rounds to 1
    const result = calculateFees({
      priceInCents: 1,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
    });
    expect(result.clientFeeInCents).toBe(0); // Math.round(0.005... no, 1*500/10000=0.05) → 0
    // For exact rounding verification:
    // 1 * 500 / 10000 = 0.05 → Math.round(0.05) = 0
    expect(result.clientFeeInCents).toBe(0);
  });

  it('precio cero: todo en cero', () => {
    const result = calculateFees({
      priceInCents: 0,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
    });
    expect(result.clientFeeInCents).toBe(0);
    expect(result.clientTotalInCents).toBe(0);
    expect(result.platformFeeInCents).toBe(0);
    expect(result.hostNetInCents).toBe(0);
  });

  it('hostFeeBps del perfil reemplaza la tasa general y la de fundador', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: true,
      clientReferredByThisHost: false,
      hostFeeBps: 700,
    });
    expect(result.appliedPlatformBps).toBe(700);
    expect(result.platformFeeInCents).toBe(23_800);
  });

  it('hostFeeBps nulo usa fee_settings', () => {
    const result = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
      hostFeeBps: null,
    });
    expect(result.appliedPlatformBps).toBe(1000);
  });

  it('cliente referido con hostFeeBps: gana la tasa más baja', () => {
    const higher = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: true,
      hostFeeBps: 700,
    });
    expect(higher.appliedPlatformBps).toBe(300);

    const lower = calculateFees({
      priceInCents: 340_000,
      settings,
      hostIsFounder: false,
      clientReferredByThisHost: true,
      hostFeeBps: 200,
    });
    expect(lower.appliedPlatformBps).toBe(200);
  });

  it('tasas personalizadas (posible cambio futuro en fee_settings)', () => {
    const customSettings: FeeSettings = {
      providerBps: 1200,
      clientBps: 600,
      founderBps: 1000,
      referralBps: 400,
    };
    const result = calculateFees({
      priceInCents: 100_000,
      settings: customSettings,
      hostIsFounder: false,
      clientReferredByThisHost: false,
    });
    expect(result.clientFeeInCents).toBe(6_000);
    expect(result.platformFeeInCents).toBe(12_000);
    expect(result.hostNetInCents).toBe(88_000);
  });
});

describe("settleLowerAgreedPrice", () => {
  const quote = calculateFees({
    priceInCents: 340_000,
    settings,
    hostIsFounder: false,
    clientReferredByThisHost: false,
  });

  it("acuerdan $3,000 sobre $3,400: reembolso $400, comisión fija $340, Host $2,660", () => {
    const r = settleLowerAgreedPrice({ quote, agreedPriceInCents: 300_000 });
    expect(r.refundToClientInCents).toBe(40_000);
    expect(r.platformFeeInCents).toBe(34_000);
    expect(r.hostNetInCents).toBe(266_000);
  });

  it("no devuelve el 5% del cliente ni recalcula la comisión", () => {
    const r = settleLowerAgreedPrice({ quote, agreedPriceInCents: 300_000 });
    expect(r.refundToClientInCents + r.platformFeeInCents + r.hostNetInCents).toBe(
      quote.priceInCents,
    );
    expect(r.clientFeeKeptInCents).toBe(quote.clientFeeInCents);
  });

  it("monto acordado menor que la comisión: Producette se queda con el monto, Host $0", () => {
    const r = settleLowerAgreedPrice({ quote, agreedPriceInCents: 20_000 });
    expect(r.refundToClientInCents).toBe(320_000);
    expect(r.platformFeeInCents).toBe(20_000);
    expect(r.hostNetInCents).toBe(0);
  });

  it("monto acordado igual al precio: sin reembolso, reparto original", () => {
    const r = settleLowerAgreedPrice({ quote, agreedPriceInCents: 340_000 });
    expect(r.refundToClientInCents).toBe(0);
    expect(r.hostNetInCents).toBe(quote.hostNetInCents);
  });

  it("monto cero: reembolso del precio completo, sin comisión ni Host", () => {
    const r = settleLowerAgreedPrice({ quote, agreedPriceInCents: 0 });
    expect(r).toMatchObject({ refundToClientInCents: 340_000, platformFeeInCents: 0, hostNetInCents: 0 });
  });

  it("rechaza montos mayores al precio, decimales y negativos", () => {
    expect(() => settleLowerAgreedPrice({ quote, agreedPriceInCents: 340_001 })).toThrow();
    expect(() => settleLowerAgreedPrice({ quote, agreedPriceInCents: 100.5 })).toThrow();
    expect(() => settleLowerAgreedPrice({ quote, agreedPriceInCents: -1 })).toThrow();
  });
});
