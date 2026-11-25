/**
 * Every deadline of Fase 1 comes from here (alcance sections 3–7; docs/plazos.md).
 * Callers compute the deadline once, when a row enters the state, and store it as a date
 * on that row. Expiry jobs compare that stored date with now(); they never recompute it.
 *
 * Two kinds of deadline:
 * - Hour-based (DEADLINE_HOURS): multiplied by DEADLINE_SCALE so staging/dev can test
 *   48 h windows in minutes. Production always runs with scale 1 (lib/env.ts refuses
 *   to start otherwise).
 * - Calendar-based: NOT scaled. The 5 business days of a dispute decision, and every rule
 *   tied to the event date (the 24 h-before-start cap on quotes, the cancellation table,
 *   the 10 days–3 months window of Reserva Inmediata).
 */
import { addDays, DEFAULT_BUSINESS_CALENDAR, type BusinessCalendar } from './business-calendar';

const HOUR_MS = 3_600_000;
const TIME_ZONE = 'America/New_York';

/** Hour-based deadlines of the alcance, at scale 1. */
export const DEADLINE_HOURS = {
  /** Host must answer a booking request. */
  requestResponse: 24,
  /** Host must answer a counter-offer. */
  counterOfferResponse: 24,
  /** Generated contract must be signed and paid. */
  contractSignOrPay: 24,
  /** Client can confirm or report a problem after "Trabajo completado". */
  releaseWindow: 48,
  /** Provider must answer a "No se presentó" report with evidence. */
  noShowResponse: 48,
  /** Both parties can leave their review. */
  reviewWindow: 7 * 24,
  /** Default validity of a sent quote (see quoteValidUntil for the cap). */
  quoteValidity: 7 * 24,
} as const;

export type ScaledDeadline = keyof typeof DEADLINE_HOURS;

/** A quote never stays valid later than this before the booking starts. Not scaled. */
export const QUOTE_CUTOFF_HOURS_BEFORE_START = 24;

/** Business days to decide a dispute. Not scaled. */
export const DISPUTE_DECISION_BUSINESS_DAYS = 5;

/** `from` + the deadline's hours × scale, rounded to the millisecond. */
export function deadlineFrom(kind: ScaledDeadline, from: Date, scale: number): Date {
  assertScale(scale);
  return new Date(from.getTime() + Math.round(DEADLINE_HOURS[kind] * scale * HOUR_MS));
}

/**
 * Expiry of a sent quote: 7 days (scaled) after sending, but never later than 24 h before
 * the booking starts (real hours: it depends on the event date). If the cut-off is already
 * in the past the result is in the past too; the caller must not send such a quote.
 */
export function quoteValidUntil(sentAt: Date, bookingStart: Date, scale: number): Date {
  const byValidity = deadlineFrom('quoteValidity', sentAt, scale).getTime();
  const cutoff = bookingStart.getTime() - QUOTE_CUTOFF_HOURS_BEFORE_START * HOUR_MS;
  return new Date(Math.min(byValidity, cutoff));
}

/**
 * Deadline to decide a dispute: the end (23:59:59.999, America/New_York) of the 5th business
 * day after the day the dispute was opened. The opening day never counts; a dispute opened on
 * a weekend or holiday starts counting on the next business day.
 * Example: opened Tuesday 3:00 pm → due next Tuesday 11:59:59.999 pm.
 * Business days come from the calendar in lib/domain/business-calendar.ts.
 */
export function disputeDecisionDueAt(
  openedAt: Date,
  calendar: BusinessCalendar = DEFAULT_BUSINESS_CALENDAR,
): Date {
  let date = calendarDateIn(openedAt, TIME_ZONE);
  let counted = 0;
  while (counted < DISPUTE_DECISION_BUSINESS_DAYS) {
    date = addDays(date, 1);
    if (calendar.isBusinessDay(date)) counted++;
  }
  // End of that day = start of the next day in New York, minus 1 ms.
  return new Date(startOfDayIn(addDays(date, 1), TIME_ZONE).getTime() - 1);
}

function assertScale(scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(`Invalid DEADLINE_SCALE ${scale}: must be a positive number`);
  }
}

// ── Timezone helpers (Intl only, DST-aware) ────────────────────────────────────

/** Calendar date 'YYYY-MM-DD' of an instant in `timeZone`. */
function calendarDateIn(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The instant when `date` starts (00:00) in `timeZone`. */
function startOfDayIn(date: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const wallClockAsUtc = Date.UTC(y, m - 1, d);
  // Two passes settle the offset when the guess lands on the other side of a DST change.
  let instant = wallClockAsUtc - offsetMs(new Date(wallClockAsUtc), timeZone);
  instant = wallClockAsUtc - offsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** Offset of `timeZone` from UTC at `instant`, in ms (New York: −5 h or −4 h). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zonedParts(instant: Date, timeZone: string) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, fmt);
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(fmt.formatToParts(instant).find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
