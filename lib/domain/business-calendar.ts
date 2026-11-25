/**
 * Business-day calendar used by deadlines counted in "días hábiles" (today: the 5-business-day
 * dispute decision, see lib/domain/deadlines.ts and docs/plazos.md).
 *
 * Definition (confirmed by the business on 2026-11-25):
 *   A business day is Monday to Friday, in America/New_York, that is NOT a holiday of the
 *   active configuration. By default the configuration holds the US federal holidays.
 *
 * HOW TO CHANGE THE HOLIDAYS
 *   Edit BUSINESS_CALENDAR_CONFIG below and open a pull request:
 *   - includeUsFederalHolidays: true keeps the 11 federal holidays (observed dates).
 *   - extraHolidays: dates Producette also treats as non-working ('YYYY-MM-DD' + a name).
 *   - excludedHolidays: federal dates Producette works anyway ('YYYY-MM-DD').
 *   A change only affects deadlines computed after it is deployed: each deadline is stored
 *   as a date on its row when the dispute opens, so open disputes keep their date.
 *
 * Dates are calendar days written as 'YYYY-MM-DD' strings (no time, no timezone).
 */

export interface Holiday {
  /** Calendar date 'YYYY-MM-DD' in America/New_York. */
  date: string;
  name: string;
}

export interface BusinessCalendarConfig {
  /** Include the US federal holidays (observed dates). Default: true. */
  includeUsFederalHolidays?: boolean;
  /** Additional non-working dates. */
  extraHolidays?: readonly Holiday[];
  /** Federal holiday dates that should count as business days. */
  excludedHolidays?: readonly string[];
}

export interface BusinessCalendar {
  readonly timeZone: 'America/New_York';
  isHoliday(date: string): boolean;
  isBusinessDay(date: string): boolean;
}

/**
 * Producette's active configuration. This is the single place to edit holidays.
 * Default: Monday–Friday minus the US federal holidays.
 */
export const BUSINESS_CALENDAR_CONFIG: BusinessCalendarConfig = {
  includeUsFederalHolidays: true,
  extraHolidays: [],
  excludedHolidays: [],
};

/**
 * The 11 US federal holidays of `year` (5 U.S.C. 6103), on their observed dates:
 * a holiday on Saturday is observed the Friday before, on Sunday the Monday after.
 * New Year's Day of `year + 1` falling on a Saturday is observed on December 31 of `year`,
 * so it is included here.
 */
export function usFederalHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    observed(year, 1, 1, "New Year's Day"),
    { date: nthWeekday(year, 1, MONDAY, 3), name: 'Martin Luther King Jr. Day' },
    { date: nthWeekday(year, 2, MONDAY, 3), name: "Washington's Birthday" },
    { date: lastWeekday(year, 5, MONDAY), name: 'Memorial Day' },
    observed(year, 6, 19, 'Juneteenth National Independence Day'),
    observed(year, 7, 4, 'Independence Day'),
    { date: nthWeekday(year, 9, MONDAY, 1), name: 'Labor Day' },
    { date: nthWeekday(year, 10, MONDAY, 2), name: 'Columbus Day' },
    observed(year, 11, 11, 'Veterans Day'),
    { date: nthWeekday(year, 11, THURSDAY, 4), name: 'Thanksgiving Day' },
    observed(year, 12, 25, 'Christmas Day'),
  ].filter((h) => h.date.startsWith(`${year}-`)); // New Year's observed in the previous year

  const nextNewYear = observed(year + 1, 1, 1, "New Year's Day");
  if (nextNewYear.date.startsWith(`${year}-`)) holidays.push(nextNewYear);
  return holidays;
}

export function createBusinessCalendar(config: BusinessCalendarConfig = {}): BusinessCalendar {
  const includeFederal = config.includeUsFederalHolidays ?? true;
  const extra = new Set((config.extraHolidays ?? []).map((h) => assertDate(h.date)));
  const excluded = new Set((config.excludedHolidays ?? []).map(assertDate));
  const federalByYear = new Map<number, Set<string>>();

  function federal(year: number): Set<string> {
    let set = federalByYear.get(year);
    if (!set) {
      set = new Set(usFederalHolidays(year).map((h) => h.date));
      federalByYear.set(year, set);
    }
    return set;
  }

  function isHoliday(date: string): boolean {
    assertDate(date);
    if (extra.has(date)) return true;
    if (!includeFederal || excluded.has(date)) return false;
    return federal(Number(date.slice(0, 4))).has(date);
  }

  return {
    timeZone: 'America/New_York',
    isHoliday,
    isBusinessDay(date) {
      const day = dayOfWeek(date);
      return day !== SATURDAY && day !== SUNDAY && !isHoliday(date);
    },
  };
}

export const DEFAULT_BUSINESS_CALENDAR = createBusinessCalendar(BUSINESS_CALENDAR_CONFIG);

// ── Calendar-date helpers (pure; no timezone involved) ─────────────────────────

const SUNDAY = 0;
const MONDAY = 1;
const THURSDAY = 4;
const SATURDAY = 6;

/** 'YYYY-MM-DD' + n calendar days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = parse(date);
  return format(new Date(Date.UTC(y, m - 1, d + days)));
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: string): number {
  const [y, m, d] = parse(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function observed(year: number, month: number, day: number, name: string): Holiday {
  const date = format(new Date(Date.UTC(year, month - 1, day)));
  const dow = dayOfWeek(date);
  if (dow === SATURDAY) return { date: addDays(date, -1), name };
  if (dow === SUNDAY) return { date: addDays(date, 1), name };
  return { date, name };
}

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = format(new Date(Date.UTC(year, month - 1, 1)));
  const offset = (weekday - dayOfWeek(first) + 7) % 7;
  return addDays(first, offset + (n - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const last = format(new Date(Date.UTC(year, month, 0)));
  const offset = (dayOfWeek(last) - weekday + 7) % 7;
  return addDays(last, -offset);
}

function parse(date: string): [number, number, number] {
  assertDate(date);
  return date.split('-').map(Number) as [number, number, number];
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function assertDate(date: string): string {
  const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) ?? [];
  const valid =
    y !== undefined &&
    m !== undefined &&
    d !== undefined &&
    new Date(Date.UTC(+y, +m - 1, +d)).toISOString().startsWith(date);
  if (!valid) throw new Error(`Invalid calendar date '${date}' (expected YYYY-MM-DD)`);
  return date;
}
