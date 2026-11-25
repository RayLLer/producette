import { describe, expect, it } from 'vitest';
import { createBusinessCalendar } from './business-calendar';
import {
  DEADLINE_HOURS,
  deadlineFrom,
  disputeDecisionDueAt,
  quoteValidUntil,
} from './deadlines';

const HOUR = 3_600_000;
const t0 = new Date('2026-12-01T15:00:00Z');

describe('deadlineFrom (plazos en horas, escalables)', () => {
  it('plazos del alcance con escala 1', () => {
    expect(DEADLINE_HOURS).toEqual({
      requestResponse: 24,
      counterOfferResponse: 24,
      contractSignOrPay: 24,
      releaseWindow: 48,
      noShowResponse: 48,
      reviewWindow: 7 * 24,
      quoteValidity: 7 * 24,
    });
    expect(deadlineFrom('requestResponse', t0, 1).getTime()).toBe(t0.getTime() + 24 * HOUR);
    expect(deadlineFrom('releaseWindow', t0, 1).getTime()).toBe(t0.getTime() + 48 * HOUR);
  });

  it('DEADLINE_SCALE 0.0035: 48 h ≈ 10 minutos', () => {
    const ms = deadlineFrom('releaseWindow', t0, 0.0035).getTime() - t0.getTime();
    expect(ms).toBe(604_800); // 10 min 4.8 s
  });

  it('rechaza escalas no positivas o no numéricas', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => deadlineFrom('requestResponse', t0, bad)).toThrow();
    }
  });
});

describe('quoteValidUntil', () => {
  it('7 días si el inicio está lejos', () => {
    const start = new Date('2027-01-15T15:00:00Z');
    expect(quoteValidUntil(t0, start, 1).getTime()).toBe(t0.getTime() + 7 * 24 * HOUR);
  });

  it('nunca después de 24 h antes del inicio', () => {
    const start = new Date('2026-12-04T15:00:00Z');
    expect(quoteValidUntil(t0, start, 1)).toEqual(new Date('2026-12-03T15:00:00Z'));
  });

  it('la escala acorta los 7 días pero no el corte de 24 h antes del inicio', () => {
    const start = new Date('2026-12-04T15:00:00Z');
    const until = quoteValidUntil(t0, start, 0.0035);
    expect(until.getTime() - t0.getTime()).toBe(Math.round(7 * 24 * 0.0035 * HOUR));
  });
});

describe('disputeDecisionDueAt (5 días hábiles, fin del 5.º día en Miami)', () => {
  it('abierta el martes 3:00 pm → martes siguiente 11:59:59.999 pm', () => {
    const opened = new Date('2026-12-01T20:00:00Z'); // mar 1-dic 3:00 pm EST
    expect(disputeDecisionDueAt(opened).toISOString()).toBe('2026-12-09T04:59:59.999Z');
  });

  it('abierta en sábado: empieza a contar el lunes y vence el viernes', () => {
    const opened = new Date('2026-12-05T17:00:00Z'); // sáb 5-dic
    expect(disputeDecisionDueAt(opened).toISOString()).toBe('2026-12-12T04:59:59.999Z');
  });

  it('salta Thanksgiving', () => {
    const opened = new Date('2026-11-23T15:00:00Z'); // lun 23-nov 10:00 am EST
    expect(disputeDecisionDueAt(opened).toISOString()).toBe('2026-12-02T04:59:59.999Z');
  });

  it('usa la fecha de Miami, no la UTC', () => {
    const opened = new Date('2026-12-01T03:00:00Z'); // lun 30-nov 10:00 pm EST
    expect(disputeDecisionDueAt(opened).toISOString()).toBe('2026-12-08T04:59:59.999Z');
  });

  it('respeta el horario de verano (EDT, UTC-4)', () => {
    const opened = new Date('2026-03-03T15:00:00Z'); // mar 3-mar; el 8 empieza EDT
    expect(disputeDecisionDueAt(opened).toISOString()).toBe('2026-03-11T03:59:59.999Z');
  });

  it('usa el calendario configurado', () => {
    const cal = createBusinessCalendar({
      includeUsFederalHolidays: false,
      extraHolidays: [{ date: '2026-12-02', name: 'Feriado de prueba' }],
    });
    const opened = new Date('2026-12-01T20:00:00Z');
    expect(disputeDecisionDueAt(opened, cal).toISOString()).toBe('2026-12-10T04:59:59.999Z');
  });
});
