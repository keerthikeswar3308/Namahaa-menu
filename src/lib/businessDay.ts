/**
 * Utility functions for Restaurant Business Day calculations (IST UTC+05:30).
 * Uses standard Intl.DateTimeFormat with 'Asia/Kolkata' timezone to ensure 100% accuracy
 * regardless of whether code runs on local Windows or remote UTC serverless environments (Cloudflare/Netlify).
 */

export function parseSafeDate(dInput: any): Date {
  if (!dInput) return new Date();
  if (dInput instanceof Date) {
    return isNaN(dInput.getTime()) ? new Date() : dInput;
  }
  if (typeof dInput === 'number') {
    return new Date(dInput);
  }
  if (typeof dInput === 'string') {
    const formatted = dInput.trim().replace(' ', 'T');
    const d = new Date(formatted);
    if (!isNaN(d.getTime())) return d;
    const fallback = new Date(dInput);
    if (!isNaN(fallback.getTime())) return fallback;
  }
  return new Date();
}

/**
 * Returns IST date parts { year, month, day, hour, minute } for any Date
 */
export function getISTParts(dInput: any = new Date()) {
  const date = parseSafeDate(dInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: parseInt(getPart('hour'), 10),
    minute: parseInt(getPart('minute'), 10),
  };
}

/**
 * Returns the restaurant business date string (YYYY-MM-DD) for a given timestamp.
 * Standard cutoff: If local IST time is before 04:00 AM, it is considered part of the previous calendar day's business session.
 */
export function getRestaurantBusinessDateStr(dInput: any = new Date()): string {
  const parts = getISTParts(dInput);
  let y = parseInt(parts.year, 10);
  let m = parseInt(parts.month, 10);
  let d = parseInt(parts.day, 10);

  // Cutoff at 4:00 AM IST for late night operating hours
  if (parts.hour < 4) {
    const prevDay = new Date(Date.UTC(y, m - 1, d - 1));
    y = prevDay.getUTCFullYear();
    m = prevDay.getUTCMonth() + 1;
    d = prevDay.getUTCDate();
  }

  const yearStr = String(y);
  const monthStr = String(m).padStart(2, '0');
  const dayStr = String(d).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Returns UTC ISO bounds for a given business date string (YYYY-MM-DD).
 * Business session covers from 00:00:00 IST of dateStr to 04:00:00 IST of next calendar day (28 hours).
 */
export function getBusinessDateBoundsISO(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startISO = new Date(`${dateStr}T00:00:00+05:30`).toISOString();

  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextYear = nextDay.getUTCFullYear();
  const nextMonth = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
  const nextDate = String(nextDay.getUTCDate()).padStart(2, '0');

  // Business day ends at 04:00 AM IST on the next calendar day (28 hours)
  const endISO = new Date(`${nextYear}-${nextMonth}-${nextDate}T04:00:00+05:30`).toISOString();

  return { startISO, endISO };
}
