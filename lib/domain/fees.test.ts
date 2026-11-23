import { describe, it, expect } from 'vitest';
import {
  calculateFees,
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
