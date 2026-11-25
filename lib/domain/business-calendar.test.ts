import { describe, expect, it } from 'vitest';
import {
  createBusinessCalendar,
  DEFAULT_BUSINESS_CALENDAR,
  usFederalHolidays,
} from './business-calendar';

describe('usFederalHolidays', () => {
  it('2026: los 11 feriados federales en su fecha observada', () => {
    expect(usFederalHolidays(2026).map((h) => h.date)).toEqual([
      '2026-01-01', // New Year's Day (jueves)
      '2026-01-19', // Martin Luther King Jr. Day (3.er lunes de enero)
      '2026-02-16', // Washington's Birthday (3.er lunes de febrero)
      '2026-05-25', // Memorial Day (último lunes de mayo)
      '2026-06-19', // Juneteenth (viernes)
      '2026-07-03', // Independence Day: el 4 cae sábado, se observa el viernes
      '2026-09-07', // Labor Day (1.er lunes de septiembre)
      '2026-10-12', // Columbus Day (2.º lunes de octubre)
      '2026-11-11', // Veterans Day (miércoles)
      '2026-11-26', // Thanksgiving (4.º jueves de noviembre)
      '2026-12-25', // Christmas Day (viernes)
    ]);
  });

  it('feriado en domingo se observa el lunes', () => {
    expect(usFederalHolidays(2022).map((h) => h.date)).toContain('2022-12-26');
  });

  it('Año Nuevo en sábado se observa el viernes 31 de diciembre del año anterior', () => {
    expect(usFederalHolidays(2021).map((h) => h.date)).toContain('2021-12-31');
    expect(DEFAULT_BUSINESS_CALENDAR.isBusinessDay('2021-12-31')).toBe(false);
  });
});

describe('BusinessCalendar', () => {
  it('fines de semana y feriados no son días hábiles', () => {
    const cal = DEFAULT_BUSINESS_CALENDAR;
    expect(cal.isBusinessDay('2026-11-25')).toBe(true); // miércoles
    expect(cal.isBusinessDay('2026-11-26')).toBe(false); // Thanksgiving
    expect(cal.isBusinessDay('2026-11-28')).toBe(false); // sábado
    expect(cal.isBusinessDay('2026-11-29')).toBe(false); // domingo
  });

  it('la configuración puede agregar feriados propios y quitar federales', () => {
    const cal = createBusinessCalendar({
      includeUsFederalHolidays: true,
      extraHolidays: [{ date: '2026-12-24', name: 'Nochebuena' }],
      excludedHolidays: ['2026-10-12'],
    });
    expect(cal.isBusinessDay('2026-12-24')).toBe(false);
    expect(cal.isBusinessDay('2026-10-12')).toBe(true);
  });

  it('sin feriados federales solo cuentan los fines de semana', () => {
    const cal = createBusinessCalendar({ includeUsFederalHolidays: false });
    expect(cal.isBusinessDay('2026-11-26')).toBe(true);
  });

  it('rechaza fechas mal escritas en la configuración', () => {
    expect(() =>
      createBusinessCalendar({ extraHolidays: [{ date: '2026-13-01', name: 'x' }] }),
    ).toThrow();
  });
});
